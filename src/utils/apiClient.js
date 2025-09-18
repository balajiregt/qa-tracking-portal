const API_BASE = '/.netlify/functions'

class APIClient {
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': 'user_005', // Default to mike_dev who has test_create permission
        ...options.headers,
      },
      ...options,
    }

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body)
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API Error (${response.status}): ${errorText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  async get(endpoint, params = {}) {
    const url = new URL(`${API_BASE}${endpoint}`, window.location.origin)
    Object.keys(params).forEach(key => 
      url.searchParams.append(key, params[key])
    )
    
    // Don't call this.request as it would double up the API_BASE
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': 'user_005', // Default to mike_dev who has test_create permission
      },
    }

    try {
      const response = await fetch(url.toString(), config)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API Error (${response.status}): ${errorText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: data,
    })
  }

  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data,
    })
  }

  async delete(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'DELETE',
      body: data,
    })
  }

  // Development mode fallback using localStorage
  isDevelopment() {
    return window.location.hostname === 'localhost'
  }

  getLocalData(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]')
    } catch {
      return []
    }
  }

  setLocalData(key, data) {
    localStorage.setItem(key, JSON.stringify(data))
  }

  // Specific API methods matching the existing serverless functions
  async getAllTestCases() {
    if (this.isDevelopment()) {
      return { data: this.getLocalData('testCases') }
    }
    try {
      const result = await this.get('/get-data', { dataType: 'test-cases' })
      console.log('getAllTestCases result:', result)
      return { data: result.data?.test_cases || [] }
    } catch (error) {
      console.error('getAllTestCases error:', error)
      return { data: [] }
    }
  }

  async addTestCase(testCase) {
    if (this.isDevelopment()) {
      const testCases = this.getLocalData('testCases')
      const newTestCase = {
        ...testCase,
        id: Date.now().toString(),
        timestamp: new Date().toISOString()
      }
      testCases.push(newTestCase)
      this.setLocalData('testCases', testCases)
      return { data: newTestCase }
    }
    // Include userId in the request body for backend validation
    return this.post('/add-test-case', { ...testCase, userId: 'user_005' })
  }

  async updateTestCase(testId, updates) {
    if (this.isDevelopment()) {
      const testCases = this.getLocalData('testCases')
      const index = testCases.findIndex(tc => tc.id === testId)
      if (index !== -1) {
        testCases[index] = { ...testCases[index], ...updates }
        this.setLocalData('testCases', testCases)
        return { data: testCases[index] }
      }
      throw new Error('Test case not found')
    }
    return this.put('/update-test-case', { testId, ...updates })
  }

  async deleteTestCase(testId) {
    if (this.isDevelopment()) {
      const testCases = this.getLocalData('testCases')
      const filteredTestCases = testCases.filter(tc => tc.id !== testId)
      this.setLocalData('testCases', filteredTestCases)
      return { success: true }
    }
    return this.delete('/delete-test-case', { testId })
  }

  async getAllPRs() {
    if (this.isDevelopment()) {
      return { data: this.getLocalData('prs') }
    }
    try {
      const result = await this.get('/get-data', { dataType: 'prs' })
      console.log('getAllPRs result:', result)
      return { data: result.data?.prs || [] }
    } catch (error) {
      console.error('getAllPRs error:', error)
      return { data: [] }
    }
  }

  async createPR(prData) {
    if (this.isDevelopment()) {
      const prs = this.getLocalData('prs')
      const newPR = {
        ...prData,
        id: `pr_${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      prs.push(newPR)
      this.setLocalData('prs', prs)
      return { data: newPR }
    }
    // Include userId in the request body for backend validation
    return this.post('/create-pr', { ...prData, userId: 'user_005' })
  }

  async updatePR(prData) {
    if (this.isDevelopment()) {
      const prs = this.getLocalData('prs')
      const index = prs.findIndex(pr => pr.id === prData.id)
      if (index !== -1) {
        prs[index] = { ...prs[index], ...prData, updated_at: new Date().toISOString() }
        this.setLocalData('prs', prs)
        return { data: prs[index] }
      }
      throw new Error('PR not found')
    }
    // Include userId in the request body for backend validation
    return this.put('/update-pr', { ...prData, userId: 'user_005' })
  }

  async uploadTraces(traceData) {
    if (this.isDevelopment()) {
      // Simulate trace upload processing
      const { prId, intent, tags, traceFiles, notes } = traceData
      
      // Create simulated extracted test cases
      const extractedTestCases = traceFiles.map((file, index) => ({
        id: `tc_${Date.now()}_${index}`,
        intent: `Test extracted from ${file.name}`,
        tags: tags.join(', '),
        source: 'Trace Extraction',
        details: `Auto-extracted test case from trace: ${file.name}`,
        testSteps: `Steps extracted from trace analysis`,
        expectedResults: `Expected results based on ${intent} testing`,
        result: 'Pending',
        localResult: 'Pending',
        mainResult: 'Pending',
        timestamp: new Date().toISOString(),
        extractedFrom: file.name,
        intent: intent,
        notes: notes
      }))

      // Add to local storage
      const testCases = this.getLocalData('testCases')
      testCases.push(...extractedTestCases)
      this.setLocalData('testCases', testCases)

      // Update PR with trace upload info
      const prs = this.getLocalData('prs')
      const prIndex = prs.findIndex(pr => pr.id === prId)
      if (prIndex !== -1) {
        if (!prs[prIndex].traceUploads) prs[prIndex].traceUploads = []
        prs[prIndex].traceUploads.push({
          uploadedAt: new Date().toISOString(),
          intent: intent,
          tags: tags,
          filesCount: traceFiles.length,
          extractedTestCases: extractedTestCases.length
        })
        this.setLocalData('prs', prs)
      }

      return {
        success: true,
        data: {
          extracted_test_cases: extractedTestCases,
          test_results_summary: {
            total: extractedTestCases.length,
            passed: 0,
            failed: 0,
            pending: extractedTestCases.length
          }
        }
      }
    }
    // Include userId in the request body for backend validation
    return this.post('/upload-traces', { ...traceData, userId: 'user_005' })
  }

  async getActivities() {
    try {
      const result = await this.get('/get-data', { dataType: 'activity' })
      console.log('getActivities result:', result)
      return { data: result.data?.activities || [] }
    } catch (error) {
      console.error('getActivities error:', error)
      return { data: [] }
    }
  }

  async getAnalytics(timeRange = 30) {
    return this.get('/analytics', { timeRange })
  }

  async getSettings() {
    return this.get('/settings')
  }

  async updateSettings(settings) {
    return this.put('/settings', settings)
  }

  async getCurrentUser() {
    // Mock current user for now - can be enhanced with authentication
    return {
      id: 'current-user',
      name: 'QA Team Member',
      email: 'qa@company.com',
      role: 'qa_engineer'
    }
  }

  async batchDataLoad() {
    try {
      if (this.isDevelopment()) {
        return {
          testCases: this.getLocalData('testCases'),
          prs: this.getLocalData('prs'),
          activities: this.getLocalData('activities'),
          users: [],
          assignments: [],
          issues: []
        }
      }

      const [testCases, prs, activities] = await Promise.all([
        this.getAllTestCases().catch(() => ({ data: [] })),
        this.getAllPRs().catch(() => ({ data: [] })),
        this.getActivities().catch(() => ({ data: [] }))
      ])

      return {
        testCases: testCases.data || testCases,
        prs: prs.data || prs,
        activities: activities.data || activities,
        users: [], // Can be populated when user management is added
        assignments: [], // Can be populated when assignment system is added
        issues: [] // Can be populated when issue tracking is added
      }
    } catch (error) {
      console.error('Batch data load failed:', error)
      throw new Error('Failed to load application data')
    }
  }

  async syncGitHubPRs(options = {}) {
    const {
      state = 'open', // 'open', 'closed', 'all'
      per_page = 50,
      syncMode = 'merge', // 'merge' or 'replace'
      userId = 'user_005'
    } = options;

    if (this.isDevelopment()) {
      // For development, simulate GitHub sync by generating some mock PRs
      const prs = this.getLocalData('prs');
      const mockGitHubPRs = [
        {
          id: `gh_pr_${Date.now()}_1`,
          github_id: Date.now() + 1,
          github_number: 123,
          name: 'Add user authentication system',
          description: 'Implement JWT-based authentication with login/logout functionality',
          developer: 'john_doe',
          status: 'ready',
          priority: 'high',
          environment: 'staging',
          source_branch: 'feature/auth-system',
          target_branch: 'main',
          created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          updated_at: new Date().toISOString(),
          github_url: 'https://github.com/example/repo/pull/123',
          associatedTestCases: [],
          github_metadata: {
            additions: 245,
            deletions: 12,
            changed_files: 8,
            commits: 5,
            labels: [{ name: 'priority: high' }, { name: 'feature' }]
          }
        },
        {
          id: `gh_pr_${Date.now()}_2`,
          github_id: Date.now() + 2,
          github_number: 124,
          name: 'Fix responsive layout issues',
          description: 'Resolve mobile layout problems in dashboard components',
          developer: 'jane_smith',
          status: 'testing',
          priority: 'medium',
          environment: 'qa',
          source_branch: 'bugfix/responsive-layout',
          target_branch: 'main',
          created_at: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
          updated_at: new Date().toISOString(),
          github_url: 'https://github.com/example/repo/pull/124',
          associatedTestCases: [],
          github_metadata: {
            additions: 67,
            deletions: 23,
            changed_files: 4,
            commits: 2,
            labels: [{ name: 'bugfix' }, { name: 'priority: medium' }]
          }
        }
      ];

      // Add mock PRs to existing PRs if they don't already exist
      const existingGitHubNumbers = new Set(prs.filter(pr => pr.github_number).map(pr => pr.github_number));
      const newPRs = mockGitHubPRs.filter(pr => !existingGitHubNumbers.has(pr.github_number));
      
      if (newPRs.length > 0) {
        prs.push(...newPRs);
        this.setLocalData('prs', prs);
      }

      return {
        success: true,
        data: {
          sync_results: {
            added: newPRs.length,
            updated: 0,
            skipped: mockGitHubPRs.length - newPRs.length,
            errors: []
          },
          total_prs: prs.length,
          github_prs_fetched: mockGitHubPRs.length
        }
      };
    }

    // For production, call the actual sync endpoint
    return this.post('/sync-github-prs', {
      state,
      per_page,
      syncMode,
      userId
    });
  }
}

export const apiClient = new APIClient()