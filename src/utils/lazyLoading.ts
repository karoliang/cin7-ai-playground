/**
 * Lazy Loading Utilities
 * Advanced lazy loading for components, routes, and resources with performance optimization
 */

import { lazy, ComponentType, Suspense } from 'react'
import { PageSpinner, PageSkeleton } from '@/components/ui/LoadingStates'

export interface LazyLoadOptions {
  fallback?: React.ComponentType
  errorFallback?: React.ComponentType<{ error: Error; retry: () => void }>
  preload?: boolean
  timeout?: number
  retryAttempts?: number
  retryDelay?: number
}

export interface LazyComponentProps {
  fallback?: React.ComponentType
  className?: string
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

  const LazyWrapper = (props: LazyComponentProps) => {
    const FallbackComponent = props.fallback || CustomFallback

    return (
      <Suspense fallback={<FallbackComponent />}>
        <ErrorBoundary Fallback={ErrorFallback}>
          <LazyComponent {...props} />
        </ErrorBoundary>
      </Suspense>
    )
  }

  // Preload functionality
  if (options.preload) {
    LazyComponent.preload()
  }

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
      return <Fallback error={this.state.error} retry={this.retry} />
    }

    return this.props.children
  }
}

/**
 * Default error fallback component
 */
function DefaultErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div style={{
      padding: '20px',
      textAlign: 'center',
      border: '1px solid #ff6b6b',
      borderRadius: '8px',
      backgroundColor: '#ffe0e0'
    }}>
      <h3>Something went wrong</h3>
      <p>{error.message}</p>
      <button
        onClick={retry}
        style={{
          padding: '8px 16px',
          backgroundColor: '#ff6b6b',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Retry
      </button>
    </div>
  )
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
            LazyComponent.preload?.()
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
 * Image lazy loading with progressive enhancement
 */
export interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  placeholder?: string
  blurDataURL?: string
  onLoad?: () => void
  onError?: () => void
}

export function LazyImage({
  src,
  placeholder,
  blurDataURL,
  onLoad,
  onError,
  ...props
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = React.useState(placeholder || blurDataURL || '')
  const [isLoading, setIsLoading] = React.useState(true)
  const [hasError, setHasError] = React.useState(false)
  const imgRef = React.useRef<HTMLImageElement>(null)

  React.useEffect(() => {
    const img = imgRef.current
    if (!img) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Start loading the actual image
            const tempImg = new Image()
            tempImg.onload = () => {
              setImageSrc(src)
              setIsLoading(false)
              onLoad?.()
            }
            tempImg.onerror = () => {
              setHasError(true)
              setIsLoading(false)
              onError?.()
            }
            tempImg.src = src
            observer.disconnect()
          }
        })
      },
      { rootMargin: '50px' } // Start loading 50px before visible
    )

    observer.observe(img)

    return () => observer.disconnect()
  }, [src, onLoad, onError])

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      loading="lazy"
      style={{
        transition: 'opacity 0.3s ease-in-out',
        filter: isLoading ? 'blur(5px)' : 'none',
        ...props.style
      }}
      {...props}
    />
  )
}

/**
 * Component for lazy loading heavy data
 */
export function useLazyData<T>(
  fetcher: () => Promise<T>,
  options: {
    enabled?: boolean
    staleTime?: number
    cacheTime?: number
    retry?: number
  } = {}
) {
  const { enabled = true, staleTime = 300000, cacheTime = 600000, retry = 3 } = options
  const [data, setData] = React.useState<T | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)
  const cacheRef = React.useRef<Map<string, { data: T; timestamp: number }>>(new Map())

  const fetchData = React.useCallback(async () => {
    if (!enabled) return

    setLoading(true)
    setError(null)

    try {
      const cacheKey = JSON.stringify(fetcher)
      const cached = cacheRef.current.get(cacheKey)

      // Check cache
      if (cached && Date.now() - cached.timestamp < staleTime) {
        setData(cached.data)
        setLoading(false)
        return
      }

      // Fetch fresh data
      const result = await fetcher()

      // Update cache
      cacheRef.current.set(cacheKey, { data: result, timestamp: Date.now() })

      // Clean old cache entries
      if (cacheRef.current.size > 100) {
        const entries = Array.from(cacheRef.current.entries())
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
        const toDelete = entries.slice(0, 50)
        toDelete.forEach(([key]) => cacheRef.current.delete(key))
      }

      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fetch failed'))
    } finally {
      setLoading(false)
    }
  }, [fetcher, enabled, staleTime])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
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

/**
 * Intersection Observer hook for lazy loading
 */
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = React.useState(false)

  React.useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)
      },
      { threshold: 0.1, ...options }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [ref, options.threshold])

  return isIntersecting
}

/**
 * Preload resources based on network conditions
 */
export function adaptivePreload() {
  const [connection, setConnection] = React.useState<{
    effectiveType: string
    downlink: number
    rtt: number
  } | null>(null)

  React.useEffect(() => {
    if ('connection' in navigator) {
      const nav = navigator as any
      setConnection({
        effectiveType: nav.connection.effectiveType,
        downlink: nav.connection.downlink,
        rtt: nav.connection.rtt
      })

      const handleChange = () => {
        setConnection({
          effectiveType: nav.connection.effectiveType,
          downlink: nav.connection.downlink,
          rtt: nav.connection.rtt
        })
      }

      nav.connection.addEventListener('change', handleChange)
      return () => nav.connection.removeEventListener('change', handleChange)
    }
  }, [])

  return {
    shouldPreload: connection ?
      connection.effectiveType !== 'slow-2g' && connection.effectiveType !== '2g' : true,
    connection
  }
}

// Pre-defined lazy loaded components for common use cases
export const LazyHomePage = createLazyComponent(() => import('@/pages/HomePage'), {
  prefetch: true,
  fallback: PageSkeleton
})

export const LazyProjectPage = createLazyComponent(() => import('@/pages/ProjectPage'), {
  prefetch: true,
  fallback: PageSkeleton
})

export const LazyCodeGeneratorPage = createLazyComponent(() => import('@/pages/CodeGeneratorPage'), {
  fallback: PageSpinner
})

export const LazySettingsPage = createLazyComponent(() => import('@/pages/SettingsPage'), {
  fallback: PageSpinner
})

export const LazyProjectWorkspace = createLazyComponent(() => import('@/components/project/ProjectWorkspace'), {
  fallback: PageSpinner
})

export const LazyFileEditor = createLazyComponent(() => import('@/components/editor/FileEditor'), {
  fallback: PageSpinner
})

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