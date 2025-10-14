import { Project, ProjectFile, Template, ProjectTemplate, SupportedFramework } from '@/types'

export class TemplateService {
  private static instance: TemplateService

  static getInstance(): TemplateService {
    if (!TemplateService.instance) {
      TemplateService.instance = new TemplateService()
    }
    return TemplateService.instance
  }

  async generateProjectFromTemplate(
    templateType: ProjectTemplate,
    userId: string,
    customizations?: {
      name?: string
      description?: string
      theme?: string
    }
  ): Promise<Project> {
    const template = await this.getTemplate(templateType)
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const project: Project = {
      id: projectId,
      user_id: userId,
      name: customizations?.name || template.name,
      description: customizations?.description || template.description,
      prompt: `Create a ${template.name.toLowerCase()} with pre-configured components and sample data`,
      files: await this.generateFilesFromTemplate(template),
      messages: [],
      metadata: {
        architecture: template.architecture,
        framework: template.framework,
        template: templateType,
        tags: template.metadata.tags,
        version: template.metadata.version
      },
      settings: {
        theme: {
          mode: 'light',
          primary_color: customizations?.theme || '#0066cc',
          framework: template.framework
        },
        editor: {
          tab_size: 2,
          word_wrap: true,
          minimap: true,
          line_numbers: true,
          font_size: 14,
          theme: 'vs-dark'
        },
        preview: {
          auto_refresh: true,
          device: 'desktop',
          orientation: 'landscape',
          size: { width: 1200, height: 800 }
        },
        ai: {
          model: 'claude-3-5-sonnet',
          temperature: 0.7,
          max_tokens: 4000,
          context_window: 200000,
          auto_suggestions: true,
          code_completion: true
        },
        collaboration: {
          real_time: false,
          permissions: []
        }
      },
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    return project
  }

  private async getTemplate(templateType: ProjectTemplate): Promise<Template> {
    switch (templateType) {
      case 'cin7-sales':
        return this.getSalesDashboardTemplate()
      case 'multi-page-app':
        return this.getMultiPageAppTemplate()
      default:
        throw new Error(`Template ${templateType} not found`)
    }
  }

  private async generateFilesFromTemplate(template: Template): Promise<ProjectFile[]> {
    const files: ProjectFile[] = []

    for (const templateFile of template.files) {
      const projectFile: ProjectFile = {
        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: templateFile.name,
        type: templateFile.type,
        content: templateFile.content,
        language: this.getLanguageFromType(templateFile.type),
        path: templateFile.name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      files.push(projectFile)
    }

    return files
  }

  private getLanguageFromType(fileType: string): string {
    const typeMap: Record<string, string> = {
      'html': 'html',
      'css': 'css',
      'javascript': 'javascript',
      'typescript': 'typescript',
      'jsx': 'jsx',
      'tsx': 'tsx',
      'json': 'json'
    }
    return typeMap[fileType] || 'text'
  }

  private getSalesDashboardTemplate(): Template {
    return {
      id: 'sales-dashboard-template',
      name: 'Sales Dashboard',
      description: 'A comprehensive sales dashboard with revenue analytics, customer metrics, product performance, and sales team insights',
      category: 'cin7',
      framework: 'react',
      architecture: {
        type: 'dashboard',
        pages: [
          {
            id: 'dashboard',
            name: 'Sales Dashboard',
            path: '/',
            title: 'Sales Dashboard',
            components: ['RevenueChart', 'SalesMetrics', 'CustomerAnalytics', 'ProductPerformance']
          },
          {
            id: 'analytics',
            name: 'Detailed Analytics',
            path: '/analytics',
            title: 'Analytics',
            components: ['TrendAnalysis', 'ForecastChart', 'ComparisonView']
          }
        ],
        routing: {
          type: 'client-side',
          routes: [
            { path: '/', component: 'Dashboard', exact: true },
            { path: '/analytics', component: 'Analytics', exact: true }
          ]
        },
        components: [
          { name: 'RevenueChart', type: 'ui', dependencies: ['recharts'] },
          { name: 'SalesMetrics', type: 'business', dependencies: [] },
          { name: 'CustomerAnalytics', type: 'business', dependencies: ['recharts'] },
          { name: 'ProductPerformance', type: 'business', dependencies: ['recharts'] },
          { name: 'TrendAnalysis', type: 'ui', dependencies: ['recharts'] },
          { name: 'ForecastChart', type: 'ui', dependencies: ['recharts'] },
          { name: 'ComparisonView', type: 'business', dependencies: [] }
        ]
      },
      files: this.generateSalesDashboardFiles(),
      settings: {
        theme: {
          mode: 'light'
        },
        editor: {
          tab_size: 2,
          word_wrap: true,
          minimap: true,
          line_numbers: true,
          font_size: 14,
          theme: 'vs-dark'
        },
        preview: {
          auto_refresh: true,
          device: 'desktop',
          orientation: 'landscape',
          size: { width: 1200, height: 800 }
        },
        ai: {
          model: 'claude-3-5-sonnet',
          temperature: 0.7,
          max_tokens: 4000,
          context_window: 200000,
          auto_suggestions: true,
          code_completion: true
        },
        collaboration: {
          real_time: false,
          permissions: []
        }
      },
      preview: {
        images: ['/templates/sales-dashboard-preview.jpg'],
        features: [
          'Real-time revenue tracking',
          'Customer analytics and insights',
          'Product performance metrics',
          'Sales team performance tracking',
          'Interactive charts and filters',
          'Forecasting capabilities',
          'Export functionality',
          'Responsive design'
        ]
      },
      metadata: {
        author: 'CIN7 AI Team',
        version: '1.0.0',
        tags: ['sales', 'dashboard', 'analytics', 'revenue', 'crm'],
        difficulty: 'intermediate',
        estimated_time: 30,
        dependencies: ['react', 'recharts', 'lucide-react', 'date-fns']
      }
    }
  }

  private getMultiPageAppTemplate(): Template {
    return {
      id: 'multi-page-app-template',
      name: 'Multi-Page Application',
      description: 'A complete multi-page application with routing, responsive design, navigation, and common pages like Home, About, Services, Contact, and more',
      category: 'business',
      framework: 'react',
      architecture: {
        type: 'multi-page',
        pages: [
          {
            id: 'home',
            name: 'Home',
            path: '/',
            title: 'Welcome to Our Company',
            components: ['HeroSection', 'FeaturesSection', 'TestimonialsSection', 'CallToAction']
          },
          {
            id: 'about',
            name: 'About Us',
            path: '/about',
            title: 'About Our Company',
            components: ['AboutHeader', 'MissionSection', 'TeamSection', 'ValuesSection']
          },
          {
            id: 'services',
            name: 'Services',
            path: '/services',
            title: 'Our Services',
            components: ['ServicesHeader', 'ServicesGrid', 'ProcessSection']
          },
          {
            id: 'contact',
            name: 'Contact',
            path: '/contact',
            title: 'Contact Us',
            components: ['ContactHeader', 'ContactForm', 'ContactInfo', 'MapSection']
          },
          {
            id: 'blog',
            name: 'Blog',
            path: '/blog',
            title: 'Our Blog',
            components: ['BlogHeader', 'BlogGrid', 'BlogSidebar']
          },
          {
            id: 'portfolio',
            name: 'Portfolio',
            path: '/portfolio',
            title: 'Our Portfolio',
            components: ['PortfolioHeader', 'PortfolioGrid', 'CaseStudyModal']
          }
        ],
        routing: {
          type: 'client-side',
          routes: [
            { path: '/', component: 'HomePage', exact: true },
            { path: '/about', component: 'AboutPage', exact: true },
            { path: '/services', component: 'ServicesPage', exact: true },
            { path: '/contact', component: 'ContactPage', exact: true },
            { path: '/blog', component: 'BlogPage', exact: true },
            { path: '/portfolio', component: 'PortfolioPage', exact: true }
          ]
        },
        components: [
          { name: 'Navigation', type: 'layout', dependencies: ['react-router-dom'] },
          { name: 'Footer', type: 'layout', dependencies: [] },
          { name: 'HeroSection', type: 'ui', dependencies: [] },
          { name: 'FeaturesSection', type: 'ui', dependencies: [] },
          { name: 'TestimonialsSection', type: 'ui', dependencies: [] },
          { name: 'CallToAction', type: 'ui', dependencies: [] },
          { name: 'AboutHeader', type: 'ui', dependencies: [] },
          { name: 'MissionSection', type: 'ui', dependencies: [] },
          { name: 'TeamSection', type: 'ui', dependencies: [] },
          { name: 'ValuesSection', type: 'ui', dependencies: [] },
          { name: 'ServicesHeader', type: 'ui', dependencies: [] },
          { name: 'ServicesGrid', type: 'ui', dependencies: [] },
          { name: 'ProcessSection', type: 'ui', dependencies: [] },
          { name: 'ContactHeader', type: 'ui', dependencies: [] },
          { name: 'ContactForm', type: 'business', dependencies: [] },
          { name: 'ContactInfo', type: 'ui', dependencies: [] },
          { name: 'MapSection', type: 'ui', dependencies: [] },
          { name: 'BlogHeader', type: 'ui', dependencies: [] },
          { name: 'BlogGrid', type: 'ui', dependencies: [] },
          { name: 'BlogSidebar', type: 'ui', dependencies: [] },
          { name: 'PortfolioHeader', type: 'ui', dependencies: [] },
          { name: 'PortfolioGrid', type: 'ui', dependencies: [] },
          { name: 'CaseStudyModal', type: 'ui', dependencies: [] }
        ]
      },
      files: this.generateMultiPageAppFiles(),
      settings: {
        theme: {
          mode: 'light'
        },
        editor: {
          tab_size: 2,
          word_wrap: true,
          minimap: true,
          line_numbers: true,
          font_size: 14,
          theme: 'vs-dark'
        },
        preview: {
          auto_refresh: true,
          device: 'desktop',
          orientation: 'landscape',
          size: { width: 1200, height: 800 }
        },
        ai: {
          model: 'claude-3-5-sonnet',
          temperature: 0.7,
          max_tokens: 4000,
          context_window: 200000,
          auto_suggestions: true,
          code_completion: true
        },
        collaboration: {
          real_time: false,
          permissions: []
        }
      },
      preview: {
        images: ['/templates/multi-page-app-preview.jpg'],
        features: [
          'Multi-page routing with React Router',
          'Responsive design for all devices',
          'Modern navigation with mobile menu',
          'Contact form with validation',
          'Blog layout with articles',
          'Portfolio showcase',
          'Service pages display',
          'Company information pages',
          'SEO-friendly structure',
          'Professional styling',
          'Interactive components',
          'Footer with links'
        ]
      },
      metadata: {
        author: 'CIN7 AI Team',
        version: '1.0.0',
        tags: ['multi-page', 'routing', 'responsive', 'business', 'portfolio', 'blog', 'contact'],
        difficulty: 'intermediate',
        estimated_time: 45,
        dependencies: ['react', 'react-router-dom', 'lucide-react']
      }
    }
  }

  private generateMultiPageAppFiles() {
    return [
      {
        name: 'package.json',
        type: 'json' as const,
        content: JSON.stringify({
          name: "multi-page-app",
          version: "1.0.0",
          dependencies: {
            "react": "^18.2.0",
            "react-dom": "^18.2.0",
            "react-router-dom": "^6.8.0",
            "lucide-react": "^0.292.0"
          },
          devDependencies: {
            "@types/react": "^18.2.37",
            "@types/react-dom": "^18.2.15",
            "@vitejs/plugin-react": "^4.1.1",
            "vite": "^4.5.0",
            "typescript": "^5.2.2"
          }
        }, null, 2),
        description: "Package dependencies and scripts",
        editable: false,
        required: true
      },
      {
        name: 'index.html',
        type: 'html' as const,
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Multi-Page Application</title>
    <meta name="description" content="A professional multi-page application built with React">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #fff;
        }
        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid white;
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
    <div id="root">
        <div class="loading">
            <div class="spinner"></div>
        </div>
    </div>
    <script type="module" src="/src/main.tsx"></script>
</body>
</html>`,
        description: "Main HTML template for the multi-page application",
        editable: false,
        required: true
      },
      {
        name: 'src/main.tsx',
        type: 'tsx' as const,
        content: `import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  )
}`,
        description: "React application entry point with router",
        editable: false,
        required: true
      },
      {
        name: 'src/index.css',
        type: 'css' as const,
        content: `:root {
  --color-primary: #3b82f6;
  --color-primary-dark: #1e40af;
  --color-secondary: #6366f1;
  --color-accent: #8b5cf6;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-400: #9ca3af;
  --color-gray-500: #6b7280;
  --color-gray-600: #4b5563;
  --color-gray-700: #374151;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: var(--font-sans);
  background-color: var(--color-gray-50);
  color: var(--color-gray-900);
  line-height: 1.6;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.container-fluid {
  width: 100%;
  padding: 0 20px;
}

.grid {
  display: grid;
  gap: 24px;
}

.grid-cols-1 { grid-template-columns: repeat(1, 1fr); }
.grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
.grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
.grid-cols-4 { grid-template-columns: repeat(4, 1fr); }

.grid-cols-1.md\\:grid-cols-2 { grid-template-columns: repeat(1, 1fr); }
.grid-cols-2.md\\:grid-cols-3 { grid-template-columns: repeat(2, 1fr); }
.grid-cols-3.md\\:grid-cols-4 { grid-template-columns: repeat(3, 1fr); }

@media (min-width: 768px) {
  .grid-cols-1.md\\:grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
  .grid-cols-2.md\\:grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
  .grid-cols-3.md\\:grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
}

.flex {
  display: flex;
}

.flex-col {
  flex-direction: column;
}

.items-center {
  align-items: center;
}

.justify-center {
  justify-content: center;
}

.justify-between {
  justify-content: space-between;
}

.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
.gap-4 { gap: 16px; }
.gap-6 { gap: 24px; }
.gap-8 { gap: 32px; }

.card {
  background: white;
  border: 1px solid var(--color-gray-200);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  justify-content: center;
  min-height: 48px;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-secondary {
  background: var(--color-gray-200);
  color: var(--color-gray-700);
}

.btn-secondary:hover {
  background: var(--color-gray-300);
}

.btn-outline {
  background: transparent;
  color: var(--color-primary);
  border: 2px solid var(--color-primary);
}

.btn-outline:hover {
  background: var(--color-primary);
  color: white;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-gray-700);
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--color-gray-300);
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-textarea {
  min-height: 120px;
  resize: vertical;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.hero {
  padding: 80px 0;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  color: white;
  text-align: center;
}

.section {
  padding: 80px 0;
}

.section-gray {
  background: var(--color-gray-50);
}

.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }

.text-sm { font-size: 14px; }
.text-lg { font-size: 18px; }
.text-xl { font-size: 20px; }
.text-2xl { font-size: 24px; }
.text-3xl { font-size: 30px; }
.text-4xl { font-size: 36px; }
.text-5xl { font-size: 48px; }

.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }

.text-gray-400 { color: var(--color-gray-400); }
.text-gray-500 { color: var(--color-gray-500); }
.text-gray-600 { color: var(--color-gray-600); }
.text-gray-700 { color: var(--color-gray-700); }
.text-gray-800 { color: var(--color-gray-800); }
.text-gray-900 { color: var(--color-gray-900); }

.mb-2 { margin-bottom: 8px; }
.mb-3 { margin-bottom: 12px; }
.mb-4 { margin-bottom: 16px; }
.mb-6 { margin-bottom: 24px; }
.mb-8 { margin-bottom: 32px; }
.mb-10 { margin-bottom: 40px; }

.mt-2 { margin-top: 8px; }
.mt-3 { margin-top: 12px; }
.mt-4 { margin-top: 16px; }
.mt-6 { margin-top: 24px; }
.mt-8 { margin-top: 32px; }
.mt-10 { margin-top: 40px; }

.py-2 { padding-top: 8px; padding-bottom: 8px; }
.py-4 { padding-top: 16px; padding-bottom: 16px; }
.py-6 { padding-top: 24px; padding-bottom: 24px; }
.py-8 { padding-top: 32px; padding-bottom: 32px; }
.py-10 { padding-top: 40px; padding-bottom: 40px; }

.px-4 { padding-left: 16px; padding-right: 16px; }
.px-6 { padding-left: 24px; padding-right: 24px; }
.px-8 { padding-left: 32px; padding-right: 32px; }

.rounded-lg { border-radius: 8px; }
.rounded-xl { border-radius: 12px; }
.rounded-2xl { border-radius: 16px; }

.shadow-sm { box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); }
.shadow-md { box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
.shadow-lg { box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1); }
.shadow-xl { box-shadow: 0 20px 25px rgba(0, 0, 0, 0.1); }

.transition { transition: all 0.2s ease; }
.transition-transform { transition: transform 0.2s ease; }
.transition-colors { transition: color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease; }

.hidden { display: none; }
.block { display: block; }
.inline-block { display: inline-block; }

@media (max-width: 768px) {
  .hero {
    padding: 60px 0;
  }

  .section {
    padding: 60px 0;
  }

  .text-5xl { font-size: 36px; }
  .text-4xl { font-size: 30px; }
  .text-3xl { font-size: 24px; }

  .btn {
    padding: 10px 20px;
    font-size: 14px;
  }
}

.fade-in {
  animation: fadeIn 0.6s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.bounce {
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-10px); }
  60% { transform: translateY(-5px); }
}`,
        description: "Global styles for the multi-page application",
        editable: false,
        required: true
      },
      {
        name: 'src/App.tsx',
        type: 'tsx' as const,
        content: `import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Navigation } from './components/Navigation'
