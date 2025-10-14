import React from 'react'
import { TopBar, Frame, Navigation, Card, Text, Badge, Button, Icon, Stack } from '@shopify/polaris'
import {
  HomeMinor,
  OrdersMinor,
  ProductsMinor,
  AnalyticsMinor,
  SettingsMinor,
  QuestionMarkMajor,
  CirclePlusMajor,
  CircleDisabledMajor,
  ExportMinor,
  ImportMinor,
  CodeMajor,
  MobileMajor,
  DesktopMajor,
  NotesMajor,
  FileMajor
} from '@shopify/polaris-icons'
import { useAuthStore } from '@/stores/authStore'
import { useTheme } from '@/components/ui/ThemeProvider'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSearchField } from '@/hooks/useProjectSearch'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, signOut, isAuthenticated } = useAuthStore()
  const { resolvedTheme, setTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  const [mobileNavigationActive, setMobileNavigationActive] = React.useState(false)

  // Use search field hook with debouncing
  const {
    inputValue,
    isFocused,
    results,
    suggestions,
    isLoading,
    error,
    handleInputChange,
    handleFocus,
    handleBlur,
    handleSelectResult,
    handleSelectSuggestion,
    clearSearch
  } = useSearchField(300)

  const handleLogout = async () => {
    await signOut()
    navigate('/')
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light')
  }

  const handleNavigation = (path: string) => {
    navigate(path)
    setMobileNavigationActive(false)
  }

  const handleSearchResultClick = (result: any) => {
    if (result.type === 'project') {
      // Navigate to project detail page
      navigate(`/project/${result.projectId}`)
    } else if (result.type === 'file') {
      // Navigate to project with specific file
      navigate(`/project/${result.projectId}?file=${result.filePath}`)
    }
    clearSearch()
  }

  const handleSearch = (value: string) => {
    handleInputChange(value)
  }

  // Format search results for TopBar
  const formattedSearchResults = results.map(result => ({
    id: result.id,
    title: result.title,
    subtitle: result.description,
    content: result.highlights[0] || '',
    url: result.type === 'project'
      ? `/project/${result.projectId}`
      : `/project/${result.projectId}?file=${result.filePath}`,
    badge: {
      content: result.type === 'file' ? result.fileType?.toUpperCase() : 'PROJECT'
    },
    icon: result.type === 'file' ? FileMajor : NotesMajor,
    onClick: () => handleSearchResultClick(result)
  }))

  const topBarMarkup = (
    <TopBar
      showNavigationToggle
      searchFieldVisible={isFocused || inputValue.length > 0}
      searchResultsVisible={isFocused && results.length > 0}
      searchValue={inputValue}
      searchResults={formattedSearchResults}
      onSearchResultsDismiss={clearSearch}
      onNavigationToggle={() => setMobileNavigationActive(!mobileNavigationActive)}
      onSearchChange={handleSearch}
      onSearchBlur={handleBlur}
      onSearchFocus={handleFocus}
      userMenu={
        user
          ? {
              name: user.name || user.email,
              detail: user.email,
              initials: user.name
                ? user.name.split(' ').map(n => n[0]).join('').toUpperCase()
                : user.email[0].toUpperCase(),
              actions: [
                {
                  items: [
                    {
                      content: 'Account settings',
                      icon: SettingsMinor,
                      onAction: () => navigate('/settings')
                    },
                    {
                      content: resolvedTheme === 'light' ? 'Dark mode' : 'Light mode',
                      icon: resolvedTheme === 'light' ? QuestionMarkMajor : QuestionMarkMajor,
                      onAction: toggleTheme
                    },
                    {
                      content: 'Documentation',
                      icon: QuestionMarkMajor,
                      onAction: () => window.open('https://docs.cin7.com', '_blank')
                    },
                    {
                      content: 'Log out',
                      icon: CircleDisabledMajor,
                      onAction: handleLogout,
                      destructive: true
                    }
                  ]
                }
              ]
            }
          : {
              actions: [
                {
                  items: [
                    {
                      content: 'Sign in',
                      icon: SettingsMinor,
                      onAction: () => navigate('/auth')
                    }
                  ]
                }
              ]
            }
      }
      searchResults={formattedSearchResults}
      searchPlaceholder="Search projects..."
      additionalMetadata={
        isAuthenticated ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isLoading && (
              <Badge status="info">Searching...</Badge>
            )}
            {error && (
              <Badge status="critical">Search Error</Badge>
            )}
            <Badge status="success">Pro</Badge>
            <Text variant="bodySm" color="subdued">
              {user?.email}
            </Text>
          </div>
        ) : undefined
      }
    />
  )

  const navigationMarkup = (
    <Navigation location={location.pathname}>
      <Navigation.Section
        items={[
          {
            label: 'Dashboard',
            icon: HomeMinor,
            onClick: () => handleNavigation('/'),
            selected: location.pathname === '/',
            badge: isAuthenticated ? undefined : 'Sign in'
          },
          {
            label: 'New Project',
            icon: CirclePlusMajor,
            onClick: () => handleNavigation('/'),
            selected: false,
            disabled: !isAuthenticated
          }
        ]}
      />

      {isAuthenticated && (
        <Navigation.Section
          title="Templates"
          items={[
            {
              label: 'Sales Dashboard',
              icon: AnalyticsMinor,
              onClick: () => {
                // TODO: Create project with sales dashboard template
                navigate('/')
              },
              selected: false,
              badge: 'Popular'
            },
            {
              label: 'Inventory Management',
              icon: ProductsMinor,
              onClick: () => {
                // TODO: Create project with inventory template
                navigate('/')
              },
              selected: false
            },
            {
              label: 'Order Management',
              icon: OrdersMinor,
              onClick: () => {
                // TODO: Create project with orders template
                navigate('/')
              },
              selected: false
            },
            {
              label: 'Multi-page App',
              icon: DesktopMajor,
              onClick: () => {
                // TODO: Create multi-page application template
                navigate('/')
              },
              selected: false,
              badge: 'New'
            },
            {
              label: 'Mobile Commerce',
              icon: MobileMajor,
              onClick: () => {
                // TODO: Create mobile commerce template
                navigate('/')
              },
              selected: false
            }
          ]}
        />
      )}

      <Navigation.Section
        title="Tools"
        items={[
          {
            label: 'Code Generator',
            icon: CodeMajor,
            onClick: () => {
              // TODO: Navigate to code generator
              console.log('Code generator tool')
            },
            selected: false,
            disabled: !isAuthenticated
          },
          {
            label: 'Import Project',
            icon: ImportMinor,
            onClick: () => {
              // TODO: Open import dialog
              console.log('Import project')
            },
            selected: false,
            disabled: !isAuthenticated
          },
          {
            label: 'Export All',
            icon: ExportMinor,
            onClick: () => {
              // TODO: Export all projects
              console.log('Export all projects')
            },
            selected: false,
            disabled: !isAuthenticated
          }
        ]}
      />

      <Navigation.Section
        items={[
          {
            label: 'Settings',
            icon: SettingsMinor,
            onClick: () => handleNavigation('/settings'),
            selected: location.pathname === '/settings'
          },
          {
            label: 'Help & Support',
            icon: QuestionMarkMajor,
            onClick: () => window.open('https://support.cin7.com', '_blank'),
            selected: false,
            external: true
          }
        ]}
      />
    </Navigation>
  )

  const logoMarkup = {
    width: 86,
    topBarSource:
      resolvedTheme === 'dark'
        ? '/cin7-logo-light.svg'
        : '/cin7-logo-dark.svg',
    url: '/',
    accessibilityLabel: 'CIN7 AI Playground'
  }

  return (
    <Frame
      topBar={topBarMarkup}
      navigation={navigationMarkup}
      logo={logoMarkup}
      showMobileNavigation={mobileNavigationActive}
      onNavigationDismiss={() => setMobileNavigationActive(false)}
    >
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {children}

        {/* Global Footer */}
        {!isAuthenticated && (
          <div style={{
            padding: '1rem',
            backgroundColor: 'var(--p-color-bg-surface-subdued)',
            borderTop: '1px solid var(--p-color-border)',
            textAlign: 'center'
          }}>
            <Text variant="bodySm" color="subdued" as="p">
              Build professional multi-page applications with AI •
              <Button
                onClick={() => navigate('/')}
                plain
                monochrome
              >
                Sign in to get started
              </Button>
            </Text>
          </div>
        )}
      </div>
    </Frame>
  )
}