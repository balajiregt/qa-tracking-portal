import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useQA } from '../contexts/QAContext'
import Layout from './Layout'
import Dashboard from '../pages/Dashboard'
import EnvironmentDashboard from '../pages/EnvironmentDashboard'
import TestCases from '../pages/TestCases'
import Analytics from '../pages/Analytics'
import FailingTests from '../pages/FailingTests'
import Settings from '../pages/Settings'
import CreatePR from '../pages/CreatePR'
import UploadTraces from '../pages/UploadTraces'
import ProjectSetup from '../pages/ProjectSetup'
import TrackTickets from '../pages/TrackTickets'

function AppRouter() {
  const { state } = useQA()
  
  // Check if any projects exist and if current project is set
  const hasProjects = state.projects && state.projects.length > 0
  const hasCurrentProject = state.project?.name && state.project?.workflowType && state.currentProjectId
  const isEnvironmentBased = state.project?.workflowType === 'environment_based'
  
  // If no projects exist at all, redirect to Settings for project setup
  if (!hasProjects || !hasCurrentProject) {
    return (
      <Layout>
        <Routes>
          <Route path="*" element={<Navigate to="/settings" replace />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    )
  }
  
  // Project exists - show appropriate dashboard based on workflow type
  const DashboardComponent = isEnvironmentBased ? EnvironmentDashboard : Dashboard
  
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardComponent />} />
        <Route path="/test-cases" element={<TestCases />} />
        <Route path="/create-pr" element={<CreatePR />} />
        <Route path="/track-tickets" element={<TrackTickets />} />
        <Route path="/upload-traces" element={<UploadTraces />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/failing-tests" element={<FailingTests />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  )
}

export default AppRouter