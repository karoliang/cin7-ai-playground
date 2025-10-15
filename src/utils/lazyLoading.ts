/**
 * Lazy Loading Utilities
 * Advanced lazy loading for components, routes, and resources with performance optimization
 */

import React, { lazy, ComponentType, Suspense } from 'react'
import { PageSpinner, PageSkeleton } from '@/components/ui/LoadingStates'

export interface LazyLoadOptions {
  fallback?: React.ComponentType
  errorFallback?: React.ComponentType<{ error: Error; retry: () => void }>
  timeout?: number
  retryAttempts?: number
  retryDelay?: number
}

export interface LazyComponentProps extends React.HTMLAttributes<HTMLElement> {
  fallback?: React.ComponentType
  [key: string]: any
}

/**
 * Enhanced lazy component loader with error handling and retry logic
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): React.ComponentType<LazyComponentProps> {
  const {
    fallback: CustomFallback = PageSpinner,
    errorFallback: ErrorFallback = DefaultErrorFallback,
    timeout = 10000,
    retryAttempts = 3,
    retryDelay = 1000
  } = options

  const LazyComponent = lazy(() =>
    loadWithRetry(importFunc, { maxAttempts: retryAttempts, delay: retryDelay, timeout })
  )

  const LazyWrapper = React.forwardRef<any, LazyComponentProps>((props, _ref) => {
    const FallbackComponent = props.fallback || CustomFallback

    return React.createElement(
      Suspense,
      { fallback: React.createElement(FallbackComponent) },
      React.createElement(
        ErrorBoundary,
        { Fallback: ErrorFallback },
        React.createElement(LazyComponent, props)
      )
    )
  })

  // Preload functionality - note: preload is not available on lazy components
  // This would need to be handled at the route level

  return LazyWrapper
}

/**
 * Lazy load with retry logic and timeout
 */
async function loadWithRetry<T>(
  importFunc: () => Promise<T>,
  options: { maxAttempts: number; delay: number; timeout: number }
): Promise<T> {
  const { maxAttempts, delay, timeout } = options
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Add timeout to the import
      const result = await Promise.race([
        importFunc(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Import timeout after ${timeout}ms`)), timeout)
        )
      ])

      return result
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown import error')

      if (attempt < maxAttempts) {
        // Exponential backoff
        const backoffDelay = delay * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, backoffDelay))
      }
    }
  }

  throw lastError || new Error('Import failed after all retry attempts')
}

/**
 * Error boundary for lazy loaded components
 */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; Fallback: ComponentType<{ error: Error; retry: () => void }> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy loading error:', error, errorInfo)
  }

  retry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const { Fallback } = this.props
      return React.createElement(Fallback, {
        error: this.state.error,
        retry: this.retry
      })
    }

    return this.props.children
  }
}

/**
 * Default error fallback component
 */
function DefaultErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  return React.createElement('div', {
    style: {
      padding: '20px',
      textAlign: 'center',
      border: '1px solid #ff6b6b',
      borderRadius: '8px',
      backgroundColor: '#ffe0e0'
    }
  }, [
    React.createElement('h3', { key: 'title' }, 'Something went wrong'),
    React.createElement('p', { key: 'message' }, error.message),
    React.createElement('button', {
      key: 'retry',
      onClick: retry,
      style: {
        padding: '8px 16px',
        backgroundColor: '#ff6b6b',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
      }
    }, 'Retry')
  ])
}

/**
 * Route-based lazy loading with prefetching
 */
export function createLazyRoute<T extends ComponentType<any>>(
  path: string,
  importFunc: () => Promise<{ default: T }>,
  options: LazyLoadOptions & { prefetch?: boolean } = {}
) {
  const LazyComponent = createLazyComponent(importFunc, options)

  // Prefetch based on user behavior or proximity
  if (options.prefetch) {
    // Prefetch when user is likely to navigate
    if (typeof window !== 'undefined') {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Note: Preload would be handled at route level
            observer.disconnect()
          }
        })
      })

      // Find link elements that match this route
      setTimeout(() => {
        const links = document.querySelectorAll(`a[href*="${path}"]`)
        links.forEach(link => observer.observe(link))
      }, 100)
    }
  }

  return LazyComponent
}

/**
 * Preload multiple components in parallel
 */
export function preloadComponents(components: Array<{ key: string; importFunc: () => Promise<any> }>) {
  const preloadPromises = components.map(({ key, importFunc }) => {
    return importFunc()
      .then(() => {
        console.log(`Component ${key} preloaded successfully`)
      })
      .catch((error) => {
        console.warn(`Failed to preload component ${key}:`, error)
      })
  })

  return Promise.allSettled(preloadPromises)
}

// Pre-defined lazy loaded components for common use cases
export const LazyHomePage = createLazyComponent(() => import('@/pages/HomePage'))

export const LazyProjectPage = createLazyComponent(() => import('@/pages/ProjectPage'))

export const LazyCodeGeneratorPage = createLazyComponent(() => import('@/pages/CodeGeneratorPage'))

export const LazySettingsPage = createLazyComponent(() => import('@/pages/SettingsPage'))

export const LazyProjectWorkspace = createLazyComponent(() => import('@/components/project/ProjectWorkspace'))

export const LazyFileEditor = createLazyComponent(() => import('@/components/editor/FileEditor'))

export const LazyBulkExportModal = createLazyComponent(() => import('@/components/export/BulkExportModal'))

export const LazyImportModal = createLazyComponent(() => import('@/components/import/ImportModal'))

// Performance monitoring for lazy loading
export function trackLazyLoadingPerformance() {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure' && entry.name.includes('lazy-load')) {
          console.log(`Lazy loading performance: ${entry.name}`, {
            duration: entry.duration,
            startTime: entry.startTime
          })
        }
      }
    })

    observer.observe({ entryTypes: ['measure'] })
    return observer
  }
  return null
}