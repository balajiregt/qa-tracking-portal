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
    priority: 'Medium',
    labels: '',
    branch: '',
    baseBranch: 'main'
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
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
      status: 'new',
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
        priority: 'Medium',
        labels: '',
        branch: '',
        baseBranch: 'main'
      })
      
    } catch (error) {
      console.error('Error creating PR:', error)
    }
  }


  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create PR Manually</h1>
          <p className="text-gray-600">Backup method - manually create PRs for testing when GitHub fetch isn't available</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link 
            to="/github-settings"
            className="btn btn-secondary"
          >
            <span className="mr-2">🔗</span>
            GitHub Settings
          </Link>
          <Link 
            to="/dashboard"
            className="btn btn-primary"
          >
            <span className="mr-2">📥</span>
            Pull from GitHub
          </Link>
        </div>
      </div>

      {/* Information Card */}
      <div className="card p-6 bg-blue-50 border-blue-200">
        <h3 className="text-lg font-medium text-blue-900 mb-2">📋 Two Ways to Add PRs</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <h4 className="font-semibold mb-1">📥 Pull from GitHub (Primary)</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Fetches real PRs from your GitHub repository</li>
              <li>Preserves existing TDD workflow stages</li>
              <li>Includes branch info, commits, and metadata</li>
              <li>Reduces manual PR creation work</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-1">➕ Manual Creation (Backup)</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Backup method when GitHub fetch isn't available</li>
              <li>Testing scenarios and edge cases</li>
              <li>Custom fields for specific testing needs</li>
              <li>Same TDD workflow as GitHub PRs</li>
            </ul>
          </div>
        </div>
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


        {/* PR Preview */}
        {(formData.title || formData.description) && (
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
                priority: 'Medium',
                labels: '',
                branch: '',
                baseBranch: 'main'
              })
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
                    {pr.developer && `Developer: ${pr.developer}`}
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