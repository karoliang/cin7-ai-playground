import React, { createContext, useContext, useEffect, useState } from 'react'
import { AppProvider } from '@shopify/polaris'
import { useAuthStore } from '@/stores/authStore'
import '@/styles/polaris-custom.css'

interface ThemeContextType {
  theme: 'light' | 'dark' | 'auto'
  setTheme: (theme: 'light' | 'dark' | 'auto') => void
  resolvedTheme: 'light' | 'dark'
  customColors?: Record<string, string>
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('light')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')
  const [customColors, setCustomColors] = useState<Record<string, string>>({})

  // Resolve system theme preference
  useEffect(() => {
    const resolveTheme = () => {
      if (theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        setResolvedTheme(prefersDark ? 'dark' : 'light')
      } else {
        setResolvedTheme(theme)
      }
    }

    resolveTheme()

    // Listen for system theme changes
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => resolveTheme()
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme])

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme)
    document.documentElement.style.colorScheme = resolvedTheme
  }, [resolvedTheme])

  // Load theme from user settings
  useEffect(() => {
    // Load from project store when available
    const loadThemeFromProject = async () => {
      try {
        const { useProjectStore } = await import('@/stores/projectStore')
        const projectStore = useProjectStore.getState()

        if (projectStore.currentProject?.settings.theme.mode) {
          setTheme(projectStore.currentProject.settings.theme.mode)
        }

        if (projectStore.currentProject?.settings.theme.primary_color) {
          setCustomColors({
            primary: projectStore.currentProject.settings.theme.primary_color
          })
        }
      } catch (error) {
        console.warn('Failed to load theme from project:', error)
      }
    }

    loadThemeFromProject()
  }, [])

  // CIN7 theme configuration for Polaris
  const polarisTheme = {
    colors: {
      ...getPolarisThemeColors(resolvedTheme, customColors)
    },
    logo: {
      dark: '/cin7-logo-dark.svg',
      light: '/cin7-logo-light.svg'
    }
  }

  const value: ThemeContextType = {
    theme,
    setTheme,
    resolvedTheme,
    customColors
  }

  return (
    <ThemeContext.Provider value={value}>
      <AppProvider theme={polarisTheme} i18n={{}}>
        {children}
      </AppProvider>
    </ThemeContext.Provider>
  )
}

