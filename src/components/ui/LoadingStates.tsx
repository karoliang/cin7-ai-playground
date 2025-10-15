/**
 * Loading States Components
 * Reusable loading and skeleton components for better UX
 */

import React from 'react'
import { Spinner, Text } from '@shopify/polaris'

export interface PageSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  accessibilityLabel?: string
}

export const PageSpinner: React.FC<PageSpinnerProps> = ({
  size = 'medium',
  accessibilityLabel = 'Loading'
}) => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '40px',
      minHeight: '200px'
    }}>
      <Spinner size={size} accessibilityLabel={accessibilityLabel} />
    </div>
  )
}

export interface PageSkeletonProps {
  lines?: number
  showAvatar?: boolean
  showTitle?: boolean
}

export const PageSkeleton: React.FC<PageSkeletonProps> = ({
  lines = 3,
  showAvatar = false,
  showTitle = true
}) => {
  return (
    <div style={{ padding: '20px' }}>
      {showTitle && (
        <div style={{
          width: '200px',
          height: '28px',
          backgroundColor: '#f3f4f6',
          borderRadius: '4px',
          marginBottom: '16px',
          animation: 'pulse 1.5s ease-in-out infinite'
        }} />
      )}

      {showAvatar && (
        <div style={{
          width: '40px',
          height: '40px',
          backgroundColor: '#f3f4f6',
          borderRadius: '50%',
          marginBottom: '16px',
          animation: 'pulse 1.5s ease-in-out infinite'
        }} />
      )}

      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          style={{
            width: index === lines - 1 ? '60%' : '100%',
            height: '16px',
            backgroundColor: '#f3f4f6',
            borderRadius: '4px',
            marginBottom: '8px',
            animation: 'pulse 1.5s ease-in-out infinite',
            animationDelay: `${index * 0.1}s`
          }}
        />
      ))}
    </div>
  )
}

export interface CardSkeletonProps {
  showHeader?: boolean
  lines?: number
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  showHeader = true,
  lines = 3
}) => {
  return (
    <div style={{
      border: '1px solid #e1e3e5',
      borderRadius: '8px',
      padding: '16px',
      backgroundColor: 'white'
    }}>
      {showHeader && (
        <div style={{
          width: '120px',
          height: '20px',
          backgroundColor: '#f3f4f6',
          borderRadius: '4px',
          marginBottom: '16px',
          animation: 'pulse 1.5s ease-in-out infinite'
        }} />
      )}

      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          style={{
            width: index === lines - 1 ? '80%' : '100%',
            height: '14px',
            backgroundColor: '#f3f4f6',
            borderRadius: '4px',
            marginBottom: '8px',
            animation: 'pulse 1.5s ease-in-out infinite',
            animationDelay: `${index * 0.1}s`
          }}
        />
      ))}
    </div>
  )
}

export interface TableSkeletonProps {
  rows?: number
  columns?: number
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4
}) => {
  return (
    <div style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e1e3e5',
        paddingBottom: '8px',
        marginBottom: '8px'
      }}>
        {Array.from({ length: columns }).map((_, index) => (
          <div
            key={index}
            style={{
              flex: 1,
              height: '16px',
              backgroundColor: '#f3f4f6',
              borderRadius: '4px',
              marginRight: '8px',
              animation: 'pulse 1.5s ease-in-out infinite'
            }}
          />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          style={{
            display: 'flex',
            padding: '8px 0',
            borderBottom: rowIndex < rows - 1 ? '1px solid #f3f4f6' : 'none'
          }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              style={{
                flex: 1,
                height: '14px',
                backgroundColor: '#f3f4f6',
                borderRadius: '4px',
                marginRight: '8px',
                animation: 'pulse 1.5s ease-in-out infinite',
                animationDelay: `${(rowIndex * columns + colIndex) * 0.05}s`
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export interface LoadingStateProps {
  isLoading: boolean
  error?: Error | null
  children: React.ReactNode
  fallback?: React.ReactNode
  errorFallback?: React.ReactNode
  retry?: () => void
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  isLoading,
  error,
  children,
  fallback = <PageSpinner />,
  errorFallback,
  retry
}) => {
  if (isLoading) {
    return <>{fallback}</>
  }

  if (error) {
    if (errorFallback) {
      return <>{errorFallback}</>
    }

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        minHeight: '200px'
      }}>
        <Text variant="headingMd" as="h2">Something went wrong</Text>
        <Text color="subdued" as="p">{error.message}</Text>
        {retry && (
          <button
            onClick={retry}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              backgroundColor: '#202223',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Try again
          </button>
        )}
      </div>
    )
  }

  return <>{children}</>
}

export interface ProgressiveLoadingProps {
  src: string
  alt: string
  placeholder?: string
  className?: string
  style?: React.CSSProperties
}

export const ProgressiveLoading: React.FC<ProgressiveLoadingProps> = ({
  src,
  alt,
  placeholder,
  className,
  style
}) => {
  const [imageSrc, setImageSrc] = React.useState(placeholder)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const img = new Image()
    img.onload = () => {
      setImageSrc(src)
      setIsLoading(false)
    }
    img.src = src
  }, [src])

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      style={{
        ...style,
        transition: 'opacity 0.3s ease-in-out',
        opacity: isLoading ? 0.7 : 1,
        filter: isLoading ? 'blur(2px)' : 'none'
      }}
    />
  )
}

// Add the pulse animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    @keyframes pulse {
      0% {
        opacity: 1;
      }
      50% {
        opacity: 0.4;
      }
      100% {
        opacity: 1;
      }
    }
  `
  document.head.appendChild(style)
}