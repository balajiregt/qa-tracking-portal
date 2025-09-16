import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQA } from '../contexts/QAContext'

function TestCases() {
  const { state, actions } = useQA()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showModal, setShowModal] = useState(false)
  const [editingTestCase, setEditingTestCase] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    intent: '',
    tags: '',
    source: '',
    details: '',
    testSteps: '',
    expectedResults: ''
  })

  // Get project-specific context
  const isEnvironmentBased = state.project?.workflowType === 'environment_based'
  const projectName = state.project?.name || 'Unknown Project'

  // Check if we should open the modal from URL params
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setShowModal(true)
      setSearchParams({}) // Clear the URL param
    }
  }, [searchParams, setSearchParams])

  // Filter test cases based on current filters and project scope
  const filteredTestCases = state.testCases.filter(testCase => {
    const filters = state.filters.testCases
    
    // Only show test cases for current project
    const isProjectTestCase = testCase.projectId === state.project?.id || 
                             testCase.projectName === projectName ||
                             (!testCase.projectId && !testCase.projectName) // Legacy test cases
    
    return isProjectTestCase && (
      (!filters.search || 
        testCase.intent?.toLowerCase().includes(filters.search.toLowerCase()) ||
        testCase.details?.toLowerCase().includes(filters.search.toLowerCase())) &&
      (!filters.tags || testCase.tags?.includes(filters.tags)) &&
      (!filters.intent || testCase.intent?.includes(filters.intent)) &&
      (!filters.source || testCase.source === filters.source)
    )
  })

  const handleFilterChange = (key, value) => {
    actions.updateFilters('testCases', { [key]: value })
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingTestCase) {
        await actions.updateTestCaseAsync(editingTestCase.id, formData)
      } else {
        // Transform form data to match API expectations with project context
        const apiData = {
          name: formData.name,
          tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
          description: formData.details,
          intent: formData.intent,
          duration: 2000, // Default duration
          // Add project context
          projectId: state.project?.id || `project_${Date.now()}`,
          projectName: projectName,
          workflowType: state.project?.workflowType,
          bddSteps: [
            { type: 'given', text: `Given ${formData.testSteps}`, formatted: `Given ${formData.testSteps}` },
            { type: 'when', text: 'When user performs the action', formatted: 'When user performs the action' },
            { type: 'then', text: `Then ${formData.expectedResults}`, formatted: `Then ${formData.expectedResults}` }
          ]
        }
        await actions.createTestCase(apiData)
      }
      resetForm()
      setShowModal(false)
    } catch (error) {
      console.error('Error saving test case:', error)
    }
  }

  const handleEdit = (testCase) => {
    setEditingTestCase(testCase)
    setFormData({
      name: testCase.name || '',
      intent: testCase.intent || '',
      tags: testCase.tags || '',
      source: testCase.source || '',
      details: testCase.details || '',
      testSteps: testCase.testSteps || '',
      expectedResults: testCase.expectedResults || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (testCaseId) => {
    if (confirm('Are you sure you want to delete this test case?')) {
      try {
        await actions.deleteTestCaseAsync(testCaseId)
      } catch (error) {
        console.error('Error deleting test case:', error)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      intent: '',
      tags: '',
      source: '',
      details: '',
      testSteps: '',
      expectedResults: ''
    })
    setEditingTestCase(null)
  }

  const closeModal = () => {
    setShowModal(false)
    resetForm()
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Test Cases</h1>
          <div className="flex items-center space-x-3 mt-1">
            <p className="text-gray-600">
              {isEnvironmentBased ? 'Environment-based test cases' : 'PR-centric test cases'} for {projectName}
            </p>
            <span className={`badge ${isEnvironmentBased ? 'badge-success' : 'badge-primary'}`}>
              {isEnvironmentBased ? 'Environment Workflow' : 'PR Workflow'}
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary"
        >
          <span className="mr-2">➕</span>
          Add Test Case
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              className="input"
              placeholder="Search test cases..."
              value={state.filters.testCases.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <input
              type="text"
              className="input"
              placeholder="Filter by tags"
              value={state.filters.testCases.tags}
              onChange={(e) => handleFilterChange('tags', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Intent
            </label>
            <input
              type="text"
              className="input"
              placeholder="Filter by intent"
              value={state.filters.testCases.intent}
              onChange={(e) => handleFilterChange('intent', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Source
            </label>
            <select
              className="select"
              value={state.filters.testCases.source}
              onChange={(e) => handleFilterChange('source', e.target.value)}
            >
              <option value="">All Sources</option>
              <option value="Manual">Manual</option>
              <option value="Automated">Automated</option>
              <option value="API">API</option>
              <option value="UI">UI</option>
            </select>
          </div>
        </div>
      </div>

      {/* Test Cases List */}
      <div className="card">
        {filteredTestCases.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Intent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tags
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTestCases.map((testCase) => (
                  <tr key={testCase.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {testCase.intent}
                      </div>
                      {testCase.details && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {testCase.details}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {testCase.tags && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {testCase.tags}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {testCase.source}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {testCase.timestamp 
                        ? new Date(testCase.timestamp).toLocaleDateString()
                        : 'N/A'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(testCase)}
                        className="text-primary-600 hover:text-primary-900 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(testCase.id)}
                        className="text-danger-600 hover:text-danger-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <span className="text-6xl">📋</span>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No test cases</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new test case.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowModal(true)}
                className="btn btn-primary"
              >
                <span className="mr-2">➕</span>
                Add Test Case
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingTestCase ? 'Edit Test Case' : 'Add New Test Case'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Case Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  className="input"
                  value={formData.name}
                  onChange={handleInputChange}
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
                  className="input"
                  value={formData.intent}
                  onChange={handleInputChange}
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
                    className="input"
                    value={formData.tags}
                    onChange={handleInputChange}
                    placeholder="e.g. critical, api, login"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source
                  </label>
                  <select
                    name="source"
                    className="select"
                    value={formData.source}
                    onChange={handleInputChange}
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
                  className="textarea"
                  rows={3}
                  value={formData.details}
                  onChange={handleInputChange}
                  placeholder="Additional details about this test case"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Steps
                </label>
                <textarea
                  name="testSteps"
                  className="textarea"
                  rows={3}
                  value={formData.testSteps}
                  onChange={handleInputChange}
                  placeholder="Step-by-step instructions for this test"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Results
                </label>
                <textarea
                  name="expectedResults"
                  className="textarea"
                  rows={2}
                  value={formData.expectedResults}
                  onChange={handleInputChange}
                  placeholder="What should happen when this test passes?"
                />
              </div>


              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={state.loading}
                >
                  {editingTestCase ? 'Update' : 'Create'} Test Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default TestCases