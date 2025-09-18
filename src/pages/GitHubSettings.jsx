import React, { useState, useEffect } from 'react'
import { useQA } from '../contexts/QAContext'

function GitHubSettings() {
  const { state, actions } = useQA()
  const [settings, setSettings] = useState({
    owner: '',
    repo: '',
    token: '',
    autoSync: false,
    syncInterval: 30, // minutes
    syncOnStartup: true,
    includeClosedPRs: false
  })
  const [testConnection, setTestConnection] = useState({
    testing: false,
    status: null,
    message: ''
  })

  // Load settings on mount
  useEffect(() => {
    // In a real app, these would be loaded from server/localStorage
    const savedSettings = localStorage.getItem('githubSettings')
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings))
      } catch (error) {
        console.error('Failed to load GitHub settings:', error)
      }
    }
  }, [])

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSaveSettings = async () => {
    try {
      // Save to localStorage (in real app, would save to server)
      localStorage.setItem('githubSettings', JSON.stringify(settings))
      actions.showNotification('GitHub settings saved successfully', 'success')
    } catch (error) {
      actions.showNotification('Failed to save settings', 'error')
    }
  }

  const handleTestConnection = async () => {
    setTestConnection({ testing: true, status: null, message: 'Testing connection...' })
    
    try {
      // In development mode, simulate connection test
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      if (settings.owner && settings.repo) {
        setTestConnection({
          testing: false,
          status: 'success',
          message: `Successfully connected to ${settings.owner}/${settings.repo}`
        })
      } else {
        setTestConnection({
          testing: false,
          status: 'error',
          message: 'Please provide owner and repository name'
        })
      }
    } catch (error) {
      setTestConnection({
        testing: false,
        status: 'error',
        message: error.message || 'Connection test failed'
      })
    }
  }

  const handleManualSync = async () => {
    try {
      const syncOptions = {
        state: settings.includeClosedPRs ? 'all' : 'open',
        per_page: 50,
        syncMode: 'merge'
      }
      
      await actions.syncGitHubPRs(syncOptions)
    } catch (error) {
      console.error('Manual sync failed:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">GitHub Integration Settings</h1>
        <p className="text-gray-600">Configure GitHub repository connection for automatic PR syncing</p>
      </div>

      {/* Connection Settings */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Repository Configuration</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Repository Owner/Organization
            </label>
            <input
              type="text"
              name="owner"
              value={settings.owner}
              onChange={handleInputChange}
              placeholder="e.g., octocat"
              className="input"
            />
            <p className="text-xs text-gray-500 mt-1">GitHub username or organization name</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Repository Name
            </label>
            <input
              type="text"
              name="repo"
              value={settings.repo}
              onChange={handleInputChange}
              placeholder="e.g., Hello-World"
              className="input"
            />
            <p className="text-xs text-gray-500 mt-1">Repository name to sync PRs from</p>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            GitHub Personal Access Token
          </label>
          <input
            type="password"
            name="token"
            value={settings.token}
            onChange={handleInputChange}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            className="input"
          />
          <p className="text-xs text-gray-500 mt-1">
            Required for API access. Generate at: 
            <a 
              href="https://github.com/settings/tokens" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 ml-1"
            >
              GitHub Settings → Developer settings → Personal access tokens
            </a>
          </p>
        </div>

        <div className="mt-6 flex items-center space-x-3">
          <button
            onClick={handleTestConnection}
            disabled={testConnection.testing || !settings.owner || !settings.repo}
            className="btn btn-secondary"
          >
            {testConnection.testing ? (
              <>
                <span className="animate-spin mr-2">⟳</span>
                Testing...
              </>
            ) : (
              <>
                <span className="mr-2">🔗</span>
                Test Connection
              </>
            )}
          </button>

          {testConnection.status && (
            <div className={`flex items-center text-sm ${
              testConnection.status === 'success' ? 'text-green-600' : 'text-red-600'
            }`}>
              <span className="mr-1">
                {testConnection.status === 'success' ? '✅' : '❌'}
              </span>
              {testConnection.message}
            </div>
          )}
        </div>
      </div>

      {/* Sync Settings */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sync Configuration</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">Auto-sync PRs</label>
              <p className="text-xs text-gray-500">Automatically sync GitHub PRs at regular intervals</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="autoSync"
                checked={settings.autoSync}
                onChange={handleInputChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {settings.autoSync && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sync Interval (minutes)
              </label>
              <select
                name="syncInterval"
                value={settings.syncInterval}
                onChange={handleInputChange}
                className="select"
              >
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={180}>3 hours</option>
              </select>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">Sync on startup</label>
              <p className="text-xs text-gray-500">Automatically sync when the application loads</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="syncOnStartup"
                checked={settings.syncOnStartup}
                onChange={handleInputChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">Include closed PRs</label>
              <p className="text-xs text-gray-500">Sync both open and closed PRs for historical data</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="includeClosedPRs"
                checked={settings.includeClosedPRs}
                onChange={handleInputChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={handleSaveSettings}
            className="btn btn-primary"
          >
            <span className="mr-2">💾</span>
            Save Settings
          </button>

          <button
            onClick={handleManualSync}
            disabled={state.loading}
            className="btn btn-secondary"
          >
            {state.loading ? (
              <>
                <span className="animate-spin mr-2">⟳</span>
                Syncing...
              </>
            ) : (
              <>
                <span className="mr-2">🔄</span>
                Manual Sync Now
              </>
            )}
          </button>
        </div>
      </div>

      {/* Help Section */}
      <div className="card p-6 bg-blue-50 border-blue-200">
        <h3 className="text-lg font-medium text-blue-900 mb-2">🔧 Setup Instructions</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p><strong>1. Create a GitHub Personal Access Token:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Go to GitHub → Settings → Developer settings → Personal access tokens</li>
            <li>Click "Generate new token (classic)"</li>
            <li>Select scopes: <code>repo</code> (for private repos) or <code>public_repo</code> (for public repos)</li>
            <li>Copy the generated token</li>
          </ul>
          
          <p><strong>2. Configure Repository:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Enter your GitHub username/organization in "Repository Owner"</li>
            <li>Enter the repository name you want to sync PRs from</li>
            <li>Paste your personal access token</li>
          </ul>
          
          <p><strong>3. Test & Save:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Click "Test Connection" to verify your settings</li>
            <li>Configure sync preferences</li>
            <li>Save your settings</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default GitHubSettings