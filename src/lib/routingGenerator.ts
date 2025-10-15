import { ProjectFile, DetectedArchitecture } from '@/types'

export interface RouteConfig {
  path: string
  component: string
  exact?: boolean
  children?: RouteConfig[]
  layout?: string
  guards?: string[]
  meta?: {
    title?: string
    description?: string
    requiresAuth?: boolean
    roles?: string[]
  }
}

export interface RoutingSystem {
  framework: 'react' | 'vue' | 'vanilla'
  router: 'react-router' | 'vue-router' | 'vanilla-router'
  files: Array<{
    name: string
    content: string
    description: string
  }>
  dependencies: Record<string, string>
  mainEntry: string
}

export class RoutingGenerator {
  // Generate routing configuration based on detected architecture
  static generateRouting(
    architecture: DetectedArchitecture,
    projectName: string
  ): RoutingSystem {
    const framework = this.detectFramework(architecture)

    switch (framework) {
      case 'react':
        return this.generateReactRouting(architecture, projectName)
      case 'vue':
        return this.generateVueRouting(architecture, projectName)
      default:
        return this.generateVanillaRouting(architecture, projectName)
    }
  }

  // Detect framework from architecture
  private static detectFramework(architecture: DetectedArchitecture): 'react' | 'vue' | 'vanilla' {
    if (architecture.framework?.includes('react')) return 'react'
    if (architecture.framework?.includes('vue')) return 'vue'
    return 'vanilla'
  }

