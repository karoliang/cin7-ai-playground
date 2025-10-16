/**
 * React Initializer
 * Ensures React is properly initialized before any Context usage
 */

import * as React from 'react'

// React initialization state
let isReactInitialized = false
let initializationPromise: Promise<void> | null = null

/**
 * Initialize React globally and ensure all required methods are available
 */
export async function initializeReact(): Promise<void> {
  if (isReactInitialized) {
    return
  }

  if (initializationPromise) {
    return initializationPromise
  }

  initializationPromise = performReactInitialization()
  return initializationPromise
}

async function performReactInitialization(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        console.warn('React initialization: Not in browser environment')
        isReactInitialized = true
        resolve()
        return
      }

      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeReactInWindow)
      } else {
        initializeReactInWindow()
      }

      function initializeReactInWindow() {
        try {
          // Ensure React is available globally
          if (!window.React) {
            window.React = React
          }

          // Validate that all required React methods are available
          const requiredMethods = [
            'createContext',
            'useContext',
            'useState',
            'useEffect',
            'useRef',
            'useCallback',
            'useMemo',
            'Component',
            'PureComponent',
            'memo',
            'forwardRef',
            'lazy',
            'Suspense'
          ]

          const missingMethods = requiredMethods.filter(
            method => typeof (window.React as any)[method] !== 'function'
          )

          if (missingMethods.length > 0) {
            console.error('React initialization: Missing methods:', missingMethods)
            throw new Error(`React is missing required methods: ${missingMethods.join(', ')}`)
          }

          // Additional validation for Context API
          if (typeof window.React.createContext !== 'function') {
            throw new Error('React.createContext is not available')
          }

          if (typeof window.React.useContext !== 'function') {
            throw new Error('React.useContext is not available')
          }

          isReactInitialized = true
          console.log('✅ React successfully initialized with Context API')

          // Set up global error handler for React Context errors
          setupReactContextErrorHandler()

          resolve()
        } catch (error) {
          console.error('❌ React initialization failed:', error)
          reject(error)
        }
      }
    } catch (error) {
      console.error('❌ React initialization promise failed:', error)
      reject(error)
    }
  })
}

/**
 * Setup global error handler for React Context errors
 */
function setupReactContextErrorHandler(): void {
  if (typeof window === 'undefined') return

  // Override console.error to catch React Context errors early
  const originalConsoleError = console.error

  console.error = (...args: any[]) => {
    const errorMessage = args.join(' ')

    // Check for common React Context errors
    if (errorMessage.includes('createContext') && errorMessage.includes('undefined')) {
      console.error('🚨 React Context Error detected:', {
        message: errorMessage,
        timestamp: new Date().toISOString(),
        reactAvailable: typeof window.React !== 'undefined',
        createContextAvailable: typeof window.React?.createContext === 'function',
        url: window.location.href
      })
    }

    // Call original console.error
    originalConsoleError.apply(console, args)
  }
}

/**
 * Check if React is properly initialized
 */
export function isReactReady(): boolean {
  return isReactInitialized &&
         typeof window !== 'undefined' &&
         typeof window.React === 'object' &&
         typeof window.React.createContext === 'function' &&
         typeof window.React.useContext === 'function'
}

/**
 * Wait for React to be ready
 */
export function waitForReact(): Promise<void> {
  if (isReactReady()) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (isReactReady()) {
        clearInterval(checkInterval)
        resolve()
      }
    }, 50)

    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(checkInterval)
      console.warn('⚠️ React initialization timeout')
      resolve() // Resolve anyway to prevent hanging
    }, 5000)
  })
}

/**
 * React Context safety check before usage
 */
export function ensureReactContextAvailable(): void {
  if (!isReactReady()) {
    throw new Error('React Context API is not available. Make sure React is properly initialized.')
  }
}

// Auto-initialize React when this module is loaded
initializeReact().catch(error => {
  console.error('Auto-initialization of React failed:', error)
})