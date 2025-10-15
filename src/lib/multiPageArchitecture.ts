import {
  SupportedFramework,
  ProjectArchitecture,
  ProjectFile,
  PageConfig,
  RoutingConfig,
  ComponentConfig
} from '@/types'

// Framework configuration
const SUPPORTED_FRAMEWORKS = {
  vanilla: {
    name: 'Vanilla JS',
    files: ['index.html', 'styles.css', 'script.js'],
    cdnPackages: []
  },
  react: {
    name: 'React',
    files: ['index.html', 'App.jsx', 'components/', 'styles.css'],
    cdnPackages: [
      'https://unpkg.com/react@18/umd/react.development.js',
      'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
      'https://unpkg.com/@babel/standalone/babel.min.js'
    ]
  },
  vue: {
    name: 'Vue.js',
    files: ['index.html', 'App.vue', 'components/', 'styles.css'],
    cdnPackages: ['https://unpkg.com/vue@3/dist/vue.global.js']
  },
  angular: {
    name: 'Angular',
    files: ['index.html', 'app.js', 'components/', 'styles.css'],
    cdnPackages: []
  },
  svelte: {
    name: 'Svelte',
    files: ['index.html', 'App.svelte', 'components/', 'styles.css'],
    cdnPackages: []
  },
  preact: {
    name: 'Preact',
    files: ['index.html', 'App.jsx', 'components/', 'styles.css'],
    cdnPackages: [
      'https://unpkg.com/preact@10/dist/preact.umd.js',
      'https://unpkg.com/preact@10/hooks/dist/hooks.umd.js'
    ]
  },
  solid: {
    name: 'Solid',
    files: ['index.html', 'App.jsx', 'components/', 'styles.css'],
    cdnPackages: ['https://unpkg.com/solid-js@1/dist/solid.js']
  }
} as const

// CSS Framework configuration (separate from JS frameworks)
const CSS_FRAMEWORKS = {
  none: {
    name: 'Custom CSS',
    cdnPackages: []
  },
  tailwind: {
    name: 'Tailwind CSS',
    cdnPackages: ['https://cdn.tailwindcss.com']
  },
  bootstrap: {
    name: 'Bootstrap',
    cdnPackages: ['https://cdn.jsdelivr.net/npm/bootstrap@5/dist/css/bootstrap.min.css']
  },
  bulma: {
    name: 'Bulma',
    cdnPackages: ['https://cdn.jsdelivr.net/npm/bulma@0.9/css/bulma.min.css']
  }
} as const

// Project structure configurations
const PROJECT_STRUCTURES = {
  'single-page': {
    name: 'Single Page App',
    files: ['index.html', 'styles.css', 'script.js']
  },
  'multi-page': {
    name: 'Multi-Page Website',
    files: ['index.html', 'about.html', 'contact.html', 'shared/styles.css', 'shared/script.js']
  },
  'dashboard': {
    name: 'Admin Dashboard',
    files: ['index.html', 'dashboard.html', 'users.html', 'settings.html', 'components/', 'styles/', 'js/']
  },
  'e-commerce': {
    name: 'E-commerce Site',
    files: ['index.html', 'products.html', 'cart.html', 'checkout.html', 'components/', 'styles/', 'js/']
  },
  'portfolio': {
    name: 'Portfolio Website',
    files: ['index.html', 'portfolio.html', 'blog.html', 'contact.html', 'assets/', 'styles/']
  }
} as const

export interface ArchitectureDetection {
  framework: SupportedFramework
  cssFramework: 'none' | 'tailwind' | 'bootstrap' | 'bulma'
  structure: 'single-page' | 'multi-page' | 'dashboard' | 'e-commerce' | 'portfolio'
}

export interface EnhancedPrompt {
  enhancedPrompt: string
  detectedConfig: ArchitectureDetection
  originalPrompt: string
}

