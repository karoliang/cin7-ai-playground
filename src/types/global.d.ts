/**
 * Global type declarations
 */

import * as React from 'react'
import * as ReactDOM from 'react-dom/client'

declare global {
  interface Window {
    // React global availability
    React: typeof React
    ReactDOM: typeof ReactDOM

    // Development helpers
    __REACT_DEVTOOLS_GLOBAL_HOOK__?: any

    // Performance monitoring
    __PERFORMANCE_ENABLED__?: boolean

    // Error tracking
    __SENTRY__?: any

    // Custom app globals
    __APP_VERSION__?: string
    __BUILD_TIME__?: string
    __ENVIRONMENT__?: 'development' | 'production' | 'test'
  }
}

export {}