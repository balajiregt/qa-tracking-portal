// GitHub API utility functions
import { Octokit } from "@octokit/rest";

class GitHubAPI {
  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });
    this.owner = process.env.GITHUB_OWNER || 'balajiregt';
    this.repo = process.env.GITHUB_REPO || 'qa-tracking-portal';
    this.branch = process.env.GITHUB_BRANCH || 'main';
  }

  /**
   * Read a JSON file from the repository
   */
  async readFile(filePath) {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: filePath,
        ref: this.branch
      });

      if (response.data.type !== 'file') {
        throw new Error(`${filePath} is not a file`);
      }

      const content = Buffer.from(response.data.content, 'base64').toString('utf8');
      return {
        content: JSON.parse(content),
        sha: response.data.sha
      };
    } catch (error) {
      if (error.status === 404) {
        throw new Error(`File not found: ${filePath}`);
      }
      throw error;
    }
  }

  /**
   * Write/Update a JSON file in the repository
   */
  async writeFile(filePath, data, commitMessage, sha = null) {
    try {
      const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
      
      const params = {
        owner: this.owner,
        repo: this.repo,
        path: filePath,
        message: commitMessage,
        content: content,
        branch: this.branch
      };

      // Include SHA if updating existing file
      if (sha) {
        params.sha = sha;
      }

      const response = await this.octokit.rest.repos.createOrUpdateFileContents(params);
      return response.data;
    } catch (error) {
      console.error('GitHub API Error:', error);
      throw error;
    }
  }

  /**
   * Update metadata in JSON file
   */
  updateMetadata(data) {
    if (data.metadata) {
      data.metadata.lastUpdated = new Date().toISOString();
      if (data.metadata.totalCount !== undefined) {
        // Update count based on array length
        const mainArrayKey = Object.keys(data).find(key => 
          Array.isArray(data[key]) && key !== 'metadata'
        );
        if (mainArrayKey) {
          data.metadata.totalCount = data[mainArrayKey].length;
        }
      }
    }
    return data;
  }

  /**
   * Generate commit message with user context
   */
  generateCommitMessage(action, details, userId) {
    const timestamp = new Date().toISOString().split('T')[0];
    return `QA Portal: ${action} - ${details} (by ${userId}) [${timestamp}]`;
  }

  /**
   * Validate user permissions
   */
  validateUserPermission(user, requiredPermission) {
    if (!user || !user.role) {
      throw new Error('User authentication required');
    }

    // Get role permissions from user data
    const rolePermissions = {
      'qa_engineer': ['test_execute', 'test_assign', 'issue_report', 'trace_upload'],
      'senior_qa_engineer': ['test_execute', 'test_assign', 'issue_report', 'trace_upload', 'test_approve', 'team_manage'],
      'developer': ['pr_create', 'test_create', 'trace_upload'],
      'senior_developer': ['pr_create', 'test_create', 'trace_upload', 'test_assign'],
      'ui_developer': ['pr_create', 'test_create', 'trace_upload']
    };

    const userPermissions = rolePermissions[user.role] || [];
    
    if (!userPermissions.includes(requiredPermission)) {
      throw new Error(`Permission denied. Required: ${requiredPermission}`);
    }

    return true;
  }

  /**
   * Get current user from session
   */
  async getCurrentUser(userId) {
    try {
      const { content: users } = await this.readFile('data/users.json');
      const user = users.users.find(u => u.id === userId || u.username === userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      throw new Error('Failed to authenticate user');
    }
  }

  /**
   * Log activity
   */
  async logActivity(type, action, userId, details, message) {
    try {
      const { content: activityData, sha } = await this.readFile('data/activity.json');
      
      const newActivity = {
        id: `act_${Date.now()}`,
        type: type,
        action: action,
        user: userId,
        timestamp: new Date().toISOString(),
        details: details,
        message: message,
        icon: this.getActivityIcon(type, action)
      };

      activityData.activities.unshift(newActivity); // Add to beginning
      
      // Keep only last 100 activities
      if (activityData.activities.length > 100) {
        activityData.activities = activityData.activities.slice(0, 100);
      }

      this.updateMetadata(activityData);

      await this.writeFile(
        'data/activity.json',
        activityData,
        `Activity: ${message}`,
        sha
      );

      return newActivity;
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Don't throw - activity logging shouldn't break main functionality
    }
  }

  /**
   * Get appropriate icon for activity type
   */
  getActivityIcon(type, action) {
    const iconMap = {
      'pr_created': '➕',
      'pr_status_change': '🔄',
      'test_execution': '🧪',
      'test_passed': '✅',
      'test_failed': '❌',
      'test_assigned': '👥',
      'trace_upload': '📎',
      'issue_reported': '⚠️',
      'issue_escalated': '🚨',
      'test_case_added': '📝',
      'merge_approved': '🚀'
    };

    return iconMap[action] || iconMap[type] || '📋';
  }

  /**
   * Fetch PRs from GitHub repository
   */
  async fetchGitHubPRs(state = 'all', per_page = 100) {
    try {
      const response = await this.octokit.rest.pulls.list({
        owner: this.owner,
        repo: this.repo,
        state: state, // 'open', 'closed', 'all'
        per_page: per_page,
        sort: 'updated',
        direction: 'desc'
      });

      return response.data;
    } catch (error) {
      console.error('GitHub PR Fetch Error:', error);
      throw error;
    }
  }

  /**
   * Get detailed PR information including commits and checks
   */
  async fetchPRDetails(prNumber) {
    try {
      const [prData, commits, checks] = await Promise.all([
        this.octokit.rest.pulls.get({
          owner: this.owner,
          repo: this.repo,
          pull_number: prNumber
        }),
        this.octokit.rest.pulls.listCommits({
          owner: this.owner,
          repo: this.repo,
          pull_number: prNumber
        }),
        this.octokit.rest.checks.listForRef({
          owner: this.owner,
          repo: this.repo,
          ref: `refs/pull/${prNumber}/head`
        }).catch(() => ({ data: { check_runs: [] } })) // Handle case where checks don't exist
      ]);

      return {
        pr: prData.data,
        commits: commits.data,
        checks: checks.data.check_runs
      };
    } catch (error) {
      console.error('GitHub PR Details Fetch Error:', error);
      throw error;
    }
  }

  /**
   * Convert GitHub PR to portal PR format
   */
  convertGitHubPRToPortalFormat(githubPR, existingPortalPR = null) {
    // Map GitHub PR state to portal status
    const mapGitHubStateToPortalStatus = (githubPR) => {
      if (githubPR.merged) return 'fully-merged';
      if (githubPR.state === 'closed') return 'closed';
      if (githubPR.draft) return 'new';
      
      // Check if PR is mergeable
      if (githubPR.mergeable === false) return 'blocked';
      if (githubPR.mergeable_state === 'blocked') return 'blocked';
      if (githubPR.mergeable_state === 'behind') return 'testing';
      if (githubPR.mergeable_state === 'clean') return 'ready';
      
      return 'testing'; // Default status
    };

    // Create portal PR object
    const portalPR = {
      id: existingPortalPR?.id || `gh_pr_${githubPR.number}`,
      github_id: githubPR.id,
      github_number: githubPR.number,
      name: githubPR.title,
      description: githubPR.body || '',
      developer: githubPR.user.login,
      assignees: githubPR.assignees.map(assignee => assignee.login),
      reviewers: githubPR.requested_reviewers.map(reviewer => reviewer.login),
      
      // Status mapping
      status: existingPortalPR?.status || mapGitHubStateToPortalStatus(githubPR),
      github_state: githubPR.state,
      merged: githubPR.merged,
      mergeable: githubPR.mergeable,
      mergeable_state: githubPR.mergeable_state,
      
      // Branch information
      source_branch: githubPR.head.ref,
      target_branch: githubPR.base.ref,
      
      // Priority mapping (try to extract from labels or use default)
      priority: this.extractPriorityFromLabels(githubPR.labels) || 'medium',
      
      // Environment mapping (try to extract from labels or branch name)
      environment: this.extractEnvironmentFromPR(githubPR) || 'staging',
      
      // Timestamps
      created_at: githubPR.created_at,
      updated_at: githubPR.updated_at,
      closed_at: githubPR.closed_at,
      merged_at: githubPR.merged_at,
      
      // GitHub URLs
      github_url: githubPR.html_url,
      github_api_url: githubPR.url,
      
      // Branch comparison (will be populated by separate call if needed)
      branch_comparison: existingPortalPR?.branch_comparison || {
        feature_branch: {
          name: githubPR.head.ref,
          tests_passed: 0,
          tests_failed: 0,
          tests_skipped: 0
        },
        main_branch: {
          name: githubPR.base.ref,
          tests_passed: 0,
          tests_failed: 0
        }
      },
      
      // Portal-specific fields (preserve from existing or set defaults)
      associatedTestCases: existingPortalPR?.associatedTestCases || [],
      assigned_testers: existingPortalPR?.assigned_testers || [],
      test_results: existingPortalPR?.test_results || [],
      qaTestsMergedAt: existingPortalPR?.qaTestsMergedAt || null,
      devPRMergedAt: existingPortalPR?.devPRMergedAt || null,
      blocked_reason: existingPortalPR?.blocked_reason || null,
      
      // Merge readiness
      merge_readiness: existingPortalPR?.merge_readiness || {
        ready_for_merge: githubPR.mergeable === true,
        merge_requirements_met: [],
        merge_blockers: githubPR.mergeable === false ? ['GitHub merge conflicts'] : [],
        approved_by: [],
        qa_approval_date: null,
        merge_requested_at: null,
        can_proceed_to_merge: githubPR.mergeable === true
      },
      
      // GitHub-specific metadata
      github_metadata: {
        additions: githubPR.additions,
        deletions: githubPR.deletions,
        changed_files: githubPR.changed_files,
        commits: githubPR.commits,
        labels: githubPR.labels,
        milestone: githubPR.milestone
      }
    };

    return portalPR;
  }

  /**
   * Extract priority from GitHub PR labels
   */
  extractPriorityFromLabels(labels) {
    const priorityLabels = {
      'priority: urgent': 'urgent',
      'priority: high': 'high', 
      'priority: medium': 'medium',
      'priority: low': 'low',
      'urgent': 'urgent',
      'high priority': 'high',
      'low priority': 'low'
    };

    for (const label of labels) {
      const labelName = label.name.toLowerCase();
      if (priorityLabels[labelName]) {
        return priorityLabels[labelName];
      }
    }

    return null;
  }

  /**
   * Extract environment from GitHub PR labels or branch name
   */
  extractEnvironmentFromPR(githubPR) {
    // Check labels first
    const envLabels = {
      'env: staging': 'staging',
      'env: production': 'production', 
      'env: qa': 'qa',
      'staging': 'staging',
      'production': 'production',
      'qa': 'qa'
    };

    for (const label of githubPR.labels) {
      const labelName = label.name.toLowerCase();
      if (envLabels[labelName]) {
        return envLabels[labelName];
      }
    }

    // Check branch name patterns
    const branchName = githubPR.head.ref.toLowerCase();
    if (branchName.includes('prod')) return 'production';
    if (branchName.includes('staging')) return 'staging';
    if (branchName.includes('qa')) return 'qa';

    return null;
  }
}

export default GitHubAPI;