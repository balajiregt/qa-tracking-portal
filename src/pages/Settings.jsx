import React, { useState, useEffect } from 'react'
import { useQA } from '../contexts/QAContext'

function Settings() {
  const { state, actions } = useQA()
  const [settings, setSettings] = useState({
    notifications: {
      emailAlerts: true,
      browserNotifications: false,
      testFailureAlerts: true,
      prStatusUpdates: true
    },
    testing: {
      defaultPriority: 'Medium',
      autoAssignReviewer: false,
      requireTestCasesForPR: true,
      enableAnalytics: true
    },
    integration: {
      githubRepo: '',
      slackWebhook: '',
      jiraProject: ''
    },
    appearance: {
      theme: 'light',
      compactView: false,
      showTestCaseDetails: true
    }
  })

  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    // Load settings from context when component mounts
    if (state.settings && Object.keys(state.settings).length > 0) {
      setSettings(state.settings)
    }
  }, [state.settings])

  const handleSettingChange = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    try {
      await actions.setSettings(settings)
      setHasChanges(false)
      actions.showNotification('Settings saved successfully', 'success')
    } catch (error) {
      console.error('Error saving settings:', error)
      actions.showNotification('Failed to save settings', 'error')
    }
  }

  const handleReset = () => {
    setSettings(state.settings || {
      notifications: {
        emailAlerts: true,
        browserNotifications: false,
        testFailureAlerts: true,
        prStatusUpdates: true
      },
      testing: {
        defaultPriority: 'Medium',
        autoAssignReviewer: false,
        requireTestCasesForPR: true,
        enableAnalytics: true
      },
      integration: {
        githubRepo: '',
        slackWebhook: '',
        jiraProject: ''
      },
      appearance: {
        theme: 'light',
        compactView: false,
        showTestCaseDetails: true
      }
    })
    setHasChanges(false)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Configure your QA tracking preferences</p>
        </div>
        
        {hasChanges && (
          <div className="flex space-x-2">
            <button
              onClick={handleReset}
              className="btn btn-secondary"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              className="btn btn-primary"
              disabled={state.loading}
            >
              {state.loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Notifications Settings */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Email Alerts</h3>
              <p className="text-sm text-gray-500">Receive email notifications for important events</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.notifications.emailAlerts}
                onChange={(e) => handleSettingChange('notifications', 'emailAlerts', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Browser Notifications</h3>
              <p className="text-sm text-gray-500">Show desktop notifications in your browser</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.notifications.browserNotifications}
                onChange={(e) => handleSettingChange('notifications', 'browserNotifications', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Test Failure Alerts</h3>
              <p className="text-sm text-gray-500">Get notified when tests fail</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.notifications.testFailureAlerts}
                onChange={(e) => handleSettingChange('notifications', 'testFailureAlerts', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">PR Status Updates</h3>
              <p className="text-sm text-gray-500">Notifications for PR status changes</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.notifications.prStatusUpdates}
                onChange={(e) => handleSettingChange('notifications', 'prStatusUpdates', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Testing Settings */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Testing Preferences</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Priority
            </label>
            <select
              className="select"
              value={settings.testing.defaultPriority}
              onChange={(e) => handleSettingChange('testing', 'defaultPriority', e.target.value)}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Default priority for new test cases</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Auto-assign Reviewer</h3>
                <p className="text-sm text-gray-500">Automatically assign reviewers to PRs</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.testing.autoAssignReviewer}
                  onChange={(e) => handleSettingChange('testing', 'autoAssignReviewer', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Require Test Cases for PR</h3>
                <p className="text-sm text-gray-500">Mandate test cases when creating PRs</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.testing.requireTestCasesForPR}
                  onChange={(e) => handleSettingChange('testing', 'requireTestCasesForPR', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Enable Analytics</h3>
                <p className="text-sm text-gray-500">Track testing metrics and performance</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.testing.enableAnalytics}
                  onChange={(e) => handleSettingChange('testing', 'enableAnalytics', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Integration Settings */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Integrations</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GitHub Repository
            </label>
            <input
              type="text"
              className="input"
              placeholder="username/repository"
              value={settings.integration.githubRepo}
              onChange={(e) => handleSettingChange('integration', 'githubRepo', e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">Link to your GitHub repository for PR integration</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slack Webhook URL
            </label>
            <input
              type="url"
              className="input"
              placeholder="https://hooks.slack.com/services/..."
              value={settings.integration.slackWebhook}
              onChange={(e) => handleSettingChange('integration', 'slackWebhook', e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">Send notifications to Slack channel</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              JIRA Project Key
            </label>
            <input
              type="text"
              className="input"
              placeholder="PROJ"
              value={settings.integration.jiraProject}
              onChange={(e) => handleSettingChange('integration', 'jiraProject', e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">Link test cases to JIRA issues</p>
          </div>
        </div>
      </div>

      {/* Appearance Settings */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Appearance</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Theme
            </label>
            <select
              className="select"
              value={settings.appearance.theme}
              onChange={(e) => handleSettingChange('appearance', 'theme', e.target.value)}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Compact View</h3>
                <p className="text-sm text-gray-500">Use more compact layouts</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.appearance.compactView}
                  onChange={(e) => handleSettingChange('appearance', 'compactView', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Show Test Case Details</h3>
                <p className="text-sm text-gray-500">Display detailed test information</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.appearance.showTestCaseDetails}
                  onChange={(e) => handleSettingChange('appearance', 'showTestCaseDetails', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Data Management</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Export Data</h3>
              <p className="text-sm text-gray-500">Export all your test cases and PRs as JSON</p>
            </div>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => {
                const dataToExport = {
                  testCases: state.testCases,
                  prs: state.prs,
                  settings: settings,
                  exportedAt: new Date().toISOString()
                }
                const dataStr = JSON.stringify(dataToExport, null, 2)
                const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
                const exportFileDefaultName = `qa-data-${new Date().toISOString().split('T')[0]}.json`
                
                const linkElement = document.createElement('a')
                linkElement.setAttribute('href', dataUri)
                linkElement.setAttribute('download', exportFileDefaultName)
                linkElement.click()
              }}
            >
              Export
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-danger-50 rounded-lg border border-danger-200">
            <div>
              <h3 className="text-sm font-medium text-danger-900">Clear All Data</h3>
              <p className="text-sm text-danger-700">This will permanently delete all test cases and PRs</p>
            </div>
            <button 
              className="btn btn-danger btn-sm"
              onClick={() => {
                if (confirm('Are you sure you want to delete all data? This action cannot be undone.')) {
                  actions.setPRs([])
                  actions.setTestCases([])
                  actions.setActivities([])
                  actions.showNotification('All data cleared', 'info')
                }
              }}
            >
              Clear Data
            </button>
          </div>
        </div>
      </div>

      {/* Save Button Footer */}
      {hasChanges && (
        <div className="sticky bottom-4 flex justify-center">
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 flex items-center space-x-3">
            <span className="text-sm text-gray-600">You have unsaved changes</span>
            <button
              onClick={handleReset}
              className="btn btn-secondary btn-sm"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              className="btn btn-primary btn-sm"
              disabled={state.loading}
            >
              {state.loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings