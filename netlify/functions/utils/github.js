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
}

export default GitHubAPI;