export class MultiPageArchitecture {
  /**
   * Detect optimal architecture from user prompt
   */
  static detectOptimalStructure(prompt: string, existingFiles: ProjectFile[] = []): ArchitectureDetection {
    const promptLower = prompt.toLowerCase()

    // Framework detection
    let framework: SupportedFramework = 'vanilla'
    if (promptLower.includes('react')) framework = 'react'
    else if (promptLower.includes('vue')) framework = 'vue'
    else if (promptLower.includes('angular')) framework = 'angular'
    else if (promptLower.includes('svelte')) framework = 'svelte'
    else if (promptLower.includes('preact')) framework = 'preact'
    else if (promptLower.includes('solid')) framework = 'solid'

    // CSS Framework detection
    let cssFramework: ArchitectureDetection['cssFramework'] = 'none'
    if (promptLower.includes('tailwind')) cssFramework = 'tailwind'
    else if (promptLower.includes('bootstrap')) cssFramework = 'bootstrap'
    else if (promptLower.includes('bulma')) cssFramework = 'bulma'

    // Structure detection
    let structure: ArchitectureDetection['structure'] = 'single-page'
    if (promptLower.includes('dashboard') || promptLower.includes('admin')) structure = 'dashboard'
    else if (promptLower.includes('shop') || promptLower.includes('ecommerce') || promptLower.includes('store')) structure = 'e-commerce'
    else if (promptLower.includes('portfolio') || promptLower.includes('blog')) structure = 'portfolio'
    else if (promptLower.includes('multi') || promptLower.includes('pages') || promptLower.includes('navigation')) structure = 'multi-page'

    return { framework, cssFramework, structure }
  }

  /**
   * Enhance prompts with architectural guidance
   */
  static enhancePromptWithArchitecturalGuidance(
    originalPrompt: string,
    existingFiles: ProjectFile[] = []
  ): EnhancedPrompt {
    const config = this.detectOptimalStructure(originalPrompt, existingFiles)
    const { framework, cssFramework, structure } = config

    let enhancedPrompt = originalPrompt

    // Add framework-specific guidance
    if (framework === 'react') {
      enhancedPrompt += `\n\nArchitectural Note: Use React components with modern hooks (useState, useEffect). Include proper JSX syntax and component structure.`
    } else if (framework === 'vue') {
      enhancedPrompt += `\n\nArchitectural Note: Use Vue.js 3 composition API with proper template, script, and style sections.`
    } else if (framework === 'angular') {
      enhancedPrompt += `\n\nArchitectural Note: Use Angular components with TypeScript and proper module structure.`
    } else if (framework === 'svelte') {
      enhancedPrompt += `\n\nArchitectural Note: Use Svelte components with proper script, markup, and style sections.`
    } else if (framework === 'preact') {
      enhancedPrompt += `\n\nArchitectural Note: Use Preact components (lightweight React alternative) with modern hooks.`
    } else if (framework === 'solid') {
      enhancedPrompt += `\n\nArchitectural Note: Use Solid.js components with fine-grained reactivity and JSX.`
    }

    // Add CSS framework-specific guidance
    if (cssFramework === 'tailwind') {
      enhancedPrompt += `\n\nCSS Framework Note: Use Tailwind CSS utility classes for styling. Include responsive design patterns and modern CSS.`
    } else if (cssFramework === 'bootstrap') {
      enhancedPrompt += `\n\nCSS Framework Note: Use Bootstrap 5 classes and components. Include responsive grid system and pre-built components.`
    } else if (cssFramework === 'bulma') {
      enhancedPrompt += `\n\nCSS Framework Note: Use Bulma CSS framework classes. Use modern CSS flexbox for layouts.`
    }

    // Add structure-specific guidance
    if (structure === 'dashboard') {
      enhancedPrompt += `\n\nStructural Note: Create a dashboard layout with sidebar navigation, header, and main content area. Include responsive design for mobile/desktop.`
    } else if (structure === 'multi-page') {
      enhancedPrompt += `\n\nStructural Note: Create a multi-page structure with proper navigation between sections. Use client-side routing if needed.`
    } else if (structure === 'e-commerce') {
      enhancedPrompt += `\n\nStructural Note: Include product listing, cart functionality, and checkout flow structure.`
    }

    // Add CIN7-specific guidance
    enhancedPrompt += `\n\nCIN7 Design System Requirements:
- Use CIN7 brand colors and design patterns
- Implement responsive design that works on all devices
- Include proper accessibility (ARIA labels, semantic HTML)
- Use modern CSS (flexbox/grid) for layouts
- Add proper error handling and loading states
- Follow CIN7 UX guidelines for inventory management interfaces`

    return {
      enhancedPrompt,
      detectedConfig: config,
      originalPrompt
    }
  }

