import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { apiClient } from '../utils/apiClient'

const QAContext = createContext()

// Initial state
const initialState = {
  // Data
  prs: [],
  testCases: [],
  assignments: [],
  users: [],
  issues: [],
  activities: [],
  settings: {},
  
  // Multi-project support
  projects: [], // Array of all projects
  currentProjectId: null, // ID of currently active project
  project: {
    id: null,
    name: '',
    workflowType: 'pr_centric', // 'pr_centric' or 'environment_based'
    environments: ['qa', 'staging', 'production'],
    integration: {
      github: { enabled: false, repo: '' },
      jira: { enabled: false, url: '', project_key: '' }
    },
    createdAt: null
  },
  
  // UI state
  loading: false,
  error: null,
  notifications: [],
  currentUser: null,
  
  // Filters and selections
  selectedPR: null,
  selectedTestCase: null,
  filters: {
    testCases: {
      search: '',
      tags: '',
      intent: '',
      source: ''
    },
    analytics: {
      timeRange: 30
    }
  }
}

// Actions
const QA_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  
  // Data actions
  SET_PRS: 'SET_PRS',
  SET_TEST_CASES: 'SET_TEST_CASES',
  SET_ASSIGNMENTS: 'SET_ASSIGNMENTS',
  SET_USERS: 'SET_USERS',
  SET_ISSUES: 'SET_ISSUES',
  SET_ACTIVITIES: 'SET_ACTIVITIES',
  SET_SETTINGS: 'SET_SETTINGS',
  SET_CURRENT_USER: 'SET_CURRENT_USER',
  
  // Project actions
  SET_PROJECT: 'SET_PROJECT',
  UPDATE_PROJECT: 'UPDATE_PROJECT',
  SET_PROJECTS: 'SET_PROJECTS',
  ADD_PROJECT: 'ADD_PROJECT',
  UPDATE_PROJECT_IN_LIST: 'UPDATE_PROJECT_IN_LIST',
  DELETE_PROJECT: 'DELETE_PROJECT',
  SWITCH_PROJECT: 'SWITCH_PROJECT',
  SET_CURRENT_PROJECT_ID: 'SET_CURRENT_PROJECT_ID',
  
  // CRUD actions
  ADD_TEST_CASE: 'ADD_TEST_CASE',
  UPDATE_TEST_CASE: 'UPDATE_TEST_CASE',
  DELETE_TEST_CASE: 'DELETE_TEST_CASE',
  ADD_PR: 'ADD_PR',
  UPDATE_PR: 'UPDATE_PR',
  
  // UI actions
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  SET_SELECTED_PR: 'SET_SELECTED_PR',
  SET_SELECTED_TEST_CASE: 'SET_SELECTED_TEST_CASE',
  UPDATE_FILTERS: 'UPDATE_FILTERS'
}

