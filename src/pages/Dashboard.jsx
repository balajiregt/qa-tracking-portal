import React from 'react'
import { Link } from 'react-router-dom'
import { useQA } from '../contexts/QAContext'

function Dashboard() {
  const { state } = useQA()
  
  // Focus on PR Testing Progress with Branch-Specific Data
  const prsWithTestProgress = state.prs.map(pr => {
    const associatedTests = state.testCases.filter(tc => 
      pr.testCases?.includes(tc.id)
    )
    
    const totalTests = associatedTests.length
    
    // Local branch results
    const localPassedTests = associatedTests.filter(tc => tc.localResult === 'Pass').length
    const localFailedTests = associatedTests.filter(tc => tc.localResult === 'Fail').length
    const localPendingTests = associatedTests.filter(tc => tc.localResult === 'Pending' || !tc.localResult).length
    
    // Main branch results (expected to fail for new features)
    const mainPassedTests = associatedTests.filter(tc => tc.mainResult === 'Pass').length
    const mainFailedTests = associatedTests.filter(tc => tc.mainResult === 'Fail').length
    const mainPendingTests = associatedTests.filter(tc => tc.mainResult === 'Pending' || !tc.mainResult).length
    
    // Overall progress calculation
    const localProgress = totalTests > 0 ? (localPassedTests / totalTests) * 100 : 0
    const testProgress = localProgress // Use local branch progress as main indicator
    
    // Determine if ready to merge (all local tests pass, main tests fail as expected)
    const readyToMerge = totalTests > 0 && 
      localFailedTests === 0 && 
      localPendingTests === 0 && 
      localPassedTests === totalTests
    
    return {
      ...pr,
      associatedTests,
      totalTests,
      // Local branch stats
      localPassedTests,
      localFailedTests,
      localPendingTests,
      // Main branch stats  
      mainPassedTests,
      mainFailedTests,
      mainPendingTests,
      // Overall progress
      testProgress,
      localProgress,
      readyToMerge,
      // Legacy compatibility
      passedTests: localPassedTests,
      failedTests: localFailedTests,
      pendingTests: localPendingTests
    }
  })

  // Filter PRs by status for different views
  const openPRs = prsWithTestProgress.filter(pr => pr.status === 'Open')
  const readyToMergePRs = prsWithTestProgress.filter(pr => pr.readyToMerge && pr.status === 'Open')
  const blockedPRs = prsWithTestProgress.filter(pr => pr.failedTests > 0)
  
  // Summary statistics
  const stats = {
    totalPRs: state.prs.length,
    openPRs: openPRs.length,
    readyToMerge: readyToMergePRs.length,
    blockedPRs: blockedPRs.length,
    totalTests: state.testCases.length
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">PR Testing Dashboard</h1>
        <p className="text-gray-600">Track testing progress for PRs in pre-merge process</p>
      </div>

      {/* PR Status Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/create-pr"
            className="btn btn-primary btn-lg flex items-center justify-center"
          >
            <span className="mr-2">🔄</span>
            Create PR
          </Link>
          <Link
            to="/test-cases?action=new"
            className="btn btn-secondary btn-lg flex items-center justify-center"
          >
            <span className="mr-2">➕</span>
            Add Test Case
          </Link>
          <Link
            to="/analytics"
            className="btn btn-secondary btn-lg flex items-center justify-center"
          >
            <span className="mr-2">📈</span>
            View Analytics
          </Link>
        </div>
      </div>

      {/* PR Testing Progress */}
      <div className="space-y-6">
        {/* Ready to Merge PRs */}
        {readyToMergePRs.length > 0 && (
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
                      <h3 className="font-medium text-gray-900">{pr.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{pr.description}</p>
                      <div className="flex items-center mt-2 space-x-2">
                        <span className="badge badge-success">{pr.localPassedTests}/{pr.totalTests} local tests passed</span>
                        <span className="badge badge-danger">{pr.mainFailedTests}/{pr.totalTests} main tests failed</span>
                        {pr.assignee && (
                          <span className="text-sm text-gray-500">Assignee: {pr.assignee}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Progress: {Math.round(pr.localProgress)}% complete • Branch: {pr.branch || 'feature'}
                      </div>
                    </div>
                    <div className="ml-4">
                      {pr.prUrl ? (
                        <a href={pr.prUrl} target="_blank" rel="noopener noreferrer" 
                           className="btn btn-success btn-sm">
                          Merge →
                        </a>
                      ) : (
                        <button className="btn btn-success btn-sm">Ready</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Blocked PRs */}
        {blockedPRs.length > 0 && (
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
                      <h3 className="font-medium text-gray-900">{pr.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{pr.description}</p>
                      <div className="flex items-center mt-2 space-x-2">
                        <span className="badge badge-danger">{pr.localFailedTests} local tests failed</span>
                        {pr.localPassedTests > 0 && (
                          <span className="badge badge-success">{pr.localPassedTests} local tests passed</span>
                        )}
                        <span className="badge badge-secondary">{pr.totalTests} total tests</span>
                        {pr.assignee && (
                          <span className="text-sm text-gray-500">Assignee: {pr.assignee}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Branch: {pr.branch || 'feature'} → {pr.baseBranch || 'main'}
                      </div>
                    </div>
                    <div className="ml-4">
                      <Link to="/test-cases" className="btn btn-danger btn-sm">
                        Fix Tests
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* In Progress PRs */}
        {openPRs.filter(pr => pr.totalTests > 0 && !pr.readyToMerge && pr.failedTests === 0).length > 0 && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-warning-700">⏳ Testing in Progress</h2>
              <span className="badge badge-warning">
                {openPRs.filter(pr => pr.totalTests > 0 && !pr.readyToMerge && pr.failedTests === 0).length} PRs
              </span>
            </div>
            
            <div className="space-y-4">
              {openPRs.filter(pr => pr.totalTests > 0 && !pr.readyToMerge && pr.failedTests === 0).map((pr) => (
                <div key={pr.id} className="bg-warning-50 border border-warning-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{pr.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{pr.description}</p>
                      <div className="flex items-center mt-2 space-x-2">
                        <span className="badge badge-success">{pr.localPassedTests} local passed</span>
                        <span className="badge badge-warning">{pr.localPendingTests} local pending</span>
                        <span className="badge badge-secondary">{pr.totalTests} total</span>
                        {pr.assignee && (
                          <span className="text-sm text-gray-500">Assignee: {pr.assignee}</span>
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
                        <p className="text-xs text-gray-500">Branch: {pr.branch || 'feature'} → {pr.baseBranch || 'main'}</p>
                      </div>
                    </div>
                    <div className="ml-4">
                      <Link to="/test-cases" className="btn btn-warning btn-sm">
                        Continue Testing
                      </Link>
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
    </div>
  )
}

export default Dashboard