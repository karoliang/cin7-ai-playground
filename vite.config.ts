import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Optimize JSX runtime
      jsxRuntime: 'automatic',
      // Enable React imports optimization
      babel: {
        plugins: []
      }
    }),
    // Bundle analyzer plugin for development
    process.env.ANALYZE === 'true' && visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/components': resolve(__dirname, 'src/components'),
      '@/pages': resolve(__dirname, 'src/pages'),
      '@/hooks': resolve(__dirname, 'src/hooks'),
      '@/utils': resolve(__dirname, 'src/utils'),
      '@/types': resolve(__dirname, 'src/types'),
      '@/stores': resolve(__dirname, 'src/stores'),
      '@/styles': resolve(__dirname, 'src/styles'),
      '@/cache': resolve(__dirname, 'src/cache'),
      '@/performance': resolve(__dirname, 'src/performance'),
      '@/database': resolve(__dirname, 'src/database'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development',
    // Enable code splitting and optimization
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2
      },
      mangle: {
        safari10: true,
        // Preserve Monaco Editor variable names
        reserved: ['monaco', 'editor', 'model', 'range', 'Position']
      },
      format: {
        // Preserve certain formatting for better debugging
        comments: false
      }
    },
    rollupOptions: {
      output: {
        // Advanced code splitting strategy
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            // Bundle ALL React-related packages together to prevent hook call errors
            if (id.includes('react') || id.includes('react-dom') || id.includes('@shopify/polaris') ||
                id.includes('react-router') || id.includes('@monaco-editor/react')) {
              return 'react-vendor'
            }
            // Move zustand to react-vendor since it depends on React hooks
            if (id.includes('date-fns') || id.includes('clsx')) {
              return 'utils-vendor'
            }
            if (id.includes('zustand')) {
              return 'react-vendor' // Bundle with React to prevent initialization errors
            }
            // Monaco core can be separate from React wrapper
            if (id.includes('monaco-editor') && !id.includes('@monaco-editor/react')) {
              return 'monaco-core'
            }
            if (id.includes('framer-motion')) {
              return 'animation-vendor'
            }
            // Other vendor libraries
            return 'vendor'
          }

          // Feature-based chunks - Ensure React-dependent chunks have access to React
          if (id.includes('src/pages/HomePage')) {
            return 'home-page'
          }
          if (id.includes('src/pages/ProjectPage')) {
            return 'project-page'
          }
          if (id.includes('src/pages/CodeGeneratorPage')) {
            return 'code-generator-page'
          }
          if (id.includes('src/pages/SettingsPage')) {
            return 'settings-page'
          }
          if (id.includes('src/components/project/')) {
            return 'project-components'
          }
          // Editor components depend heavily on React Context - bundle with React vendor
          if (id.includes('src/components/editor/') || id.includes('src/components/context/') || id.includes('src/utils/reactContextSafety')) {
            return 'react-vendor' // Bundle with React to prevent createContext errors
          }
          if (id.includes('src/components/export/')) {
            return 'export-components'
          }
          if (id.includes('src/components/import/')) {
            return 'import-components'
          }
          if (id.includes('src/services/')) {
            return 'services'
          }
          if (id.includes('src/cache/')) {
            return 'cache-services'
          }
          if (id.includes('src/performance/')) {
            return 'performance-services'
          }
          if (id.includes('src/database/')) {
            return 'database-services'
          }
          if (id.includes('src/security/')) {
            return 'security-services'
          }
        },
        // Optimize chunk naming
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
          if (facadeModuleId) {
            const fileName = facadeModuleId.split('/').pop()?.replace('.tsx', '') || 'chunk'
            return `js/${fileName}-[hash].js`
          }
          return 'js/[name]-[hash].js'
        },
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name?.split('.').pop()
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType || '')) {
            return `images/[name]-[hash][extname]`
          }
          if (/woff|woff2|ttf|eot/i.test(extType || '')) {
            return `fonts/[name]-[hash][extname]`
          }
          return `assets/[name]-[hash][extname]`
        }
      },
      // Bundle all dependencies for static deployment
      external: []
    },
    // Optimize chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Dynamic import variables
    dynamicImportVarsOptions: {
      warnOnError: true
    }
  },
  // Development server optimization
  server: {
    port: 3000,
    host: true,
    // Enable HMR overlay
    hmr: {
      overlay: true
    }
  },
  // Preview server optimization
  preview: {
    port: 4173,
    host: true,
  },
  // Environment variables
  define: {
    'process.env': {},
    // Performance flags
    __DEV__: process.env.NODE_ENV === 'development',
    __PROD__: process.env.NODE_ENV === 'production',
    // Feature flags
    __ENABLE_CACHE__: JSON.stringify(process.env.ENABLE_CACHE !== 'false'),
    __ENABLE_PERFORMANCE_MONITORING__: JSON.stringify(process.env.ENABLE_PERFORMANCE_MONITORING !== 'false'),
    // Ensure React is available for dynamic imports
    'import.meta.env.VITE_REACT_VERSION': JSON.stringify('18.2.0')
  },
  // CSS optimization
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      // Configure CSS preprocessing if needed
    },
    // Enable CSS modules
    modules: {
      localsConvention: 'camelCase'
    }
  },
  // Experimental features
  experimental: {
    renderBuiltUrl: (filename, { hostType }) => {
      if (hostType === 'js') {
        return { js: `/${filename}` }
      } else {
        return { relative: true }
      }
    }
  },
  // Optimization settings
  optimizeDeps: {
    force: true,
    include: [
      // React ecosystem - bundle together to prevent hook call errors
      'react',
      'react-dom',
      'react-router-dom',
      '@monaco-editor/react',
      '@shopify/polaris',
      '@shopify/polaris-icons',
      '@shopify/polaris-tokens',
      'zustand',
      'date-fns',
      'clsx',
      'framer-motion',
      'jszip',
      'monaco-editor'
    ],
    // Pre-bundle React dependencies to ensure single instance
    exclude: []
  },
  })