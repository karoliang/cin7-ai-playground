import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { ThemeProvider } from '@/components/ui/ThemeProvider'
import '@/styles/index.css'

// Ensure React is available globally to prevent createContext errors
if (typeof window !== 'undefined' && !window.React) {
  window.React = React
}

// Error boundary for graceful error handling
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)