// Reducer
function qaReducer(state, action) {
  switch (action.type) {
    case QA_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload }
    
    case QA_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, loading: false }
    
    case QA_ACTIONS.CLEAR_ERROR:
      return { ...state, error: null }
    
    case QA_ACTIONS.SET_PRS:
      return { ...state, prs: action.payload }
    
    case QA_ACTIONS.SET_TEST_CASES:
      return { ...state, testCases: action.payload }
    
    case QA_ACTIONS.SET_ASSIGNMENTS:
      return { ...state, assignments: action.payload }
    
    case QA_ACTIONS.SET_USERS:
      return { ...state, users: action.payload }
    
    case QA_ACTIONS.SET_ISSUES:
      return { ...state, issues: action.payload }
    
    case QA_ACTIONS.SET_ACTIVITIES:
      return { ...state, activities: action.payload }
    
    case QA_ACTIONS.SET_SETTINGS:
      return { ...state, settings: action.payload }
    
    case QA_ACTIONS.SET_CURRENT_USER:
      return { ...state, currentUser: action.payload }
    
    case QA_ACTIONS.SET_PROJECT:
      return { ...state, project: action.payload }
    
    case QA_ACTIONS.UPDATE_PROJECT:
      return { ...state, project: { ...state.project, ...action.payload } }
    
    case QA_ACTIONS.SET_PROJECTS:
      return { ...state, projects: action.payload }
    
    case QA_ACTIONS.ADD_PROJECT:
      const newStateAdd = { 
        ...state, 
        projects: [...state.projects, action.payload],
        project: action.payload,
        currentProjectId: action.payload.id
      }
      // Save to storage after state update
      setTimeout(() => {
        try {
          localStorage.setItem('qaProjects', JSON.stringify(newStateAdd.projects))
          localStorage.setItem('qaCurrentProjectId', newStateAdd.currentProjectId)
          localStorage.setItem('qaProjectConfig', JSON.stringify(newStateAdd.project))
        } catch (error) {
          console.error('Failed to save projects to storage:', error)
        }
      }, 0)
      return newStateAdd
    
    case QA_ACTIONS.UPDATE_PROJECT_IN_LIST:
      return {
        ...state,
        projects: state.projects.map(p => 
          p.id === action.payload.id ? action.payload : p
        ),
        project: state.currentProjectId === action.payload.id ? action.payload : state.project
      }
    
    case QA_ACTIONS.DELETE_PROJECT:
      const updatedProjects = state.projects.filter(p => p.id !== action.payload)
      const wasCurrentProject = state.currentProjectId === action.payload
      const newCurrentProject = wasCurrentProject && updatedProjects.length > 0 ? updatedProjects[0] : state.project
      return {
        ...state,
        projects: updatedProjects,
        project: wasCurrentProject ? (updatedProjects.length > 0 ? newCurrentProject : initialState.project) : state.project,
        currentProjectId: wasCurrentProject ? (updatedProjects.length > 0 ? newCurrentProject.id : null) : state.currentProjectId
      }
    
    case QA_ACTIONS.SWITCH_PROJECT:
      const selectedProject = state.projects.find(p => p.id === action.payload)
      const newStateSwitch = {
        ...state,
        project: selectedProject || state.project,
        currentProjectId: action.payload
      }
      // Save to storage after state update
      setTimeout(() => {
        try {
          localStorage.setItem('qaCurrentProjectId', newStateSwitch.currentProjectId)
          localStorage.setItem('qaProjectConfig', JSON.stringify(newStateSwitch.project))
        } catch (error) {
          console.error('Failed to save projects to storage:', error)
        }
      }, 0)
      return newStateSwitch
    
    case QA_ACTIONS.SET_CURRENT_PROJECT_ID:
      return { ...state, currentProjectId: action.payload }
    
    case QA_ACTIONS.ADD_TEST_CASE:
      return { 
        ...state, 
        testCases: [...state.testCases, action.payload] 
      }
    
    case QA_ACTIONS.UPDATE_TEST_CASE:
      return {
        ...state,
        testCases: state.testCases.map(tc => 
          tc.id === action.payload.id ? action.payload : tc
        )
      }
    
    case QA_ACTIONS.DELETE_TEST_CASE:
      return {
        ...state,
        testCases: state.testCases.filter(tc => tc.id !== action.payload)
      }
    
    case QA_ACTIONS.ADD_PR:
      return { 
        ...state, 
        prs: [...state.prs, action.payload] 
      }
    
    case QA_ACTIONS.UPDATE_PR:
      return {
        ...state,
        prs: state.prs.map(pr => 
          pr.id === action.payload.id ? action.payload : pr
        )
      }
    
    case QA_ACTIONS.ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [...state.notifications, action.payload]
      }
    
    case QA_ACTIONS.REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      }
    
    case QA_ACTIONS.SET_SELECTED_PR:
      return { ...state, selectedPR: action.payload }
    
    case QA_ACTIONS.SET_SELECTED_TEST_CASE:
      return { ...state, selectedTestCase: action.payload }
    
    case QA_ACTIONS.UPDATE_FILTERS:
      return {
        ...state,
        filters: {
          ...state.filters,
          [action.payload.section]: {
            ...state.filters[action.payload.section],
            ...action.payload.filters
          }
        }
      }
    
    default:
      return state
  }
}

