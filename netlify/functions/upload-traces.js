import GitHubAPI from './utils/github.js';

export const handler = async (event, context) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const github = new GitHubAPI();
    const requestData = JSON.parse(event.body);
    
    // Extract user info
    const userId = event.headers['x-user-id'] || requestData.userId || 'user_001';
    const user = await github.getCurrentUser(userId);
    
    // Validate permissions
    github.validateUserPermission(user, 'trace_upload');

    // Validate required fields
    const { prId, intent, tags, traceFiles, testResults } = requestData;
    
    if (!prId || !intent || !tags || !Array.isArray(tags) || tags.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'prId, intent, and tags are required' })
      };
    }

    if (!traceFiles || !Array.isArray(traceFiles) || traceFiles.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'traceFiles are required' })
      };
    }

    // Validate intent
    const validIntents = ['regression', 'e2e', 'smoke', 'api', 'ui', 'performance'];
    if (!validIntents.includes(intent)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `Invalid intent. Must be one of: ${validIntents.join(', ')}` })
      };
    }

    // Read current data
    const { content: prData, sha: prSha } = await github.readFile('data/prs.json');
    const { content: testCaseData } = await github.readFile('data/test-cases.json');
    const { content: testResultData, sha: resultSha } = await github.readFile('data/test-results.json');
    const { content: assignmentData, sha: assignmentSha } = await github.readFile('data/test-assignments.json');
    
    // Find the PR
    const pr = prData.prs.find(p => p.id === prId);
    if (!pr) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'PR not found' })
      };
    }

    // Extract test case information from trace files
    const extractedTestCases = await this.extractTestCasesFromTraces(traceFiles, intent, tags, testCaseData);
    
    // Process test results if provided
    let processedResults = [];
    if (testResults && Array.isArray(testResults)) {
      processedResults = testResults.map(result => ({
        id: `tr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        pr_id: prId,
        test_case_id: result.testCaseId || null,
        test_name: result.testName || 'Unknown Test',
        tester: user.display_name || user.username,
        status: result.status || 'unknown',
        actual_duration: result.duration || 0,
        expected_duration: result.expectedDuration || 2000,
        executed_at: new Date().toISOString(),
        environment: result.environment || 'staging',
        browser: result.browser || 'Chrome',
        trace_files: result.traceFiles || [],
        screenshots: result.screenshots || 0,
        actions_performed: result.actions || 0,
        notes: result.notes || '',
        failure_reason: result.failureReason || null,
        error_messages: result.errorMessages || []
      }));
    }

    // Auto-create assignments for extracted test cases
    let newAssignments = [];
    for (const testCase of extractedTestCases) {
      // Check if assignment already exists
      const existingAssignment = assignmentData.assignments.find(a => 
        a.pr_id === prId && a.test_case_id === testCase.id
      );
      
      if (!existingAssignment) {
        const newAssignment = {
          id: `assign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          pr_id: prId,
          test_case_id: testCase.id,
          test_name: testCase.name,
          assigned_to: null, // Will be assigned later
          assigned_at: null,
          status: 'unassigned',
          priority: testCase.priority || 'medium',
          estimated_duration: testCase.expected_duration || 2000,
          actual_duration: null,
          started_at: null,
          completed_at: null,
          due_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48h from now
          progress: 0,
          environment: 'staging',
          browser: 'Chrome',
          progress_updates: [],
          requirements: [`Test intent: ${intent}`, `Tags: ${tags.join(', ')}`],
          dependencies: [],
          notes: `Auto-created from trace upload by ${user.display_name || user.username}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        newAssignments.push(newAssignment);
        assignmentData.assignments.push(newAssignment);
      }
    }

    // Update PR with test results summary
    const passedResults = processedResults.filter(r => r.status === 'passed').length;
    const failedResults = processedResults.filter(r => r.status === 'failed').length;
    const skippedResults = processedResults.filter(r => r.status === 'skipped').length;

    pr.branch_comparison.feature_branch.tests_passed += passedResults;
    pr.branch_comparison.feature_branch.tests_failed += failedResults;
    pr.branch_comparison.feature_branch.tests_skipped += skippedResults;
    
    // Update PR status based on test results
    if (failedResults > 0) {
      pr.status = 'testing';
      pr.merge_readiness.merge_blockers.push(`${failedResults} failing tests`);
      pr.merge_readiness.ready_for_merge = false;
    } else if (passedResults > 0) {
      pr.status = 'testing';
      // Remove test-related blockers
      pr.merge_readiness.merge_blockers = pr.merge_readiness.merge_blockers.filter(
        blocker => !blocker.includes('No tests executed')
      );
    }
    
    pr.updated_at = new Date().toISOString();

    // Add test results to database
    testResultData.test_results.push(...processedResults);
    
    // Update statistics
    assignmentData.assignment_statistics = this.calculateAssignmentStats(assignmentData.assignments);
    github.updateMetadata(prData);
    github.updateMetadata(testResultData);
    github.updateMetadata(assignmentData);

    // Save all data in parallel
    const savePromises = [
      github.writeFile('data/prs.json', prData, 
        `Updated PR ${pr.name}: ${passedResults} passed, ${failedResults} failed tests`, prSha),
      github.writeFile('data/test-results.json', testResultData, 
        `Added ${processedResults.length} test results from trace upload`, resultSha),
      github.writeFile('data/test-assignments.json', assignmentData, 
        `Auto-created ${newAssignments.length} assignments from trace upload`, assignmentSha)
    ];
    
    await Promise.all(savePromises);

    // Log activity
    await github.logActivity(
      'trace_upload',
      'test_cases_extracted',
      user.display_name || user.username,
      {
        pr_id: prId,
        pr_name: pr.name,
        intent: intent,
        tags: tags,
        trace_files_count: traceFiles.length,
        extracted_test_cases: extractedTestCases.length,
        new_assignments: newAssignments.length,
        test_results: {
          passed: passedResults,
          failed: failedResults,
          skipped: skippedResults
        }
      },
      `Uploaded ${traceFiles.length} trace files, extracted ${extractedTestCases.length} test cases, created ${newAssignments.length} assignments`
    );

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: `Processed ${traceFiles.length} trace files successfully`,
        data: {
          pr: pr,
          extracted_test_cases: extractedTestCases,
          new_assignments: newAssignments,
          test_results_summary: {
            passed: passedResults,
            failed: failedResults,
            skipped: skippedResults,
            total: processedResults.length
          }
        }
      })
    };

  } catch (error) {
    console.error('Upload Traces Error:', error);
    
    return {
      statusCode: error.message.includes('Permission denied') ? 403 : 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }

  // Helper method to extract test cases from trace files
  async extractTestCasesFromTraces(traceFiles, intent, tags, testCaseData) {
    const extractedCases = [];
    
    for (const traceFile of traceFiles) {
      // Simulate trace parsing - in real implementation, you would parse actual Playwright traces
      const testCase = {
        id: `tc_extracted_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: traceFile.name || `Test extracted from ${traceFile.filename}`,
        description: `Auto-extracted test case from trace: ${traceFile.filename}`,
        tags: [...tags, `@${intent}`, '@extracted'],
        intent: intent,
        type: 'functional',
        priority: this.determinePriorityFromIntent(intent),
        bdd_steps: this.generateBDDStepsFromTrace(traceFile, intent),
        steps: [], // Will be populated from BDD steps
        expected_duration: traceFile.duration || this.getDefaultDurationForIntent(intent),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'system_extraction',
        is_custom: false,
        source: 'trace_extraction'
      };
      
      // Generate formatted steps from BDD
      testCase.steps = testCase.bdd_steps.map(step => step.formatted);
      
      // Check if similar test case already exists
      const existingCase = testCaseData.test_cases.find(tc => 
        tc.name === testCase.name || tc.tags.some(tag => testCase.tags.includes(tag))
      );
      
      if (!existingCase) {
        extractedCases.push(testCase);
        testCaseData.test_cases.push(testCase);
      }
    }
    
    return extractedCases;
  }

  // Helper method to determine priority from intent
  determinePriorityFromIntent(intent) {
    const priorityMap = {
      'regression': 'high',
      'smoke': 'high', 
      'e2e': 'medium',
      'api': 'medium',
      'ui': 'low',
      'performance': 'medium'
    };
    return priorityMap[intent] || 'medium';
  }

  // Helper method to get default duration for intent
  getDefaultDurationForIntent(intent) {
    const durationMap = {
      'regression': 3000,
      'smoke': 1500,
      'e2e': 5000,
      'api': 1000,
      'ui': 2000,
      'performance': 10000
    };
    return durationMap[intent] || 2000;
  }

  // Helper method to generate BDD steps from trace
  generateBDDStepsFromTrace(traceFile, intent) {
    // This would parse actual trace data in a real implementation
    const intentStepTemplates = {
      'regression': [
        { type: 'given', text: 'the application is in a stable state', formatted: 'Given the application is in a stable state' },
        { type: 'when', text: 'I execute the regression test scenario', formatted: 'When I execute the regression test scenario' },
        { type: 'then', text: 'all functionality should work as expected', formatted: 'Then all functionality should work as expected' }
      ],
      'smoke': [
        { type: 'given', text: 'the application is deployed', formatted: 'Given the application is deployed' },
        { type: 'when', text: 'I perform basic smoke tests', formatted: 'When I perform basic smoke tests' },
        { type: 'then', text: 'core functionality should be accessible', formatted: 'Then core functionality should be accessible' }
      ],
      'e2e': [
        { type: 'given', text: 'I am on the application homepage', formatted: 'Given I am on the application homepage' },
        { type: 'when', text: 'I complete the end-to-end user journey', formatted: 'When I complete the end-to-end user journey' },
        { type: 'then', text: 'the workflow should complete successfully', formatted: 'Then the workflow should complete successfully' }
      ],
      'api': [
        { type: 'given', text: 'the API endpoints are available', formatted: 'Given the API endpoints are available' },
        { type: 'when', text: 'I make API requests', formatted: 'When I make API requests' },
        { type: 'then', text: 'I should receive valid responses', formatted: 'Then I should receive valid responses' }
      ],
      'ui': [
        { type: 'given', text: 'I am on the target page', formatted: 'Given I am on the target page' },
        { type: 'when', text: 'I interact with UI elements', formatted: 'When I interact with UI elements' },
        { type: 'then', text: 'the UI should respond correctly', formatted: 'Then the UI should respond correctly' }
      ],
      'performance': [
        { type: 'given', text: 'the system is under normal load', formatted: 'Given the system is under normal load' },
        { type: 'when', text: 'I execute performance tests', formatted: 'When I execute performance tests' },
        { type: 'then', text: 'response times should meet requirements', formatted: 'Then response times should meet requirements' }
      ]
    };
    
    return intentStepTemplates[intent] || intentStepTemplates['ui'];
  }

  // Helper method to calculate assignment statistics
  calculateAssignmentStats(assignments) {
    return {
      total_assignments: assignments.length,
      unassigned: assignments.filter(a => a.status === 'unassigned').length,
      assigned: assignments.filter(a => a.status === 'assigned').length,
      in_progress: assignments.filter(a => a.status === 'in_progress').length,
      completed: assignments.filter(a => a.status === 'completed').length,
      failed: assignments.filter(a => a.status === 'failed').length,
      blocked: assignments.filter(a => a.status === 'blocked').length,
      overdue: assignments.filter(a => 
        new Date(a.due_date) < new Date() && !['completed', 'failed'].includes(a.status)
      ).length,
      by_tester: assignments.reduce((acc, a) => {
        if (a.assigned_to) {
          acc[a.assigned_to] = (acc[a.assigned_to] || 0) + 1;
        } else {
          acc.unassigned = (acc.unassigned || 0) + 1;
        }
        return acc;
      }, {})
    };
  }
};