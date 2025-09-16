import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQA } from '../contexts/QAContext'

function EnvironmentDashboard() {
  const { state, actions } = useQA()
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [showTestAssociation, setShowTestAssociation] = useState(false)
  const [selectedTestCases, setSelectedTestCases] = useState([])

  // Get associated test cases for each JIRA ticket
  const getAssociatedTestCases = (ticketId) => {
    // For now, get from localStorage - later this would come from backend
    const ticketData = JSON.parse(localStorage.getItem('jiraTickets') || '[]')
    const ticket = ticketData.find(t => t.id === ticketId)
    return ticket?.associatedTestCases || []
  }

  // Mock JIRA tickets data - this would come from JIRA integration
  const jiraTickets = [
    {
      id: "PROJ-123",
      title: "User Authentication Enhancement",
      description: "Improve login flow with 2FA support",
      type: "Story",
      priority: "High",
      status: "In Testing",
      assignee: "John Developer",
      environment: "qa",
      testProgress: {
        qa: { total: 8, passed: 5, failed: 1, pending: 2, status: "In Progress" },
        uat: { total: 0, passed: 0, failed: 0, pending: 0, status: "Pending" },
        production: { total: 0, passed: 0, failed: 0, pending: 0, status: "Not Started" }
      },
      associatedTestCases: [
        { id: "tc_001", name: "Login with 2FA", status: "Pass", environment: "qa" },
        { id: "tc_002", name: "Password Reset", status: "Pass", environment: "qa" },
        { id: "tc_003", name: "Account Lockout", status: "Fail", environment: "qa" }
      ]
    },
    {
      id: "PROJ-124", 
      title: "Payment Gateway Integration",
      description: "Integrate new payment processor",
      type: "Feature",
      priority: "Medium",
      status: "Ready for UAT",
      assignee: "Sarah Developer",
      environment: "uat",
      testProgress: {
        qa: { total: 12, passed: 12, failed: 0, pending: 0, status: "Completed" },
        uat: { total: 6, passed: 2, failed: 0, pending: 4, status: "In Progress" },
        production: { total: 0, passed: 0, failed: 0, pending: 0, status: "Not Started" }
      }
    },
    {
      id: "PROJ-125",
      title: "Database Performance Optimization", 
      description: "Optimize slow queries and indexing",
      type: "Task",
      priority: "Low",
      status: "Development",
      assignee: "Mike Developer",
      environment: "qa",
      testProgress: {
        qa: { total: 0, passed: 0, failed: 0, pending: 0, status: "Not Started" },
        uat: { total: 0, passed: 0, failed: 0, pending: 0, status: "Not Started" },
        production: { total: 0, passed: 0, failed: 0, pending: 0, status: "Not Started" }
      }
    }
  ]

  const getEnvironmentBadgeColor = (env, status) => {
    if (status === "Completed") return "badge-success"
    if (status === "In Progress") return "badge-warning" 
    if (status === "Failed") return "badge-danger"
    return "badge-secondary"
  }

  const getProgressPercentage = (progress) => {
    if (progress.total === 0) return 0
    return Math.round((progress.passed / progress.total) * 100)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QA Dashboard</h1>
          <p className="text-gray-600">Environment-based testing workflow • Track JIRA tickets through QA pipeline</p>
        </div>
        <div className="flex space-x-3">
          <Link to="/create-ticket" className="btn btn-primary">
            Import JIRA Ticket
          </Link>
          <Link to="/test-cases" className="btn btn-secondary">
            Manage Test Cases
          </Link>
        </div>
      </div>

      {/* Environment Pipeline Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {state.project.environments.map((env, index) => {
          const envTickets = jiraTickets.filter(ticket => 
            ticket.environment === env || 
            (env === 'qa' && ['Development', 'In Testing'].includes(ticket.status)) ||
            (env === 'uat' && ['Ready for UAT', 'UAT Testing'].includes(ticket.status)) ||
            (env === 'production' && ['Ready for Production'].includes(ticket.status))
          )

          return (
            <div key={env} className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold capitalize">{env} Environment</h3>
                <span className="badge badge-secondary">{envTickets.length} tickets</span>
              </div>
              
              <div className="space-y-2">
                {envTickets.slice(0, 3).map(ticket => (
                  <div key={ticket.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{ticket.id}</p>
                      <p className="text-xs text-gray-500 truncate max-w-32">{ticket.title}</p>
                    </div>
                    <span className={`badge ${getEnvironmentBadgeColor(env, ticket.testProgress[env]?.status)}`}>
                      {ticket.testProgress[env]?.status || 'Not Started'}
                    </span>
                  </div>
                ))}
                {envTickets.length > 3 && (
                  <p className="text-xs text-gray-500 text-center">+{envTickets.length - 3} more</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Active JIRA Tickets */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Active JIRA Tickets</h2>
          <p className="text-sm text-gray-600">Track testing progress across environments</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Environment Pipeline
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Test Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jiraTickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg ${
                        ticket.type === 'Story' ? 'bg-green-100' :
                        ticket.type === 'Feature' ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        <span className="text-sm font-medium">
                          {ticket.type === 'Story' ? '📖' : 
                           ticket.type === 'Feature' ? '⭐' : '📝'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{ticket.id}</p>
                        <p className="text-sm text-gray-600 max-w-xs truncate">{ticket.title}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`badge ${
                            ticket.priority === 'High' ? 'badge-danger' :
                            ticket.priority === 'Medium' ? 'badge-warning' : 'badge-secondary'
                          }`}>
                            {ticket.priority}
                          </span>
                          <span className="text-xs text-gray-500">{ticket.assignee}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {state.project.environments.map((env, index) => (
                        <React.Fragment key={env}>
                          <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                              ticket.testProgress[env]?.status === 'Completed' ? 'bg-green-100 text-green-800' :
                              ticket.testProgress[env]?.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                              ticket.testProgress[env]?.status === 'Failed' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-500'
                            }`}>
                              {env.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs text-gray-500 mt-1">{env}</span>
                          </div>
                          {index < state.project.environments.length - 1 && (
                            <div className="w-4 h-0.5 bg-gray-300"></div>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {Object.entries(ticket.testProgress).map(([env, progress]) => (
                        progress.total > 0 && (
                          <div key={env} className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500 w-12 capitalize">{env}:</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  progress.failed > 0 ? 'bg-red-500' : 
                                  progress.passed === progress.total ? 'bg-green-500' : 'bg-yellow-500'
                                }`}
                                style={{ width: `${getProgressPercentage(progress)}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-600">
                              {progress.passed}/{progress.total}
                            </span>
                          </div>
                        )
                      ))}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setSelectedTicket(ticket)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      View Details
                    </button>
                    <Link
                      to={`/test-execution/${ticket.id}`}
                      className="text-green-600 hover:text-green-900"
                    >
                      Execute Tests
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions for Environment Testing */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link
          to="/environment-status"
          className="card p-6 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <span className="text-xl">🏢</span>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">Environment Status</h3>
              <p className="text-xs text-gray-500">Check environment health</p>
            </div>
          </div>
        </Link>

        <Link
          to="/test-execution"
          className="card p-6 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <span className="text-xl">🧪</span>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">Execute Tests</h3>
              <p className="text-xs text-gray-500">Run environment tests</p>
            </div>
          </div>
        </Link>

        <Link
          to="/analytics"
          className="card p-6 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full">
              <span className="text-xl">📊</span>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">Analytics</h3>
              <p className="text-xs text-gray-500">Environment testing metrics</p>
            </div>
          </div>
        </Link>

        <Link
          to="/failing-tests"
          className="card p-6 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-full">
              <span className="text-xl">❌</span>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">Failing Tests</h3>
              <p className="text-xs text-gray-500">Environment failures</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedTicket.id}</h2>
                  <p className="text-gray-600">{selectedTicket.title}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedTicket(null)
                    setShowTestAssociation(false)
                    setSelectedTestCases([])
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => setShowTestAssociation(true)}
                  className="btn btn-primary flex items-center justify-center"
                >
                  <span className="mr-2">➕</span>
                  Add Test Case
                </button>
                <Link
                  to={`/test-cases?ticket=${selectedTicket.id}`}
                  className="btn btn-secondary flex items-center justify-center"
                  onClick={() => setSelectedTicket(null)}
                >
                  <span className="mr-2">📋</span>
                  Manage Test Cases
                </Link>
              </div>

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
                        Select test cases to track for this JIRA ticket ({selectedTestCases.length} selected)
                      </p>
                    </div>
                    
                    {state.testCases && state.testCases.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {state.testCases
                          .filter(testCase => 
                            testCase.projectName === state.project?.name || 
                            testCase.projectId === state.project?.id ||
                            (!testCase.projectName && !testCase.projectId)
                          )
                          .map((testCase) => (
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
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <span className="text-4xl">🧪</span>
                        <p className="mt-2">No test cases available</p>
                        <p className="text-sm">Create test cases first to associate them with this ticket</p>
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
                              
                              // Update ticket in localStorage with associated test cases
                              const existingTickets = JSON.parse(localStorage.getItem('jiraTickets') || '[]')
                              const ticketIndex = existingTickets.findIndex(t => t.id === selectedTicket.id)
                              
                              if (ticketIndex !== -1) {
                                existingTickets[ticketIndex] = {
                                  ...existingTickets[ticketIndex],
                                  associatedTestCases: [
                                    ...(existingTickets[ticketIndex].associatedTestCases || []),
                                    ...testCasesToAssociate.filter(tc => 
                                      !existingTickets[ticketIndex].associatedTestCases?.some(existing => existing.id === tc.id)
                                    )
                                  ]
                                }
                                localStorage.setItem('jiraTickets', JSON.stringify(existingTickets))
                                
                                // Update local modal state
                                setSelectedTicket({
                                  ...selectedTicket,
                                  associatedTestCases: existingTickets[ticketIndex].associatedTestCases
                                })
                              }
                              
                              setShowTestAssociation(false)
                              setSelectedTestCases([])
                              actions.showNotification('Test cases associated successfully!', 'success')
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Ticket Information</h3>
                  <div className="space-y-2">
                    <p><strong>Type:</strong> {selectedTicket.type}</p>
                    <p><strong>Priority:</strong> {selectedTicket.priority}</p>
                    <p><strong>Assignee:</strong> {selectedTicket.assignee}</p>
                    <p><strong>Status:</strong> {selectedTicket.status}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Environment Progress</h3>
                  <div className="space-y-3">
                    {Object.entries(selectedTicket.testProgress).map(([env, progress]) => (
                      <div key={env} className="border rounded p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium capitalize">{env}</span>
                          <span className={`badge ${getEnvironmentBadgeColor(env, progress.status)}`}>
                            {progress.status}
                          </span>
                        </div>
                        {progress.total > 0 && (
                          <div className="text-sm text-gray-600">
                            Passed: {progress.passed} | Failed: {progress.failed} | Pending: {progress.pending}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Associated Test Cases */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">📋 Associated Test Cases</h3>
                {selectedTicket.associatedTestCases && selectedTicket.associatedTestCases.length > 0 ? (
                  <div className="bg-white border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Intent</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Environment</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedTicket.associatedTestCases.map((testCase) => (
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
                                <span className="badge badge-secondary">
                                  {testCase.environment || 'qa'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  testCase.status === 'Pass' ? 'bg-green-100 text-green-800' :
                                  testCase.status === 'Fail' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {testCase.status || 'Pending'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <Link
                                  to={`/test-cases?edit=${testCase.id}&ticket=${selectedTicket.id}`}
                                  className="text-blue-600 hover:text-blue-900"
                                  onClick={() => setSelectedTicket(null)}
                                >
                                  Edit
                                </Link>
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
                    <p className="text-sm">Click "Add Test Case" above to associate test cases with this JIRA ticket</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="btn btn-secondary"
                >
                  Close
                </button>
                <Link
                  to={`/test-execution/${selectedTicket.id}`}
                  className="btn btn-primary"
                >
                  Execute Tests
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EnvironmentDashboard