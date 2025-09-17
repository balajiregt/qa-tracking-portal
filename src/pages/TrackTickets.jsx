import React, { useState } from 'react'
import { useQA } from '../contexts/QAContext'
import { Link } from 'react-router-dom'

function TrackTickets() {
  const { state, actions } = useQA()
  const [formData, setFormData] = useState({
    ticketId: '',
    title: '',
    description: '',
    type: 'Story',
    priority: 'Medium',
    assignee: '',
    environment: 'qa',
    acceptanceCriteria: '',
    jiraUrl: ''
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      // Create a new JIRA ticket mapping for tracking
      const ticketData = {
        id: formData.ticketId,
        title: formData.title,
        description: formData.description,
        type: formData.type,
        priority: formData.priority,
        status: 'Development',
        assignee: formData.assignee,
        environment: formData.environment,
        jiraUrl: formData.jiraUrl,
        acceptanceCriteria: formData.acceptanceCriteria,
        projectId: state.project?.id || `project_${Date.now()}`,
        projectName: state.project?.name,
        testProgress: {
          qa: { total: 0, passed: 0, failed: 0, pending: 0, status: "Not Started" },
          uat: { total: 0, passed: 0, failed: 0, pending: 0, status: "Not Started" },
          production: { total: 0, passed: 0, failed: 0, pending: 0, status: "Not Started" }
        },
        createdAt: new Date().toISOString()
      }

      // For now, we'll store in localStorage - later this would go to backend
      const existingTickets = JSON.parse(localStorage.getItem('jiraTickets') || '[]')
      existingTickets.push(ticketData)
      localStorage.setItem('jiraTickets', JSON.stringify(existingTickets))

      // Dispatch custom event to notify other components of the update
      window.dispatchEvent(new Event('jiraTicketsUpdated'))

      actions.showNotification('JIRA ticket mapped successfully!', 'success')
      resetForm()
    } catch (error) {
      console.error('Error mapping ticket:', error)
      actions.showNotification('Failed to map JIRA ticket', 'error')
    }
  }

  const resetForm = () => {
    setFormData({
      ticketId: '',
      title: '',
      description: '',
      type: 'Story',
      priority: 'Medium',
      assignee: '',
      environment: 'qa',
      acceptanceCriteria: '',
      jiraUrl: ''
    })
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Map JIRA Ticket</h1>
          <p className="text-gray-600">Map a JIRA ticket to start tracking QA testing progress</p>
        </div>
        <Link to="/dashboard" className="btn btn-secondary">
          View Dashboard
        </Link>
      </div>

      {/* Main Form */}
      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  JIRA Ticket ID *
                </label>
                <input
                  type="text"
                  name="ticketId"
                  required
                  className="input"
                  value={formData.ticketId}
                  onChange={handleInputChange}
                  placeholder="e.g. PROJ-123"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ticket Type
                </label>
                <select
                  name="type"
                  className="select"
                  value={formData.type}
                  onChange={handleInputChange}
                >
                  <option value="Story">Story</option>
                  <option value="Feature">Feature</option>
                  <option value="Bug">Bug</option>
                  <option value="Task">Task</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                name="title"
                required
                className="input"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Brief description of the ticket"
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
                placeholder="Detailed description of the work"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                JIRA URL
              </label>
              <input
                type="url"
                name="jiraUrl"
                className="input"
                value={formData.jiraUrl}
                onChange={handleInputChange}
                placeholder="https://yourcompany.atlassian.net/browse/PROJ-123"
              />
            </div>
          </div>

          {/* Ticket Details */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ticket Details</h2>
            
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
                  Target Environment
                </label>
                <select
                  name="environment"
                  className="select"
                  value={formData.environment}
                  onChange={handleInputChange}
                >
                  {state.project?.environments.map(env => (
                    <option key={env} value={env} className="capitalize">{env}</option>
                  ))}
                </select>
              </div>
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
                placeholder="Developer or team member name"
              />
            </div>
          </div>

          {/* Acceptance Criteria */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Testing Information</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Acceptance Criteria
              </label>
              <textarea
                name="acceptanceCriteria"
                className="textarea"
                rows={4}
                value={formData.acceptanceCriteria}
                onChange={handleInputChange}
                placeholder="List the acceptance criteria that need to be tested..."
              />
              <p className="text-xs text-gray-500 mt-1">Define what needs to be tested for this ticket to be considered complete</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={resetForm}
              className="btn btn-secondary"
            >
              Clear Form
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={state.loading || !formData.ticketId || !formData.title}
            >
              {state.loading ? 'Mapping...' : 'Map Ticket'}
            </button>
          </div>
        </form>
      </div>

      {/* Success Actions */}
      <div className="card p-6 bg-blue-50 border border-blue-200">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-blue-400">💡</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">What happens next?</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>After mapping this JIRA ticket:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>It will appear in your Dashboard for tracking</li>
                <li>You can create test cases linked to this ticket</li>
                <li>Track testing progress across environments</li>
                <li>Monitor test execution and results</li>
              </ul>
            </div>
            <div className="mt-4">
              <Link
                to="/test-cases"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Create Test Cases →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TrackTickets