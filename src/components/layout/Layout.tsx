import React from 'react'
import { TopBar, Frame, Navigation, Card } from '@shopify/polaris'
import {
  HomeMinor,
  OrdersMinor,
  ProductsMinor,
  AnalyticsMinor,
  SettingsMinor,
  QuestionMarkMajor,
  CirclePlusMajor
} from '@shopify/polaris-icons'
import { useAuthStore } from '@/stores/authStore'
import { useTheme } from '@/components/ui/ThemeProvider'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, signOut } = useAuthStore()
  const { resolvedTheme, setTheme } = useTheme()

  const [searchValue, setSearchValue] = React.useState('')
  const [searchActive, setSearchActive] = React.useState(false)
  const [mobileNavigationActive, setMobileNavigationActive] = React.useState(false)

  const handleLogout = async () => {
    await signOut()
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light')
  }

  const topBarMarkup = (
    <TopBar
      showNavigationToggle
      searchFieldVisible={searchActive}
      searchResultsVisible={false}
      searchValue={searchValue}
      onSearchResultsDismiss={() => setSearchActive(false)}
      onNavigationToggle={() => setMobileNavigationActive(!mobileNavigationActive)}
      onSearchChange={(value) => setSearchValue(value)}
      onSearchBlur={() => setSearchActive(false)}
      onSearchFocus={() => setSearchActive(true)}
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
                      onAction: () => console.log('Account settings')
                    },
                    {
                      content: resolvedTheme === 'light' ? 'Dark mode' : 'Light mode',
                      icon: resolvedTheme === 'light' ? QuestionMarkMajor : QuestionMarkMajor,
                      onAction: toggleTheme
                    },
                    {
                      content: 'Log out',
                      icon: QuestionMarkMajor,
                      onAction: handleLogout
                    }
                  ]
                }
              ]
            }
          : undefined
      }
      searchResults={[]}
      searchPlaceholder="Search projects..."
    />
  )

  const navigationMarkup = (
    <Navigation location="/">
      <Navigation.Section
        items={[
          {
            label: 'Dashboard',
            icon: HomeMinor,
            onClick: () => window.location.href = '/',
            selected: window.location.pathname === '/'
          },
          {
            label: 'New Project',
            icon: CirclePlusMajor,
            onClick: () => window.location.href = '/',
            selected: false
          }
        ]}
      />
      <Navigation.Section
        title="CIN7 Templates"
        items={[
          {
            label: 'Sales Dashboard',
            icon: AnalyticsMinor,
            onClick: () => console.log('Sales dashboard template'),
            selected: false
          },
          {
            label: 'Inventory Management',
            icon: ProductsMinor,
            onClick: () => console.log('Inventory template'),
            selected: false
          },
          {
            label: 'Order Management',
            icon: OrdersMinor,
            onClick: () => console.log('Orders template'),
            selected: false
          }
        ]}
      />
      <Navigation.Section
        items={[
          {
            label: 'Settings',
            icon: SettingsMinor,
            onClick: () => console.log('Settings'),
            selected: false
          },
          {
            label: 'Help & Support',
            icon: QuestionMarkMajor,
            onClick: () => console.log('Help'),
            selected: false
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
      <div style={{ height: '100vh' }}>
        {children}
      </div>
    </Frame>
  )
}