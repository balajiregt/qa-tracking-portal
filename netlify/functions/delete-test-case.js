import GitHubAPI from './utils/github.js';

export const handler = async (event, context) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS'
      }
    };
  }

  if (event.httpMethod !== 'DELETE') {
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
    
    // Validate permissions for deletion
    github.validateUserPermission(user, 'test_create'); // Same permission as create for now

    // Validate required fields
    const { testId } = requestData;
    if (!testId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'testId is required' })
      };
    }

    // Read current test cases
    const { content: testData, sha } = await github.readFile('data/test-cases.json');
    
    // Find the test case to delete
    const testCaseIndex = testData.test_cases.findIndex(tc => tc.id === testId);
    if (testCaseIndex === -1) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Test case not found' })
      };
    }

    const testCaseToDelete = testData.test_cases[testCaseIndex];
    
    // Check if user can delete this test case
    if (testCaseToDelete.created_by && testCaseToDelete.created_by !== user.username) {
      // Allow team leads and senior QA to delete any test case
      if (!['senior_qa_engineer', 'admin'].includes(user.role)) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: 'You can only delete test cases you created' })
        };
      }
    }

    // Check if test case is currently assigned or in use
    try {
      const { content: assignmentData } = await github.readFile('data/test-assignments.json');
      const activeAssignments = assignmentData.assignments.filter(a => 
        a.test_case_id === testId && !['completed', 'failed'].includes(a.status)
      );
      
      if (activeAssignments.length > 0) {
        return {
          statusCode: 409,
          body: JSON.stringify({ 
            error: `Cannot delete test case: ${activeAssignments.length} active assignment(s) exist. Complete or reassign them first.`,
            active_assignments: activeAssignments.map(a => ({
              id: a.id,
              assigned_to: a.assigned_to,
              status: a.status,
              pr_id: a.pr_id
            }))
          })
        };
      }
    } catch (assignmentError) {
      console.warn('Could not check test assignments:', assignmentError);
      // Continue with deletion if assignments file doesn't exist or is inaccessible
    }

    // Remove the test case
    testData.test_cases.splice(testCaseIndex, 1);

    // Clean up unused tags (optional - keep tags even if no test cases use them for now)
    // We could implement tag cleanup here if needed

    // Update metadata
    github.updateMetadata(testData);

    // Save to GitHub
    const commitMessage = github.generateCommitMessage(
      'Test Case Deleted',
      `${testCaseToDelete.name}: deleted by ${user.display_name || user.username}`,
      userId
    );

    await github.writeFile('data/test-cases.json', testData, commitMessage, sha);

    // Also clean up any completed assignments for this test case
    try {
      const { content: assignmentData, sha: assignmentSha } = await github.readFile('data/test-assignments.json');
      const originalLength = assignmentData.assignments.length;
      
      assignmentData.assignments = assignmentData.assignments.filter(a => a.test_case_id !== testId);
      
      const deletedAssignments = originalLength - assignmentData.assignments.length;
      if (deletedAssignments > 0) {
        // Update assignment statistics
        assignmentData.assignment_statistics = this.calculateAssignmentStats(assignmentData.assignments);
        github.updateMetadata(assignmentData);
        
        await github.writeFile('data/test-assignments.json', assignmentData, 
          `Cleaned up ${deletedAssignments} assignments for deleted test case: ${testCaseToDelete.name}`, assignmentSha);
      }
    } catch (cleanupError) {
      console.warn('Could not clean up assignments:', cleanupError);
      // Don't fail the deletion if cleanup fails
    }

    // Clean up test results for this test case
    try {
      const { content: resultData, sha: resultSha } = await github.readFile('data/test-results.json');
      const originalLength = resultData.test_results.length;
      
      resultData.test_results = resultData.test_results.filter(r => r.test_case_id !== testId);
      
      const deletedResults = originalLength - resultData.test_results.length;
      if (deletedResults > 0) {
        github.updateMetadata(resultData);
        
        await github.writeFile('data/test-results.json', resultData,
          `Cleaned up ${deletedResults} test results for deleted test case: ${testCaseToDelete.name}`, resultSha);
      }
    } catch (cleanupError) {
      console.warn('Could not clean up test results:', cleanupError);
      // Don't fail the deletion if cleanup fails
    }

    // Log activity
    await github.logActivity(
      'test_case_deleted',
      'test_case_removed',
      user.display_name || user.username,
      {
        test_case_id: testId,
        test_name: testCaseToDelete.name,
        intent: testCaseToDelete.intent,
        tags: testCaseToDelete.tags,
        was_custom: testCaseToDelete.is_custom,
        created_by: testCaseToDelete.created_by
      },
      `${user.display_name || user.username} deleted test case: ${testCaseToDelete.name}`
    );

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: `Test case "${testCaseToDelete.name}" deleted successfully`,
        data: {
          deleted_test_case: {
            id: testCaseToDelete.id,
            name: testCaseToDelete.name,
            intent: testCaseToDelete.intent,
            tags: testCaseToDelete.tags
          }
        }
      })
    };

  } catch (error) {
    console.error('Delete Test Case Error:', error);
    
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