import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQA } from '../contexts/QAContext'

function Layout({ children }) {
  const location = useLocation()
  const { state, actions } = useQA()
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProjectDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isEnvironmentBased = state.project?.workflowType === 'environment_based'
  
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Test Cases', href: '/test-cases', icon: '📋' },
    // Workflow-specific navigation
    isEnvironmentBased 
      ? { name: 'Track Tickets', href: '/track-tickets', icon: '🎫' }
      : { name: 'Create PR', href: '/create-pr', icon: '🔄' },
    { name: 'Upload Traces', href: '/upload-traces', icon: '🎬' },
    { name: 'Analytics', href: '/analytics', icon: '📈' },
    { name: 'Settings', href: '/settings', icon: '⚙️' },
  ].filter(Boolean)

  const isActive = (href) => location.pathname === href

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                QA Test Tracking Portal
              </h1>
            </div>

            {/* Project Switcher */}
            {state.projects && state.projects.length > 1 && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <span className="mr-2">📁</span>
                  <span className="max-w-32 truncate">{state.project?.name || 'Select Project'}</span>
                  <span className="ml-2">▼</span>
                </button>

                {showProjectDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-48">
                    <div className="py-1">
                      {state.projects.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => {
                            if (project.id !== state.currentProjectId) {
                              actions.switchToProject(project.id)
                            }
                            setShowProjectDropdown(false)
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                            project.id === state.currentProjectId 
                              ? 'bg-primary-50 text-primary-700 font-medium' 
                              : 'text-gray-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{project.name}</div>
                              <div className="text-xs text-gray-500">
                                {project.workflowType === 'pr_centric' ? '🔄 PR-Centric' : '🏢 Environment-Based'}
                              </div>
                            </div>
                            {project.id === state.currentProjectId && (
                              <span className="text-primary-600">✓</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <nav className="hidden md:flex space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                    isActive(item.href)
                      ? 'border-b-2 border-primary-500 text-gray-900'
                      : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* User Info */}
            <div className="flex items-center">
              {state.currentUser && (
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center">
                    <span className="text-xs font-medium text-white">
                      {state.currentUser.name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <span className="ml-2 text-sm text-gray-700 hidden sm:block">
                    {state.currentUser.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50 border-t border-gray-200">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive(item.href)
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Loading Overlay */}
        {state.loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 flex items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-3 text-gray-700">Loading...</span>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {state.error && (
          <div className="mb-6 mx-4 sm:mx-0">
            <div className="bg-danger-50 border border-danger-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-danger-400">⚠️</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-danger-800">
                    Error
                  </h3>
                  <div className="mt-2 text-sm text-danger-700">
                    {state.error}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <div className="px-4 sm:px-0">
          {children}
        </div>
      </main>

      {/* Notifications */}
      <div className="fixed top-4 right-4 space-y-2 z-50">
        {state.notifications.map((notification) => (
          <div
            key={notification.id}
            className={`notification notification-${notification.type}`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {notification.type === 'success' && '✅'}
                {notification.type === 'error' && '❌'}
                {notification.type === 'warning' && '⚠️'}
                {notification.type === 'info' && 'ℹ️'}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">
                  {notification.message}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Layout