import { Footer } from './components/Footer'
import { HomePage } from './pages/HomePage'
import { AboutPage } from './pages/AboutPage'
import { ServicesPage } from './pages/ServicesPage'
import { ContactPage } from './pages/ContactPage'
import { BlogPage } from './pages/BlogPage'
import { PortfolioPage } from './pages/PortfolioPage'
import './App.css'

function App() {
  return (
    <div className="App">
      <Navigation />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default App`,
        description: "Main application component with routing configuration",
        editable: true,
        required: true
      },
      {
        name: 'src/App.css',
        type: 'css' as const,
        content: `.App {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

main {
  flex: 1;
}

/* Navigation styles */
.nav {
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 70px;
}

.nav-logo {
  font-size: 24px;
  font-weight: bold;
  color: var(--color-primary);
  text-decoration: none;
  transition: color 0.2s ease;
}

.nav-logo:hover {
  color: var(--color-primary-dark);
}

.nav-menu {
  display: flex;
  list-style: none;
  gap: 32px;
  margin: 0;
  padding: 0;
}

.nav-link {
  color: var(--color-gray-700);
  text-decoration: none;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 8px;
  transition: all 0.2s ease;
  position: relative;
}

.nav-link:hover,
.nav-link.active {
  color: var(--color-primary);
  background: rgba(59, 130, 246, 0.1);
}

.nav-toggle {
  display: none;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--color-gray-700);
}

/* Footer styles */
.footer {
  background: var(--color-gray-900);
  color: white;
  padding: 60px 0 20px;
  margin-top: auto;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 40px;
  margin-bottom: 40px;
}

.footer-section h3 {
  margin-bottom: 20px;
  color: white;
}

.footer-links {
  list-style: none;
  padding: 0;
}

.footer-links li {
  margin-bottom: 8px;
}

.footer-links a {
  color: var(--color-gray-400);
  text-decoration: none;
  transition: color 0.2s ease;
}

.footer-links a:hover {
  color: white;
}

.footer-bottom {
  text-align: center;
  padding: 20px;
  border-top: 1px solid var(--color-gray-800);
  color: var(--color-gray-400);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .nav-menu {
    position: fixed;
    top: 70px;
    right: -100%;
    width: 250px;
    height: calc(100vh - 70px);
    background: white;
    flex-direction: column;
    gap: 0;
    padding: 20px;
    box-shadow: -2px 0 4px rgba(0, 0, 0, 0.1);
    transition: right 0.3s ease;
  }

  .nav-menu.active {
    right: 0;
  }

  .nav-toggle {
    display: block;
  }

  .footer-content {
    grid-template-columns: 1fr;
    text-align: center;
  }
}`,
        description: "App-specific styles for layout components",
        editable: true,
        required: true
      },
      {
        name: 'src/components/Navigation.tsx',
        type: 'tsx' as const,
        content: `import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

export const Navigation: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMenuOpen && !(event.target as Element).closest('.nav-menu') && !(event.target as Element).closest('.nav-toggle')) {
        closeMenu()
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isMenuOpen])

  // Close menu when route changes
  useEffect(() => {
    closeMenu()
  }, [location.pathname])

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/about', label: 'About' },
    { path: '/services', label: 'Services' },
    { path: '/portfolio', label: 'Portfolio' },
    { path: '/blog', label: 'Blog' },
    { path: '/contact', label: 'Contact' }
  ]

  return (
    <nav className="nav">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          YourCompany
        </Link>

        <button
          className="nav-toggle"
          onClick={toggleMenu}
          aria-label="Toggle navigation menu"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <ul className={\`nav-menu \${isMenuOpen ? 'active' : ''}\`}>
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={\`nav-link \${location.pathname === item.path ? 'active' : ''}\`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}`,
        description: "Responsive navigation component with mobile menu",
        editable: true,
        required: true
      },
      {
        name: 'src/components/Footer.tsx',
        type: 'tsx' as const,
        content: `import React from 'react'
import { Link } from 'react-router-dom'
import { Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram } from 'lucide-react'

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>YourCompany</h3>
          <p>Creating amazing digital experiences that help businesses grow and succeed in the modern world.</p>
          <div className="flex gap-4 mt-4">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
              <Facebook size={20} />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
              <Twitter size={20} />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
              <Linkedin size={20} />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
              <Instagram size={20} />
            </a>
          </div>
        </div>

        <div className="footer-section">
          <h3>Quick Links</h3>
          <ul className="footer-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/services">Services</Link></li>
            <li><Link to="/portfolio">Portfolio</Link></li>
            <li><Link to="/blog">Blog</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>Services</h3>
          <ul className="footer-links">
            <li><Link to="/services">Web Development</Link></li>
            <li><Link to="/services">Mobile Apps</Link></li>
            <li><Link to="/services">UI/UX Design</Link></li>
            <li><Link to="/services">Digital Marketing</Link></li>
            <li><Link to="/services">Consulting</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>Contact Info</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Mail size={16} />
              <span>hello@yourcompany.com</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone size={16} />
              <span>+1 (555) 123-4567</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={16} />
              <span>123 Business St, City, State 12345</span>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {currentYear} YourCompany. All rights reserved.</p>
      </div>
    </footer>
  )
}`,
        description: "Footer component with company information and links",
        editable: true,
        required: true
      },
      {
        name: 'src/pages/HomePage.tsx',
        type: 'tsx' as const,
        content: `import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Star, CheckCircle } from 'lucide-react'
import { HeroSection } from '../components/HeroSection'
import { FeaturesSection } from '../components/FeaturesSection'
import { TestimonialsSection } from '../components/TestimonialsSection'
import { CallToAction } from '../components/CallToAction'

export const HomePage: React.FC = () => {
  return (
    <div>
      <HeroSection />
      <FeaturesSection />
      <TestimonialsSection />
      <CallToAction />
    </div>
  )
}`,
        description: "Home page with hero, features, testimonials, and CTA sections",
        editable: true,
        required: true
      },
      {
        name: 'src/pages/AboutPage.tsx',
        type: 'tsx' as const,
        content: `import React from 'react'
import { AboutHeader } from '../components/AboutHeader'
import { MissionSection } from '../components/MissionSection'
import { TeamSection } from '../components/TeamSection'
import { ValuesSection } from '../components/ValuesSection'

export const AboutPage: React.FC = () => {
  return (
    <div>
      <AboutHeader />
      <MissionSection />
      <TeamSection />
      <ValuesSection />
    </div>
  )
}`,
        description: "About page with company information, mission, team, and values",
        editable: true,
        required: true
      },
      {
        name: 'src/pages/ServicesPage.tsx',
        type: 'tsx' as const,
        content: `import React from 'react'
import { ServicesHeader } from '../components/ServicesHeader'
import { ServicesGrid } from '../components/ServicesGrid'
import { ProcessSection } from '../components/ProcessSection'

export const ServicesPage: React.FC = () => {
  return (
    <div>
      <ServicesHeader />
      <ServicesGrid />
      <ProcessSection />
    </div>
  )
}`,
        description: "Services page showcasing service offerings and process",
        editable: true,
        required: true
      },
      {
        name: 'src/pages/ContactPage.tsx',
        type: 'tsx' as const,
        content: `import React from 'react'
import { ContactHeader } from '../components/ContactHeader'
import { ContactForm } from '../components/ContactForm'
import { ContactInfo } from '../components/ContactInfo'
import { MapSection } from '../components/MapSection'

export const ContactPage: React.FC = () => {
  return (
    <div>
      <ContactHeader />
      <div className="container grid grid-cols-1 md:grid-cols-2 gap-8 py-8">
        <ContactForm />
        <ContactInfo />
      </div>
      <MapSection />
    </div>
  )
}`,
        description: "Contact page with form, information, and map",
        editable: true,
        required: true
      },
      {
        name: 'src/pages/BlogPage.tsx',
        type: 'tsx' as const,
        content: `import React from 'react'
import { BlogHeader } from '../components/BlogHeader'
import { BlogGrid } from '../components/BlogGrid'
import { BlogSidebar } from '../components/BlogSidebar'

export const BlogPage: React.FC = () => {
  return (
    <div>
      <BlogHeader />
      <div className="container grid grid-cols-1 md:grid-cols-3 gap-8 py-8">
        <div className="md:col-span-2">
          <BlogGrid />
        </div>
        <div>
          <BlogSidebar />
        </div>
      </div>
    </div>
  )
}`,
        description: "Blog page with articles and sidebar",
        editable: true,
        required: true
      },
      {
        name: 'src/pages/PortfolioPage.tsx',
        type: 'tsx' as const,
        content: `import React from 'react'
import { PortfolioHeader } from '../components/PortfolioHeader'
import { PortfolioGrid } from '../components/PortfolioGrid'
import { CaseStudyModal } from '../components/CaseStudyModal'

export const PortfolioPage: React.FC = () => {
  return (
    <div>
      <PortfolioHeader />
      <PortfolioGrid />
      <CaseStudyModal />
    </div>
  )
}`,
        description: "Portfolio page showcasing work and case studies",
        editable: true,
        required: true
      },
      {
        name: 'src/components/HeroSection.tsx',
        type: 'tsx' as const,
        content: `import React from 'react'
import { ArrowRight, Play, CheckCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

export const HeroSection: React.FC = () => {
  return (
    <section className="hero">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl font-bold mb-6 fade-in">
              Transform Your Business with Digital Excellence
            </h1>
            <p className="text-xl mb-8 text-gray-100 fade-in">
              We create stunning digital experiences that drive growth, engage customers, and set you apart from the competition.
            </p>
            <div className="flex gap-4 mb-8 fade-in">
              <Link to="/contact" className="btn btn-primary">
                Get Started
                <ArrowRight size={20} />
              </Link>
              <Link to="/portfolio" className="btn btn-outline">
                View Our Work
              </Link>
            </div>
            <div className="flex items-center gap-6 fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle className="text-green-400" size={20} />
                <span>Free Consultation</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="text-green-400" size={20} />
                <span>30-Day Guarantee</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="text-green-400" size={20} />
                <span>Expert Team</span>
              </div>
            </div>
          </div>
          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4">
                    <div className="text-3xl font-bold text-blue-600">500+</div>
                    <div className="text-sm text-gray-600">Projects Completed</div>
                  </div>
                  <div className="p-4">
                    <div className="text-3xl font-bold text-green-600">98%</div>
                    <div className="text-sm text-gray-600">Client Satisfaction</div>
                  </div>
                  <div className="p-4">
                    <div className="text-3xl font-bold text-purple-600">15+</div>
                    <div className="text-sm text-gray-600">Years Experience</div>
                  </div>
                  <div className="p-4">
                    <div className="text-3xl font-bold text-orange-600">24/7</div>
                    <div className="text-sm text-gray-600">Support Available</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}`,
        description: "Hero section with main value proposition and call-to-action",
        editable: true,
        required: true
      },
      {
        name: 'src/components/FeaturesSection.tsx',
        type: 'tsx' as const,
        content: `import React from 'react'
import { Zap, Shield, Smartphone, Globe, Code, BarChart } from 'lucide-react'

export const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Optimized performance that loads in seconds and keeps users engaged."
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Enterprise-grade security with 99.9% uptime guarantee."
    },
    {
      icon: Smartphone,
      title: "Mobile First",
      description: "Responsive design that works perfectly on all devices."
    },
    {
      icon: Globe,
      title: "Global Reach",
      description: "Scalable solutions that grow with your business worldwide."
    },
    {
      icon: Code,
      title: "Clean Code",
      description: "Modern, maintainable code following industry best practices."
    },
    {
      icon: BarChart,
      title: "Data Driven",
      description: "Analytics and insights to make informed business decisions."
    }
  ]

  return (
    <section className="section section-gray">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Why Choose Us</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We combine cutting-edge technology with proven strategies to deliver exceptional results that exceed expectations.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="card text-center hover:shadow-lg transition-shadow">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <feature.icon className="text-blue-600" size={32} />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}`,
        description: "Features section showcasing key benefits and capabilities",
        editable: true,
        required: true
      },
      {
        name: 'src/components/TestimonialsSection.tsx',
        type: 'tsx' as const,
        content: `import React from 'react'
import { Star, Quote } from 'lucide-react'

export const TestimonialsSection: React.FC = () => {
  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "CEO, TechStart Inc.",
      content: "Working with this team transformed our business. They delivered a stunning website that increased our conversions by 300%.",
      rating: 5,
      avatar: "SJ"
    },
    {
      name: "Michael Chen",
      role: "Marketing Director, Global Corp",
      content: "The attention to detail and creativity they brought to our project was exceptional. They exceeded our expectations in every way.",
      rating: 5,
      avatar: "MC"
    },
    {
      name: "Emily Rodriguez",
      role: "Founder, Creative Agency",
      content: "Professional, responsive, and incredibly talented. They turned our vision into reality and delivered on time and on budget.",
      rating: 5,
      avatar: "ER"
    }
  ]

  return (
    <section className="section">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">What Our Clients Say</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Don't just take our word for it. Here's what our satisfied clients have to say about their experience working with us.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="card relative">
              <div className="absolute top-4 right-4">
                <Quote className="text-blue-200" size={32} />
              </div>
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="text-yellow-400 fill-current" size={20} />
                ))}
              </div>
              <p className="text-gray-700 mb-6 italic">"{testimonial.content}"</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-gray-600">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}`,
        description: "Testimonials section showcasing client feedback and reviews",
        editable: true,
        required: true
      },
      {
        name: 'src/components/CallToAction.tsx',
        type: 'tsx' as const,
        content: `import React from 'react'
import { ArrowRight, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'

export const CallToAction: React.FC = () => {
  return (
    <section className="section section-gray">
      <div className="container">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-center text-white">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-white/20 rounded-full">
              <Zap size={48} />
            </div>
          </div>
          <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Join hundreds of satisfied customers who have transformed their business with our solutions.
            Schedule your free consultation today and see what we can do for you.
          </p>
          <div className="flex justify-center gap-4">
            <Link to="/contact" className="btn bg-white text-blue-600 hover:bg-gray-100">
              Get Free Consultation
              <ArrowRight size={20} />
            </Link>
            <Link to="/portfolio" className="btn btn-outline border-white text-white hover:bg-white hover:text-blue-600">
              View Our Work
            </Link>
          </div>
          <div className="mt-8 flex justify-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>30-day money-back guarantee</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}`,
        description: "Call-to-action section encouraging users to take the next step",
        editable: true,
        required: true
      },
      {
        name: 'src/components/AboutHeader.tsx',
        type: 'tsx' as const,
        content: `import React from 'react'

export const AboutHeader: React.FC = () => {
  return (
    <section className="hero">
      <div className="container text-center">
        <h1 className="text-5xl font-bold mb-6">About Our Company</h1>
        <p className="text-xl max-w-3xl mx-auto text-gray-100">
          We're a team of passionate creators, developers, and strategists dedicated to building exceptional digital experiences that drive meaningful results.
        </p>
      </div>
    </section>
  )
}`,
        description: "About page header section",
        editable: true,
        required: true
      },
      {
        name: 'src/components/MissionSection.tsx',
        type: 'tsx' as const,
        content: `import React from 'react'
import { Target, Lightbulb, Users } from 'lucide-react'

export const MissionSection: React.FC = () => {
  return (
    <section className="section section-gray">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Our Mission & Vision</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Guided by innovation and driven by passion, we're committed to excellence in everything we do.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="card text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Target className="text-blue-600" size={32} />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-3">Our Mission</h3>
            <p className="text-gray-600">
              To transform businesses through innovative digital solutions that create lasting value and drive sustainable growth.
            </p>
          </div>
          <div className="card text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Lightbulb className="text-purple-600" size={32} />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-3">Our Vision</h3>
            <p className="text-gray-600">
              To be the global leader in digital innovation, setting new standards for excellence and creativity in the industry.
            </p>
          </div>
          <div className="card text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="text-green-600" size={32} />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-3">Our Values</h3>
            <p className="text-gray-600">
              Integrity, innovation, and collaboration guide every decision we make and every solution we create.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}`,
        description: "Mission and vision section for About page",
        editable: true,
        required: true
      },
      {
        name: 'src/components/TeamSection.tsx',
        type: 'tsx' as const,
        content: `import React from 'react'
import { Twitter, Linkedin, Mail } from 'lucide-react'

export const TeamSection: React.FC = () => {
  const team = [
    {
      name: "Alex Thompson",
      role: "CEO & Founder",
      bio: "Visionary leader with 15+ years of experience in digital transformation and business strategy.",
      avatar: "AT"
    },
    {
      name: "Sarah Johnson",
      role: "Creative Director",
      bio: "Award-winning designer passionate about creating beautiful, user-centered experiences.",
      avatar: "SJ"
    },
    {
      name: "Michael Chen",
      role: "Technical Lead",
      bio: "Full-stack developer specializing in scalable architectures and cutting-edge technologies.",
      avatar: "MC"
    },
    {
      name: "Emily Rodriguez",
      role: "Marketing Head",
      bio: "Growth marketing expert with a proven track record of scaling digital businesses.",
      avatar: "ER"
    }
  ]

  return (
    <section className="section">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Meet Our Team</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our diverse team of experts brings together creativity, technical excellence, and business acumen to deliver outstanding results.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {team.map((member, index) => (
            <div key={index} className="card text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-4">
                {member.avatar}
              </div>
              <h3 className="text-xl font-semibold mb-2">{member.name}</h3>
              <p className="text-blue-600 font-medium mb-3">{member.role}</p>
              <p className="text-gray-600 text-sm mb-4">{member.bio}</p>
              <div className="flex justify-center gap-3">
                <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors">
                  <Twitter size={18} />
                </a>
                <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors">
                  <Linkedin size={18} />
                </a>
                <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors">
                  <Mail size={18} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}`,
        description: "Team section showcasing team members",
        editable: true,
        required: true
      },
      {
        name: 'src/components/ValuesSection.tsx',
        type: 'tsx' as const,
        content: `import React from 'react'
import { Award, Heart, Zap, Shield } from 'lucide-react'

export const ValuesSection: React.FC = () => {
  const values = [
    {
      icon: Award,
      title: "Excellence",
      description: "We strive for perfection in every project, delivering outstanding quality that exceeds expectations."
    },
    {
      icon: Heart,
      title: "Passion",
      description: "We love what we do and bring genuine enthusiasm to every challenge and opportunity."
    },
    {
      icon: Zap,
      title: "Innovation",
      description: "We push boundaries and explore new possibilities to create solutions that make a difference."
    },
    {
      icon: Shield,
      title: "Integrity",
      description: "We build trust through transparency, honesty, and ethical business practices."
    }
  ]

  return (
    <section className="section section-gray">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Our Core Values</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            These principles guide our decisions, shape our culture, and define who we are as a company.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {values.map((value, index) => (
            <div key={index} className="card text-center hover:shadow-lg transition-shadow">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg">
                  <value.icon className="text-blue-600" size={32} />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3">{value.title}</h3>
              <p className="text-gray-600">{value.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}`,
        description: "Core values section for About page",
        editable: true,
        required: true
      },
      {
        name: 'src/components/ServicesHeader.tsx',
        type: 'tsx' as const,
        content: `import React from 'react'

export const ServicesHeader: React.FC = () => {
  return (
    <section className="hero">
      <div className="container text-center">
        <h1 className="text-5xl font-bold mb-6">Our Services</h1>
        <p className="text-xl max-w-3xl mx-auto text-gray-100">
          We offer comprehensive digital solutions tailored to your unique business needs, helping you achieve your goals with cutting-edge technology and expertise.
        </p>
      </div>
    </section>
  )
}`,
        description: "Services page header section",
        editable: true,
        required: true
      },
      {
        name: 'src/components/ServicesGrid.tsx',
        type: 'tsx' as const,
        content: `import React from 'react'
import { Code, Palette, Smartphone, BarChart, Megaphone, Settings } from 'lucide-react'

export const ServicesGrid: React.FC = () => {
  const services = [
    {
      icon: Code,
      title: "Web Development",
      description: "Custom websites and web applications built with modern technologies and best practices.",
      features: ["Responsive Design", "React/Vue/Angular", "Node.js Backend", "API Integration"]
    },
    {
      icon: Smartphone,
      title: "Mobile Apps",
      description: "Native and cross-platform mobile applications for iOS and Android devices.",
      features: ["React Native", "Flutter", "iOS/Android Native", "App Store Deployment"]
    },
    {
      icon: Palette,
      title: "UI/UX Design",
      description: "Beautiful, intuitive designs that delight users and drive engagement.",
      features: ["User Research", "Wireframing", "Prototyping", "Design Systems"]
    },
    {
      icon: Megaphone,
      title: "Digital Marketing",
      description: "Strategic marketing solutions to grow your online presence and reach.",
      features: ["SEO Optimization", "Content Marketing", "Social Media", "PPC Advertising"]
    },
    {
      icon: BarChart,
      title: "Analytics & Insights",
      description: "Data-driven strategies to optimize performance and drive business decisions.",
      features: ["Google Analytics", "Custom Dashboards", "A/B Testing", "Performance Tracking"]
    },
    {
      icon: Settings,
      title: "Consulting",
      description: "Expert guidance to help you navigate your digital transformation journey.",
      features: ["Strategy Planning", "Technology Audits", "Team Training", "Ongoing Support"]
    }
  ]

  return (
    <section className="section">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div key={index} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <service.icon className="text-blue-600" size={24} />
                </div>
                <h3 className="text-xl font-semibold">{service.title}</h3>
              </div>
              <p className="text-gray-600 mb-6">{service.description}</p>
              <ul className="space-y-2">
                {service.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center gap-2 text-sm text-gray-700">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}`,
        description: "Services grid showcasing service offerings",
        editable: true,
        required: true
      },
      {
        name: 'src/components/ProcessSection.tsx',
        type: 'tsx' as const,
        content: `import React from 'react'
import { Search, Code, Test, Rocket } from 'lucide-react'

export const ProcessSection: React.FC = () => {
  const process = [
    {
      icon: Search,
      title: "Discovery & Planning",
      description: "We start by understanding your business goals, target audience, and technical requirements to create a comprehensive project roadmap."
    },
    {
      icon: Code,
      title: "Design & Development",
      description: "Our team builds your solution using agile methodologies, ensuring transparency and regular updates throughout the development process."
    },
    {
      icon: Test,
      title: "Testing & Quality Assurance",
      description: "Rigorous testing ensures your product meets the highest quality standards and performs flawlessly across all devices and platforms."
    },
    {
      icon: Rocket,
      title: "Launch & Support",
      description: "We handle the deployment process and provide ongoing support to ensure your continued success and growth."
    }
  ]

  return (
    <section className="section section-gray">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Our Process</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We follow a proven methodology that ensures successful project delivery and exceptional results.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {process.map((step, index) => (
            <div key={index} className="text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xl">
                  {index + 1}
                </div>
              </div>
              <div className="flex justify-center mb-4">
                <step.icon className="text-blue-600" size={32} />
              </div>
              <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
              <p className="text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}`,
        description: "Process section showing project workflow",
        editable: true,
        required: true
      },
      {
        name: 'src/components/ContactHeader.tsx',
        type: 'tsx' as const,
        content: `import React from 'react'

export const ContactHeader: React.FC = () => {
  return (
    <section className="hero">
      <div className="container text-center">
        <h1 className="text-5xl font-bold mb-6">Get In Touch</h1>
        <p className="text-xl max-w-3xl mx-auto text-gray-100">
          Ready to start your next project? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
        </p>
      </div>
    </section>
  )
}`,
        description: "Contact page header section",
        editable: true,
        required: true
      },
      {
        name: 'src/components/ContactForm.tsx',
        type: 'tsx' as const,
        content: `import React, { useState } from 'react'

export const ContactForm: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    service: '',
    message: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission here
    console.log('Form submitted:', formData)
    alert('Thank you for your message! We will get back to you soon.')
  }

  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-6">Send us a message</h2>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="form-group">
            <label htmlFor="name" className="form-label">Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="form-input"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="form-group">
            <label htmlFor="company" className="form-label">Company</label>
            <input
              type="text"
              id="company"
              name="company"
              value={formData.company}
              onChange={handleChange}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label htmlFor="phone" className="form-label">Phone</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="form-input"
            />
          </div>
        </div>
        <div className="form-group mb-4">
          <label htmlFor="service" className="form-label">Service Interest</label>
          <select
            id="service"
            name="service"
            value={formData.service}
            onChange={handleChange}
            className="form-input"
          >
            <option value="">Select a service</option>
            <option value="web-development">Web Development</option>
            <option value="mobile-apps">Mobile Apps</option>
            <option value="ui-ux-design">UI/UX Design</option>
            <option value="digital-marketing">Digital Marketing</option>
            <option value="consulting">Consulting</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="form-group mb-6">
          <label htmlFor="message" className="form-label">Message *</label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows={5}
            className="form-textarea"
          />
        </div>
        <button type="submit" className="btn btn-primary w-full">
          Send Message
        </button>
      </form>
    </div>
  )
}`,
        description: "Contact form component",
        editable: true,
        required: true
      },
      {
        name: 'src/components/ContactInfo.tsx',
        type: 'tsx' as const,
        content: `import React from 'react'
import { Mail, Phone, MapPin, Clock } from 'lucide-react'

export const ContactInfo: React.FC = () => {
  return (
    <div>
      <div className="card mb-6">
        <h2 className="text-2xl font-bold mb-6">Contact Information</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Mail className="text-blue-600" size={20} />
            </div>
            <div>
              <div className="font-semibold">Email</div>
              <div className="text-gray-600">hello@yourcompany.com</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Phone className="text-blue-600" size={20} />
            </div>
            <div>
              <div className="font-semibold">Phone</div>
              <div className="text-gray-600">+1 (555) 123-4567</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <MapPin className="text-blue-600" size={20} />
            </div>
            <div>
              <div className="font-semibold">Address</div>
              <div className="text-gray-600">123 Business St, City, State 12345</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Clock className="text-blue-600" size={20} />
            </div>
            <div>
              <div className="font-semibold">Business Hours</div>
              <div className="text-gray-600">Mon-Fri: 9AM-6PM EST</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-xl font-bold mb-4">Why Contact Us?</h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <span className="text-gray-600">Free consultation and project estimate</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <span className="text-gray-600">Response within 24 hours</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <span className="text-gray-600">Expert technical guidance</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <span className="text-gray-600">Customized solutions for your needs</span>
          </li>
        </ul>
      </div>
    </div>
  )
}`,
        description: "Contact information component",
        editable: true,
        required: true
      },
      {
        name: 'src/components/MapSection.tsx',
        type: 'tsx' as const,
        content: `import React from 'react'

export const MapSection: React.FC = () => {
  return (
    <section className="section">
      <div className="container">
        <div className="card">
          <h2 className="text-2xl font-bold mb-6">Find Us</h2>
          <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-6xl mb-4">📍</div>
              <p className="text-lg">Interactive Map</p>
              <p className="text-sm">123 Business St, City, State 12345</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}`,
        description: "Map section for contact page",
        editable: true,
        required: true
      }
    ]
  }

  private generateSalesDashboardFiles() {
    return [
      {
        name: 'package.json',
        type: 'json' as const,
        content: JSON.stringify({
          name: "sales-dashboard",
          version: "1.0.0",
          dependencies: {
            "react": "^18.2.0",
            "react-dom": "^18.2.0",
            "recharts": "^2.8.0",
            "lucide-react": "^0.292.0",
            "date-fns": "^2.30.0"
          },
          devDependencies: {
            "@types/react": "^18.2.37",
            "@types/react-dom": "^18.2.15",
            "@vitejs/plugin-react": "^4.1.1",
            "vite": "^4.5.0",
            "typescript": "^5.2.2"
          }
        }, null, 2),
        description: "Package dependencies and scripts",
        editable: false,
        required: true
      },
      {
        name: 'index.html',
        type: 'html' as const,
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sales Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .dashboard-container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .dashboard-header {
            background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%);
            color: white;
            padding: 24px 32px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .dashboard-title {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
        }
        .dashboard-subtitle {
            opacity: 0.9;
            font-size: 16px;
        }
        .date-filter {
            display: flex;
            gap: 12px;
            align-items: center;
        }
        .date-filter select {
            padding: 8px 16px;
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 8px;
            background: rgba(255,255,255,0.1);
            color: white;
            font-size: 14px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 24px;
            padding: 32px;
        }
        .metric-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 24px;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .metric-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px rgba(0,0,0,0.1);
        }
        .metric-label {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 8px;
            font-weight: 500;
        }
        .metric-value {
            font-size: 32px;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 8px;
        }
        .metric-change {
            font-size: 14px;
            font-weight: 500;
        }
        .metric-change.positive {
            color: #10b981;
        }
        .metric-change.negative {
            color: #ef4444;
        }
        .charts-section {
            padding: 0 32px 32px;
        }
        .charts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
            gap: 24px;
        }
        .chart-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 24px;
        }
        .chart-title {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 16px;
        }
        .table-container {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 24px;
            margin-top: 24px;
        }
        .table-title {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 16px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            text-align: left;
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
        }
        th {
            font-weight: 600;
            color: #6b7280;
            font-size: 14px;
        }
        .status-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
        }
        .status-badge.success {
            background: #d1fae5;
            color: #065f46;
        }
        .status-badge.pending {
            background: #fed7aa;
            color: #92400e;
        }
        .status-badge.failed {
            background: #fee2e2;
            color: #991b1b;
        }
        .loading-spinner {
            border: 4px solid #f3f4f6;
            border-top: 4px solid #3b82f6;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .revenue-bar {
            display: inline-block;
            height: 20px;
            background: linear-gradient(90deg, #10b981 0%, #059669 100%);
            border-radius: 4px;
            margin-right: 8px;
        }
        .performance-indicator {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 14px;
        }
        .arrow-up {
            color: #10b981;
        }
        .arrow-down {
            color: #ef4444;
        }
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
</body>
</html>`,
        description: "Main HTML template for the sales dashboard",
        editable: false,
        required: true
      },
      {
        name: 'src/main.tsx',
        type: 'tsx' as const,
        content: `import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<App />)
}`,
        description: "React application entry point",
        editable: false,
        required: true
      },
      {
        name: 'src/index.css',
        type: 'css' as const,
        content: `:root {
  --color-primary: #3b82f6;
  --color-primary-dark: #1e40af;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-400: #9ca3af;
  --color-gray-500: #6b7280;
  --color-gray-600: #4b5563;
  --color-gray-700: #374151;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  background: var(--color-gray-50);
  color: var(--color-gray-900);
  line-height: 1.6;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.grid {
  display: grid;
  gap: 24px;
}

.grid-cols-1 { grid-template-columns: repeat(1, 1fr); }
.grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
.grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
.grid-cols-4 { grid-template-columns: repeat(4, 1fr); }

.card {
  background: white;
  border: 1px solid var(--color-gray-200);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s ease;
}

.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-dark);
}

