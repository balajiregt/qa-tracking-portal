import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQA } from '../contexts/QAContext'

function ProjectSetup() {
  const navigate = useNavigate()
  const { actions } = useQA()
  const [step, setStep] = useState(1)
  const [projectData, setProjectData] = useState({
    name: '',
    description: '',
    workflowType: '', // 'pr_centric' or 'environment_based'
    team: {
      size: '',
      role: ''
    },
    integration: {
      github: {
        enabled: false,
        repo: ''
      },
      jira: {
        enabled: false,
        url: '',
        project_key: ''
      }
    },
    environments: ['qa', 'staging', 'production']
  })

  const handleWorkflowSelect = (workflowType) => {
    setProjectData(prev => ({ ...prev, workflowType }))
    setStep(2)
  }

  const handleProjectSubmit = async (e) => {
    e.preventDefault()
    try {
      // Update project configuration in context
      actions.updateProject({
        name: projectData.name,
        description: projectData.description,
        workflowType: projectData.workflowType,
        environments: projectData.environments,
        integration: projectData.integration
      })
      
      // Here we would typically also save to backend/localStorage
      localStorage.setItem('qaProjectConfig', JSON.stringify({
        name: projectData.name,
        description: projectData.description,
        workflowType: projectData.workflowType,
        environments: projectData.environments,
        integration: projectData.integration,
        createdAt: new Date().toISOString()
      }))
      
      actions.showNotification(
        `Project "${projectData.name}" created successfully with ${projectData.workflowType.replace('_', ' ')} workflow!`, 
        'success'
      )
      
      // Redirect to dashboard after project creation
      navigate('/')
    } catch (error) {
      actions.showNotification(`Failed to create project: ${error.message}`, 'error')
    }
  }

  const renderWorkflowSelection = () => (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your QA Workflow</h2>
        <p className="text-lg text-gray-600">Select the workflow that matches your team's current development process</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* PR-Centric Workflow */}
        <div 
          className="card p-8 border-2 border-gray-200 hover:border-blue-400 cursor-pointer transition-all transform hover:scale-105"
          onClick={() => handleWorkflowSelect('pr_centric')}
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔀</span>
            </div>
            <h3 className="text-xl font-semibold text-blue-900 mb-2">PR-Centric Workflow</h3>
            <p className="text-blue-700 text-sm">Modern DevOps • Shift-Left Testing</p>
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="flex items-start space-x-3">
              <span className="text-green-500 mt-0.5">✓</span>
              <span className="text-sm text-gray-700">Test cases linked directly to Pull Requests</span>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-green-500 mt-0.5">✓</span>
              <span className="text-sm text-gray-700">Branch-specific test execution and results</span>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-green-500 mt-0.5">✓</span>
              <span className="text-sm text-gray-700">Automated PR status updates based on test results</span>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-green-500 mt-0.5">✓</span>
              <span className="text-sm text-gray-700">Developer-QA collaboration on code level</span>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            <strong>Best for:</strong> Agile teams, continuous integration, cloud-native development
          </div>
        </div>

        {/* Environment-Based Workflow */}
        <div 
          className="card p-8 border-2 border-gray-200 hover:border-green-400 cursor-pointer transition-all transform hover:scale-105"
          onClick={() => handleWorkflowSelect('environment_based')}
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🏢</span>
            </div>
            <h3 className="text-xl font-semibold text-green-900 mb-2">Environment-Based Workflow</h3>
            <p className="text-green-700 text-sm">Traditional QA • Release Testing</p>
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="flex items-start space-x-3">
              <span className="text-green-500 mt-0.5">✓</span>
              <span className="text-sm text-gray-700">JIRA ticket-based test tracking and execution</span>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-green-500 mt-0.5">✓</span>
              <span className="text-sm text-gray-700">Environment-specific testing (QA → UAT → PROD)</span>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-green-500 mt-0.5">✓</span>
              <span className="text-sm text-gray-700">Release-based test planning and execution</span>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-green-500 mt-0.5">✓</span>
              <span className="text-sm text-gray-700">Traditional UAT and regression test cycles</span>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            <strong>Best for:</strong> Enterprise teams, regulated industries, waterfall/hybrid processes
          </div>
        </div>
      </div>

      <div className="text-center mt-8">
        <p className="text-sm text-gray-500">
          Don't worry - you can always change your workflow type later in project settings
        </p>
      </div>
    </div>
  )

  const renderProjectForm = () => (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Project Configuration</h2>
        <p className="text-lg text-gray-600">
          Setting up {projectData.workflowType === 'pr_centric' ? 'PR-Centric' : 'Environment-Based'} workflow
        </p>
      </div>

      <form onSubmit={handleProjectSubmit} className="space-y-6">
        {/* Basic Project Info */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Details</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
              <input
                type="text"
                className="input"
                placeholder="My QA Project"
                value={projectData.name}
                onChange={(e) => setProjectData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                className="input"
                rows={3}
                placeholder="Brief description of your project and testing scope"
                value={projectData.description}
                onChange={(e) => setProjectData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Integration Configuration */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Integration Setup</h3>
          
          {projectData.workflowType === 'pr_centric' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">GitHub Integration</h4>
                  <p className="text-sm text-gray-600">Connect to your GitHub repository for PR tracking</p>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={projectData.integration.github.enabled}
                    onChange={(e) => setProjectData(prev => ({
                      ...prev,
                      integration: {
                        ...prev.integration,
                        github: { ...prev.integration.github, enabled: e.target.checked }
                      }
                    }))}
                  />
                  <span className="slider"></span>
                </label>
              </div>
              
              {projectData.integration.github.enabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Repository URL</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="https://github.com/username/repository"
                    value={projectData.integration.github.repo}
                    onChange={(e) => setProjectData(prev => ({
                      ...prev,
                      integration: {
                        ...prev.integration,
                        github: { ...prev.integration.github, repo: e.target.value }
                      }
                    }))}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">JIRA Integration</h4>
                  <p className="text-sm text-gray-600">Connect to JIRA for ticket-based testing workflow</p>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={projectData.integration.jira.enabled}
                    onChange={(e) => setProjectData(prev => ({
                      ...prev,
                      integration: {
                        ...prev.integration,
                        jira: { ...prev.integration.jira, enabled: e.target.checked }
                      }
                    }))}
                  />
                  <span className="slider"></span>
                </label>
              </div>
              
              {projectData.integration.jira.enabled && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">JIRA URL</label>
                    <input
                      type="url"
                      className="input"
                      placeholder="https://company.atlassian.net"
                      value={projectData.integration.jira.url}
                      onChange={(e) => setProjectData(prev => ({
                        ...prev,
                        integration: {
                          ...prev.integration,
                          jira: { ...prev.integration.jira, url: e.target.value }
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Project Key</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="PROJ"
                      value={projectData.integration.jira.project_key}
                      onChange={(e) => setProjectData(prev => ({
                        ...prev,
                        integration: {
                          ...prev.integration,
                          jira: { ...prev.integration.jira, project_key: e.target.value.toUpperCase() }
                        }
                      }))}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Environment Configuration for Environment-Based */}
        {projectData.workflowType === 'environment_based' && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Environment Pipeline</h3>
            <p className="text-sm text-gray-600 mb-4">Configure your testing environment progression</p>
            
            <div className="space-y-3">
              {projectData.environments.map((env, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <span className="text-lg">{index + 1}.</span>
                  <input
                    type="text"
                    className="input flex-1"
                    value={env}
                    onChange={(e) => {
                      const newEnvs = [...projectData.environments]
                      newEnvs[index] = e.target.value
                      setProjectData(prev => ({ ...prev, environments: newEnvs }))
                    }}
                  />
                  {index > 0 && (
                    <button
                      type="button"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => {
                        const newEnvs = projectData.environments.filter((_, i) => i !== index)
                        setProjectData(prev => ({ ...prev, environments: newEnvs }))
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setProjectData(prev => ({
                  ...prev,
                  environments: [...prev.environments, '']
                }))}
              >
                Add Environment
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setStep(1)}
          >
            Back to Workflow Selection
          </button>
          
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!projectData.name.trim()}
          >
            Create Project
          </button>
        </div>
      </form>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="container mx-auto">
        {/* Progress Indicator */}
        <div className="max-w-md mx-auto mb-8">
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              step >= 1 ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-gray-300'
            }`}>
              1
            </div>
            <div className={`flex-1 h-0.5 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              step >= 2 ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-gray-300'
            }`}>
              2
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>Choose Workflow</span>
            <span>Configure Project</span>
          </div>
        </div>

        {/* Step Content */}
        {step === 1 && renderWorkflowSelection()}
        {step === 2 && renderProjectForm()}
      </div>
    </div>
  )
}

export default ProjectSetup