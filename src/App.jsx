import React from 'react'
import { QAProvider } from './contexts/QAContext'
import AppRouter from './components/AppRouter'

function App() {
  return (
    <QAProvider>
      <AppRouter />
    </QAProvider>
  )
}

export default App