// Provider component
export function QAProvider({ children }) {
  const [state, dispatch] = useReducer(qaReducer, initialState)

  // Actions
  const actions = {
    setLoading: (loading) => dispatch({ type: QA_ACTIONS.SET_LOADING, payload: loading }),
    setError: (error) => dispatch({ type: QA_ACTIONS.SET_ERROR, payload: error }),
    clearError: () => dispatch({ type: QA_ACTIONS.CLEAR_ERROR }),
    
    // Data actions
    setPRs: (prs) => dispatch({ type: QA_ACTIONS.SET_PRS, payload: prs }),
    setTestCases: (testCases) => dispatch({ type: QA_ACTIONS.SET_TEST_CASES, payload: testCases }),
    setAssignments: (assignments) => dispatch({ type: QA_ACTIONS.SET_ASSIGNMENTS, payload: assignments }),
    setUsers: (users) => dispatch({ type: QA_ACTIONS.SET_USERS, payload: users }),
    setIssues: (issues) => dispatch({ type: QA_ACTIONS.SET_ISSUES, payload: issues }),
    setActivities: (activities) => dispatch({ type: QA_ACTIONS.SET_ACTIVITIES, payload: activities }),
    setSettings: (settings) => {
      // Save to localStorage for persistence
      localStorage.setItem('settings', JSON.stringify(settings))
      dispatch({ type: QA_ACTIONS.SET_SETTINGS, payload: settings })
    },
    setCurrentUser: (user) => dispatch({ type: QA_ACTIONS.SET_CURRENT_USER, payload: user }),
    
    // Project actions
    setProject: (project) => dispatch({ type: QA_ACTIONS.SET_PROJECT, payload: project }),
    updateProject: (updates) => dispatch({ type: QA_ACTIONS.UPDATE_PROJECT, payload: updates }),
    setProjects: (projects) => dispatch({ type: QA_ACTIONS.SET_PROJECTS, payload: projects }),
    addProject: (project) => dispatch({ type: QA_ACTIONS.ADD_PROJECT, payload: project }),
    updateProjectInList: (project) => dispatch({ type: QA_ACTIONS.UPDATE_PROJECT_IN_LIST, payload: project }),
    deleteProject: (projectId) => dispatch({ type: QA_ACTIONS.DELETE_PROJECT, payload: projectId }),
    switchProject: (projectId) => dispatch({ type: QA_ACTIONS.SWITCH_PROJECT, payload: projectId }),
    setCurrentProjectId: (projectId) => dispatch({ type: QA_ACTIONS.SET_CURRENT_PROJECT_ID, payload: projectId }),
    
    // CRUD actions
    addTestCase: (testCase) => dispatch({ type: QA_ACTIONS.ADD_TEST_CASE, payload: testCase }),
    updateTestCase: (testCase) => dispatch({ type: QA_ACTIONS.UPDATE_TEST_CASE, payload: testCase }),
    deleteTestCase: (testCaseId) => dispatch({ type: QA_ACTIONS.DELETE_TEST_CASE, payload: testCaseId }),
    addPR: (pr) => dispatch({ type: QA_ACTIONS.ADD_PR, payload: pr }),
    updatePR: (pr) => dispatch({ type: QA_ACTIONS.UPDATE_PR, payload: pr }),
    
    // UI actions
    showNotification: (message, type = 'info') => {
      const id = Date.now()
      const notification = { id, message, type }
      dispatch({ type: QA_ACTIONS.ADD_NOTIFICATION, payload: notification })
      
      // Auto remove after 5 seconds
      setTimeout(() => {
        actions.removeNotification(id)
      }, 5000)
    },
    removeNotification: (id) => dispatch({ type: QA_ACTIONS.REMOVE_NOTIFICATION, payload: id }),
    setSelectedPR: (pr) => dispatch({ type: QA_ACTIONS.SET_SELECTED_PR, payload: pr }),
    setSelectedTestCase: (testCase) => dispatch({ type: QA_ACTIONS.SET_SELECTED_TEST_CASE, payload: testCase }),
    updateFilters: (section, filters) => dispatch({ 
      type: QA_ACTIONS.UPDATE_FILTERS, 
      payload: { section, filters } 
    }),

    // Async actions
    async loadAllData() {
      try {
        actions.setLoading(true)
        actions.clearError()
        
        const data = await apiClient.batchDataLoad()
        
        actions.setPRs(data.prs || [])
        actions.setTestCases(data.testCases || [])
        actions.setAssignments(data.assignments || [])
        actions.setUsers(data.users || [])
        actions.setIssues(data.issues || [])
        actions.setActivities(data.activity || [])
        
        // Load current user
        const currentUser = await apiClient.getCurrentUser()
        actions.setCurrentUser(currentUser)
        
      } catch (error) {
        console.error('Failed to load data:', error)
        actions.setError(error.message)
        actions.showNotification('Failed to load data', 'error')
      } finally {
        actions.setLoading(false)
      }
    },

    async createTestCase(testCaseData) {
      try {
        actions.setLoading(true)
        const result = await apiClient.addTestCase(testCaseData)
        
        // Add to local state and reload all data to ensure consistency
        actions.addTestCase(result.data)
        
        // Reload all data from server to ensure UI shows latest data
        await actions.loadAllData()
        
        actions.showNotification('Test case created successfully', 'success')
        return result.data
      } catch (error) {
        actions.setError(error.message)
        actions.showNotification(`Failed to create test case: ${error.message}`, 'error')
        throw error
      } finally {
        actions.setLoading(false)
      }
    },

    async updateTestCaseAsync(testCaseId, updates) {
      try {
        actions.setLoading(true)
        const result = await apiClient.request('/update-test-case', {
          method: 'PUT',
          body: { testId: testCaseId, ...updates }
        })
        actions.updateTestCase(result.data)
        actions.showNotification('Test case updated successfully', 'success')
        return result.data
      } catch (error) {
        actions.setError(error.message)
        actions.showNotification(`Failed to update test case: ${error.message}`, 'error')
        throw error
      } finally {
        actions.setLoading(false)
      }
    },

    async deleteTestCaseAsync(testCaseId) {
      try {
        actions.setLoading(true)
        await apiClient.request('/delete-test-case', {
          method: 'DELETE',
          body: { testId: testCaseId }
        })
        actions.deleteTestCase(testCaseId)
        actions.showNotification('Test case deleted successfully', 'success')
      } catch (error) {
        actions.setError(error.message)
        actions.showNotification(`Failed to delete test case: ${error.message}`, 'error')
        throw error
      } finally {
        actions.setLoading(false)
      }
    },

    async createPR(prData) {
      try {
        actions.setLoading(true)
        const result = await apiClient.createPR(prData)
        
        // Add to local state and reload all data to ensure consistency
        actions.addPR(result.data)
        
        // Reload all data from server to ensure UI shows latest data
        await actions.loadAllData()
        
        actions.showNotification('PR created successfully', 'success')
        return result.data
      } catch (error) {
        actions.setError(error.message)
        actions.showNotification(`Failed to create PR: ${error.message}`, 'error')
        throw error
      } finally {
        actions.setLoading(false)
      }
    },

    async updatePRAsync(prData) {
      try {
        actions.setLoading(true)
        const result = await apiClient.updatePR(prData)
        
        // Update local state
        actions.updatePR(result.data)
        
        // Reload all data from server to ensure UI shows latest data
        await actions.loadAllData()
        
        actions.showNotification('PR updated successfully', 'success')
        return result.data
      } catch (error) {
        actions.setError(error.message)
        actions.showNotification(`Failed to update PR: ${error.message}`, 'error')
        throw error
      } finally {
        actions.setLoading(false)
      }
    },

    async uploadTraces(traceData) {
      try {
        actions.setLoading(true)
        const result = await apiClient.uploadTraces(traceData)
        
        // Add extracted test cases to state
        if (result.data?.extracted_test_cases) {
          result.data.extracted_test_cases.forEach(testCase => {
            actions.addTestCase(testCase)
          })
        }
        
        // Reload all data to get updated PRs
        await actions.loadAllData()
        
        actions.showNotification(
          `Successfully processed trace upload. Extracted ${result.data?.extracted_test_cases?.length || 0} test cases.`,
          'success'
        )
        return result.data
      } catch (error) {
        actions.setError(error.message)
        actions.showNotification(`Failed to upload traces: ${error.message}`, 'error')
        throw error
      } finally {
        actions.setLoading(false)
      }
    },

    // Project management utility functions
    createProject(projectData) {
      const project = {
        id: `project_${Date.now()}`,
        name: projectData.name,
        workflowType: projectData.workflowType,
        environments: projectData.environments || ['qa', 'staging', 'production'],
        integration: projectData.integration || {
          github: { enabled: false, repo: '' },
          jira: { enabled: false, url: '', project_key: '' }
        },
        createdAt: new Date().toISOString()
      }
      
      actions.addProject(project)
      actions.showNotification(`Project "${project.name}" created successfully`, 'success')
      return project
    },

    updateProjectDetails(projectId, updates) {
      const updatedProject = {
        ...state.projects.find(p => p.id === projectId),
        ...updates
      }
      
      actions.updateProjectInList(updatedProject)
      actions.showNotification(`Project updated successfully`, 'success')
      return updatedProject
    },

    deleteProjectById(projectId) {
      const project = state.projects.find(p => p.id === projectId)
      if (project) {
        actions.deleteProject(projectId)
        actions.showNotification(`Project "${project.name}" deleted successfully`, 'success')
      }
    },

    switchToProject(projectId) {
      const project = state.projects.find(p => p.id === projectId)
      if (project) {
        actions.switchProject(projectId)
        actions.showNotification(`Switched to project "${project.name}"`, 'success')
        
        // Reload data for the new project
        actions.loadAllData()
      }
    },

    saveProjectsToStorage(projectsData, currentProjectId, currentProject) {
      try {
        const projects = projectsData || state.projects
        const currentId = currentProjectId || state.currentProjectId
        const project = currentProject || state.project
        
        localStorage.setItem('qaProjects', JSON.stringify(projects))
        if (currentId) {
          localStorage.setItem('qaCurrentProjectId', currentId)
        }
        if (project?.id) {
          localStorage.setItem('qaProjectConfig', JSON.stringify(project))
        }
      } catch (error) {
        console.error('Failed to save projects to storage:', error)
      }
    }
  }

  // Helper function to load projects from storage
  const loadProjectsFromStorage = () => {
    try {
      const savedProjects = localStorage.getItem('qaProjects')
      const savedCurrentProjectId = localStorage.getItem('qaCurrentProjectId')
      
      if (savedProjects) {
        const projects = JSON.parse(savedProjects)
        actions.setProjects(projects)
        
        // Set current project if we have a saved ID and it exists
        if (savedCurrentProjectId && projects.find(p => p.id === savedCurrentProjectId)) {
          actions.switchProject(savedCurrentProjectId)
        } else if (projects.length > 0) {
          // Default to first project if no saved current project
          actions.switchProject(projects[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to load projects from storage:', error)
    }
  }

  // Add loadProjectsFromStorage to actions
  actions.loadProjectsFromStorage = loadProjectsFromStorage

  // GitHub PR sync action
  actions.syncGitHubPRs = async (options = {}) => {
    try {
      actions.setLoading(true)
      actions.showNotification('Syncing GitHub PRs...', 'info')
      
      const result = await apiClient.syncGitHubPRs(options)
      
      if (result.success) {
        // Reload all data to reflect synced PRs
        await actions.loadAllData()
        
        const { sync_results } = result.data
        const message = `GitHub sync complete: ${sync_results.added} added, ${sync_results.updated} updated`
        actions.showNotification(message, 'success')
        
        return result.data
      } else {
        throw new Error(result.error || 'GitHub sync failed')
      }
    } catch (error) {
      console.error('GitHub sync error:', error)
      actions.setError(error.message)
      actions.showNotification(`GitHub sync failed: ${error.message}`, 'error')
      throw error
    } finally {
      actions.setLoading(false)
    }
  }

  // Initialize data on mount
  useEffect(() => {
    // Load projects and set current project
    actions.loadProjectsFromStorage()
    
    // Load other data
    actions.loadAllData()
  }, [])

  return (
    <QAContext.Provider value={{ state, actions }}>
      {children}
    </QAContext.Provider>
  )
}

// Custom hook to use QA context
export function useQA() {
  const context = useContext(QAContext)
  if (!context) {
    throw new Error('useQA must be used within a QAProvider')
  }
  return context
}

export { QA_ACTIONS }