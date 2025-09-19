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
        body: JSON.stringify({ success: false, error: 'PR ID is required' })
      };
    }

    // Retry mechanism for handling GitHub API conflicts
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
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
            body: JSON.stringify({ success: false, error: 'PR not found' })
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

        // Log activity (don't retry on failure)
        try {
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
        } catch (activityError) {
          console.warn('Failed to log activity:', activityError.message);
        }

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

      } catch (retryableError) {
        retryCount++;
        console.warn(`Update PR attempt ${retryCount} failed:`, retryableError.message);
        
        if (retryCount >= maxRetries) {
          throw retryableError;
        }
        
        // Exponential backoff: wait 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      }
    }

  } catch (error) {
    console.error('Update PR Error:', error);
    
    // Determine error type for better client-side handling
    let statusCode = 500;
    let errorMessage = 'Internal server error';
    
    if (error.message.includes('Permission denied')) {
      statusCode = 403;
      errorMessage = 'Permission denied';
    } else if (error.message.includes('User not found')) {
      statusCode = 401;
      errorMessage = 'Authentication required';
    } else if (error.message.includes('File not found')) {
      statusCode = 404;
      errorMessage = 'Data file not found';
    } else if (error.message.includes('rate limit')) {
      statusCode = 429;
      errorMessage = 'Rate limit exceeded, please try again later';
    } else if (error.status === 409 || error.message.includes('conflict')) {
      statusCode = 409;
      errorMessage = 'Update conflict, please refresh and try again';
    } else {
      errorMessage = error.message || errorMessage;
    }
    
    return {
      statusCode: statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};