  /**
   * Generate professional file structure
   */
  static generateFileStructure(architecture: ArchitectureDetection, projectName: string): ProjectFile[] {
    const { framework, cssFramework, structure } = architecture
    const files: ProjectFile[] = []

    // Generate index.html with proper framework setup
    files.push({
      id: 'index.html',
      name: 'index.html',
      type: 'html',
      content: this.generateIndexHTML(architecture, projectName),
      language: 'html'
    })

    // Add framework-specific files
    if (framework === 'react') {
      files.push({
        id: 'App.jsx',
        name: 'App.jsx',
        type: 'jsx',
        content: this.generateReactApp(structure, projectName),
        language: 'javascript'
      })

      files.push({
        id: 'Header.jsx',
        name: 'components/Header.jsx',
        type: 'jsx',
        content: this.generateReactComponent('Header', structure),
        language: 'javascript'
      })

      files.push({
        id: 'Navigation.jsx',
        name: 'components/Navigation.jsx',
        type: 'jsx',
        content: this.generateReactNavigation(structure),
        language: 'javascript'
      })
    }

    // Add additional pages for multi-page structures
    if (structure !== 'single-page') {
      const additionalPages = this.getAdditionalPages(structure)
      additionalPages.forEach(page => {
        const filename = `${page.path}.html`
        files.push({
          id: filename,
          name: filename,
          type: 'html',
          content: this.generatePageHTML(page, architecture, projectName),
          language: 'html'
        })
      })
    }

    // Add shared CSS
    files.push({
      id: 'styles.css',
      name: 'styles.css',
      type: 'css',
      content: this.generateModernCSS(framework, cssFramework, structure),
      language: 'css'
    })

    // Add routing script
    if (structure !== 'single-page') {
      files.push({
        id: 'router.js',
        name: 'router.js',
        type: 'javascript',
        content: this.generateClientSideRouter(structure),
        language: 'javascript'
      })
    }

    // Add main JavaScript
    files.push({
      id: 'script.js',
      name: 'script.js',
      type: 'javascript',
      content: this.generateMainScript(architecture),
      language: 'javascript'
    })

    return files
  }

  /**
   * Generate modern HTML with CDN packages
   */
  private static generateIndexHTML(architecture: ArchitectureDetection, projectName: string): string {
    const { framework, cssFramework, structure } = architecture
    const frameworkConfig = SUPPORTED_FRAMEWORKS[framework]
    const cssConfig = CSS_FRAMEWORKS[cssFramework]
    const cdnPackages = [...(frameworkConfig?.cdnPackages || []), ...(cssConfig?.cdnPackages || [])]

    const packageTags = cdnPackages.map(pkg => {
      if (pkg.includes('tailwindcss')) return `<script src="${pkg}"></script>`
      if (pkg.includes('.css')) return `<link rel="stylesheet" href="${pkg}">`
      return `<script src="${pkg}"></script>`
    }).join('\n    ')

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName} | ${frameworkConfig.name}</title>
    <link rel="stylesheet" href="styles.css">
    ${packageTags}
    <style>
        /* Critical CSS for instant loading */
        body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            flex-direction: column;
            gap: 1rem;
        }
        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f4f6;
            border-top: 4px solid #5c6ac4;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div id="app">
        <div class="loading">
            <div class="loading-spinner"></div>
            <div>Loading ${projectName}...</div>
        </div>
    </div>

    ${structure !== 'single-page' ? '<script src="router.js"></script>' : ''}
    <script src="script.js"></script>
    ${framework === 'react' ? this.generateReactBootstrap() : ''}
