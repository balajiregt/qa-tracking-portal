import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQA } from '../contexts/QAContext'

function Dashboard() {
  const { state } = useQA()
  const [selectedPR, setSelectedPR] = useState(null)
  
  // Focus on PR Testing Progress with Branch-Specific Data
  const prsWithTestProgress = state.prs.map(pr => {
    // Use actual test results from PR data
    const testResults = pr.test_results || []
    const totalTests = testResults.length
    
    // Count test results by status
    const passedTests = testResults.filter(tr => tr.status === 'passed').length
    const failedTests = testResults.filter(tr => tr.status === 'failed').length
    const pendingTests = totalTests - passedTests - failedTests
    
    // Branch test counts from branch_comparison data
    const featureBranchPassed = pr.branch_comparison?.feature_branch?.tests_passed || 0
    const featureBranchFailed = pr.branch_comparison?.feature_branch?.tests_failed || 0
    const mainBranchPassed = pr.branch_comparison?.main_branch?.tests_passed || 0
    const mainBranchFailed = pr.branch_comparison?.main_branch?.tests_failed || 0
    
    // Overall progress calculation
    const progress = pr.progress || 0
    const localProgress = totalTests > 0 ? (passedTests / totalTests) * 100 : progress
    
    // Determine if ready to merge based on status and merge_readiness
    const readyToMerge = pr.status === 'ready' || pr.merge_readiness?.ready_for_merge || false
    
    return {
      ...pr,
      totalTests,
      // Test result stats
      passedTests,
      failedTests,
      pendingTests,
      // Branch stats  
      localPassedTests: featureBranchPassed,
      localFailedTests: featureBranchFailed,
      localPendingTests: 0,
      mainPassedTests: mainBranchPassed,
      mainFailedTests: mainBranchFailed,
      mainPendingTests: 0,
      // Overall progress
      testProgress: progress,
      localProgress,
      readyToMerge
    }
  })

  // Filter PRs by status for different views
  const openPRs = prsWithTestProgress.filter(pr => pr.status !== 'merged' && pr.status !== 'closed')
  const readyToMergePRs = prsWithTestProgress.filter(pr => pr.status === 'ready')
  const blockedPRs = prsWithTestProgress.filter(pr => pr.status === 'blocked')
  
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/create-pr"
            className="btn btn-primary btn-lg flex items-center justify-center"
          >
            <span className="mr-2">🔄</span>
            Create PR
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
                    <div className="ml-4">
                      <button 
                        onClick={() => setSelectedPR(pr)}
                        className="btn btn-primary btn-sm mr-2"
                      >
                        View Details
                      </button>
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
                      <h3 className="font-medium text-gray-900">{pr.name}</h3>
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
                    <div className="ml-4">
                      <button 
                        onClick={() => setSelectedPR(pr)}
                        className="btn btn-primary btn-sm mr-2"
                      >
                        View Details
                      </button>
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
        {openPRs.filter(pr => pr.status === 'testing' || pr.status === 'new').length > 0 && (
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
                      <h3 className="font-medium text-gray-900">{pr.name}</h3>
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
                    <div className="ml-4">
                      <button 
                        onClick={() => setSelectedPR(pr)}
                        className="btn btn-primary btn-sm mr-2"
                      >
                        View Details
                      </button>
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
                </div>
                <button
                  onClick={() => setSelectedPR(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <Link
                  to={`/test-cases?pr=${selectedPR.id}`}
                  className="btn btn-primary flex items-center justify-center"
                  onClick={() => setSelectedPR(null)}
                >
                  <span className="mr-2">➕</span>
                  Add Test Case
                </Link>
                <Link
                  to={`/upload-traces?pr=${selectedPR.id}`}
                  className="btn btn-secondary flex items-center justify-center"
                  onClick={() => setSelectedPR(null)}
                >
                  <span className="mr-2">📎</span>
                  Add Traces
                </Link>
              </div>

              {/* Branch Comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="card p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    🌟 Feature Branch: {selectedPR.branch_comparison?.feature_branch?.name || selectedPR.name}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Tests Passed</span>
                      <span className="badge badge-success">{selectedPR.branch_comparison?.feature_branch?.tests_passed || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Tests Failed</span>
                      <span className="badge badge-danger">{selectedPR.branch_comparison?.feature_branch?.tests_failed || 0}</span>
                    </div>
                    {selectedPR.branch_comparison?.feature_branch?.tests_skipped > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Tests Skipped</span>
                        <span className="badge badge-secondary">{selectedPR.branch_comparison.feature_branch.tests_skipped}</span>
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
                      <span className="badge badge-success">{selectedPR.branch_comparison?.main_branch?.tests_passed || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Tests Failed</span>
                      <span className="badge badge-danger">{selectedPR.branch_comparison?.main_branch?.tests_failed || 0}</span>
                    </div>
                  </div>
                </div>
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
    </div>
  )
}

export default Dashboard