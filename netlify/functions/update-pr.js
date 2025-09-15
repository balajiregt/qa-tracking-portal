import GitHubAPI from './utils/github.js';

export const handler = async (event, context) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id',
        'Access-Control-Allow-Methods': 'PUT, OPTIONS'
      }
    };
  }

  if (event.httpMethod !== 'PUT') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const github = new GitHubAPI();
    const requestData = JSON.parse(event.body);
    
    // Extract user info
    const userId = event.headers['x-user-id'] || requestData.userId || 'user_005';
    const user = await github.getCurrentUser(userId);
    
    // Validate permissions (same as PR creation)
    github.validateUserPermission(user, 'test_create');

    // Validate required fields
    const { id } = requestData;
    if (!id) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'PR ID is required' })
      };
    }

    // Read current PR data
    const { content: prData, sha } = await github.readFile('data/prs.json');
    
    // Find the PR to update
    const prIndex = prData.prs.findIndex(pr => pr.id === id);
    if (prIndex === -1) {
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'PR not found' })
      };
    }

    const existingPR = prData.prs[prIndex];
    
    // Update the PR with new data
    const updatedPR = {
      ...existingPR,
      ...requestData,
      id: existingPR.id, // Ensure ID doesn't change
      updated_at: new Date().toISOString(),
      updated_by: user.display_name || user.username
    };

    prData.prs[prIndex] = updatedPR;

    // Update metadata
    github.updateMetadata(prData);

    // Save to GitHub
    const commitMessage = github.generateCommitMessage(
      'PR Updated',
      `${updatedPR.name || updatedPR.title}: updated by ${user.display_name || user.username}`,
      userId
    );

    await github.writeFile('data/prs.json', prData, commitMessage, sha);

    // Log activity
    await github.logActivity(
      'pr_updated',
      'pr_modified',
      user.display_name || user.username,
      {
        pr_id: id,
        pr_name: updatedPR.name || updatedPR.title,
        updated_fields: Object.keys(requestData).filter(key => !['id', 'userId'].includes(key)),
        developer: updatedPR.developer,
        priority: updatedPR.priority
      },
      `${user.display_name || user.username} updated PR: ${updatedPR.name || updatedPR.title}`
    );

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'PR updated successfully',
        data: updatedPR
      })
    };

  } catch (error) {
    console.error('Update PR Error:', error);
    
    return {
      statusCode: error.message.includes('Permission denied') ? 403 : 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      })
    };
  }
};