  // Generate React Router configuration
  private static generateReactRouting(
    architecture: DetectedArchitecture,
    projectName: string
  ): RoutingSystem {
    const routes = this.generateRouteConfigs(architecture)
    const files: Array<{ name: string; content: string; description: string }> = []

    // Generate App.jsx with routing
    const appContent = this.generateReactApp(routes, architecture)
    files.push({
      name: 'src/App.jsx',
      content: appContent,
      description: 'Main App component with routing configuration'
    })

    // Generate main.jsx
    const mainContent = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`
    files.push({
      name: 'src/main.jsx',
      content: mainContent,
      description: 'React application entry point'
    })

    // Generate page components
    architecture.pages?.forEach((page, index) => {
      const pageContent = this.generateReactPage(page, index)
      files.push({
        name: `src/pages/${page.name}.jsx`,
        content: pageContent,
        description: `${page.title || page.name} page component`
      })
    })

    // Generate layout component if needed
    if (architecture.layout?.type === 'sidebar' || architecture.layout?.type === 'header') {
      const layoutContent = this.generateReactLayout(architecture)
      files.push({
        name: 'src/components/Layout.jsx',
        content: layoutContent,
        description: 'Main layout component'
      })
    }

    // Generate navigation component
    if (routes.length > 1) {
      const navContent = this.generateReactNavigation(routes, architecture)
      files.push({
        name: 'src/components/Navigation.jsx',
        content: navContent,
        description: 'Navigation component'
      })
    }

    // Generate CSS for routing
    const cssContent = this.generateRoutingCSS(architecture)
    files.push({
      name: 'src/index.css',
      content: cssContent,
      description: 'Global styles including routing styles'
    })

    return {
      framework: 'react',
      router: 'react-router',
      files,
      dependencies: {
        'react': '^18.2.0',
        'react-dom': '^18.2.0',
        'react-router-dom': '^6.8.0'
      },
      mainEntry: 'src/main.jsx'
    }
  }

  // Generate Vue Router configuration
  private static generateVueRouting(
    architecture: DetectedArchitecture,
    projectName: string
  ): RoutingSystem {
    const routes = this.generateRouteConfigs(architecture)
    const files: Array<{ name: string; content: string; description: string }> = []

    // Generate router configuration
    const routerContent = this.generateVueRouterConfig(routes, architecture)
    files.push({
      name: 'src/router/index.js',
      content: routerContent,
      description: 'Vue Router configuration'
    })

    // Generate main.js
    const mainContent = `import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './style.css'

const app = createApp(App)
app.use(router)
app.mount('#app')
`
    files.push({
      name: 'src/main.js',
      content: mainContent,
      description: 'Vue application entry point'
    })

    // Generate App.vue
    const appContent = this.generateVueApp(architecture)
    files.push({
      name: 'src/App.vue',
      content: appContent,
      description: 'Main Vue App component'
    })

    // Generate page components
    architecture.pages?.forEach((page) => {
      const pageContent = this.generateVuePage(page)
      files.push({
        name: `src/views/${page.name}.vue`,
        content: pageContent,
        description: `${page.title || page.name} page component`
      })
    })

    // Generate layout component
    if (architecture.layout?.type) {
      const layoutContent = this.generateVueLayout(architecture)
      files.push({
        name: `src/layouts/${architecture.layout.type}Layout.vue`,
        content: layoutContent,
        description: 'Layout component'
      })
    }

    return {
      framework: 'vue',
      router: 'vue-router',
      files,
      dependencies: {
        'vue': '^3.3.0',
        'vue-router': '^4.2.0'
      },
      mainEntry: 'src/main.js'
    }
  }

  // Generate Vanilla JS routing
  private static generateVanillaRouting(
    architecture: DetectedArchitecture,
    projectName: string
  ): RoutingSystem {
    const routes = this.generateRouteConfigs(architecture)
    const files: Array<{ name: string; content: string; description: string }> = []

    // Generate router class
    const routerContent = this.generateVanillaRouter(routes, architecture)
    files.push({
      name: 'src/router.js',
      content: routerContent,
      description: 'Vanilla JavaScript router'
    })

    // Generate main.js
    const mainContent = `import './style.css'
import { Router } from './router.js'
import { homePage } from './pages/home.js'
${architecture.pages?.map(page => `import { ${page.name}Page } from './pages/${page.name}.js'`).join('\n')}

const routes = [
  { path: '/', component: homePage },
  ${architecture.pages?.map(page => `{ path: '/${page.name}', component: ${page.name}Page }`).join(',\n  ')}
]

const router = new Router(routes)
router.init()
`
    files.push({
      name: 'src/main.js',
      content: mainContent,
      description: 'Vanilla JS application entry point'
    })

    // Generate page modules
    files.push({
      name: 'src/pages/home.js',
      content: this.generateVanillaPage({ name: 'home', title: 'Home' }),
      description: 'Home page component'
    })

    architecture.pages?.forEach((page) => {
      const pageContent = this.generateVanillaPage(page)
      files.push({
        name: `src/pages/${page.name}.js`,
        content: pageContent,
        description: `${page.title || page.name} page component`
      })
    })

    return {
      framework: 'vanilla',
      router: 'vanilla-router',
      files,
      dependencies: {},
      mainEntry: 'src/main.js'
    }
  }

  // Generate route configurations from architecture
  private static generateRouteConfigs(architecture: DetectedArchitecture): RouteConfig[] {
    const routes: RouteConfig[] = []

    // Add home route
    routes.push({
      path: '/',
      component: 'HomePage',
      exact: true,
      meta: {
        title: 'Home',
        description: 'Welcome page'
      }
    })

    // Add page routes
    architecture.pages?.forEach((page) => {
      routes.push({
        path: `/${page.name}`,
        component: `${page.name.charAt(0).toUpperCase() + page.name.slice(1)}Page`,
        meta: {
          title: page.title || page.name.charAt(0).toUpperCase() + page.name.slice(1),
          description: page.description
        }
      })

      // Add nested routes if specified
      if ('children' in page && page.children && Array.isArray(page.children)) {
        const childRoutes: RouteConfig[] = (page.children as any[]).map((child: any) => ({
          path: child.path,
          component: `${child.name}Component`,
          meta: {
            title: child.title || child.name
          }
        }))

        routes.push({
          path: `/${page.name}`,
          component: `${page.name.charAt(0).toUpperCase() + page.name.slice(1)}Page`,
          children: childRoutes
        })
      }
    })

    return routes
  }

  // React specific generators
  private static generateReactApp(routes: RouteConfig[], architecture: DetectedArchitecture): string {
    const hasLayout = architecture.layout?.type
    const LayoutComponent = hasLayout ? 'Layout' : ''

    return `import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
${hasLayout ? 'import Layout from "./components/Layout.jsx"' : ''}
${routes.map(route => `import { ${route.component} } from "./pages/${route.path.slice(1) || 'home'}.jsx"`).join('\n')}

function App() {
  return (
    <BrowserRouter>
      ${hasLayout ? `<Layout>` : ''}
        <Routes>
          ${routes.map(route =>
            `<Route path="${route.path}" ${route.exact ? 'exact' : ''} element={<${route.component} />} />`
          ).join('\n          ')}
        </Routes>
      ${hasLayout ? '</Layout>' : ''}
    </BrowserRouter>
  )
}

export default App`
  }

  private static generateReactPage(page: any, index: number): string {
    return `import React from 'react'
${page.polaris ? 'import { Page, Card, Text } from "@shopify/polaris"' : ''}

export const ${page.name.charAt(0).toUpperCase() + page.name.slice(1)}Page = () => {
  return (
    ${page.polaris ? `
    <Page title="${page.title || page.name.charAt(0).toUpperCase() + page.name.slice(1)}">
      <Card sectioned>
        <Text>Welcome to the ${page.title || page.name} page.</Text>
      </Card>
    </Page>` : `
    <div className="page">
      <h1>${page.title || page.name.charAt(0).toUpperCase() + page.name.slice(1)}</h1>
      <p>Welcome to the ${page.name} page.</p>
    </div>`}
  )
}

export default ${page.name.charAt(0).toUpperCase() + page.name.slice(1)}Page`
  }

  private static generateReactLayout(architecture: DetectedArchitecture): string {
    const isSidebar = architecture.layout?.type === 'sidebar'

    return `import React from 'react'
${architecture.polaris ? 'import { Frame, Navigation, TopBar, Layout } from "@shopify/polaris"' : 'import { Link } from "react-router-dom"'}
${isSidebar ? 'import Navigation from "./Navigation.jsx"' : ''}

const Layout = ({ children }) => {
  return (
    ${architecture.polaris ? `
    <Frame>
      ${isSidebar ? '<Navigation />' : '<TopBar />'}
      <Layout>
        <Layout.Section>
          {children}
        </Layout.Section>
      </Layout>
    </Frame>` : `
    <div className="layout">
      ${isSidebar ? '<nav className="sidebar"><Navigation /></nav>' : '<header className="header"><Navigation /></header>'}
      <main className="main">
        {children}
      </main>
    </div>`}
  )
}

export default Layout`
  }

  private static generateReactNavigation(routes: RouteConfig[], architecture: DetectedArchitecture): string {
    return `import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
${architecture.polaris ? 'import { Navigation as PolarisNavigation } from "@shopify/polaris"' : ''}

export const Navigation = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const items = [
    ${routes.map(route => `
    {
      label: "${route.meta?.title || 'Home'}",
      onClick: () => navigate('${route.path}'),
      selected: location.pathname === '${route.path}'
    }`).join(',')}
  ]

  return (
    ${architecture.polaris ? `
    <PolarisNavigation location={location.pathname}>
      <PolarisNavigation.Section items={items} />
    </PolarisNavigation>` : `
    <nav className="navigation">
      <ul>
        {items.map((item, index) => (
          <li key={index}>
            <button
              onClick={item.onClick}
              className={item.selected ? 'active' : ''}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>`}
  )
}

export default Navigation`
  }

  // Vue specific generators
  private static generateVueRouterConfig(routes: RouteConfig[], architecture: DetectedArchitecture): string {
    return `import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  ${routes.map(route => `
  {
    path: '${route.path}',
    name: '${route.component}',
    component: () => import('../views/${route.path.slice(1) || 'home'}.vue'),
    meta: ${JSON.stringify(route.meta || {})}
  }`).join(',')}
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router`
  }

  private static generateVueApp(architecture: DetectedArchitecture): string {
    return `<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}
