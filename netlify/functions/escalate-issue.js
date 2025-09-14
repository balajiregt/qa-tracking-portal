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
    github.validateUserPermission(user, 'issue_escalate');

    // Validate required fields
    const { issueId, escalationReason, escalationLevel, assignTo, severity } = requestData;
    
    if (!issueId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'issueId is required' })
      };
    }

    // Read current issues
    const { content: issuesData, sha } = await github.readFile('data/issues.json');
    
    const issue = issuesData.issues.find(i => i.id === issueId);
    if (!issue) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Issue not found' })
      };
    }

    // Create escalation update
    const escalationUpdate = {
      id: `escalation_${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: user.display_name || user.username,
      message: escalationReason || `Issue escalated to level ${escalationLevel || issue.escalation_level + 1}`,
      action: 'escalated',
      previous_level: issue.escalation_level,
      new_level: escalationLevel || issue.escalation_level + 1,
      previous_assignee: issue.assigned_to,
      new_assignee: assignTo || null
    };

    // Update issue
    issue.escalation_level = escalationLevel || issue.escalation_level + 1;
    issue.severity = severity || issue.severity;
    issue.assigned_to = assignTo || issue.assigned_to;
    issue.status = 'escalated';
    issue.escalated_at = new Date().toISOString();
    issue.escalated_by = user.display_name || user.username;
    issue.updated_at = new Date().toISOString();

    // Add escalation update to issue updates
    issue.updates = issue.updates || [];
    issue.updates.push(escalationUpdate);

    // Determine notification recipients based on escalation level
    let notificationRecipients = [];
    if (issue.escalation_level === 1) {
      notificationRecipients = ['senior_qa_engineer'];
    } else if (issue.escalation_level === 2) {
      notificationRecipients = ['admin', 'senior_qa_engineer'];
    } else if (issue.escalation_level >= 3) {
      notificationRecipients = ['admin', 'senior_qa_engineer', 'senior_developer'];
    }

    // Update metadata
    github.updateMetadata(issuesData);

    // Save to GitHub
    const commitMessage = github.generateCommitMessage(
      'Issue Escalated',
      `${issue.title}: Level ${issue.escalation_level}`,
      userId
    );

    await github.writeFile('data/issues.json', issuesData, commitMessage, sha);

    // Auto-assign to team lead if escalation level is high
    if (issue.escalation_level >= 2 && assignTo) {
      const { content: userData } = await github.readFile('data/users.json');
      const assignedUser = userData.users.find(u => u.username === assignTo || u.id === assignTo);
      
      if (assignedUser) {
        // Create notification/assignment in activity log
        await github.logActivity(
          'issue_assigned',
          'auto_assignment',
          user.display_name || user.username,
          {
            issue_id: issueId,
            issue_title: issue.title,
            assigned_to: assignedUser.display_name,
            escalation_level: issue.escalation_level,
            auto_assigned: true
          },
          `Issue auto-assigned to ${assignedUser.display_name} due to escalation level ${issue.escalation_level}`
        );
      }
    }

    // Log escalation activity
    await github.logActivity(
      'issue_escalated',
      `escalation_level_${issue.escalation_level}`,
      user.display_name || user.username,
      {
        issue_id: issueId,
        issue_title: issue.title,
        previous_level: escalationUpdate.previous_level,
        new_level: issue.escalation_level,
        severity: issue.severity,
        assigned_to: issue.assigned_to,
        notification_recipients: notificationRecipients
      },
      escalationUpdate.message
    );

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: `Issue escalated to level ${issue.escalation_level}`,
        data: {
          issue: issue,
          escalation_update: escalationUpdate,
          notification_recipients: notificationRecipients
        }
      })
    };

  } catch (error) {
    console.error('Escalate Issue Error:', error);
    
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