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
    const requestData = JSON.parse(event.body || '{}');
    
    // Extract parameters
    const { 
      userId = 'user_001', 
      state = 'open', // 'open', 'closed', 'all'
      per_page = 50,
      syncMode = 'merge' // 'merge' (preserve portal data) or 'replace' (overwrite with GitHub data)
    } = requestData;

    // Validate user permissions
    try {
      const user = await github.getCurrentUser(userId);
      github.validateUserPermission(user, 'pr_create'); // Need PR creation permission to sync
    } catch (error) {
      return {
        statusCode: 403,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          error: 'Permission denied. User must have PR creation permissions to sync GitHub data.'
        })
      };
    }

    // Fetch GitHub PRs
    console.log(`Fetching GitHub PRs (state: ${state}, per_page: ${per_page})`);
    const githubPRs = await github.fetchGitHubPRs(state, per_page);
    
    // Read existing portal PRs
    let prData;
    let sha;
    try {
      const result = await github.readFile('data/prs.json');
      prData = result.content;
      sha = result.sha;
    } catch (error) {
      // If file doesn't exist, create initial structure
      prData = {
        prs: [],
        metadata: {
          lastUpdated: new Date().toISOString(),
          totalCount: 0,
          lastGitHubSync: null
        }
      };
      sha = null;
    }

    // Create lookup map of existing portal PRs
    const existingPortalPRs = new Map();
    prData.prs.forEach(pr => {
      // Map by GitHub PR number if available, otherwise by portal ID
      const key = pr.github_number || pr.id;
      existingPortalPRs.set(key, pr);
    });

    // Process GitHub PRs
    const syncResults = {
      added: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    const syncedPRs = [];

    for (const githubPR of githubPRs) {
      try {
        const existingPortalPR = existingPortalPRs.get(githubPR.number) || 
                                existingPortalPRs.get(`gh_pr_${githubPR.number}`);

        if (existingPortalPR) {
          // Update existing PR
          const updatedPR = github.convertGitHubPRToPortalFormat(githubPR, existingPortalPR);
          
          // In merge mode, preserve portal-specific data; in replace mode, use GitHub data
          if (syncMode === 'merge') {
            // Preserve portal-specific fields that shouldn't be overwritten
            updatedPR.associatedTestCases = existingPortalPR.associatedTestCases || [];
            updatedPR.assigned_testers = existingPortalPR.assigned_testers || [];
            updatedPR.test_results = existingPortalPR.test_results || [];
            updatedPR.qaTestsMergedAt = existingPortalPR.qaTestsMergedAt;
            updatedPR.devPRMergedAt = existingPortalPR.devPRMergedAt;
            updatedPR.blocked_reason = existingPortalPR.blocked_reason;
            
            // Only update status if portal status is not in TDD workflow
            if (!['qa-tests-merged'].includes(existingPortalPR.status)) {
              updatedPR.status = existingPortalPR.status;
            }
          }
          
          syncedPRs.push(updatedPR);
          syncResults.updated++;
          
        } else {
          // Add new PR
          const newPR = github.convertGitHubPRToPortalFormat(githubPR);
          syncedPRs.push(newPR);
          syncResults.added++;
        }
        
      } catch (error) {
        console.error(`Error processing PR #${githubPR.number}:`, error);
        syncResults.errors.push({
          pr_number: githubPR.number,
          pr_title: githubPR.title,
          error: error.message
        });
      }
    }

    // Add portal PRs that weren't found in GitHub (if not in replace mode)
    if (syncMode === 'merge') {
      prData.prs.forEach(portalPR => {
        // Skip if this PR was already processed from GitHub
        const wasProcessed = syncedPRs.some(syncedPR => 
          syncedPR.id === portalPR.id || 
          (portalPR.github_number && syncedPR.github_number === portalPR.github_number)
        );
        
        if (!wasProcessed) {
          // This is a portal-only PR (not synced from GitHub)
          syncedPRs.push(portalPR);
          syncResults.skipped++;
        }
      });
    }

    // Update PR data
    prData.prs = syncedPRs;
    prData.metadata = {
      ...prData.metadata,
      lastUpdated: new Date().toISOString(),
      totalCount: syncedPRs.length,
      lastGitHubSync: new Date().toISOString(),
      syncResults: syncResults
    };

    // Save updated data
    const commitMessage = `GitHub PR Sync: ${syncResults.added} added, ${syncResults.updated} updated (${userId})`;
    await github.writeFile('data/prs.json', prData, commitMessage, sha);

    // Log activity
    await github.logActivity(
      'github_sync',
      'prs_synced',
      userId,
      {
        sync_results: syncResults,
        state: state,
        pr_count: githubPRs.length
      },
      `GitHub PRs synced: ${syncResults.added} added, ${syncResults.updated} updated`
    );

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'GitHub PRs synced successfully',
        data: {
          sync_results: syncResults,
          total_prs: syncedPRs.length,
          github_prs_fetched: githubPRs.length
        }
      })
    };

  } catch (error) {
    console.error('GitHub PR Sync Error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to sync GitHub PRs',
        details: error.stack
      })
    };
  }
};