</style>`
  }

  private static generateVuePage(page: any): string {
    return `<template>
  <div class="page">
    <h1>${page.title || page.name.charAt(0).toUpperCase() + page.name.slice(1)}</h1>
    <p>Welcome to the ${page.name} page.</p>
  </div>
</template>

<script>
export default {
  name: '${page.name.charAt(0).toUpperCase() + page.name.slice(1)}',
  meta: {
    title: '${page.title || page.name.charAt(0).toUpperCase() + page.name.slice(1)}'
  }
}
</script>

<style scoped>
.page {
  padding: 2rem;
}
</style>`
  }

  private static generateVueLayout(architecture: DetectedArchitecture): string {
    return `<template>
  <div class="layout">
    <header class="header">
      <nav>
        <router-link to="/">Home</router-link>
        ${architecture.pages?.map(page => `<router-link to="/${page.name}">${page.title || page.name.charAt(0).toUpperCase() + page.name.slice(1)}</router-link>`).join('\n        ')}
      </nav>
    </header>
    <main class="main">
      <slot />
    </main>
  </div>
</template>

<script>
export default {
  name: 'Layout'
}
</script>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background: #f8f9fa;
  padding: 1rem;
  border-bottom: 1px solid #dee2e6;
}

.header nav {
  display: flex;
  gap: 1rem;
}

