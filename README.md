# CIN7 AI Playground v2.0

🚀 **Transform your ideas into fully functional multi-page applications with AI-powered code generation, CIN7 design system, and modern development practices.**

## ✨ Key Features

- 🤖 **AI-Powered Generation**: Transform natural language prompts into complete multi-page applications
- 🎨 **CIN7 Design System**: Built-in Shopify Polaris components with CIN7 branding
- 📱 **Multi-Page Architecture**: Generate complex applications with routing and navigation
- 🔄 **Contextual Updates**: Smart code modifications that understand project context
- 📦 **Build System**: Modern Vite-based development and production builds
- 🌙 **Theme System**: Light/dark mode with CIN7 brand colors
- 🔗 **Export & Deploy**: Generate self-contained packages for deployment

## 🛠 Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: Shopify Polaris with CIN7 theming
- **State Management**: Zustand with persistence
- **Routing**: React Router v6
- **Backend**: Supabase (Database + Auth + Edge Functions)
- **AI Integration**: Claude API via OpenRouter
- **Build System**: Vite + PostCSS + ESLint

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. **Clone and install**
```bash
git clone https://github.com/karoliang/cin7-ai-playground.git
cd cin7-ai-playground
npm install
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

3. **Start development**
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Environment Variables

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Development Configuration
VITE_API_URL=http://localhost:54321/functions/v1
VITE_APP_URL=http://localhost:3000

# AI Configuration
VITE_DEFAULT_AI_MODEL=claude-3-5-sonnet
VITE_MAX_TOKENS=4000
```

## 🏗 Project Structure

```
cin7-ai-playground/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Base UI components
│   │   ├── layout/         # Layout components
│   │   ├── project/        # Project-specific components
│   │   └── chat/           # Chat interface components
│   ├── pages/              # Page components
│   │   ├── HomePage.tsx    # Homepage with project creation
│   │   └── ProjectPage.tsx # Project workspace
│   ├── stores/             # Zustand state management
│   │   ├── authStore.ts    # Authentication state
│   │   └── projectStore.ts # Project state
│   ├── services/           # API and business logic
│   ├── types/              # TypeScript definitions
│   ├── styles/             # CSS and styling
│   ├── utils/              # Utility functions
│   ├── hooks/              # Custom React hooks
│   └── lib/                # External library configurations
├── dist/                   # Build output
├── public/                 # Static assets
└── docs/                   # Documentation
```

## 📚 Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run preview          # Preview production build

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix ESLint issues
npm run type-check       # TypeScript type checking

# Testing
npm run test             # Run tests
npm run test:ui          # Run tests with UI

# Analysis
npm run analyze          # Analyze bundle size
```

## 🎯 Core Features

### AI-Powered Code Generation

Simply describe what you want to build:

- "Create a CIN7 sales dashboard with revenue charts"
- "Build a multi-page inventory management system"
- "Design a responsive e-commerce website with cart"

### Multi-Page Architecture

Generate complete applications with:
- Client-side routing
- Navigation components
- Multiple pages and layouts
- Shared components and styles

### CIN7 Design System

Built-in support for:
- Shopify Polaris components
- CIN7 brand colors and styling
- Responsive design patterns
- Accessibility compliance

### Contextual Updates

Smart code modifications that:
- Understand existing project context
- Apply targeted changes
- Preserve existing functionality
- Maintain code quality

## 🏗 Build System Features

### Modern Development Experience

- **Hot Module Replacement** - Instant development feedback
- **TypeScript Support** - Full type safety
- **ESLint Integration** - Code quality enforcement
- **Path Aliases** - Clean import statements

### Production Optimization

- **Code Splitting** - Optimized bundle sizes
- **Tree Shaking** - Remove unused code
- **Minification** - Smaller production builds
- **Source Maps** - Easy debugging

### Theme System

- **Light/Dark Mode** - Automatic theme detection
- **CIN7 Branding** - Consistent visual identity
- **Custom Colors** - Tailorable design tokens
- **CSS Variables** - Dynamic theming

## 🚀 Deployment

### Netlify (Recommended)

1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Configure environment variables
5. Deploy!

### Vercel

1. Import your GitHub repository
2. Vercel auto-detects Vite configuration
3. Configure environment variables
4. Deploy!

### Static Export

```bash
npm run build
# Deploy the 'dist' folder to any static host
```

## 🔧 Configuration

### Custom Templates

Add your own project templates in `src/templates/`:

```typescript
export const customTemplate: Template = {
  id: 'custom-dashboard',
  name: 'Custom Dashboard',
  description: 'A custom dashboard template',
  category: 'dashboard',
  framework: 'react',
  architecture: {
    type: 'multi-page',
    pages: [...]
  },
  files: [...]
}
```

### AI Model Configuration

Customize AI behavior in your environment:

```env
VITE_DEFAULT_AI_MODEL=claude-3-5-sonnet
VITE_MAX_TOKENS=4000
VITE_AI_TEMPERATURE=0.7
```

### Theme Customization

Override CIN7 design tokens:

```css
:root {
  --cin7-primary: #your-brand-color;
  --cin7-secondary: #your-secondary-color;
  /* Add custom design tokens */
}
```

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow existing code style and patterns
- Add TypeScript types for new code
- Include tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the ISC License.

## 🙏 Acknowledgments

- **CIN7** - For the design system and brand guidelines
- **Shopify** - For the Polaris design system
- **Anthropic** - For Claude AI and code generation capabilities
- **Supabase** - For the backend infrastructure
- **Vite** - For the modern build tooling

## 📞 Support

For issues and questions:

- 🐛 [Report Issues](https://github.com/karoliang/cin7-ai-playground/issues)
- 📖 [Documentation](./docs/)
- 💬 [Discussions](https://github.com/karoliang/cin7-ai-playground/discussions)

---

**Built with ❤️ for the CIN7 ecosystem**
*Version 2.0.0 | Modern AI-Powered Application Builder*