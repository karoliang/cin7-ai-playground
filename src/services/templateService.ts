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