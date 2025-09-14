import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQA } from '../contexts/QAContext'

function CreatePR() {
  const { state, actions } = useQA()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    prUrl: '',
    assignee: '',
    testCases: [],
    priority: 'Medium',
    labels: '',
    branch: '',
    baseBranch: 'main'
  })
  
  const [selectedTestCases, setSelectedTestCases] = useState([])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleTestCaseToggle = (testCaseId) => {
    setSelectedTestCases(prev => {
      if (prev.includes(testCaseId)) {
        return prev.filter(id => id !== testCaseId)
      } else {
        return [...prev, testCaseId]
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const prData = {
      name: formData.title, // API expects 'name' not 'title'
      developer: formData.assignee || 'user_005', // API expects 'developer' field
      description: formData.description,
      priority: formData.priority.toLowerCase(), // API expects lowercase
      environment: 'staging', // Default environment
      branch: formData.branch,
      baseBranch: formData.baseBranch,
      testCases: selectedTestCases,
      status: 'Open',
      createdAt: new Date().toISOString(),
      labels: formData.labels.split(',').map(label => label.trim()).filter(Boolean)
    }

    try {
      await actions.createPR(prData)
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        prUrl: '',
        assignee: '',
        testCases: [],
        priority: 'Medium',
        labels: '',
        branch: '',
        baseBranch: 'main'
      })
      setSelectedTestCases([])
      
    } catch (error) {
      console.error('Error creating PR:', error)
    }
  }

  // Show all test cases for mapping, with branch-specific results
  const availableTestCases = state.testCases.map(tc => ({
    ...tc,
    // Add branch-specific test results tracking
    branchResults: {
      local: tc.localResult || tc.result || 'Pending',
      main: tc.mainResult || 'Pending'
    }
  }))

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Pull Request</h1>
        <p className="text-gray-600">Create a new PR and associate it with test cases</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PR Title *
              </label>
              <input
                type="text"
                name="title"
                required
                className="input"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter PR title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                className="textarea"
                rows={4}
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the changes in this PR"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Feature Branch *
                </label>
                <input
                  type="text"
                  name="branch"
                  required
                  className="input"
                  value={formData.branch}
                  onChange={handleInputChange}
                  placeholder="feature/user-authentication"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base Branch
                </label>
                <select
                  name="baseBranch"
                  className="select"
                  value={formData.baseBranch}
                  onChange={handleInputChange}
                >
                  <option value="main">main</option>
                  <option value="develop">develop</option>
                  <option value="staging">staging</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PR URL
                </label>
                <input
                  type="url"
                  name="prUrl"
                  className="input"
                  value={formData.prUrl}
                  onChange={handleInputChange}
                  placeholder="https://github.com/repo/pull/123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assignee
                </label>
                <input
                  type="text"
                  name="assignee"
                  className="input"
                  value={formData.assignee}
                  onChange={handleInputChange}
                  placeholder="GitHub username"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  name="priority"
                  className="select"
                  value={formData.priority}
                  onChange={handleInputChange}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Labels
                </label>
                <input
                  type="text"
                  name="labels"
                  className="input"
                  value={formData.labels}
                  onChange={handleInputChange}
                  placeholder="bug, feature, enhancement (comma-separated)"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Associated Test Cases */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Associate Test Cases
          </h2>
          
          {availableTestCases.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  Select test cases to track for this PR ({selectedTestCases.length} selected)
                </p>
                <div className="text-xs text-gray-500">
                  <span className="mr-3">🟢 = Local Branch</span>
                  <span>🔴 = Main Branch</span>
                </div>
              </div>
              
              <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-2">
                {availableTestCases.map((testCase) => (
                  <div
                    key={testCase.id}
                    className="flex items-center p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      id={`test-${testCase.id}`}
                      checked={selectedTestCases.includes(testCase.id)}
                      onChange={() => handleTestCaseToggle(testCase.id)}
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
                            {testCase.tags && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                {testCase.tags}
                              </span>
                            )}
                            {testCase.source && (
                              <span className="text-xs text-gray-500">
                                {testCase.source}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          {/* Local Branch Result */}
                          <div className="text-center">
                            <div className="text-xs text-gray-500">Local</div>
                            {testCase.branchResults.local === 'Pass' && (
                              <span className="badge badge-success text-xs">Pass</span>
                            )}
                            {testCase.branchResults.local === 'Fail' && (
                              <span className="badge badge-danger text-xs">Fail</span>
                            )}
                            {testCase.branchResults.local === 'Pending' && (
                              <span className="badge badge-warning text-xs">Pending</span>
                            )}
                          </div>
                          
                          {/* Main Branch Result */}
                          <div className="text-center">
                            <div className="text-xs text-gray-500">Main</div>
                            {testCase.branchResults.main === 'Pass' && (
                              <span className="badge badge-success text-xs">Pass</span>
                            )}
                            {testCase.branchResults.main === 'Fail' && (
                              <span className="badge badge-danger text-xs">Fail</span>
                            )}
                            {testCase.branchResults.main === 'Pending' && (
                              <span className="badge badge-warning text-xs">Expected Fail</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <span className="text-4xl">📋</span>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No test cases available
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Create test cases first to associate them with PRs.
              </p>
              <Link to="/test-cases?action=new" className="text-primary-600 hover:text-primary-500 text-sm">
                Create your first test case →
              </Link>
            </div>
          )}
        </div>

        {/* PR Preview */}
        {(formData.title || formData.description || selectedTestCases.length > 0) && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Preview</h2>
            
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              {formData.title && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Title:</p>
                  <p className="text-gray-900">{formData.title}</p>
                </div>
              )}
              
              {formData.description && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Description:</p>
                  <p className="text-gray-900 whitespace-pre-wrap">{formData.description}</p>
                </div>
              )}
              
              {selectedTestCases.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Associated Test Cases ({selectedTestCases.length}):
                  </p>
                  <ul className="mt-1 space-y-1">
                    {selectedTestCases.map(tcId => {
                      const testCase = availableTestCases.find(tc => tc.id === tcId)
                      return testCase ? (
                        <li key={tcId} className="text-sm text-gray-700">
                          • {testCase.intent}
                        </li>
                      ) : null
                    })}
                  </ul>
                </div>
              )}
              
              <div className="flex items-center space-x-4 pt-2">
                <span className={`badge ${
                  formData.priority === 'Critical' ? 'badge-danger' :
                  formData.priority === 'High' ? 'badge-warning' :
                  formData.priority === 'Medium' ? 'badge-primary' : 'badge-secondary'
                }`}>
                  {formData.priority} Priority
                </span>
                
                {formData.labels && formData.labels.split(',').map(label => label.trim()).filter(Boolean).map((label, index) => (
                  <span key={index} className="badge badge-secondary">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => {
              setFormData({
                title: '',
                description: '',
                prUrl: '',
                assignee: '',
                testCases: [],
                priority: 'Medium',
                labels: '',
                branch: '',
                baseBranch: 'main'
              })
              setSelectedTestCases([])
            }}
            className="btn btn-secondary"
          >
            Clear Form
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={state.loading || !formData.title}
          >
            {state.loading ? 'Creating...' : 'Create PR'}
          </button>
        </div>
      </form>

      {/* Recent PRs */}
      {state.prs.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent PRs</h2>
          <div className="space-y-3">
            {state.prs.slice(0, 3).map((pr) => (
              <div key={pr.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{pr.title}</p>
                  <p className="text-sm text-gray-500">
                    {pr.assignee && `Assigned to: ${pr.assignee}`}
                    {pr.testCases?.length > 0 && ` • ${pr.testCases.length} test cases`}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`badge ${
                    pr.status === 'Open' ? 'badge-success' :
                    pr.status === 'Merged' ? 'badge-primary' : 'badge-secondary'
                  }`}>
                    {pr.status}
                  </span>
                  {pr.prUrl && (
                    <a
                      href={pr.prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-500 text-sm"
                    >
                      View →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default CreatePR