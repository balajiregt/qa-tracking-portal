import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { QAProvider } from './contexts/QAContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import TestCases from './pages/TestCases'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import CreatePR from './pages/CreatePR'
import UploadTraces from './pages/UploadTraces'

function App() {
  return (
    <QAProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/test-cases" element={<TestCases />} />
          <Route path="/create-pr" element={<CreatePR />} />
          <Route path="/upload-traces" element={<UploadTraces />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </QAProvider>
  )
}

export default App