</body>
</html>`
  }

  /**
   * Generate React application
   */
  private static generateReactApp(structure: ArchitectureDetection['structure'], projectName: string): string {
    const pages = this.getAdditionalPages(structure)

    return `const { useState, useEffect } = React;

function App() {
    const [currentPage, setCurrentPage] = useState('home');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Simulate loading time
        const timer = setTimeout(() => setIsLoading(false), 500);
        return () => clearTimeout(timer);
    }, []);

    if (isLoading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <p>Loading ${projectName}...</p>
            </div>
        );
    }

    return (
        <div className="app">
            <Header title="${projectName}" />
            <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
            <main className="main-content">
                {currentPage === 'home' && <HomePage />}
                ${pages.map(page => `{currentPage === '${page.path}' && <${page.name}Page />}`).join('\n                ')}
            </main>
            <Footer />
        </div>
    );
}

function HomePage() {
    return (
        <div className="page home-page">
            <h1>Welcome to ${projectName}</h1>
            <p>This is a modern React application with client-side routing and CIN7 design system.</p>
        </div>
    );
}

${pages.map(page => `
function ${page.name}Page() {
    return (
        <div className="page ${page.path}-page">
            <h1>${page.title}</h1>
            <p>${page.description}</p>
        </div>
    );
}`).join('\n')}

