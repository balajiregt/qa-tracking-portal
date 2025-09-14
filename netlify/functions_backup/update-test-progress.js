const GitHubAPI = require('./utils/github');

exports.handler = async (event, context) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'PUT, POST, OPTIONS'
      }
    };
  }

  if (!['PUT', 'POST'].includes(event.httpMethod)) {
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
    github.validateUserPermission(user, 'test_execute');

    // Validate required fields
    const { assignmentId, action, progress, message, status, testResult } = requestData;
    
    if (!assignmentId || !action) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'assignmentId and action are required' })
      };
    }

    // Read current assignments
    const { content: assignmentData, sha } = await github.readFile('data/test-assignments.json');
    
    const assignment = assignmentData.assignments.find(a => a.id === assignmentId);
    if (!assignment) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Assignment not found' })
      };
    }

    // Validate user can update this assignment
    if (assignment.assigned_to !== user.username && assignment.assigned_to !== user.id) {
      // Allow team leads and senior QA to update any assignment
      if (!['senior_qa_engineer', 'admin'].includes(user.role)) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: 'You can only update your own assignments' })
        };
      }
    }

    // Create progress update
    const progressUpdate = {
      id: `update_${Date.now()}`,
      timestamp: new Date().toISOString(),
      message: message || `${action} by ${user.display_name}`,
      progress: progress || assignment.progress,
      user: user.display_name || user.username,
      action: action
    };

    // Handle different actions
    switch (action) {
      case 'start':
        assignment.status = 'in_progress';
        assignment.started_at = new Date().toISOString();
        assignment.progress = Math.max(assignment.progress, 10);
        progressUpdate.message = message || `Started testing: ${assignment.test_name}`;
        break;
        
      case 'update_progress':
        if (progress !== undefined) {
          assignment.progress = Math.min(Math.max(progress, 0), 100);
        }
        progressUpdate.message = message || `Progress update: ${assignment.progress}%`;
        break;
        
      case 'complete':
        assignment.status = 'completed';
        assignment.completed_at = new Date().toISOString();
        assignment.progress = 100;
        assignment.actual_duration = testResult?.duration || assignment.estimated_duration;
        progressUpdate.message = message || `Completed testing: ${assignment.test_name}`;
        
        // Create test result if provided
        if (testResult) {
          await this.createTestResult(github, assignment, testResult, user);
        }
        break;
        
      case 'pause':
        assignment.status = 'assigned';
        progressUpdate.message = message || `Paused testing: ${assignment.test_name}`;
        break;
        
      case 'fail':
        assignment.status = 'failed';
        assignment.completed_at = new Date().toISOString();
        assignment.actual_duration = testResult?.duration || assignment.estimated_duration;
        progressUpdate.message = message || `Test failed: ${assignment.test_name}`;
        
        if (testResult) {
          await this.createTestResult(github, assignment, testResult, user);
        }
        break;
        
      case 'block':
        assignment.status = 'blocked';
        progressUpdate.message = message || `Test blocked: ${assignment.test_name}`;
        
        // Create issue if blocking reason provided
        if (requestData.blockingReason) {
          await this.createBlockingIssue(github, assignment, requestData.blockingReason, user);
        }
        break;
        
      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Invalid action: ${action}` })
        };
    }

    // Add progress update
    assignment.progress_updates = assignment.progress_updates || [];
    assignment.progress_updates.push(progressUpdate);
    assignment.updated_at = new Date().toISOString();

    // Update assignment statistics
    assignmentData.assignment_statistics = this.calculateAssignmentStats(assignmentData.assignments);
    
    // Update metadata
    github.updateMetadata(assignmentData);

    // Save to GitHub
    const commitMessage = github.generateCommitMessage(
      'Test Progress Updated',
      `${assignment.test_name}: ${action} (${assignment.progress}%)`,
      userId
    );

    await github.writeFile('data/test-assignments.json', assignmentData, commitMessage, sha);

    // Update user's current assignments count if completed
    if (['completed', 'failed'].includes(assignment.status)) {
      await this.updateUserAssignmentCount(github, assignment.assigned_to, -1);
    }

    // Log activity
    await github.logActivity(
      'test_execution',
      assignment.status === 'completed' ? 'test_passed' : 
      assignment.status === 'failed' ? 'test_failed' : 'test_updated',
      user.display_name || user.username,
      {
        assignment_id: assignmentId,
        test_name: assignment.test_name,
        status: assignment.status,
        progress: assignment.progress,
        action: action
      },
      progressUpdate.message
    );

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: `Test progress updated: ${action}`,
        data: {
          assignment: assignment,
          progress_update: progressUpdate
        }
      })
    };

  } catch (error) {
    console.error('Update Test Progress Error:', error);
    
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

  // Helper method to create test result
  async createTestResult(github, assignment, testResult, user) {
    try {
      const { content: resultData, sha } = await github.readFile('data/test-results.json');
      
      const newResult = {
        id: `tr_${Date.now()}`,
        pr_id: assignment.pr_id,
        test_case_id: assignment.test_case_id,
        test_name: assignment.test_name,
        tester: user.display_name || user.username,
        status: testResult.status || 'passed',
        actual_duration: testResult.duration || assignment.actual_duration,
        expected_duration: assignment.estimated_duration,
        executed_at: new Date().toISOString(),
        environment: assignment.environment || 'staging',
        browser: assignment.browser || 'Chrome',
        trace_files: testResult.traceFiles || [],
        screenshots: testResult.screenshots || 0,
        actions_performed: testResult.actions || 0,
        notes: testResult.notes || assignment.notes || '',
        failure_reason: testResult.failureReason || null,
        error_messages: testResult.errorMessages || []
      };

      resultData.test_results.push(newResult);
      github.updateMetadata(resultData);

      await github.writeFile('data/test-results.json', resultData, 
        `Test result: ${assignment.test_name} - ${testResult.status}`, sha);
        
    } catch (error) {
      console.error('Failed to create test result:', error);
    }
  }

  // Helper method to create blocking issue  
  async createBlockingIssue(github, assignment, blockingReason, user) {
    try {
      const { content: issuesData, sha } = await github.readFile('data/issues.json');
      
      const newIssue = {
        id: `issue_${Date.now()}`,
        pr_id: assignment.pr_id,
        test_case_id: assignment.test_case_id,
        test_name: assignment.test_name,
        type: blockingReason.type || 'technical',
        severity: blockingReason.severity || 'medium',
        title: blockingReason.title || `Test blocked: ${assignment.test_name}`,
        description: blockingReason.description || 'Test execution blocked',
        reported_by: user.display_name || user.username,
        reported_at: new Date().toISOString(),
        status: 'open',
        assigned_to: null,
        escalation_level: 0,
        updates: [{
          id: `update_${Date.now()}`,
          timestamp: new Date().toISOString(),
          user: user.display_name || user.username,
          message: 'Issue reported due to test blocking',
          action: 'reported'
        }]
      };

      issuesData.issues.push(newIssue);
      github.updateMetadata(issuesData);

      await github.writeFile('data/issues.json', issuesData,
        `Issue reported: ${newIssue.title}`, sha);
        
    } catch (error) {
      console.error('Failed to create blocking issue:', error);
    }
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

  // Helper method to update user assignment count
  async updateUserAssignmentCount(github, userId, delta) {
    try {
      const { content: userData, sha } = await github.readFile('data/users.json');
      const user = userData.users.find(u => u.username === userId || u.id === userId);
      
      if (user) {
        user.current_assignments = Math.max(0, (user.current_assignments || 0) + delta);
        user.last_active = new Date().toISOString();
        
        await github.writeFile('data/users.json', userData, 
          `Updated ${user.display_name} assignment count`, sha);
      }
    } catch (error) {
      console.error('Failed to update user assignment count:', error);
    }
  }
};