.btn-secondary {
  background: var(--color-gray-200);
  color: var(--color-gray-700);
}

.btn-secondary:hover {
  background: var(--color-gray-300);
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-gray-700);
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-gray-300);
  border-radius: 6px;
  font-size: 14px;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-gray-200);
  border-top: 3px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.text-sm { font-size: 14px; }
.text-lg { font-size: 18px; }
.text-xl { font-size: 20px; }
.text-2xl { font-size: 24px; }
.text-3xl { font-size: 30px; }

.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }

.text-gray-500 { color: var(--color-gray-500); }
.text-gray-600 { color: var(--color-gray-600); }
.text-gray-700 { color: var(--color-gray-700); }
.text-gray-900 { color: var(--color-gray-900); }

.mb-2 { margin-bottom: 8px; }
.mb-4 { margin-bottom: 16px; }
.mb-6 { margin-bottom: 24px; }
.mb-8 { margin-bottom: 32px; }

.mt-2 { margin-top: 8px; }
.mt-4 { margin-top: 16px; }
.mt-6 { margin-top: 24px; }
.mt-8 { margin-top: 32px; }

.hidden { display: none; }
.flex { display: flex; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.gap-2 { gap: 8px; }
.gap-4 { gap: 16px; }`,
        description: "Global styles for the sales dashboard",
        editable: false,
        required: true
      },
      {
        name: 'src/App.tsx',
        type: 'tsx' as const,
        content: `import React, { useState, useEffect } from 'react'
import { TrendingUp, Users, Package, DollarSign, Calendar, Filter, Download } from 'lucide-react'
import { generateSalesData } from './data/salesData'
import { RevenueChart } from './components/RevenueChart'
import { SalesMetrics } from './components/SalesMetrics'
import { CustomerAnalytics } from './components/CustomerAnalytics'
import { ProductPerformance } from './components/ProductPerformance'
import { SalesTable } from './components/SalesTable'
import { DateFilter } from './components/DateFilter'
import type { SalesData, DateRange } from './types'

function App() {
  const [salesData, setSalesData] = useState<SalesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(new Date().setMonth(new Date().getMonth() - 6)),
    end: new Date()
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const data = await generateSalesData(dateRange)
        setSalesData(data)
      } catch (error) {
        console.error('Failed to load sales data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [dateRange])

  const handleDateRangeChange = (newDateRange: DateRange) => {
    setDateRange(newDateRange)
  }

  const handleExport = () => {
    if (!salesData) return

    const dataStr = JSON.stringify(salesData, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)

    const exportFileDefaultName = \`sales-data-\${new Date().toISOString().split('T')[0]}.json\`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    )
  }

  if (!salesData) {
    return (
      <div className="container">
        <div className="card text-center">
          <h2>Error loading sales data</h2>
          <p className="text-gray-600 mt-2">Please try refreshing the page</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <header className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Sales Dashboard</h1>
            <p className="text-gray-600">Comprehensive overview of your sales performance</p>
          </div>
          <div className="flex gap-4">
            <DateFilter
              value={dateRange}
              onChange={handleDateRangeChange}
              className="btn-secondary"
            />
            <button onClick={handleExport} className="btn btn-primary">
              <Download size={16} />
              Export Data
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-4 mb-8">
        <SalesMetrics data={salesData} />
      </div>

      <div className="grid grid-cols-2 mb-8">
        <div className="card">
          <RevenueChart data={salesData.revenue} />
        </div>
        <div className="card">
          <CustomerAnalytics data={salesData.customers} />
        </div>
      </div>

      <div className="card mb-8">
        <ProductPerformance data={salesData.products} />
      </div>

      <div className="card">
        <SalesTable data={salesData.recentSales} />
      </div>
    </div>
  )
}

export default App`,
        description: "Main application component with dashboard layout",
        editable: true,
        required: true
      },
      {
        name: 'src/types/index.ts',
        type: 'ts' as const,
        content: `export interface SalesData {
  revenue: RevenueData[]
  customers: CustomerData[]
  products: ProductData[]
  recentSales: SaleData[]
  metrics: {
    totalRevenue: number
    totalOrders: number
    totalCustomers: number
    averageOrderValue: number
    growthRate: number
    conversionRate: number
  }
}

export interface RevenueData {
  date: string
  revenue: number
  orders: number
  target: number
}

export interface CustomerData {
  date: string
  newCustomers: number
  returningCustomers: number
  churnRate: number
}

export interface ProductData {
  id: string
  name: string
  category: string
  revenue: number
  units: number
  growth: number
  margin: number
  rating: number
}

export interface SaleData {
  id: string
  date: string
  customer: string
  product: string
  amount: number
  status: 'completed' | 'pending' | 'cancelled'
  salesRep: string
  region: string
}

export interface DateRange {
  start: Date
  end: Date
}

export type MetricPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year'

export interface ChartData {
  name: string
  value: number
  change?: number
  trend?: 'up' | 'down' | 'stable'
}`,
        description: "Type definitions for the sales dashboard",
        editable: false,
        required: true
      },
      {
        name: 'src/data/salesData.ts',
        type: 'ts' as const,
        content: `import {
  SalesData,
  RevenueData,
  CustomerData,
  ProductData,
  SaleData,
  DateRange
} from '../types'

export async function generateSalesData(dateRange: DateRange): Promise<SalesData> {
  const days = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))

  const revenue = generateRevenueData(dateRange.start, days)
  const customers = generateCustomerData(dateRange.start, days)
  const products = generateProductData()
  const recentSales = generateRecentSales(50)

  const totalRevenue = revenue.reduce((sum, r) => sum + r.revenue, 0)
  const totalOrders = revenue.reduce((sum, r) => sum + r.orders, 0)
  const totalCustomers = customers.reduce((sum, c) => sum + c.newCustomers, 0)
  const averageOrderValue = totalRevenue / totalOrders

  return {
    revenue,
    customers,
    products,
    recentSales,
    metrics: {
      totalRevenue,
      totalOrders,
      totalCustomers,
      averageOrderValue,
      growthRate: 15.3,
      conversionRate: 3.2
    }
  }
}

function generateRevenueData(startDate: Date, days: number): RevenueData[] {
  const data: RevenueData[] = []
  let baseRevenue = 50000

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)

    // Add some seasonality and randomness
    const seasonalFactor = 1 + 0.2 * Math.sin((i / 365) * 2 * Math.PI)
    const randomFactor = 0.8 + Math.random() * 0.4
    const weekendFactor = (date.getDay() === 0 || date.getDay() === 6) ? 0.7 : 1

    const revenue = Math.round(baseRevenue * seasonalFactor * randomFactor * weekendFactor)
    const orders = Math.round(revenue / (150 + Math.random() * 100))
    const target = Math.round(baseRevenue * seasonalFactor)

    data.push({
      date: date.toISOString().split('T')[0],
      revenue,
      orders,
      target
    })

    // Gradually increase base revenue
    baseRevenue *= 1.001
  }

  return data
}

function generateCustomerData(startDate: Date, days: number): CustomerData[] {
  const data: CustomerData[] = []
  let totalCustomers = 1000

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)

    const newCustomers = Math.round(5 + Math.random() * 15 + Math.sin(i / 7) * 3)
    const returningCustomers = Math.round(totalCustomers * 0.1 * (0.8 + Math.random() * 0.4))
    const churnRate = Math.max(0, Math.min(10, (Math.random() * 5 - 2)))

    totalCustomers += newCustomers

    data.push({
      date: date.toISOString().split('T')[0],
      newCustomers,
      returningCustomers,
      churnRate: parseFloat(churnRate.toFixed(1))
    })
  }

  return data
}

function generateProductData(): ProductData[] {
  const categories = ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books']
  const products = [
    'Laptop Pro 15"', 'Wireless Headphones', 'Smart Watch', 'Bluetooth Speaker',
    'Winter Jacket', 'Running Shoes', 'Yoga Mat', 'Coffee Maker',
    'Desk Lamp', 'Backpack', 'Water Bottle', 'Phone Case',
    'Gaming Mouse', 'Keyboard Mechanical', 'Monitor 27"', 'Webcam HD'
  ]

  return products.map((name, index) => {
    const baseRevenue = 1000 + Math.random() * 9000
    const growth = (Math.random() - 0.5) * 30

    return {
      id: \`prod_\${index + 1}\`,
      name,
      category: categories[Math.floor(Math.random() * categories.length)],
      revenue: Math.round(baseRevenue),
      units: Math.round(baseRevenue / (50 + Math.random() * 200)),
      growth: parseFloat(growth.toFixed(1)),
      margin: parseFloat((20 + Math.random() * 40).toFixed(1)),
      rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1))
    }
  }).sort((a, b) => b.revenue - a.revenue)
}

function generateRecentSales(count: number): SaleData[] {
  const customers = [
    'Acme Corporation', 'Global Tech Inc', 'StartUp Ventures', 'Enterprise Solutions',
    'Digital Agency', 'Retail Chain Co', 'Manufacturing Ltd', 'Service Provider Pro',
    'Small Business LLC', 'Freelance Creative', 'Consulting Group', 'Software Company'
  ]

  const salesReps = ['John Smith', 'Sarah Johnson', 'Mike Chen', 'Emily Davis', 'Alex Wilson']
  const regions = ['North', 'South', 'East', 'West', 'Central']
  const statuses: ('completed' | 'pending' | 'cancelled')[] = ['completed', 'completed', 'completed', 'pending', 'cancelled']

  const sales: SaleData[] = []

  for (let i = 0; i < count; i++) {
    const date = new Date()
    date.setDate(date.getDate() - Math.floor(Math.random() * 30))

    sales.push({
      id: \`sale_\${Date.now()}_\${i}\`,
      date: date.toISOString(),
      customer: customers[Math.floor(Math.random() * customers.length)],
      product: \`Product \${Math.floor(Math.random() * 20) + 1}\`,
      amount: Math.round(100 + Math.random() * 10000),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      salesRep: salesReps[Math.floor(Math.random() * salesReps.length)],
      region: regions[Math.floor(Math.random() * regions.length)]
    })
  }

  return sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}`,
        description: "Sales data generator with realistic metrics",
        editable: true,
        required: true
      },
      {
        name: 'src/components/SalesMetrics.tsx',
        type: 'tsx' as const,
        content: `import React from 'react'
import { DollarSign, TrendingUp, Users, ShoppingCart, ArrowUp, ArrowDown } from 'lucide-react'
import { SalesData } from '../types'

interface SalesMetricsProps {
  data: SalesData
}

export function SalesMetrics({ data }: SalesMetricsProps) {
  const metrics = [
    {
      title: 'Total Revenue',
      value: \`$\${data.metrics.totalRevenue.toLocaleString()}\`,
      change: data.metrics.growthRate,
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      title: 'Total Orders',
      value: data.metrics.totalOrders.toLocaleString(),
      change: 8.2,
      icon: ShoppingCart,
      color: 'text-blue-600'
    },
    {
      title: 'Total Customers',
      value: data.metrics.totalCustomers.toLocaleString(),
      change: 12.5,
      icon: Users,
      color: 'text-purple-600'
    },
    {
      title: 'Avg Order Value',
      value: \`$\${data.metrics.averageOrderValue.toFixed(2)}\`,
      change: 3.1,
      icon: TrendingUp,
      color: 'text-orange-600'
    }
  ]

  return (
    <>
      {metrics.map((metric, index) => (
        <div key={index} className="card">
          <div className="flex items-center justify-between mb-4">
            <metric.icon className={metric.color} size={24} />
            <div className="flex items-center gap-1">
              {metric.change > 0 ? (
                <ArrowUp className="text-green-500" size={16} />
              ) : (
                <ArrowDown className="text-red-500" size={16} />
              )}
              <span className={\`text-sm font-medium \${
                metric.change > 0 ? 'text-green-500' : 'text-red-500'
              }\`}>
                {Math.abs(metric.change)}%
              </span>
            </div>
          </div>
          <div className="mb-1">
            <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
          </div>
          <div className="text-sm text-gray-600">{metric.title}</div>
        </div>
      ))}
    </>
  )
}`,
        description: "Sales metrics KPI components",
        editable: true,
        required: true
      },
      {
        name: 'src/components/RevenueChart.tsx',
        type: 'tsx' as const,
        content: `import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { TrendingUp } from 'lucide-react'
import { RevenueData } from '../types'

interface RevenueChartProps {
  data: RevenueData[]
}

export function RevenueChart({ data }: RevenueChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Revenue Overview</h3>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <TrendingUp size={16} />
          <span>Last {data.length} days</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tickFormatter={formatCurrency}
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <Tooltip
            formatter={(value: number) => [formatCurrency(value), '']}
            labelFormatter={formatDate}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px'
            }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#3b82f6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorRevenue)"
            name="Revenue"
          />
          <Area
            type="monotone"
            dataKey="target"
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="5 5"
            fillOpacity={1}
            fill="url(#colorTarget)"
            name="Target"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}`,
        description: "Revenue trend chart component",
        editable: true,
        required: true
      },
      {
        name: 'src/components/CustomerAnalytics.tsx',
        type: 'tsx' as const,
        content: `import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ComposedChart, Area } from 'recharts'
import { Users, UserPlus, UserMinus } from 'lucide-react'
import { CustomerData } from '../types'

interface CustomerAnalyticsProps {
  data: CustomerData[]
}

export function CustomerAnalytics({ data }: CustomerAnalyticsProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const recentData = data.slice(-30) // Last 30 days

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Customer Analytics</h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <UserPlus className="text-green-500" size={16} />
            <span className="text-gray-600">New</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="text-blue-500" size={16} />
            <span className="text-gray-600">Returning</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={recentData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <Tooltip
            labelFormatter={formatDate}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px'
            }}
          />
          <Bar
            dataKey="newCustomers"
            fill="#10b981"
            name="New Customers"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="returningCustomers"
            fill="#3b82f6"
            name="Returning Customers"
            radius={[4, 4, 0, 0]}
          />
          <Line
            type="monotone"
            dataKey="churnRate"
            stroke="#ef4444"
            strokeWidth={2}
            name="Churn Rate %"
            yAxisId="right"
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {recentData.reduce((sum, d) => sum + d.newCustomers, 0)}
          </div>
          <div className="text-sm text-gray-600">New Customers</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {recentData.reduce((sum, d) => sum + d.returningCustomers, 0)}
          </div>
          <div className="text-sm text-gray-600">Returning</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">
            {(recentData.reduce((sum, d) => sum + d.churnRate, 0) / recentData.length).toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Avg Churn Rate</div>
        </div>
      </div>
    </div>
  )
}`,
        description: "Customer analytics charts component",
        editable: true,
        required: true
      },
      {
        name: 'src/components/ProductPerformance.tsx',
        type: 'tsx' as const,
        content: `import React, { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Package, TrendingUp, TrendingDown, Star, ArrowUp, ArrowDown } from 'lucide-react'
import { ProductData } from '../types'

interface ProductPerformanceProps {
  data: ProductData[]
}

export function ProductPerformance({ data }: ProductPerformanceProps) {
  const [sortBy, setSortBy] = useState<'revenue' | 'units' | 'growth'>('revenue')

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value)
  }

  const sortedData = [...data].slice(0, 10).sort((a, b) => {
    switch (sortBy) {
      case 'revenue':
        return b.revenue - a.revenue
      case 'units':
        return b.units - a.units
      case 'growth':
        return b.growth - a.growth
      default:
        return 0
    }
  })

  const chartData = sortedData.map(product => ({
    name: product.name.length > 15 ? product.name.substring(0, 15) + '...' : product.name,
    revenue: product.revenue,
    units: product.units,
    growth: product.growth
  }))

  const getBarColor = (growth: number) => {
    if (growth > 10) return '#10b981'
    if (growth > 0) return '#3b82f6'
    if (growth > -10) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Product Performance</h3>
        <div className="flex gap-2">
          {(['revenue', 'units', 'growth'] as const).map((sort) => (
            <button
              key={sort}
              onClick={() => setSortBy(sort)}
              className={\`px-3 py-1 text-sm rounded-md transition-colors \${
                sortBy === sort
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }\`}
            >
              {sort.charAt(0).toUpperCase() + sort.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                type="number"
                tickFormatter={(value) => {
                  if (sortBy === 'revenue') return formatCurrency(value)
                  if (sortBy === 'units') return value.toString()
                  return \`\${value}%\`
                }}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11 }}
                width={100}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === 'revenue') return [formatCurrency(value), 'Revenue']
                  if (name === 'units') return [value, 'Units Sold']
                  if (name === 'growth') return [\`\${value}%\`, 'Growth']
                  return [value, name]
                }}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px'
                }}
              />
              <Bar
                dataKey={sortBy}
                radius={[0, 4, 4, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell key={\`cell-\${index}\`} fill={getBarColor(entry.growth)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-4">Top Products</h4>
          <div className="space-y-3">
            {sortedData.slice(0, 6).map((product, index) => (
              <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{product.name}</div>
                    <div className="text-sm text-gray-500">{product.category}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{formatCurrency(product.revenue)}</div>
                  <div className="flex items-center gap-1 text-sm">
                    {product.growth > 0 ? (
                      <ArrowUp className="text-green-500" size={12} />
                    ) : (
                      <ArrowDown className="text-red-500" size={12} />
                    )}
                    <span className={product.growth > 0 ? 'text-green-500' : 'text-red-500'}>
                      {Math.abs(product.growth)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}`,
        description: "Product performance charts and rankings",
        editable: true,
        required: true
      },
      {
        name: 'src/components/SalesTable.tsx',
        type: 'tsx' as const,
        content: `import React, { useState } from 'react'
import { Search, Filter, Eye } from 'lucide-react'
import { SaleData } from '../types'

interface SalesTableProps {
  data: SaleData[]
}

export function SalesTable({ data }: SalesTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filteredData = data.filter(sale => {
    const matchesSearch = sale.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sale.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sale.salesRep.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || sale.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value)
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800'
    }

    return (
      <span className={\`px-2 py-1 text-xs font-medium rounded-full \${styles[status as keyof typeof styles]}\`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Recent Sales</h3>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search sales..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Date</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Customer</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Product</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Sales Rep</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Region</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Amount</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.slice(0, 10).map((sale) => (
              <tr key={sale.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 text-sm text-gray-900">{formatDate(sale.date)}</td>
                <td className="py-3 px-4 text-sm font-medium text-gray-900">{sale.customer}</td>
                <td className="py-3 px-4 text-sm text-gray-600">{sale.product}</td>
                <td className="py-3 px-4 text-sm text-gray-600">{sale.salesRep}</td>
                <td className="py-3 px-4 text-sm text-gray-600">{sale.region}</td>
                <td className="py-3 px-4 text-sm font-semibold text-gray-900">
                  {formatCurrency(sale.amount)}
                </td>
                <td className="py-3 px-4">{getStatusBadge(sale.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredData.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-500 mb-2">No sales found</div>
          <div className="text-sm text-gray-400">Try adjusting your search or filter criteria</div>
        </div>
      )}

      {filteredData.length > 10 && (
        <div className="text-center mt-4">
          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            View all {filteredData.length} sales
          </button>
        </div>
      )}
    </div>
  )
}`,
        description: "Recent sales table with filtering",
        editable: true,
        required: true
      },
      {
        name: 'src/components/DateFilter.tsx',
        type: 'tsx' as const,
        content: `import React, { useState } from 'react'
import { Calendar } from 'lucide-react'
import { DateRange } from '../types'

interface DateFilterProps {
  value: DateRange
  onChange: (dateRange: DateRange) => void
  className?: string
}

export function DateFilter({ value, onChange, className = '' }: DateFilterProps) {
  const [isOpen, setIsOpen] = useState(false)

  const predefinedRanges = [
    {
      label: 'Last 7 days',
      value: {
        start: new Date(new Date().setDate(new Date().getDate() - 7)),
        end: new Date()
      }
    },
    {
      label: 'Last 30 days',
      value: {
        start: new Date(new Date().setDate(new Date().getDate() - 30)),
        end: new Date()
      }
    },
    {
      label: 'Last 3 months',
      value: {
        start: new Date(new Date().setMonth(new Date().getMonth() - 3)),
        end: new Date()
      }
    },
    {
      label: 'Last 6 months',
      value: {
        start: new Date(new Date().setMonth(new Date().getMonth() - 6)),
        end: new Date()
      }
    },
    {
      label: 'Last year',
      value: {
        start: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
        end: new Date()
      }
    }
  ]

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleRangeSelect = (range: DateRange) => {
    onChange(range)
    setIsOpen(false)
  }

  const getCurrentRangeLabel = () => {
    const days = Math.ceil((value.end.getTime() - value.start.getTime()) / (1000 * 60 * 60 * 24))

    if (days <= 7) return 'Last 7 days'
    if (days <= 30) return 'Last 30 days'
    if (days <= 90) return 'Last 3 months'
    if (days <= 180) return 'Last 6 months'
    return 'Last year'
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={\`flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors \${className}\`}
      >
        <Calendar size={16} />
        <span>{getCurrentRangeLabel()}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="p-2">
              <div className="px-3 py-2 text-sm font-medium text-gray-700 mb-2">
                Select date range
              </div>
              <div className="text-xs text-gray-500 mb-3 px-3">
                {formatDate(value.start)} - {formatDate(value.end)}
              </div>
              {predefinedRanges.map((range, index) => (
                <button
                  key={index}
                  onClick={() => handleRangeSelect(range.value)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-md transition-colors"
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}`,
        description: "Date range filter component",
        editable: true,
        required: true
    }
    ]
  }
}