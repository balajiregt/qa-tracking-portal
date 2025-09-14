import GitHubAPI from './utils/github.js';

export const handler = async (event, context) => {
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
    
    // Validate permissions - only senior roles can merge
    github.validateUserPermission(user, 'pr_merge');

    // Validate required fields
    const { prId, action, approvalComments, mergeStrategy } = requestData;
    
    if (!prId || !action) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'prId and action are required' })
      };
    }

    if (!['approve', 'merge', 'reject'].includes(action)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid action. Must be: approve, merge, or reject' })
      };
    }

    // Read current PRs
    const { content: prData, sha } = await github.readFile('data/prs.json');
    
    const pr = prData.prs.find(p => p.id === prId);
    if (!pr) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'PR not found' })
      };
    }

    let statusMessage = '';
    let activityType = '';
    let newStatus = pr.status;

    // Handle different actions
    switch (action) {
      case 'approve':
        // Add approval
        if (!pr.merge_readiness.approved_by.includes(user.username)) {
          pr.merge_readiness.approved_by.push(user.username);
          pr.merge_readiness.qa_approval_date = new Date().toISOString();
        }
        
        // Update merge requirements
        const passedTests = pr.branch_comparison.feature_branch.tests_passed > 0;
        const noFailedTests = pr.branch_comparison.feature_branch.tests_failed === 0;
        const hasApproval = pr.merge_readiness.approved_by.length > 0;
        
        pr.merge_readiness.merge_requirements_met = [];
        pr.merge_readiness.merge_blockers = [];
        
        if (passedTests) {
          pr.merge_readiness.merge_requirements_met.push('Tests passing');
        } else {
          pr.merge_readiness.merge_blockers.push('No tests executed');
        }
        
        if (noFailedTests) {
          pr.merge_readiness.merge_requirements_met.push('No failing tests');
        } else {
          pr.merge_readiness.merge_blockers.push('Tests failing');
        }
        
        if (hasApproval) {
          pr.merge_readiness.merge_requirements_met.push('QA approval');
        } else {
          pr.merge_readiness.merge_blockers.push('No QA approval');
        }
        
        // Check if ready for merge
        pr.merge_readiness.ready_for_merge = passedTests && noFailedTests && hasApproval;
        pr.merge_readiness.can_proceed_to_merge = pr.merge_readiness.ready_for_merge;
        
        if (pr.merge_readiness.ready_for_merge) {
          newStatus = 'ready';
        }
        
        statusMessage = `PR approved by ${user.display_name || user.username}`;
        activityType = 'pr_approved';
        break;
        
      case 'merge':
        // Check if PR is ready for merge
        if (!pr.merge_readiness.ready_for_merge) {
          return {
            statusCode: 400,
            body: JSON.stringify({ 
              error: 'PR is not ready for merge',
              blockers: pr.merge_readiness.merge_blockers
            })
          };
        }
        
        // Update PR status
        newStatus = 'merged';
        pr.merged_at = new Date().toISOString();
        pr.merged_by = user.display_name || user.username;
        pr.merge_strategy = mergeStrategy || 'merge';
        pr.progress = 100;
        
        // Update merge readiness
        pr.merge_readiness.merge_requested_at = new Date().toISOString();
        pr.merge_readiness.can_proceed_to_merge = false; // No longer applicable
        
        statusMessage = `PR merged by ${user.display_name || user.username}`;
        activityType = 'pr_merged';
        break;
        
      case 'reject':
        newStatus = 'testing';
        pr.merge_readiness.approved_by = pr.merge_readiness.approved_by.filter(approver => approver !== user.username);
        pr.merge_readiness.qa_approval_date = null;
        pr.merge_readiness.ready_for_merge = false;
        pr.merge_readiness.can_proceed_to_merge = false;
        pr.merge_readiness.merge_blockers.push(`Rejected by ${user.display_name || user.username}`);
        
        statusMessage = `PR rejected by ${user.display_name || user.username}`;
        activityType = 'pr_rejected';
        break;
    }

    // Update PR
    pr.status = newStatus;
    pr.updated_at = new Date().toISOString();

    // Update metadata
    github.updateMetadata(prData);

    // Save to GitHub
    const commitMessage = github.generateCommitMessage(
      `PR ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      `${pr.name}: ${statusMessage}`,
      userId
    );

    await github.writeFile('data/prs.json', prData, commitMessage, sha);

    // If merged, update test assignments to completed
    if (action === 'merge') {
      try {
        const { content: assignmentData, sha: assignmentSha } = await github.readFile('data/test-assignments.json');
        
        // Mark all assignments for this PR as completed
        assignmentData.assignments.forEach(assignment => {
          if (assignment.pr_id === prId && assignment.status !== 'completed') {
            assignment.status = 'completed';
            assignment.completed_at = new Date().toISOString();
            assignment.progress = 100;
          }
        });
        
        // Recalculate statistics
        assignmentData.assignment_statistics = this.calculateAssignmentStats(assignmentData.assignments);
        github.updateMetadata(assignmentData);
        
        await github.writeFile('data/test-assignments.json', assignmentData, 
          `Auto-completed assignments for merged PR: ${pr.name}`, assignmentSha);
          
      } catch (error) {
        console.error('Failed to update assignments after merge:', error);
      }
    }

    // Log activity
    await github.logActivity(
      'pr_management',
      activityType,
      user.display_name || user.username,
      {
        pr_id: prId,
        pr_name: pr.name,
        action: action,
        new_status: newStatus,
        ready_for_merge: pr.merge_readiness.ready_for_merge,
        approved_by: pr.merge_readiness.approved_by,
        merge_strategy: mergeStrategy || 'merge',
        approval_comments: approvalComments
      },
      `${statusMessage}${approvalComments ? `: ${approvalComments}` : ''}`
    );

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: statusMessage,
        data: {
          pr: pr,
          action: action,
          merge_status: {
            ready_for_merge: pr.merge_readiness.ready_for_merge,
            requirements_met: pr.merge_readiness.merge_requirements_met,
            blockers: pr.merge_readiness.merge_blockers
          }
        }
      })
    };

  } catch (error) {
    console.error('Merge PR Error:', error);
    
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