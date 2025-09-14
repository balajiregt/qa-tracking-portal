// API Client for QA Tracking Portal
class APIClient {
  constructor() {
    this.baseURL = window.location.hostname === 'localhost' 
      ? 'http://localhost:8888/.netlify/functions'
      : '/.netlify/functions';
    this.currentUserId = 'user_001'; // Default user, will be managed by session
  }

  // Generic API request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': this.currentUserId,
        ...options.headers
      },
      ...options
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Data retrieval methods
  async getData(dataType, userId = null) {
    const params = new URLSearchParams({ dataType });
    if (userId) params.append('userId', userId);
    
    return this.request(`/get-data?${params.toString()}`, {
      method: 'GET'
    });
  }

  async getPRs() {
    const response = await this.getData('prs');
    return response.data?.prs || [];
  }

  async getTestCases() {
    const response = await this.getData('test-cases');
    return response.data?.test_cases || [];
  }

  async getTestAssignments() {
    const response = await this.getData('test-assignments');
    return response.data?.assignments || [];
  }

  async getUsers() {
    const response = await this.getData('users', this.currentUserId);
    return response.data?.users || [];
  }

  async getIssues() {
    const response = await this.getData('issues');
    return response.data?.issues || [];
  }

  async getActivity() {
    const response = await this.getData('activity');
    return response.data?.activities || [];
  }

  async getSettings() {
    const response = await this.getData('settings');
    return response.data || {};
  }

  // PR Management
  async createPR(prData) {
    return this.request('/create-pr', {
      method: 'POST',
      body: { ...prData, userId: this.currentUserId }
    });
  }

  async mergePR(prId, action, options = {}) {
    return this.request('/merge-pr', {
      method: 'PUT',
      body: { 
        prId, 
        action, 
        userId: this.currentUserId,
        ...options
      }
    });
  }

  // Test Case Management
  async addTestCase(testCaseData) {
    return this.request('/add-test-case', {
      method: 'POST',
      body: { ...testCaseData, userId: this.currentUserId }
    });
  }

  // Test Assignment Management
  async assignTest(assignmentData) {
    return this.request('/assign-test', {
      method: 'POST',
      body: { ...assignmentData, userId: this.currentUserId }
    });
  }

  async updateTestProgress(assignmentId, action, options = {}) {
    return this.request('/update-test-progress', {
      method: 'PUT',
      body: { 
        assignmentId, 
        action, 
        userId: this.currentUserId,
        ...options
      }
    });
  }

  // Issue Management
  async escalateIssue(issueId, escalationData) {
    return this.request('/escalate-issue', {
      method: 'PUT',
      body: { 
        issueId, 
        userId: this.currentUserId,
        ...escalationData
      }
    });
  }

  // File Upload
  async uploadTraces(prId, intent, tags, traceFiles, testResults = []) {
    return this.request('/upload-traces', {
      method: 'POST',
      body: { 
        prId, 
        intent, 
        tags, 
        traceFiles, 
        testResults,
        userId: this.currentUserId
      }
    });
  }

  // User session management
  setCurrentUser(userId) {
    this.currentUserId = userId;
    localStorage.setItem('qa_current_user', userId);
  }

  getCurrentUserId() {
    return this.currentUserId || localStorage.getItem('qa_current_user') || 'user_001';
  }

  async getCurrentUser() {
    const users = await this.getUsers();
    return users.find(u => u.id === this.currentUserId || u.username === this.currentUserId);
  }

  // Error handling helpers
  handleError(error, context = '') {
    console.error(`API Error ${context}:`, error);
    
    // Show user-friendly error messages
    const errorMessage = error.message || 'An unexpected error occurred';
    
    if (errorMessage.includes('Permission denied')) {
      this.showNotification('Permission Denied: You do not have access to perform this action', 'error');
    } else if (errorMessage.includes('not found')) {
      this.showNotification('Resource not found. Please refresh and try again.', 'error');
    } else if (errorMessage.includes('Network')) {
      this.showNotification('Network error. Please check your connection and try again.', 'error');
    } else {
      this.showNotification(`Error: ${errorMessage}`, 'error');
    }
    
    throw error;
  }

  // UI notification helper
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '15px 20px',
      borderRadius: '8px',
      color: 'white',
      fontSize: '14px',
      fontWeight: '600',
      zIndex: '10000',
      maxWidth: '400px',
      wordWrap: 'break-word',
      boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
      opacity: '0',
      transform: 'translateX(100%)',
      transition: 'all 0.3s ease'
    });

    // Set background color based on type
    const colors = {
      success: '#2ecc71',
      error: '#e74c3c',
      warning: '#f39c12',
      info: '#3498db'
    };
    notification.style.backgroundColor = colors[type] || colors.info;

    // Add to DOM
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    }, 100);

    // Remove after 5 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 5000);
  }

  // Data caching helpers
  clearCache() {
    const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith('qa_cache_'));
    cacheKeys.forEach(key => localStorage.removeItem(key));
  }

  setCachedData(key, data, ttl = 30000) { // 30 second default TTL
    const cacheItem = {
      data: data,
      timestamp: Date.now(),
      ttl: ttl
    };
    localStorage.setItem(`qa_cache_${key}`, JSON.stringify(cacheItem));
  }

  getCachedData(key) {
    try {
      const cached = localStorage.getItem(`qa_cache_${key}`);
      if (!cached) return null;

      const cacheItem = JSON.parse(cached);
      const now = Date.now();
      
      if (now - cacheItem.timestamp > cacheItem.ttl) {
        localStorage.removeItem(`qa_cache_${key}`);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.error('Cache error:', error);
      return null;
    }
  }

  // Batch operations for performance
  async batchDataLoad() {
    try {
      const [prs, testCases, assignments, users, issues, activity] = await Promise.all([
        this.getPRs().catch(() => []),
        this.getTestCases().catch(() => []),
        this.getTestAssignments().catch(() => []),
        this.getUsers().catch(() => []),
        this.getIssues().catch(() => []),
        this.getActivity().catch(() => [])
      ]);

      return {
        prs,
        testCases,
        assignments,
        users,
        issues,
        activity
      };
    } catch (error) {
      this.handleError(error, 'batch data load');
      return {};
    }
  }
}

// Create global API client instance
window.apiClient = new APIClient();

// Initialize current user from localStorage
const storedUserId = localStorage.getItem('qa_current_user');
if (storedUserId) {
  window.apiClient.setCurrentUser(storedUserId);
}