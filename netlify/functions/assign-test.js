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
    github.validateUserPermission(user, 'test_assign');

    // Validate required fields
    const { assignmentId, testCaseId, prId, assignedTo, dueDate, priority, requirements } = requestData;
    
    if (!testCaseId || !prId || !assignedTo) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'testCaseId, prId, and assignedTo are required' })
      };
    }

    // Validate assigned user exists and can handle the assignment
    const { content: userData } = await github.readFile('data/users.json');
    const assignedUser = userData.users.find(u => u.username === assignedTo || u.id === assignedTo);
    
    if (!assignedUser) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `User ${assignedTo} not found` })
      };
    }

    // Check user workload
    if (assignedUser.current_assignments >= assignedUser.max_concurrent_assignments) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: `User ${assignedUser.display_name} is at maximum capacity (${assignedUser.max_concurrent_assignments} assignments)`
        })
      };
    }

    // Read current assignments
    const { content: assignmentData, sha } = await github.readFile('data/test-assignments.json');
    
    let assignment;
    
    if (assignmentId) {
      // Update existing assignment
      assignment = assignmentData.assignments.find(a => a.id === assignmentId);
      if (!assignment) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Assignment not found' })
        };
      }
      
      assignment.assigned_to = assignedTo;
      assignment.assigned_at = new Date().toISOString();
      assignment.status = 'assigned';
      assignment.updated_at = new Date().toISOString();
      
    } else {
      // Create new assignment
      const { content: testCaseData } = await github.readFile('data/test-cases.json');
      const testCase = testCaseData.test_cases.find(tc => tc.id === testCaseId);
      
      if (!testCase) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Test case not found' })
        };
      }

      assignment = {
        id: `assign_${Date.now()}`,
        pr_id: prId,
        test_case_id: testCaseId,
        test_name: testCase.name,
        assigned_to: assignedTo,
        assigned_at: new Date().toISOString(),
        status: 'assigned',
        priority: priority || 'medium',
        estimated_duration: testCase.expected_duration || 2000,
        actual_duration: null,
        started_at: null,
        completed_at: null,
        due_date: dueDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Default: 24h from now
        progress: 0,
        environment: 'staging',
        browser: 'Chrome',
        progress_updates: [],
        requirements: requirements || [],
        dependencies: [],
        notes: `Assigned by ${user.display_name || user.username}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      assignmentData.assignments.push(assignment);
    }

    // Update assignment statistics
    assignmentData.assignment_statistics = {
      total_assignments: assignmentData.assignments.length,
      unassigned: assignmentData.assignments.filter(a => a.status === 'unassigned').length,
      assigned: assignmentData.assignments.filter(a => a.status === 'assigned').length,
      in_progress: assignmentData.assignments.filter(a => a.status === 'in_progress').length,
      completed: assignmentData.assignments.filter(a => a.status === 'completed').length,
      overdue: assignmentData.assignments.filter(a => 
        new Date(a.due_date) < new Date() && a.status !== 'completed'
      ).length,
      by_tester: assignmentData.assignments.reduce((acc, a) => {
        if (a.assigned_to) {
          acc[a.assigned_to] = (acc[a.assigned_to] || 0) + 1;
        } else {
          acc.unassigned = (acc.unassigned || 0) + 1;
        }
        return acc;
      }, {})
    };

    // Update metadata
    github.updateMetadata(assignmentData);

    // Save to GitHub
    const commitMessage = github.generateCommitMessage(
      'Test Assigned',
      `${assignment.test_name} to ${assignedUser.display_name}`,
      userId
    );

    await github.writeFile('data/test-assignments.json', assignmentData, commitMessage, sha);

    // Update user's current assignments count
    assignedUser.current_assignments = (assignedUser.current_assignments || 0) + 1;
    assignedUser.last_active = new Date().toISOString();
    
    const { sha: userSha } = await github.readFile('data/users.json');
    await github.writeFile('data/users.json', userData, `Updated ${assignedUser.display_name} assignment count`, userSha);

    // Log activity
    await github.logActivity(
      'test_assigned',
      'test_assigned', 
      user.display_name || user.username,
      {
        assignment_id: assignment.id,
        test_name: assignment.test_name,
        assigned_to: assignedUser.display_name,
        pr_id: prId,
        priority: assignment.priority
      },
      `${user.display_name || user.username} assigned "${assignment.test_name}" to ${assignedUser.display_name}`
    );

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: `Test assigned to ${assignedUser.display_name} successfully`,
        data: assignment
      })
    };

  } catch (error) {
    console.error('Assign Test Error:', error);
    
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
};