.header a {
  text-decoration: none;
  color: #495057;
  font-weight: 500;
}

.header a:hover,
.header a.router-link-active {
  color: #007bff;
}

.main {
  flex: 1;
  padding: 2rem;
}
</style>`
  }

  // Vanilla JS generators
  private static generateVanillaRouter(routes: RouteConfig[], architecture: DetectedArchitecture): string {
    return `export class Router {
  constructor(routes) {
    this.routes = routes
    this.currentPath = window.location.pathname
    this.init()
  }

  init() {
    // Handle initial route
    this.handleRoute()

    // Listen for popstate events (browser back/forward)
    window.addEventListener('popstate', () => {
      this.currentPath = window.location.pathname
      this.handleRoute()
    })

    // Intercept link clicks
    document.addEventListener('click', (e) => {
      if (e.target.matches('a[data-route]')) {
        e.preventDefault()
        const path = e.target.getAttribute('href')
        this.navigate(path)
      }
    })
  }

  navigate(path) {
    window.history.pushState({}, '', path)
    this.currentPath = path
    this.handleRoute()
  }

  handleRoute() {
    const route = this.routes.find(r => r.path === this.currentPath) ||
                 this.routes.find(r => r.path === '/')

    if (route) {
      const app = document.getElementById('app')
      if (app) {
        app.innerHTML = route.component()
      }

      // Update page title
      if (route.meta?.title) {
        document.title = route.meta.title
      }
    }
  }
}`
  }

  private static generateVanillaPage(page: any): string {
    return `export function ${page.name}Page() {
  return \`
    <div class="page">
      <h1>${page.title || page.name.charAt(0).toUpperCase() + page.name.slice(1)}</h1>
      <p>Welcome to the ${page.name} page.</p>
    </div>
  \`
}`
  }

  // Generate CSS for routing
  private static generateRoutingCSS(architecture: DetectedArchitecture): string {
    return `:root {
  --primary-color: #1976d2;
  --text-color: #333;
  --bg-color: #fff;
  --border-color: #e0e0e0;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  line-height: 1.6;
  color: var(--text-color);
  background-color: var(--bg-color);
}

.page {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: var(--primary-color);
}

${architecture.layout?.type === 'sidebar' ? `
.layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 250px;
  background: #f8f9fa;
  border-right: 1px solid var(--border-color);
  padding: 1rem;
}

.main {
  flex: 1;
  padding: 2rem;
}

.navigation {
  list-style: none;
}

.navigation li {
  margin-bottom: 0.5rem;
}

.navigation a {
  display: block;
  padding: 0.75rem;
  text-decoration: none;
  color: var(--text-color);
  border-radius: 4px;
  transition: background-color 0.2s;
}

.navigation a:hover,
.navigation a.active {
  background-color: var(--primary-color);
  color: white;
}` : architecture.layout?.type === 'header' ? `
.header {
  background: #f8f9fa;
  border-bottom: 1px solid var(--border-color);
  padding: 1rem;
}

.header nav {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  gap: 2rem;
}

.header a {
  text-decoration: none;
  color: var(--text-color);
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.header a:hover,
.header a.active {
  background-color: var(--primary-color);
  color: white;
}` : ''}

/* Responsive design */
@media (max-width: 768px) {
  .page {
    padding: 1rem;
  }

  ${architecture.layout?.type === 'sidebar' ? `
  .layout {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }` : ''}
}`
  }

  // Utility method to get route metadata
  static getRouteMetadata(routes: RouteConfig[]): Array<{ path: string; title: string; description: string }> {
    return routes.map(route => ({
      path: route.path,
      title: route.meta?.title || 'Untitled Page',
      description: route.meta?.description || 'No description available'
    }))
  }
}