function Footer() {
    return (
        <footer className="app-footer">
            <p>&copy; ${new Date().getFullYear()} ${projectName}. Built with React and CIN7 design system.</p>
        </footer>
    );
}`
  }

  /**
   * Generate React components
   */
  private static generateReactComponent(componentName: string, structure: ArchitectureDetection['structure']): string {
    return `function ${componentName}({ title }) {
    return (
        <header className="app-header">
            <div className="header-content">
                <h1 className="app-title">{title}</h1>
                <div className="header-actions">
                    <button className="btn btn-primary">Get Started</button>
                </div>
            </div>
        </header>
    );
}`
  }

  /**
   * Generate navigation component
   */
  private static generateReactNavigation(structure: ArchitectureDetection['structure']): string {
    const pages = this.getAdditionalPages(structure)

    return `function Navigation({ currentPage, onPageChange }) {
    const navItems = [
        { route: 'home', label: 'Home', icon: '🏠' },
        ${pages.map(page => `{ route: '${page.path}', label: '${page.title}', icon: '📄' }`).join(',\n        ')}
    ];

    return (
        <nav className="app-navigation">
            <div className="nav-content">
                {navItems.map(item => (
                    <button
                        key={item.route}
                        className={\`nav-item \${currentPage === item.route ? 'active' : ''}\`}
                        onClick={() => onPageChange(item.route)}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                    </button>
                ))}
            </div>
        </nav>
    );
}`
  }

  /**
   * Generate modern CSS with CIN7 design system
   */
  private static generateModernCSS(framework: SupportedFramework, cssFramework: ArchitectureDetection['cssFramework'], structure: ArchitectureDetection['structure']): string {
    const isTailwind = cssFramework === 'tailwind'

    if (isTailwind) {
      return `@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom CIN7 components */
@layer components {
    .btn {
        @apply px-4 py-2 rounded-md font-medium transition-colors duration-200;
    }

    .btn-primary {
        @apply bg-blue-600 text-white hover:bg-blue-700;
    }

    .app-header {
        @apply bg-white shadow-sm border-b border-gray-200;
    }

    .app-navigation {
        @apply bg-gray-50 border-b border-gray-200;
    }

    .nav-item {
        @apply flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors;
    }

    .nav-item.active {
        @apply text-blue-600 bg-blue-50;
    }
}`
    }

    return `/* Modern CSS Reset */
*, *::before, *::after {
    box-sizing: border-box;
}

* {
    margin: 0;
    padding: 0;
}

body {
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    background-color: #f6f8fc;
    color: #202223;
}

/* CIN7 App Layout */
.app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

.app-header {
    background: white;
    border-bottom: 1px solid #e5e7eb;
    padding: 1rem 2rem;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.header-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.app-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: #202223;
}

.app-navigation {
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
    padding: 0 2rem;
}

.nav-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    gap: 0.5rem;
}

.nav-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: none;
    border: none;
    color: #454f5b;
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 0.375rem;
    font-weight: 500;
}

.nav-item:hover {
    color: #202223;
    background: #f3f4f6;
}

.nav-item.active {
    color: #5c6ac4;
    background: #eef2ff;
}

.main-content {
    flex: 1;
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
}

.page {
    animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

.btn {
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    background: #5c6ac4;
    color: white;
}

.btn:hover {
    background: #4c5ab5;
}

.btn-primary {
    background: #5c6ac4;
    color: white;
}

.btn-primary:hover {
    background: #4c5ab5;
}

.app-footer {
    background: #f9fafb;
    border-top: 1px solid #e5e7eb;
    padding: 2rem;
    text-align: center;
    color: #6b7280;
    margin-top: auto;
}

.loading-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    gap: 1rem;
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f4f6;
    border-top: 4px solid #5c6ac4;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* Responsive Design */
@media (max-width: 768px) {
    .header-content {
        padding: 0 1rem;
        flex-direction: column;
        gap: 1rem;
    }

    .nav-content {
        padding: 0 1rem;
        overflow-x: auto;
        justify-content: center;
    }

    .main-content {
        padding: 1rem;
    }

    .app-header {
        padding: 1rem;
    }
}`
  }

  /**
   * Generate client-side router
   */
  private static generateClientSideRouter(structure: ArchitectureDetection['structure']): string {
    return `// Simple Client-Side Router for Multi-Page Applications
class SimpleRouter {
    constructor() {
        this.routes = {};
        this.currentRoute = '';
        this.init();
    }

    init() {
        // Handle initial route
        this.handleRoute();

        // Listen for navigation
        window.addEventListener('popstate', () => this.handleRoute());

        // Intercept navigation links
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-route]')) {
                e.preventDefault();
                const route = e.target.getAttribute('data-route');
                this.navigate(route);
            }
        });
    }

    register(path, handler) {
        this.routes[path] = handler;
    }

    navigate(path) {
        window.history.pushState({}, '', path);
        this.handleRoute();
    }

    handleRoute() {
        const path = window.location.pathname === '/' ? 'home' : window.location.pathname.slice(1);
        this.currentRoute = path;

        // Update active navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeItem = document.querySelector(\`[data-route="\${path}"]\`);
        activeItem?.classList.add('active');

        // Handle route
        const handler = this.routes[path] || this.routes['404'];
        if (handler) handler();
    }
}

// Initialize router when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const router = new SimpleRouter();

    // Register routes
    router.register('home', () => {
        console.log('Home page loaded');
        // Add home page specific logic here
    });

    ${this.getAdditionalPages(structure).map(page => `
    router.register('${page.path}', () => {
        console.log('${page.title} page loaded');
        // Add ${page.title.toLowerCase()} page specific logic here
    });`).join('\n    ')}

    router.register('404', () => {
        console.log('Page not found');
        // Handle 404 page
    });
});`
  }

  /**
   * Get additional pages based on structure
   */
  private static getAdditionalPages(structure: ArchitectureDetection['structure']): PageConfig[] {
    const pageConfigs = {
      'multi-page': [
        { id: 'about', name: 'About', path: 'about', title: 'About', description: 'Learn more about us' },
        { id: 'contact', name: 'Contact', path: 'contact', title: 'Contact', description: 'Get in touch' }
      ],
      'dashboard': [
        { id: 'dashboard', name: 'Dashboard', path: 'dashboard', title: 'Dashboard', description: 'Overview and analytics' },
        { id: 'users', name: 'Users', path: 'users', title: 'Users', description: 'User management' },
        { id: 'settings', name: 'Settings', path: 'settings', title: 'Settings', description: 'Application settings' }
      ],
      'e-commerce': [
        { id: 'products', name: 'Products', path: 'products', title: 'Products', description: 'Browse our products' },
        { id: 'cart', name: 'Cart', path: 'cart', title: 'Cart', description: 'Your shopping cart' },
        { id: 'checkout', name: 'Checkout', path: 'checkout', title: 'Checkout', description: 'Complete your purchase' }
      ],
      'portfolio': [
        { id: 'portfolio', name: 'Portfolio', path: 'portfolio', title: 'Portfolio', description: 'View my work' },
        { id: 'blog', name: 'Blog', path: 'blog', title: 'Blog', description: 'Latest articles' },
        { id: 'contact', name: 'Contact', path: 'contact', title: 'Contact', description: 'Get in touch' }
      ]
    }

    return pageConfigs[structure] || []
  }

  /**
   * Generate individual page HTML
   */
  private static generatePageHTML(
    page: PageConfig,
    architecture: ArchitectureDetection,
    projectName: string
  ): string {
    const { framework, cssFramework } = architecture
    const frameworkConfig = SUPPORTED_FRAMEWORKS[framework]
    const cssConfig = CSS_FRAMEWORKS[cssFramework]
    const cdnPackages = [...(frameworkConfig?.cdnPackages || []), ...(cssConfig?.cdnPackages || [])]

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${page.title} | ${projectName}</title>
    <link rel="stylesheet" href="../styles.css">
    ${cdnPackages.map(pkg => {
      if (pkg.includes('.css')) return `<link rel="stylesheet" href="${pkg}">`
      return `<script src="${pkg}"></script>`
    }).join('\n    ') || ''}
</head>
<body>
    <div class="app">
        <header class="app-header">
            <div class="header-content">
                <h1><a href="/">${projectName}</a></h1>
                <nav>
                    <a href="/" data-route="home">Home</a>
                    <a href="/${page.path}" data-route="${page.path}" class="active">${page.title}</a>
                </nav>
            </div>
        </header>

        <main class="main-content">
            <div class="page ${page.path}-page">
                <h1>${page.title}</h1>
                <p>${page.description}</p>

                <!-- Page-specific content will be generated here -->
                <div class="page-content">
                    <p>This is the ${page.title} page. Content will be customized based on your requirements.</p>
                </div>
            </div>
        </main>

        <footer class="app-footer">
            <p>&copy; ${new Date().getFullYear()} ${projectName}. Built with modern web technologies.</p>
        </footer>
    </div>

    <script src="../router.js"></script>
    <script src="../script.js"></script>
</body>
</html>`
  }

  /**
   * Generate main JavaScript
   */
  private static generateMainScript(architecture: ArchitectureDetection): string {
    const { framework, structure } = architecture

    return `// Main Application Script
document.addEventListener('DOMContentLoaded', function() {
    console.log('${framework} application loaded with ${structure} structure');

    // Initialize application
    initializeApp();

    // Setup interactions
    setupInteractions();

    // Initialize animations
    initializeAnimations();
});

function initializeApp() {
    // App initialization logic
    console.log('Initializing application...');

    // Remove loading screen
    const loadingScreen = document.querySelector('.loading');
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => loadingScreen.remove(), 300);
        }, 500);
    }
}

function setupInteractions() {
    // Button interactions
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', handleButtonClick);
    });

    // Navigation interactions
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', handleNavigation);
    });
}

function handleButtonClick(e) {
    const btn = e.target;
    btn.classList.add('clicked');
    setTimeout(() => btn.classList.remove('clicked'), 200);
}

function handleNavigation(e) {
    const route = e.target.getAttribute('data-route');
    if (route) {
        console.log('Navigating to:', route);
        // Add navigation logic here
    }
}

function initializeAnimations() {
    // Intersection Observer for animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    });

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });
}

// CIN7 specific functionality
function initializeCIN7Features() {
    // Add CIN7-specific features here
    console.log('Initializing CIN7 features...');
}

// Call CIN7 features initialization
initializeCIN7Features();`
  }

  /**
   * Generate React bootstrap
   */
  private static generateReactBootstrap(): string {
    return `
    <script type="text/babel">
        ReactDOM.render(<App />, document.getElementById('app'));
    </script>`
  }
}