// Helper function to get Polaris theme colors based on CIN7 design system
function getPolarisThemeColors(
  theme: 'light' | 'dark',
  customColors?: Record<string, string>
) {
  const baseColors = theme === 'light' ? {
    // Surface colors
    surface: '#ffffff',
    surfaceNeutral: '#f6f8fc',
    surfaceNeutralHovered: '#f3f4f6',
    surfaceNeutralDepressed: '#e5e7eb',
    surfaceNeutralSubdued: '#f9fafb',
    surfaceSubdued: '#f6f8fc',
    surfaceDisabled: '#f3f4f6',
    surfaceHovered: '#f6f8fc',
    surfaceDepressed: '#eef2ff',

    // Content colors
    onSurface: '#202223',
    onSurfaceNeutral: '#454f5b',
    onSurfaceNeutralDisabled: '#9ca3af',
    onSurfaceSubdued: '#6b7280',
    onSurfaceDisabled: '#9ca3af',

    // Interactive colors
    interactive: '#5c6ac4',
    interactiveHovered: '#4c5ab5',
    interactivePressed: '#3849a4',
    interactiveDisabled: '#d1d5db',

    // Primary colors (CIN7 brand)
    primary: customColors?.primary || '#5c6ac4',
    primaryHover: customColors?.primary ? adjustColor(customColors.primary, -10) : '#4c5ab5',
    primaryPressed: customColors?.primary ? adjustColor(customColors.primary, -20) : '#3849a4',

    // Status colors
    success: '#008060',
    successHover: '#006050',
    successPressed: '#004040',
    warning: '#ffb800',
    warningHover: '#e5a500',
    warningPressed: '#cc9400',
    critical: '#de3618',
    criticalHover: '#be2608',
    criticalPressed: '#9e1600',

    // Text colors
    text: '#202223',
    textSubdued: '#454f5b',
    textDisabled: '#9ca3af',

    // Icon colors
    icon: '#454f5b',
    iconHover: '#202223',
    iconPressed: '#111827',
    iconDisabled: '#9ca3af',
    iconSubdued: '#6b7280',

    // Border colors
    border: '#e5e7eb',
    borderHovered: '#d1d5db',
    borderDisabled: '#f3f4f6',
    borderSubdued: '#e5e7eb',
    borderInteractive: '#5c6ac4',
    borderInteractiveHovered: '#4c5ab5',
    borderInteractivePressed: '#3849a4',
    borderCritical: '#de3618',
    borderCriticalHovered: '#be2608',
    borderCriticalPressed: '#9e1600',
    borderSuccess: '#008060',
    borderSuccessHovered: '#006050',
    borderSuccessPressed: '#004040',
    borderWarning: '#ffb800',
    borderWarningHovered: '#e5a500',
    borderWarningPressed: '#cc9400',

    // Shadow colors
    shadow: 'rgba(0, 0, 0, 0.1)',
    shadowInset: 'rgba(0, 0, 0, 0.05)',
    shadowBevel: 'rgba(255, 255, 255, 0.5)',

    // Backdrop colors
    backdrop: 'rgba(0, 0, 0, 0.5)',
    backdropSubdued: 'rgba(0, 0, 0, 0.3)'
  } : {
    // Dark theme colors
    surface: '#1f2937',
    surfaceNeutral: '#111827',
    surfaceNeutralHovered: '#374151',
    surfaceNeutralDepressed: '#4b5563',
    surfaceNeutralSubdued: '#1f2937',
    surfaceSubdued: '#374151',
    surfaceDisabled: '#374151',
    surfaceHovered: '#374151',
    surfaceDepressed: '#4b5563',

    // Content colors
    onSurface: '#f9fafb',
    onSurfaceNeutral: '#d1d5db',
    onSurfaceNeutralDisabled: '#6b7280',
    onSurfaceSubdued: '#9ca3af',
    onSurfaceDisabled: '#6b7280',

    // Interactive colors
    interactive: '#818cf8',
    interactiveHovered: '#a5b4fc',
    interactivePressed: '#6366f1',
    interactiveDisabled: '#4b5563',

    // Primary colors (CIN7 brand - adjusted for dark mode)
    primary: adjustColor(customColors?.primary || '#5c6ac4', 20),
    primaryHover: adjustColor(customColors?.primary || '#5c6ac4', 30),
    primaryPressed: adjustColor(customColors?.primary || '#5c6ac4', 10),

    // Status colors
    success: '#34d399',
    successHover: '#6ee7b7',
    successPressed: '#10b981',
    warning: '#fbbf24',
    warningHover: '#fcd34d',
    warningPressed: '#f59e0b',
    critical: '#f87171',
    criticalHover: '#fca5a5',
    criticalPressed: '#ef4444',

    // Text colors
    text: '#f9fafb',
    textSubdued: '#d1d5db',
    textDisabled: '#6b7280',

    // Icon colors
    icon: '#d1d5db',
    iconHover: '#f9fafb',
    iconPressed: '#ffffff',
    iconDisabled: '#6b7280',
    iconSubdued: '#9ca3af',

    // Border colors
    border: '#374151',
    borderHovered: '#4b5563',
    borderDisabled: '#374151',
    borderSubdued: '#4b5563',
    borderInteractive: '#818cf8',
    borderInteractiveHovered: '#a5b4fc',
    borderInteractivePressed: '#6366f1',
    borderCritical: '#f87171',
    borderCriticalHovered: '#fca5a5',
    borderCriticalPressed: '#ef4444',
    borderSuccess: '#34d399',
    borderSuccessHovered: '#6ee7b7',
    borderSuccessPressed: '#10b981',
    borderWarning: '#fbbf24',
    borderWarningHovered: '#fcd34d',
    borderWarningPressed: '#f59e0b',

    // Shadow colors
    shadow: 'rgba(0, 0, 0, 0.3)',
    shadowInset: 'rgba(0, 0, 0, 0.2)',
    shadowBevel: 'rgba(255, 255, 255, 0.1)',

    // Backdrop colors
    backdrop: 'rgba(0, 0, 0, 0.7)',
    backdropSubdued: 'rgba(0, 0, 0, 0.5)'
  }

  return baseColors
}

// Helper function to adjust color brightness
function adjustColor(color: string, amount: number): string {
  const usePound = color[0] === '#'
  const col = usePound ? color.slice(1) : color
  const num = parseInt(col, 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + amount))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount))
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount))
  return (usePound ? '#' : '') + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')
}