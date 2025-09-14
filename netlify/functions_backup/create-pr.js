const GitHubAPI = require('./utils/github');

exports.handler = async (event, context) => {
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
    
    // Extract user info from headers or request
    const userId = event.headers['x-user-id'] || requestData.userId || 'user_001'; // Default for demo
    const user = await github.getCurrentUser(userId);
    
    // Validate permissions
    github.validateUserPermission(user, 'pr_create');

    // Validate required fields
    const { name, developer, description, priority, environment } = requestData;
    if (!name || !developer) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'PR name and developer are required' })
      };
    }

    // Read current PRs
    const { content: prData, sha } = await github.readFile('data/prs.json');
    
    // Create new PR object
    const newPR = {
      id: `pr_${Date.now()}`,
      name: name,
      developer: developer,
      description: description || '',
      priority: priority || 'medium',
      environment: environment || 'staging',
      status: 'new',
      progress: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: userId,
      branch_comparison: {
        feature_branch: {
          name: name,
          tests_passed: 0,
          tests_failed: 0,
          tests_skipped: 0
        },
        main_branch: {
          name: 'main',
          tests_passed: 0,
          tests_failed: 0
        }
      },
      assigned_testers: [],
      test_results: [],
      merge_readiness: {
        ready_for_merge: false,
        merge_requirements_met: [],
        merge_blockers: ['No tests executed', 'No QA approval'],
        approved_by: [],
        qa_approval_date: null,
        merge_requested_at: null,
        can_proceed_to_merge: false
      }
    };

    // Add to PRs array
    prData.prs.push(newPR);
    
    // Update metadata
    github.updateMetadata(prData);

    // Save to GitHub
    const commitMessage = github.generateCommitMessage(
      'PR Created',
      `${name} by ${developer}`,
      userId
    );

    await github.writeFile('data/prs.json', prData, commitMessage, sha);

    // Log activity
    await github.logActivity(
      'pr_created',
      'pr_added', 
      user.display_name || user.username,
      {
        pr_id: newPR.id,
        pr_name: name,
        developer: developer,
        priority: priority,
        environment: environment
      },
      `${user.display_name || user.username} created new PR: ${name}`
    );

    return {
      statusCode: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'PR created successfully',
        data: newPR
      })
    };

  } catch (error) {
    console.error('Create PR Error:', error);
    
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