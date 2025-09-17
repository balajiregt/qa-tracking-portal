import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQA } from '../contexts/QAContext'

function FailingTests() {
  const { state } = useQA()
  const [selectedTest, setSelectedTest] = useState(null)

  // Get all failing tests across all PRs
  const getFailingTests = () => {
    const failingTests = []
    
    state.prs.forEach(pr => {
      if (pr.associatedTestCases && pr.associatedTestCases.length > 0) {
        pr.associatedTestCases.forEach(testCase => {
          // Check if test is failing in local or main branch
          if (testCase.localResult === 'Fail' || testCase.mainResult === 'Fail') {
            failingTests.push({
              ...testCase,
              pr: {
                id: pr.id,
                name: pr.name,
                developer: pr.developer,
                status: pr.status,
                priority: pr.priority,
                environment: pr.environment
              },
              failureType: testCase.localResult === 'Fail' ? 'Local Branch' : 'Main Branch',
              bothFailing: testCase.localResult === 'Fail' && testCase.mainResult === 'Fail'
            })
          }
        })
      }
    })
    
    return failingTests
  }

  const failingTests = getFailingTests()

  // Group tests by PR
  const testsByPR = failingTests.reduce((acc, test) => {
    const prId = test.pr.id
    if (!acc[prId]) {
      acc[prId] = {
        pr: test.pr,
        tests: []
      }
    }
    acc[prId].tests.push(test)
    return acc
  }, {})

  const handleTestClick = (test) => {
    setSelectedTest(test)
  }

  const closeModal = () => {
    setSelectedTest(null)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Failing Tests</h1>
        <p className="text-gray-600">Review and track failed test cases across all PRs</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-danger-100 rounded-lg">
              <span className="text-2xl">❌</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Failing Tests</p>
              <p className="text-2xl font-semibold text-danger-600">{failingTests.length}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-warning-100 rounded-lg">
              <span className="text-2xl">🔄</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Affected PRs</p>
              <p className="text-2xl font-semibold text-warning-600">{Object.keys(testsByPR).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Failing Tests by PR */}
      {Object.keys(testsByPR).length > 0 ? (
        <div className="space-y-6">
          {Object.values(testsByPR).map((prGroup) => (
            <div key={prGroup.pr.id} className="card">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{prGroup.pr.name}</h3>
                    <div className="flex items-center mt-1 space-x-2">
                      <span className={`badge ${
                        prGroup.pr.status === 'blocked' ? 'badge-danger' :
                        prGroup.pr.status === 'testing' ? 'badge-warning' : 'badge-secondary'
                      }`}>
                        {prGroup.pr.status}
                      </span>
                      <span className={`badge ${
                        prGroup.pr.priority === 'urgent' ? 'badge-danger' :
                        prGroup.pr.priority === 'high' ? 'badge-warning' : 'badge-secondary'
                      }`}>
                        {prGroup.pr.priority}
                      </span>
                      <span className="text-sm text-gray-500">Developer: {prGroup.pr.developer}</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {prGroup.tests.length} failing test{prGroup.tests.length > 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Test Case
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tags
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Failure Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Source
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {prGroup.tests.map((test) => (
                        <tr key={`${test.pr.id}-${test.id}`} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{test.intent || test.name}</div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {test.description}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-wrap gap-1">
                              {(test.tags || []).slice(0, 2).map((tag, index) => (
                                <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                  {tag.replace('@', '')}
                                </span>
                              ))}
                              {(test.tags || []).length > 2 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                                  +{(test.tags || []).length - 2} more
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col space-y-1">
                              {test.localResult === 'Fail' && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Local Branch Failed
                                </span>
                              )}
                              {test.mainResult === 'Fail' && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  Main Branch Failed
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {test.source}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleTestClick(test)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              View Details
                            </button>
                            <Link
                              to={`/?pr=${test.pr.id}`}
                              className="text-green-600 hover:text-green-900"
                            >
                              Go to PR
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <span className="text-6xl">✅</span>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No Failing Tests</h3>
          <p className="mt-2 text-sm text-gray-500">
            All test cases are passing or pending. Great work!
          </p>
          <div className="mt-6">
            <Link to="/" className="btn btn-primary">
              Back to Dashboard
            </Link>
          </div>
        </div>
      )}

      {/* Test Details Modal */}
      {selectedTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl max-h-[90vh] overflow-y-auto w-full">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedTest.intent || selectedTest.name}</h2>
                  <p className="text-sm text-gray-600">{selectedTest.description}</p>
                </div>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* PR Information */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Associated PR</h3>
                <div className="flex items-center space-x-4">
                  <span className="font-medium text-gray-900">{selectedTest.pr.name}</span>
                  <span className={`badge ${
                    selectedTest.pr.status === 'blocked' ? 'badge-danger' :
                    selectedTest.pr.status === 'testing' ? 'badge-warning' : 'badge-secondary'
                  }`}>
                    {selectedTest.pr.status}
                  </span>
                  <span className="text-sm text-gray-500">Developer: {selectedTest.pr.developer}</span>
                </div>
              </div>

              {/* Test Results */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="card p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">🌟 Local Branch Result</h3>
                  <span className={`badge ${
                    selectedTest.localResult === 'Pass' ? 'badge-success' :
                    selectedTest.localResult === 'Fail' ? 'badge-danger' : 'badge-warning'
                  }`}>
                    {selectedTest.localResult || 'Pending'}
                  </span>
                </div>

                <div className="card p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">🏠 Main Branch Result</h3>
                  <span className={`badge ${
                    selectedTest.mainResult === 'Pass' ? 'badge-success' :
                    selectedTest.mainResult === 'Fail' ? 'badge-danger' : 'badge-warning'
                  }`}>
                    {selectedTest.mainResult || 'Pending'}
                  </span>
                </div>
              </div>

              {/* Test Details */}
              <div className="space-y-4 mb-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {(selectedTest.tags || []).map((tag, index) => (
                      <span key={index} className="badge badge-secondary">
                        {tag.replace('@', '')}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedTest.bdd_steps && selectedTest.bdd_steps.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Test Steps</h3>
                    <div className="space-y-2">
                      {selectedTest.bdd_steps.map((step, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            step.type === 'given' ? 'bg-blue-100 text-blue-800' :
                            step.type === 'when' ? 'bg-yellow-100 text-yellow-800' :
                            step.type === 'then' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {step.type.toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-700">{step.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={closeModal}
                  className="btn btn-secondary"
                >
                  Close
                </button>
                <Link
                  to={`/?pr=${selectedTest.pr.id}`}
                  className="btn btn-primary"
                  onClick={closeModal}
                >
                  Go to PR
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FailingTests