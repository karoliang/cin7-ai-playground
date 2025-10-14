# Sales Dashboard Template

A comprehensive sales dashboard template for the CIN7 AI Playground that provides real-time sales analytics, customer insights, and product performance metrics.

## Features

### 📊 Core Dashboard Components

- **Revenue Analytics**: Interactive revenue charts with trends and targets
- **Sales Metrics**: Key performance indicators (KPIs) with growth tracking
- **Customer Analytics**: New vs returning customers, churn rate analysis
- **Product Performance**: Top products, revenue ranking, growth indicators
- **Recent Sales Table**: Filterable table with detailed transaction history

### 🎯 Interactive Features

- **Date Range Filtering**: Flexible date range selection (7 days, 30 days, 3 months, 6 months, 1 year)
- **Real-time Data Updates**: Dynamic data generation based on selected date ranges
- **Search & Filter**: Search functionality for sales data with status filtering
- **Export Capabilities**: Export sales data to JSON format
- **Responsive Design**: Fully responsive layout for desktop, tablet, and mobile

### 📈 Visualizations

- **Area Charts**: Revenue trends with target comparisons
- **Bar Charts**: Product performance and customer analytics
- **Mixed Charts**: Combined visualizations for multi-metric analysis
- **Color-coded Indicators**: Visual growth indicators (positive/negative trends)

## Technical Implementation

### File Structure

```
src/
├── services/
│   └── templateService.ts          # Template generation service
├── utils/
│   ├── templateUtils.ts           # Template integration utilities
│   └── notifications.ts           # Notification system
├── components/
│   ├── layout/
│   │   └── Layout.tsx             # Updated with template integration
│   └── sales-dashboard/
│       ├── SalesMetrics.tsx       # KPI components
│       ├── RevenueChart.tsx       # Revenue visualization
│       ├── CustomerAnalytics.tsx  # Customer insights
│       ├── ProductPerformance.tsx # Product analysis
│       ├── SalesTable.tsx         # Sales data table
│       └── DateFilter.tsx         # Date range selector
├── data/
│   └── salesData.ts               # Realistic data generator
└── types/
    └── index.ts                   # TypeScript definitions
```

### Key Components

#### TemplateService
- Generates complete project structures from templates
- Handles file creation and metadata configuration
- Supports customizable project parameters

#### Data Generation
- **Realistic Revenue Data**: Seasonal patterns, growth trends, random variations
- **Customer Analytics**: New customer acquisition, retention metrics, churn rates
- **Product Performance**: Diverse product categories with varying performance metrics
- **Sales Transactions**: Detailed transaction history with multiple attributes

#### Component Architecture
- **Modular Design**: Reusable components with clear separation of concerns
- **Type Safety**: Comprehensive TypeScript definitions
- **State Management**: Efficient data handling with React hooks
- **Performance Optimized**: Lazy loading and efficient rendering

## Usage

### Creating a Sales Dashboard Project

1. Navigate to the **Templates** section in the navigation
2. Click on **"Sales Dashboard"** (marked as "Popular")
3. The system will automatically:
   - Generate a complete sales dashboard project
   - Create all necessary files and components
   - Populate with realistic sample data
   - Navigate to the newly created project

### Interactive Features

- **Date Filtering**: Use the date picker to filter data by time period
- **Search**: Search sales by customer, product, or sales representative
- **Status Filtering**: Filter sales by completion status
- **Export**: Export filtered data for external analysis

## Sample Data

The template includes realistic sample data featuring:

- **50+ Products**: Across 5 categories (Electronics, Clothing, Home & Garden, Sports, Books)
- **Multiple Sales Representatives**: Different regional performance
- **Customer Segments**: New vs returning customer analysis
- **Revenue Trends**: 6 months of historical data with seasonal patterns
- **Performance Metrics**: Growth rates, conversion rates, average order values

## Customization

### Adding New Metrics

1. Update `src/types/index.ts` with new data structures
2. Extend the data generator in `src/data/salesData.ts`
3. Create new components in `src/components/sales-dashboard/`
4. Integrate into `src/App.tsx`

### Styling

- Global styles in `src/index.css`
- Component-specific styles using CSS variables
- Responsive design with CSS Grid and Flexbox

### Data Sources

The template can be easily adapted to connect to:
- Real APIs via the `salesData.ts` generator
- Database connections
- External data sources
- CSV/Excel imports

## Dependencies

- **React 18**: Modern React with hooks
- **Recharts**: Comprehensive charting library
- **Lucide React**: Modern icon library
- **Date-fns**: Date manipulation utilities
- **TypeScript**: Full type safety

## Future Enhancements

- [ ] Real-time API integration
- [ ] Advanced filtering options
- [ ] Custom dashboard builder
- [ ] Team collaboration features
- [ ] Advanced export options (CSV, PDF)
- [ ] Predictive analytics
- [ ] Custom KPI creation
- [ ] Mobile app integration

## Support

For questions or issues related to the sales dashboard template:

1. Check the documentation in this file
2. Review the component source code
3. Test with different date ranges and filters
4. Export and analyze the sample data structure

The template is designed to be both a functional sales dashboard and a learning resource for building data-driven applications with React and TypeScript.