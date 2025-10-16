/**
 * React Context Safety Wrapper
 * Ensures React and Context APIs are available before use
 */

import React from 'react'

// Safety wrapper for createContext
export function safeCreateContext<T>(defaultValue: T): React.Context<T> {
  // Check if React is available
  if (typeof React === 'undefined' || !React.createContext) {
    throw new Error('React or createContext is not available. Check React imports and bundling.')
  }

  return React.createContext(defaultValue)
}

// Safety wrapper for useContext
export function safeUseContext<T>(context: React.Context<T>): T {
  // Check if React is available
  if (typeof React === 'undefined' || !React.useContext) {
    throw new Error('React or useContext is not available. Check React imports and bundling.')
  }

  return React.useContext(context)
}

// Enhanced context provider with error boundaries
export interface SafeContextProviderProps<T> {
  context: React.Context<T>
  value: T
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error) => void
}

export function SafeContextProvider<T>({
  context,
  value,
  children,
  fallback = null,
  onError
}: SafeContextProviderProps<T>) {
  try {
    // Check if React is available
    if (typeof React === 'undefined' || !React.createContext) {
      throw new Error('React is not available in SafeContextProvider')
    }

    return React.createElement(context.Provider, { value }, children)
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error('Unknown error in SafeContextProvider')
    console.error('SafeContextProvider error:', errorObj)

    if (onError) {
      onError(errorObj)
    }

    return React.createElement(React.Fragment, {}, fallback)
  }
}

// Hook to check React availability
export function useReactAvailability() {
  const [isReactAvailable, setIsReactAvailable] = React.useState(false)

  React.useEffect(() => {
    const checkReact = () => {
      const available = typeof React !== 'undefined' &&
                      typeof React.createContext === 'function' &&
                      typeof React.useContext === 'function'

      setIsReactAvailable(available)

      if (!available) {
        console.error('React is not properly available. This may cause Context errors.')
      }
    }

    checkReact()

    // Re-check periodically in case of dynamic loading issues
    const interval = setInterval(checkReact, 1000)

    return () => clearInterval(interval)
  }, [])

  return isReactAvailable
}

// Global React context validation
export function validateReactContext(): boolean {
  try {
    // Test if React and Context API are working
    if (typeof React === 'undefined') {
      console.error('React is undefined')
      return false
    }

    if (typeof React.createContext !== 'function') {
      console.error('React.createContext is not a function')
      return false
    }

    if (typeof React.useContext !== 'function') {
      console.error('React.useContext is not a function')
      return false
    }

    // Test context creation and usage
    const TestContext = React.createContext<string>('test')
    if (!TestContext || typeof TestContext.Provider !== 'function') {
      console.error('Context creation failed')
      return false
    }

    return true
  } catch (error) {
    console.error('React context validation failed:', error)
    return false
  }
}

// Development-time context debugging
export function debugContextInfo(contextName: string) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 Debugging context: ${contextName}`)
    console.log('React available:', typeof React !== 'undefined')
    console.log('createContext available:', typeof React?.createContext === 'function')
    console.log('useContext available:', typeof React?.useContext === 'function')
    console.log('window.React available:', typeof window?.React !== 'undefined')
    console.log('window.React.createContext available:', typeof window?.React?.createContext === 'function')
  }
}