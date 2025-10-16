import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { ThemeProvider } from '@/components/ui/ThemeProvider'
import { initializeReact, ensureReactContextAvailable } from '@/utils/reactInitializer'
import '@/styles/index.css'

// Initialize React before rendering
async function initializeApp() {
  try {
    // Initialize React globally
    await initializeReact()

    // Ensure React Context API is available
    ensureReactContextAvailable()

    // Error boundary for graceful error handling
    const root = document.getElementById('root')
    if (!root) {
      throw new Error('Root element not found')
    }

    console.log('🚀 Starting React application with Context API support')

    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <BrowserRouter>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </BrowserRouter>
      </React.StrictMode>,
    )
  } catch (error) {
    console.error('❌ Failed to initialize React application:', error)

    // Fallback rendering without React StrictMode
    const root = document.getElementById('root')
    if (root) {
      root.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #d32f2f;">
          <h2>Application Initialization Failed</h2>
          <p>React Context API could not be initialized. Please refresh the page.</p>
          <button onclick="window.location.reload()">Refresh Page</button>
        </div>
      `
    }
  }
}

// Start the application
initializeApp()