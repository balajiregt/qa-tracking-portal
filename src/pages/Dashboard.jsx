import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQA } from '../contexts/QAContext'
import { notifyQATestsMerged, notifyDevPRMerged, notifyPRStatusChanged } from '../utils/webhookNotifier'

function Dashboard() {
  const { state, actions } = useQA()
  const [selectedPR, setSelectedPR] = useState(null)
  const [showTestAssociation, setShowTestAssociation] = useState(false)
  const [selectedTestCases, setSelectedTestCases] = useState([])
  const [blockedReason, setBlockedReason] = useState('')
  const [showBlockedReasonEdit, setShowBlockedReasonEdit] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTestCase, setEditingTestCase] = useState(null)
  const [editingPR, setEditingPR] = useState(null)
  const [showPREditModal, setShowPREditModal] = useState(false)
  const [prFormData, setPRFormData] = useState({
    name: '',
    description: '',
    priority: 'medium',
    labels: '',
    developer: ''
  })
  const [visibleSections, setVisibleSections] = useState({
    ready: true,
    qaTestsMerged: true,
    blocked: true,
    inProgress: true,
    fullyMerged: false // Hidden by default
  })
  const [formData, setFormData] = useState({
    name: '',
    intent: '',
    tags: '',
    source: '',
    details: '',
    testSteps: '',
    expectedResults: '',
    localResult: 'Pending',
    mainResult: 'Pending'
  })

  // Send Slack notification to dev
  const sendSlackNotification = async (pr) => {
    try {
      // Get Slack webhook URL from settings (try both storage locations)
      let settings = JSON.parse(localStorage.getItem('settings') || '{}')
      if (!settings.integration?.slackWebhook) {
        // Fallback to old storage location
        const oldSettings = JSON.parse(localStorage.getItem('githubSettings') || '{}')
        if (oldSettings.integration?.slackWebhook) {
          settings = { integration: oldSettings.integration }
        }
      }
      const slackWebhook = settings.integration?.slackWebhook
      
      if (!slackWebhook) {
        console.log('No Slack webhook configured - skipping notification')
        console.log('Settings found:', settings)
        return
      }
      
      console.log('Found Slack webhook, sending notification for PR:', pr.name)

      const message = {
        text: `🧪 QA Tests Ready for Dev Merge - ${pr.name} (${pr.developer ? `@${pr.developer}` : 'Developer needed'})`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "🧪 QA Tests Merged - Ready for Dev Merge"
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*PR:* ${pr.name}\n*Developer:* ${pr.developer ? `<@${pr.developer}>` : 'Unassigned - needs developer assignment'}`
            }
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Priority:* ${pr.priority ? pr.priority.charAt(0).toUpperCase() + pr.priority.slice(1) : 'Medium'}`
              },
              {
                type: "mrkdwn",
                text: `*Branch:* \`${pr.branch_comparison?.feature_branch?.name || pr.branch || pr.name}\``
              },
              {
                type: "mrkdwn",
                text: `*Status:* qa-tests-merged`
              },
              {
                type: "mrkdwn",
                text: `*Test Cases:* ${pr.associatedTestCases?.length || 0} tests`
              }
            ]
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `📋 *Description:*\n${pr.description || 'No description provided'}`
            }
          },
          {
            type: "divider"
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `✅ *TDD Status:* QA tests have been merged to main and are *failing as expected* (Fail-First approach)\n\n🚀 *Next Action Required:* ${pr.developer ? `<@${pr.developer}>` : 'Developer'} can now merge their development code to make the tests pass!`
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `⏰ *QA Tests Merged:* ${new Date(pr.qaTestsMergedAt).toLocaleString()}\n📊 *PR ID:* ${pr.id}`
            }
          },
          ...(pr.github_url ? [{
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "View PR on GitHub"
                },
                url: pr.github_url,
                style: "primary"
              }
            ]
          }] : [])
        ]
      }

      // Send via Netlify function to avoid CORS issues
      const response = await fetch('/.netlify/functions/send-slack-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhookUrl: slackWebhook,
          message: message
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send notification')
      }

      actions.showNotification('Slack notification sent to dev team!', 'success')
    } catch (error) {
      console.error('Failed to send Slack notification:', error)
      actions.showNotification('Failed to send Slack notification', 'error')
    }
  }

  // Handle PR editing
  const handleEditPR = (pr) => {
    setEditingPR(pr)
    setPRFormData({
      name: pr.name || '',
      description: pr.description || '',
      priority: pr.priority || 'medium',
      labels: Array.isArray(pr.labels) ? pr.labels.join(', ') : (pr.labels || ''),
      developer: pr.developer || ''
    })
    setShowPREditModal(true)
  }

  const handleSavePREdit = async () => {
    if (!editingPR) return
    
    try {
      const updatedPR = {
        ...editingPR,
        name: prFormData.name,
        description: prFormData.description,
        priority: prFormData.priority,
        labels: prFormData.labels.split(',').map(label => label.trim()).filter(Boolean),
        developer: prFormData.developer,
        updated_at: new Date().toISOString()
      }
      
      await actions.updatePRAsync(updatedPR)
      setShowPREditModal(false)
      setEditingPR(null)
      actions.showNotification('PR updated successfully', 'success')
    } catch (error) {
      console.error('Error updating PR:', error)
      actions.showNotification('Failed to update PR', 'error')
    }
  }

  const handleCancelPREdit = () => {
    setShowPREditModal(false)
    setEditingPR(null)
    setPRFormData({
      name: '',
      description: '',
      priority: 'medium',
      labels: '',
      developer: ''
    })
  }

  // Merge QA tests first (TDD/Fail-First approach)
  const handleMergeQATests = async (pr) => {
    try {
      // Update all associated test cases' main branch results to 'Fail' (expected)
      const updatedAssociatedTestCases = pr.associatedTestCases.map(tc => ({
        ...tc,
        mainResult: 'Fail'
      }))

      // Update PR status to qa-tests-merged
      const updatedPR = {
        ...pr,
        status: 'qa-tests-merged',
        associatedTestCases: updatedAssociatedTestCases,
        qaTestsMergedAt: new Date().toISOString()
      }

      // Update the PR in backend and global state
      await actions.updatePRAsync(updatedPR)
      
      // Send webhook notifications
      await notifyQATestsMerged(updatedPR)
      await notifyPRStatusChanged(updatedPR, pr.status, 'qa-tests-merged')
      
      // Send Slack notification to dev team
      await sendSlackNotification(updatedPR)
      
      actions.showNotification(`QA tests merged to main - Tests failing as expected!`, 'success')
    } catch (error) {
      console.error('Error merging QA tests:', error)
      actions.showNotification('Failed to merge QA tests', 'error')
    }
  }

  // Merge Dev PR (should make tests pass)
  const handleMergeDevPR = async (pr) => {
    try {
      // Update all associated test cases' main branch results to 'Pass'
      const updatedAssociatedTestCases = pr.associatedTestCases.map(tc => ({
        ...tc,
        mainResult: 'Pass'
      }))

      // Update PR status to fully merged
      const updatedPR = {
        ...pr,
        status: 'fully-merged',
        associatedTestCases: updatedAssociatedTestCases,
        devPRMergedAt: new Date().toISOString()
      }

      // Update the PR in backend and global state
      await actions.updatePRAsync(updatedPR)
      
      // Send webhook notifications
      await notifyDevPRMerged(updatedPR)
      await notifyPRStatusChanged(updatedPR, pr.status, 'fully-merged')
      
      actions.showNotification(`Dev PR merged - All tests now passing!`, 'success')
    } catch (error) {
      console.error('Error merging dev PR:', error)
      actions.showNotification('Failed to merge dev PR', 'error')
    }
  }

  
  // Get associated test cases for each PR
  const getAssociatedTestCases = (prId) => {
    const pr = state.prs.find(p => p.id === prId)
    return pr?.associatedTestCases || []
  }

  // Focus on PR Testing Progress with Branch-Specific Data
  const prsWithTestProgress = state.prs.map(pr => {
    // Get associated test cases for this PR
    const associatedTestCases = getAssociatedTestCases(pr.id)
    const totalTests = associatedTestCases.length
    
    // Count test results based on associated test case dropdown values
    const localPassedTests = associatedTestCases.filter(tc => tc.localResult === 'Pass').length
    const localFailedTests = associatedTestCases.filter(tc => tc.localResult === 'Fail').length
    const localPendingTests = associatedTestCases.filter(tc => !tc.localResult || tc.localResult === 'Pending').length
    
    const mainPassedTests = associatedTestCases.filter(tc => tc.mainResult === 'Pass').length
    const mainFailedTests = associatedTestCases.filter(tc => tc.mainResult === 'Fail').length
    const mainPendingTests = associatedTestCases.filter(tc => !tc.mainResult || tc.mainResult === 'Pending').length
    
    // Overall progress calculation based on local branch results
    const localProgress = totalTests > 0 ? (localPassedTests / totalTests) * 100 : 0
    
    // Automatically calculate status based on test results
    let calculatedStatus
    if (pr.status === 'fully-merged') {
      calculatedStatus = 'fully-merged'
    } else if (pr.status === 'qa-tests-merged') {
      calculatedStatus = 'qa-tests-merged'
    } else if (pr.blocked_reason || localFailedTests > 0) {
      calculatedStatus = 'blocked'
    } else if (totalTests > 0 && localPendingTests === 0 && localPassedTests === totalTests) {
      calculatedStatus = 'ready'
    } else if (totalTests > 0) {
      calculatedStatus = 'testing'
    } else {
      calculatedStatus = 'new'
    }
    
    // Determine if ready to merge based on calculated status
    const readyToMerge = calculatedStatus === 'ready'
    
    return {
      ...pr,
      associatedTestCases,
      totalTests,
      // Use calculated status instead of manual status
      status: calculatedStatus,
      // Test result stats based on associated test cases
      passedTests: localPassedTests,
      failedTests: localFailedTests,
      pendingTests: localPendingTests,
      // Branch stats from associated test cases
      localPassedTests,
      localFailedTests,
      localPendingTests,
      mainPassedTests,
      mainFailedTests,
      mainPendingTests,
      // Overall progress
      testProgress: localProgress,
      localProgress,
      readyToMerge
    }
  })

  // Recalculate selected PR data when test cases change
  useEffect(() => {
    if (selectedPR) {
      const updatedSelectedPR = prsWithTestProgress.find(pr => pr.id === selectedPR.id)
      if (updatedSelectedPR && JSON.stringify(updatedSelectedPR) !== JSON.stringify(selectedPR)) {
        setSelectedPR(updatedSelectedPR)
      }
    }
  }, [state.testCases])

  // Filter PRs by status for different views
  const openPRs = prsWithTestProgress.filter(pr => !['fully-merged', 'closed'].includes(pr.status))
  const readyToMergePRs = prsWithTestProgress.filter(pr => pr.status === 'ready')
  const qaTestsMergedPRs = prsWithTestProgress.filter(pr => pr.status === 'qa-tests-merged')
  const blockedPRs = prsWithTestProgress.filter(pr => pr.status === 'blocked')
  const fullyMergedPRs = prsWithTestProgress.filter(pr => pr.status === 'fully-merged')
  
  // Summary statistics
  const stats = {
    totalPRs: state.prs.length,
    openPRs: openPRs.length,
    readyToMerge: readyToMergePRs.length,
    qaTestsMerged: qaTestsMergedPRs.length,
    blockedPRs: blockedPRs.length,
    fullyMerged: fullyMergedPRs.length,
    totalTests: state.testCases.length
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">PR Testing Dashboard</h1>
          <p className="text-gray-600">Track testing progress for PRs in pre-merge process</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={async () => {
              try {
                await actions.syncGitHubPRs({ 
                  state: 'open', 
                  per_page: 50, 
                  syncMode: 'merge' 
                });
              } catch (error) {
                console.error('GitHub fetch failed:', error);
              }
            }}
            className="btn btn-primary"
            disabled={state.loading}
            title="Pull PRs from GitHub repository for TDD workflow"
          >
            {state.loading ? (
              <>
                <span className="animate-spin mr-2">⟳</span>
                Fetching...
              </>
            ) : (
              <>
                <span className="mr-2">📥</span>
                Pull PRs
              </>
            )}
          </button>
          
        </div>
      </div>

      {/* Quick Info Bar */}
      {stats.totalPRs === 0 && (
        <div className="card p-4 bg-yellow-50 border-yellow-200">
          <div className="flex items-center">
            <span className="text-yellow-600 mr-3 text-xl">💡</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">No PRs found</p>
              <p className="text-xs text-yellow-700">
                Get started by pulling PRs from GitHub or creating them manually for testing
              </p>
            </div>
            <div className="text-xs text-yellow-700">
              Use the "Pull PRs" button above or navigate to "Create PR" in the menu
            </div>
          </div>
        </div>
      )}

      {/* PR Filters */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">🔍 Filter PR Views</h3>
          <button
            onClick={() => setVisibleSections({
              ready: true,
              qaTestsMerged: true,
              blocked: true,
              inProgress: true,
              fullyMerged: true
            })}
            className="btn btn-sm btn-secondary"
          >
            Show All
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={visibleSections.ready}
              onChange={(e) => setVisibleSections(prev => ({...prev, ready: e.target.checked}))}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-gray-700">✅ Ready ({stats.readyToMerge})</span>
          </label>
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={visibleSections.qaTestsMerged}
              onChange={(e) => setVisibleSections(prev => ({...prev, qaTestsMerged: e.target.checked}))}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-gray-700">🧪 QA Tests Merged ({stats.qaTestsMerged})</span>
          </label>
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={visibleSections.blocked}
              onChange={(e) => setVisibleSections(prev => ({...prev, blocked: e.target.checked}))}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-gray-700">🚫 Blocked ({stats.blockedPRs})</span>
          </label>
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={visibleSections.inProgress}
              onChange={(e) => setVisibleSections(prev => ({...prev, inProgress: e.target.checked}))}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-gray-700">⏳ In Progress ({openPRs.filter(pr => pr.status === 'testing' || pr.status === 'new').length})</span>
          </label>
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={visibleSections.fullyMerged}
              onChange={(e) => setVisibleSections(prev => ({...prev, fullyMerged: e.target.checked}))}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-gray-700">🎉 Fully Merged ({stats.fullyMerged})</span>
          </label>
        </div>
      </div>

      {/* PR Status Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <span className="text-2xl">🔄</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Open PRs</p>
              <p className="text-2xl font-semibold text-primary-600">{stats.openPRs}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-success-100 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ready to Merge</p>
              <p className="text-2xl font-semibold text-success-600">{stats.readyToMerge}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-danger-100 rounded-lg">
              <span className="text-2xl">🚫</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Blocked PRs</p>
              <p className="text-2xl font-semibold text-danger-600">{stats.blockedPRs}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <span className="text-2xl">🧪</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">QA Tests Merged</p>
              <p className="text-2xl font-semibold text-orange-600">{stats.qaTestsMerged}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">🎉</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Fully Merged</p>
              <p className="text-2xl font-semibold text-blue-600">{stats.fullyMerged}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <span className="text-2xl">📋</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Tests</p>
              <p className="text-2xl font-semibold text-gray-600">{stats.totalTests}</p>
            </div>
          </div>
        </div>
      </div>

      {/* TDD Workflow Guide */}
      <div className="card p-6 bg-blue-50 border-blue-200">
        <h2 className="text-lg font-semibold text-blue-900 mb-4">🧪 TDD Workflow Guide</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold">1</span>
            </div>
            <div>
              <h3 className="font-medium text-blue-900">Ready for Testing</h3>
              <p className="text-blue-700 text-xs mt-1">Dev PR ready, QA creates automated tests</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-orange-600 font-semibold">2</span>
            </div>
            <div>
              <h3 className="font-medium text-orange-900">QA Tests Merged</h3>
              <p className="text-orange-700 text-xs mt-1">Tests merged first (fail-first approach)</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-semibold">3</span>
            </div>
            <div>
              <h3 className="font-medium text-green-900">Fully Merged</h3>
              <p className="text-green-700 text-xs mt-1">Dev code merged, tests now pass</p>
            </div>
          </div>
        </div>
      </div>

      {/* PR Testing Progress */}
      <div className="space-y-6">
        {/* Ready to Merge PRs */}
        {visibleSections.ready && readyToMergePRs.length > 0 && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-success-700">✅ Ready to Merge</h2>
              <span className="badge badge-success">{readyToMergePRs.length} PRs</span>
            </div>
            
            <div className="space-y-4">
              {readyToMergePRs.map((pr) => (
                <div key={pr.id} className="bg-success-50 border border-success-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{pr.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{pr.description}</p>
                      <div className="flex items-center mt-2 space-x-2">
                        <span className="badge badge-success">{pr.localPassedTests}/{pr.totalTests} local tests passed</span>
                        <span className="badge badge-danger">{pr.mainFailedTests}/{pr.totalTests} main tests failed</span>
                        {pr.developer && (
                          <span className="text-sm text-gray-500">Developer: {pr.developer}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Progress: {Math.round(pr.localProgress)}% complete • Branch: {pr.branch_comparison?.feature_branch?.name || pr.name}
                      </div>
                    </div>
                    <div className="ml-4 space-x-2">
                      <button 
                        onClick={() => handleEditPR(pr)}
                        className="btn btn-outline btn-sm"
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        onClick={() => setSelectedPR(pr)}
                        className="btn btn-secondary btn-sm"
                      >
                        View Details
                      </button>
                      <button 
                        onClick={() => handleMergeQATests(pr)}
                        className="btn btn-warning btn-sm"
                      >
                        🧪 Merge QA Tests
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* QA Tests Merged PRs (Fail-First Stage) */}
        {visibleSections.qaTestsMerged && qaTestsMergedPRs.length > 0 && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-orange-700">🧪 QA Tests Merged (Failing as Expected)</h2>
              <span className="badge badge-warning">{qaTestsMergedPRs.length} PRs</span>
            </div>
            
            <div className="space-y-4">
              {qaTestsMergedPRs.map((pr) => (
                <div key={pr.id} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">{pr.name}</h3>
                        <span className="badge badge-warning">qa-tests-merged</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{pr.description}</p>
                      <div className="flex items-center mt-2 space-x-2">
                        <span className="badge badge-success">{pr.localPassedTests}/{pr.totalTests} local tests passed</span>
                        <span className="badge badge-danger">{pr.mainFailedTests}/{pr.totalTests} main tests failing</span>
                        {pr.developer && (
                          <span className="text-sm text-gray-500">Developer: {pr.developer}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        QA Tests Merged: {pr.qaTestsMergedAt ? new Date(pr.qaTestsMergedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Recently'} • Branch: {pr.branch_comparison?.feature_branch?.name || pr.name}
                      </div>
                    </div>
                    <div className="ml-4 space-x-2">
                      <button 
                        onClick={() => handleEditPR(pr)}
                        className="btn btn-outline btn-sm"
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        onClick={() => setSelectedPR(pr)}
                        className="btn btn-secondary btn-sm"
                      >
                        View Details
                      </button>
                      <button 
                        onClick={() => handleMergeDevPR(pr)}
                        className="btn btn-success btn-sm"
                      >
                        🚀 Merge Dev PR
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Blocked PRs */}
        {visibleSections.blocked && blockedPRs.length > 0 && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-danger-700">🚫 Blocked PRs</h2>
              <span className="badge badge-danger">{blockedPRs.length} PRs</span>
            </div>
            
            <div className="space-y-4">
              {blockedPRs.map((pr) => (
                <div key={pr.id} className="bg-danger-50 border border-danger-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">{pr.name}</h3>
                        <span className="badge badge-danger">
                          {pr.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{pr.description}</p>
                      <div className="flex items-center mt-2 space-x-2">
                        <span className="badge badge-danger">{pr.localFailedTests} local tests failed</span>
                        {pr.localPassedTests > 0 && (
                          <span className="badge badge-success">{pr.localPassedTests} local tests passed</span>
                        )}
                        <span className="badge badge-secondary">{pr.totalTests} total tests</span>
                        {pr.developer && (
                          <span className="text-sm text-gray-500">Developer: {pr.developer}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Branch: {pr.branch_comparison?.feature_branch?.name || pr.name} → {pr.branch_comparison?.main_branch?.name || 'main'}
                      </div>
                    </div>
                    <div className="ml-4 space-x-2">
                      <button 
                        onClick={() => handleEditPR(pr)}
                        className="btn btn-outline btn-sm"
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        onClick={() => setSelectedPR(pr)}
                        className="btn btn-primary btn-sm"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* In Progress PRs */}
        {visibleSections.inProgress && openPRs.filter(pr => pr.status === 'testing' || pr.status === 'new').length > 0 && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-warning-700">⏳ Testing in Progress</h2>
              <span className="badge badge-warning">
                {openPRs.filter(pr => pr.status === 'testing' || pr.status === 'new').length} PRs
              </span>
            </div>
            
            <div className="space-y-4">
              {openPRs.filter(pr => pr.status === 'testing' || pr.status === 'new').map((pr) => (
                <div key={pr.id} className="bg-warning-50 border border-warning-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">{pr.name}</h3>
                        <span className={`badge ${pr.status === 'testing' ? 'badge-warning' : 'badge-secondary'}`}>
                          {pr.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{pr.description}</p>
                      <div className="flex items-center mt-2 space-x-2">
                        <span className="badge badge-success">{pr.localPassedTests} local passed</span>
                        <span className="badge badge-warning">{pr.localPendingTests} local pending</span>
                        <span className="badge badge-secondary">{pr.totalTests} total</span>
                        {pr.developer && (
                          <span className="text-sm text-gray-500">Developer: {pr.developer}</span>
                        )}
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs text-gray-500 min-w-0">Local Progress:</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-success-500 h-2 rounded-full transition-all" 
                              style={{ width: `${pr.localProgress}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500 min-w-0">{Math.round(pr.localProgress)}%</span>
                        </div>
                        <p className="text-xs text-gray-500">Branch: {pr.branch_comparison?.feature_branch?.name || pr.name} → {pr.branch_comparison?.main_branch?.name || 'main'}</p>
                      </div>
                    </div>
                    <div className="ml-4 space-x-2">
                      <button 
                        onClick={() => handleEditPR(pr)}
                        className="btn btn-outline btn-sm"
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        onClick={() => setSelectedPR(pr)}
                        className="btn btn-primary btn-sm"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fully Merged PRs */}
        {visibleSections.fullyMerged && fullyMergedPRs.length > 0 && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-blue-700">🎉 Fully Merged PRs</h2>
              <span className="badge badge-primary">{fullyMergedPRs.length} PRs</span>
            </div>
            
            <div className="space-y-4">
              {fullyMergedPRs.map((pr) => (
                <div key={pr.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">{pr.name}</h3>
                        <span className="badge badge-primary">fully-merged</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{pr.description}</p>
                      <div className="flex items-center mt-2 space-x-2">
                        <span className="badge badge-success">{pr.localPassedTests}/{pr.totalTests} local tests passed</span>
                        <span className="badge badge-success">{pr.mainPassedTests}/{pr.totalTests} main tests passed</span>
                        {pr.developer && (
                          <span className="text-sm text-gray-500">Developer: {pr.developer}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Dev PR Merged: {pr.devPRMergedAt ? new Date(pr.devPRMergedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Recently'} • Branch: {pr.branch_comparison?.feature_branch?.name || pr.name}
                      </div>
                    </div>
                    <div className="ml-4 space-x-2">
                      <button 
                        onClick={() => setSelectedPR(pr)}
                        className="btn btn-secondary btn-sm"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* No PRs State */}
      {state.prs.length === 0 && (
        <div className="card p-12 text-center">
          <span className="text-6xl">🔄</span>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No PRs to track</h3>
          <p className="mt-2 text-sm text-gray-500">
            Create your first PR to start tracking testing progress
          </p>
          <div className="mt-6">
            <Link to="/create-pr" className="btn btn-primary">
              Create PR
            </Link>
          </div>
        </div>
      )}

      {/* PR Detail Modal */}
      {selectedPR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto w-full">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedPR.name}</h2>
                  <p className="text-sm text-gray-600">{selectedPR.description}</p>
                  <div className="flex items-center mt-2 space-x-2">
                    <span className={`badge ${
                      selectedPR.status === 'ready' ? 'badge-success' :
                      selectedPR.status === 'blocked' ? 'badge-danger' :
                      selectedPR.status === 'testing' ? 'badge-warning' : 'badge-secondary'
                    }`}>
                      {selectedPR.status}
                    </span>
                    <span className="badge badge-secondary">{selectedPR.priority}</span>
                    {selectedPR.developer && (
                      <span className="text-sm text-gray-500">Developer: {selectedPR.developer}</span>
                    )}
                  </div>
                  <div className="flex items-center mt-2 space-x-4 text-xs text-gray-500">
                    <span>
                      <strong>Created:</strong> {new Date(selectedPR.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <span>
                      <strong>Updated:</strong> {new Date(selectedPR.updated_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <span>
                      <strong>Duration:</strong> {(() => {
                        const start = new Date(selectedPR.created_at)
                        const end = new Date(selectedPR.updated_at)
                        const hours = Math.round((end - start) / (1000 * 60 * 60))
                        return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d ${hours % 24}h`
                      })()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedPR(null)
                    setShowTestAssociation(false)
                    setSelectedTestCases([])
                    setBlockedReason('')
                    setShowBlockedReasonEdit(false)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <button
                  onClick={() => setShowTestAssociation(true)}
                  className="btn btn-primary flex items-center justify-center"
                >
                  <span className="mr-2">➕</span>
                  Add Test Case
                </button>
                <Link
                  to={`/upload-traces?pr=${selectedPR.id}`}
                  className="btn btn-secondary flex items-center justify-center"
                  onClick={() => setSelectedPR(null)}
                >
                  <span className="mr-2">📎</span>
                  Add Traces
                </Link>
                {selectedPR.status !== 'blocked' && (
                  <button
                    onClick={() => {
                      setBlockedReason('')
                      setShowBlockedReasonEdit(true)
                    }}
                    className="btn btn-danger flex items-center justify-center"
                  >
                    <span className="mr-2">🚫</span>
                    Block PR
                  </button>
                )}
                {selectedPR.status === 'blocked' && selectedPR.blocked_reason && (
                  <button
                    onClick={async () => {
                      try {
                        // Update the PR in the global state by removing blocked_reason
                        const updatedPR = { ...selectedPR, blocked_reason: '' }
                        
                        // Update the PR in the context/backend
                        await actions.updatePRAsync(updatedPR)
                        
                        // Update local modal state
                        setSelectedPR(updatedPR)
                      } catch (error) {
                        console.error('Error unblocking PR:', error)
                        actions.showNotification('Failed to unblock PR', 'error')
                      }
                    }}
                    className="btn btn-success flex items-center justify-center"
                  >
                    <span className="mr-2">✅</span>
                    Unblock PR
                  </button>
                )}
              </div>

              {/* Blocked Reason Management */}
              {(selectedPR.status === 'blocked' || showBlockedReasonEdit) && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">🚫 Blocked Reason</h3>
                    <button
                      onClick={() => {
                        setBlockedReason(selectedPR.blocked_reason || '')
                        setShowBlockedReasonEdit(!showBlockedReasonEdit)
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {showBlockedReasonEdit ? 'Cancel' : (selectedPR.blocked_reason ? 'Edit' : 'Add Reason')}
                    </button>
                  </div>
                  
                  {showBlockedReasonEdit ? (
                    <div className="space-y-3">
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        rows={3}
                        value={blockedReason}
                        onChange={(e) => setBlockedReason(e.target.value)}
                        placeholder="Explain why this PR is blocked..."
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            setShowBlockedReasonEdit(false)
                            setBlockedReason('')
                          }}
                          className="btn btn-secondary btn-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              // Update local modal state
                              const updatedPR = { ...selectedPR, blocked_reason: blockedReason }
                              
                              // Update the PR in the context/backend
                              await actions.updatePRAsync(updatedPR)
                              setSelectedPR(updatedPR)
                              
                              setShowBlockedReasonEdit(false)
                            } catch (error) {
                              console.error('Error blocking PR:', error)
                              actions.showNotification('Failed to block PR', 'error')
                            }
                          }}
                          className="btn btn-danger btn-sm"
                          disabled={!blockedReason.trim()}
                        >
                          Save Blocked Reason
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      {selectedPR.blocked_reason ? (
                        <p className="text-red-800">{selectedPR.blocked_reason}</p>
                      ) : (
                        <p className="text-red-600 italic">No blocked reason specified</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Test Case Association */}
              {showTestAssociation && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Associate Test Cases</h3>
                    <button
                      onClick={() => setShowTestAssociation(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="card p-4 border-2 border-dashed border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-gray-600">
                        Select test cases to track for this PR ({selectedTestCases.length} selected)
                      </p>
                      <div className="text-xs text-gray-500 flex items-center space-x-3">
                        <span className="flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                          = Local Branch
                        </span>
                        <span className="flex items-center">
                          <span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                          = Main Branch
                        </span>
                      </div>
                    </div>
                    
                    {state.testCases && state.testCases.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {state.testCases.map((testCase) => (
                          <div
                            key={testCase.id}
                            className="flex items-center p-3 border rounded-lg hover:bg-gray-50"
                          >
                            <input
                              type="checkbox"
                              id={`test-${testCase.id}`}
                              checked={selectedTestCases.includes(testCase.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTestCases(prev => [...prev, testCase.id])
                                } else {
                                  setSelectedTestCases(prev => prev.filter(id => id !== testCase.id))
                                }
                              }}
                              className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                            />
                            <label
                              htmlFor={`test-${testCase.id}`}
                              className="ml-3 flex-1 cursor-pointer"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">
                                    {testCase.intent}
                                  </p>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <span className="text-sm text-gray-600">
                                      {testCase.tags || '@regression@smoke@auth'}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {testCase.source}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-4 ml-4">
                                  {/* Local Branch Result */}
                                  <div className="text-center min-w-[60px]">
                                    <div className="text-xs text-gray-500 mb-1">Local</div>
                                    <span className={`badge text-xs ${
                                      testCase.localResult === 'Pass' ? 'badge-success' :
                                      testCase.localResult === 'Fail' ? 'badge-danger' : 'badge-warning'
                                    }`}>
                                      {testCase.localResult || 'Pending'}
                                    </span>
                                  </div>
                                  
                                  {/* Main Branch Result */}
                                  <div className="text-center min-w-[80px]">
                                    <div className="text-xs text-gray-500 mb-1">Main</div>
                                    <span className={`badge text-xs ${
                                      testCase.mainResult === 'Pass' ? 'badge-success' :
                                      testCase.mainResult === 'Fail' ? 'badge-danger' : 'badge-warning'
                                    }`}>
                                      {testCase.mainResult || 'Pending'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <span className="text-4xl">🧪</span>
                        <p className="mt-2">No test cases available</p>
                        <p className="text-sm">Create test cases first to associate them with this PR</p>
                      </div>
                    )}
                    
                    {state.testCases && state.testCases.length > 0 && (
                      <div className="flex justify-end mt-4 space-x-2">
                        <button
                          onClick={() => {
                            setShowTestAssociation(false)
                            setSelectedTestCases([])
                          }}
                          className="btn btn-secondary btn-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              // Get the selected test cases from state
                              const testCasesToAssociate = state.testCases.filter(tc => 
                                selectedTestCases.includes(tc.id)
                              )
                              
                              // Create updated PR with associated test cases
                              const updatedPR = {
                                ...selectedPR,
                                associatedTestCases: [
                                  ...(selectedPR.associatedTestCases || []),
                                  ...testCasesToAssociate.filter(tc => 
                                    !selectedPR.associatedTestCases?.some(existing => existing.id === tc.id)
                                  )
                                ]
                              }
                              
                              // Update the PR in backend and global state
                              await actions.updatePRAsync(updatedPR)
                              
                              // Update local modal state
                              setSelectedPR(updatedPR)
                              
                              setShowTestAssociation(false)
                              setSelectedTestCases([])
                            } catch (error) {
                              console.error('Error associating test cases:', error)
                              actions.showNotification('Failed to associate test cases', 'error')
                            }
                          }}
                          className="btn btn-primary btn-sm"
                          disabled={selectedTestCases.length === 0}
                        >
                          Associate {selectedTestCases.length} Test Cases
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Branch Comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="card p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    🌟 Feature Branch: {selectedPR.branch_comparison?.feature_branch?.name || selectedPR.name}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Tests Passed</span>
                      <span className="badge badge-success">{selectedPR.localPassedTests}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Tests Failed</span>
                      <span className="badge badge-danger">{selectedPR.localFailedTests}</span>
                    </div>
                    {selectedPR.localPendingTests > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Tests Pending</span>
                        <span className="badge badge-warning">{selectedPR.localPendingTests}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="card p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    🏠 Main Branch: {selectedPR.branch_comparison?.main_branch?.name || 'main'}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Tests Passed</span>
                      <span className="badge badge-success">{selectedPR.mainPassedTests}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Tests Failed</span>
                      <span className="badge badge-danger">{selectedPR.mainFailedTests}</span>
                    </div>
                    {selectedPR.mainPendingTests > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Tests Pending</span>
                        <span className="badge badge-warning">{selectedPR.mainPendingTests}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Associated Test Cases */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">📋 Associated Test Cases</h3>
                {selectedPR.associatedTestCases && selectedPR.associatedTestCases.length > 0 ? (
                  <div className="bg-white border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Intent</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedPR.associatedTestCases.map((testCase) => (
                            <tr key={testCase.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{testCase.intent}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500">{testCase.tags || '@regression@smoke@auth'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500">{testCase.source}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  testCase.localResult === 'Pass' ? 'bg-green-100 text-green-800' :
                                  testCase.localResult === 'Fail' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {testCase.localResult || 'Pending'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">N/A</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button 
                                  onClick={() => {
                                    setEditingTestCase(testCase)
                                    setFormData({
                                      name: testCase.name || '',
                                      intent: testCase.intent || '',
                                      tags: testCase.tags || '',
                                      source: testCase.source || '',
                                      details: testCase.details || '',
                                      testSteps: testCase.testSteps || '',
                                      expectedResults: testCase.expectedResults || '',
                                      localResult: testCase.localResult || 'Pending',
                                      mainResult: testCase.mainResult || 'Pending'
                                    })
                                    setShowEditModal(true)
                                  }}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Edit
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 border rounded-lg">
                    <span className="text-4xl">📋</span>
                    <p className="mt-2">No test cases associated yet</p>
                    <p className="text-sm">Click "Add Test Case" above to associate test cases with this PR</p>
                  </div>
                )}
              </div>

              {/* Test Results */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">🧪 Test Results</h3>
                {selectedPR.test_results && selectedPR.test_results.length > 0 ? (
                  <div className="space-y-3">
                    {selectedPR.test_results.map((test, index) => (
                      <div key={test.test_id || index} className="card p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{test.name}</h4>
                            <div className="flex items-center mt-1 space-x-2">
                              <span className={`badge ${
                                test.status === 'passed' ? 'badge-success' :
                                test.status === 'failed' ? 'badge-danger' : 'badge-warning'
                              }`}>
                                {test.status}
                              </span>
                              <span className="text-sm text-gray-500">by {test.tester}</span>
                              <span className="text-sm text-gray-500">• {test.type}</span>
                              {test.duration && (
                                <span className="text-sm text-gray-500">• {Math.round(test.duration/1000)}s</span>
                              )}
                            </div>
                            {test.failure_reason && (
                              <p className="text-sm text-red-600 mt-1">❌ {test.failure_reason}</p>
                            )}
                            {test.trace_files && test.trace_files.length > 0 && (
                              <div className="mt-1">
                                <span className="text-xs text-gray-500">Traces: </span>
                                {test.trace_files.map((file, i) => (
                                  <span key={i} className="text-xs text-blue-600 mr-2">📎 {file}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <span className="text-4xl">🧪</span>
                    <p className="mt-2">No test results yet</p>
                    <p className="text-sm">Add test cases and run tests to see results here</p>
                  </div>
                )}
              </div>

              {/* Assigned Testers */}
              {selectedPR.assigned_testers && selectedPR.assigned_testers.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">👥 Assigned Testers</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPR.assigned_testers.map((tester, index) => (
                      <span key={index} className="badge badge-primary">{tester}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Merge Readiness */}
              {selectedPR.merge_readiness && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    🚀 Merge Readiness
                  </h3>
                  <div className="card p-4">
                    <div className={`p-3 rounded-lg mb-3 ${
                      selectedPR.merge_readiness.ready_for_merge ? 'bg-success-100 border border-success-200' : 'bg-warning-100 border border-warning-200'
                    }`}>
                      <p className="font-medium">
                        {selectedPR.merge_readiness.ready_for_merge ? '✅ Ready for Merge' : '⏳ Not Ready for Merge'}
                      </p>
                    </div>
                    
                    {selectedPR.merge_readiness.merge_requirements_met && selectedPR.merge_readiness.merge_requirements_met.length > 0 && (
                      <div className="mb-3">
                        <h4 className="font-medium text-gray-900 mb-2">Requirements Met:</h4>
                        <ul className="space-y-1">
                          {selectedPR.merge_readiness.merge_requirements_met.map((req, index) => (
                            <li key={index} className="text-sm text-success-700">{req}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedPR.merge_readiness.merge_blockers && selectedPR.merge_readiness.merge_blockers.length > 0 && (
                      <div className="mb-3">
                        <h4 className="font-medium text-gray-900 mb-2">Blockers:</h4>
                        <ul className="space-y-1">
                          {selectedPR.merge_readiness.merge_blockers.map((blocker, index) => (
                            <li key={index} className="text-sm text-danger-700">❌ {blocker}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedPR.merge_readiness.approved_by && selectedPR.merge_readiness.approved_by.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Approved By:</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedPR.merge_readiness.approved_by.map((approver, index) => (
                            <span key={index} className="badge badge-success">✅ {approver}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Blocked Reason */}
              {selectedPR.blocked_reason && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">🚫 Blocked Reason</h3>
                  <div className="bg-danger-50 border border-danger-200 rounded-lg p-4">
                    <p className="text-danger-800">{selectedPR.blocked_reason}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Test Case Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl max-h-[90vh] overflow-y-auto w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Edit Test Case
                </h2>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingTestCase(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form 
                onSubmit={async (e) => {
                  e.preventDefault()
                  try {
                    // Update the test case with new data
                    const updatedTestCase = {
                      ...editingTestCase,
                      ...formData
                    }
                    
                    // Update the associated test case in the PR (for Local/Main branch results)
                    const updatedAssociatedTestCases = selectedPR.associatedTestCases.map(tc =>
                      tc.id === editingTestCase.id ? updatedTestCase : tc
                    )
                    
                    // Update the PR with the modified test case results
                    const updatedPR = {
                      ...selectedPR,
                      associatedTestCases: updatedAssociatedTestCases
                    }
                    
                    // Update the PR in backend and global state
                    await actions.updatePRAsync(updatedPR)
                    
                    // Update local modal state
                    setSelectedPR(updatedPR)
                    
                    setShowEditModal(false)
                    setEditingTestCase(null)
                    
                  } catch (error) {
                    console.error('Error updating test case:', error)
                    actions.showNotification('Failed to update test case', 'error')
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Test Case Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter a descriptive test case name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Intent *
                  </label>
                  <input
                    type="text"
                    name="intent"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    value={formData.intent}
                    onChange={(e) => setFormData(prev => ({ ...prev, intent: e.target.value }))}
                    placeholder="What is the intent of this test?"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tags
                    </label>
                    <input
                      type="text"
                      name="tags"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      value={formData.tags}
                      onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="e.g. critical, api, login"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Source
                    </label>
                    <select
                      name="source"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      value={formData.source}
                      onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                    >
                      <option value="">Select source</option>
                      <option value="Manual">Manual</option>
                      <option value="Automated">Automated</option>
                      <option value="API">API</option>
                      <option value="UI">UI</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Details
                  </label>
                  <textarea
                    name="details"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    rows={3}
                    value={formData.details}
                    onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
                    placeholder="Additional details about this test case"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Test Steps
                  </label>
                  <textarea
                    name="testSteps"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    rows={3}
                    value={formData.testSteps}
                    onChange={(e) => setFormData(prev => ({ ...prev, testSteps: e.target.value }))}
                    placeholder="Step-by-step instructions for this test"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expected Results
                  </label>
                  <textarea
                    name="expectedResults"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    rows={2}
                    value={formData.expectedResults}
                    onChange={(e) => setFormData(prev => ({ ...prev, expectedResults: e.target.value }))}
                    placeholder="What should happen when this test passes?"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Local Branch Result
                    </label>
                    <select
                      name="localResult"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      value={formData.localResult}
                      onChange={(e) => setFormData(prev => ({ ...prev, localResult: e.target.value }))}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Pass">Pass</option>
                      <option value="Fail">Fail</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Main Branch Result
                    </label>
                    <select
                      name="mainResult"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      value={formData.mainResult}
                      onChange={(e) => setFormData(prev => ({ ...prev, mainResult: e.target.value }))}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Pass">Pass</option>
                      <option value="Fail">Fail</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false)
                      setEditingTestCase(null)
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={state.loading}
                  >
                    Update Test Case
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* PR Edit Modal */}
      {showPREditModal && editingPR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">✏️ Edit PR</h3>
              <p className="text-sm text-gray-500 mt-1">Update PR information and details</p>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault()
              handleSavePREdit()
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PR Title *</label>
                <input
                  type="text"
                  required
                  className="input"
                  value={prFormData.name}
                  onChange={(e) => setPRFormData(prev => ({...prev, name: e.target.value}))}
                  placeholder="Enter PR title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="textarea"
                  rows={4}
                  value={prFormData.description}
                  onChange={(e) => setPRFormData(prev => ({...prev, description: e.target.value}))}
                  placeholder="Describe the changes in this PR"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    className="select"
                    value={prFormData.priority}
                    onChange={(e) => setPRFormData(prev => ({...prev, priority: e.target.value}))}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Developer</label>
                  <input
                    type="text"
                    className="input"
                    value={prFormData.developer}
                    onChange={(e) => setPRFormData(prev => ({...prev, developer: e.target.value}))}
                    placeholder="GitHub username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Labels</label>
                <input
                  type="text"
                  className="input"
                  value={prFormData.labels}
                  onChange={(e) => setPRFormData(prev => ({...prev, labels: e.target.value}))}
                  placeholder="bug, feature, enhancement (comma-separated)"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancelPREdit}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={state.loading || !prFormData.name}
                >
                  {state.loading ? 'Updating...' : 'Update PR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard