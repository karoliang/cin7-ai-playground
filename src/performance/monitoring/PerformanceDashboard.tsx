/**
 * Performance Monitoring Dashboard
 * Real-time performance metrics and optimization insights
 */

import React, { useState, useEffect } from 'react'
import { Card, Layout, Page, Text, Button, Badge, Stack, Grid, Divider } from '@shopify/polaris'
import {
  PerformanceMajor,
  AnalyticsMajor,
  CircleMajor,
  AlertMajor,
  ClockMajor,
  DatabaseMajor,
  CashDollarMajor,
  MobileMajor
} from '@shopify/polaris-icons'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface PerformanceMetrics {
  timestamp: number
  cpu: number
  memory: number
  requests: number
  cacheHitRate: number
  avgLatency: number
  errorRate: number
  cost: number
  tokensPerSecond: number
}

interface OptimizationAlert {
  id: string
  type: 'warning' | 'critical' | 'info'
  title: string
  description: string
  impact: string
  recommendation: string
  timestamp: number
}

export const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([])
  const [alerts, setAlerts] = useState<OptimizationAlert[]>([])
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h')
  const [isRealTime, setIsRealTime] = useState(true)
  const [selectedTab, setSelectedTab] = useState(0)

  // Mock data generation
  useEffect(() => {
    const generateMetrics = () => {
      const now = Date.now()
      const newMetric: PerformanceMetrics = {
        timestamp: now,
        cpu: 20 + Math.random() * 60,
        memory: 30 + Math.random() * 50,
        requests: Math.floor(Math.random() * 100),
        cacheHitRate: 60 + Math.random() * 35,
        avgLatency: 200 + Math.random() * 800,
        errorRate: Math.random() * 5,
        cost: Math.random() * 0.5,
        tokensPerSecond: 10 + Math.random() * 40
      }

      setMetrics(prev => {
        const updated = [...prev, newMetric]
        // Keep only last 50 data points
        return updated.slice(-50)
      })

      // Generate alerts based on metrics
      if (newMetric.cpu > 80 || newMetric.memory > 85 || newMetric.avgLatency > 1000 || newMetric.cacheHitRate < 60) {
        const alert: OptimizationAlert = {
          id: Math.random().toString(36).substr(2, 9),
          type: newMetric.cpu > 90 || newMetric.memory > 95 ? 'critical' : 'warning',
          title: generateAlertTitle(newMetric),
          description: generateAlertDescription(newMetric),
          impact: generateAlertImpact(newMetric),
          recommendation: generateAlertRecommendation(newMetric),
          timestamp: now
        }
        setAlerts(prev => [alert, ...prev.slice(0, 9)]) // Keep last 10 alerts
      }
    }

    // Initial data
    for (let i = 0; i < 20; i++) {
      generateMetrics()
    }

    // Real-time updates
    let interval: NodeJS.Timeout
    if (isRealTime) {
      interval = setInterval(generateMetrics, 2000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRealTime])

  const generateAlertTitle = (metric: PerformanceMetrics): string => {
    if (metric.cpu > 80) return 'High CPU Usage'
    if (metric.memory > 85) return 'High Memory Usage'
    if (metric.avgLatency > 1000) return 'High Response Latency'
    if (metric.cacheHitRate < 60) return 'Low Cache Hit Rate'
    return 'Performance Alert'
  }

  const generateAlertDescription = (metric: PerformanceMetrics): string => {
    if (metric.cpu > 80) return `CPU usage is at ${metric.cpu.toFixed(1)}%`
    if (metric.memory > 85) return `Memory usage is at ${metric.memory.toFixed(1)}%`
    if (metric.avgLatency > 1000) return `Average latency is ${metric.avgLatency.toFixed(0)}ms`
    if (metric.cacheHitRate < 60) return `Cache hit rate is ${metric.cacheHitRate.toFixed(1)}%`
    return 'Performance metric needs attention'
  }

  const generateAlertImpact = (metric: PerformanceMetrics): string => {
    if (metric.cpu > 80) return 'May cause system slowdowns and poor user experience'
    if (metric.memory > 85) return 'Risk of memory leaks and potential crashes'
    if (metric.avgLatency > 1000) return 'Users experiencing slow response times'
    if (metric.cacheHitRate < 60) return 'Increased API costs and slower responses'
    return 'Performance degradation detected'
  }

  const generateAlertRecommendation = (metric: PerformanceMetrics): string => {
    if (metric.cpu > 80) return 'Consider optimizing CPU-intensive operations or scaling resources'
    if (metric.memory > 85) return 'Review memory usage patterns and implement cleanup strategies'
    if (metric.avgLatency > 1000) return 'Implement caching and optimize database queries'
    if (metric.cacheHitRate < 60) return 'Review caching strategies and key generation logic'
    return 'Review performance optimization recommendations'
  }

  const latestMetric = metrics[metrics.length - 1] || {} as PerformanceMetrics

  const tabs = [
    { id: 'overview', content: 'Overview', panelID: 'overview-panel' },
    { id: 'ai-performance', content: 'AI Performance', panelID: 'ai-performance-panel' },
    { id: 'cache-analysis', content: 'Cache Analysis', panelID: 'cache-analysis-panel' },
    { id: 'cost-analysis', content: 'Cost Analysis', panelID: 'cost-analysis-panel' },
    { id: 'alerts', content: 'Alerts', panelID: 'alerts-panel' }
  ]

  const renderOverviewTab = () => (
    <Grid>
      <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
        <Card>
          <div style={{ padding: '16px' }}>
            <Stack spacing="tight">
              <Stack.Item>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: latestMetric.cpu > 80 ? '#ff6b6b' : latestMetric.cpu > 60 ? '#ffa500' : '#51cf66',
                    marginRight: '8px'
                  }} />
                  <Text variant="headingMd" as="h3">CPU Usage</Text>
                </div>
              </Stack.Item>
              <Text variant="heading2xl" as="p">
                {latestMetric.cpu?.toFixed(1) || 0}%
              </Text>
              <Text variant="bodySm" color="subdued">
                {latestMetric.cpu > 80 ? 'Critical' : latestMetric.cpu > 60 ? 'Warning' : 'Normal'}
              </Text>
            </Stack>
          </div>
        </Card>
      </Grid.Cell>

      <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
        <Card>
          <div style={{ padding: '16px' }}>
            <Stack spacing="tight">
              <Stack.Item>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: latestMetric.memory > 85 ? '#ff6b6b' : latestMetric.memory > 70 ? '#ffa500' : '#51cf66',
                    marginRight: '8px'
                  }} />
                  <Text variant="headingMd" as="h3">Memory</Text>
                </div>
              </Stack.Item>
              <Text variant="heading2xl" as="p">
                {latestMetric.memory?.toFixed(1) || 0}%
              </Text>
              <Text variant="bodySm" color="subdued">
                {latestMetric.memory > 85 ? 'Critical' : latestMetric.memory > 70 ? 'Warning' : 'Normal'}
              </Text>
            </Stack>
          </div>
        </Card>
      </Grid.Cell>

      <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
        <Card>
          <div style={{ padding: '16px' }}>
            <Stack spacing="tight">
              <Stack.Item>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: latestMetric.avgLatency > 1000 ? '#ff6b6b' : latestMetric.avgLatency > 500 ? '#ffa500' : '#51cf66',
                    marginRight: '8px'
                  }} />
                  <Text variant="headingMd" as="h3">Latency</Text>
                </div>
              </Stack.Item>
              <Text variant="heading2xl" as="p">
                {latestMetric.avgLatency?.toFixed(0) || 0}ms
              </Text>
              <Text variant="bodySm" color="subdued">
                {latestMetric.avgLatency > 1000 ? 'Poor' : latestMetric.avgLatency > 500 ? 'Fair' : 'Good'}
              </Text>
            </Stack>
          </div>
        </Card>
      </Grid.Cell>

      <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
        <Card>
          <div style={{ padding: '16px' }}>
            <Stack spacing="tight">
              <Stack.Item>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: latestMetric.cacheHitRate < 60 ? '#ff6b6b' : latestMetric.cacheHitRate < 80 ? '#ffa500' : '#51cf66',
                    marginRight: '8px'
                  }} />
                  <Text variant="headingMd" as="h3">Cache Hit Rate</Text>
                </div>
              </Stack.Item>
              <Text variant="heading2xl" as="p">
                {latestMetric.cacheHitRate?.toFixed(1) || 0}%
              </Text>
              <Text variant="bodySm" color="subdued">
                {latestMetric.cacheHitRate < 60 ? 'Poor' : latestMetric.cacheHitRate < 80 ? 'Fair' : 'Good'}
              </Text>
            </Stack>
          </div>
        </Card>
      </Grid.Cell>

      <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
        <Card title="Performance Trends">
          <div style={{ height: '300px', padding: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="cpu"
                  stroke="#ff6b6b"
                  strokeWidth={2}
                  dot={false}
                  name="CPU %"
                />
                <Line
                  type="monotone"
                  dataKey="memory"
                  stroke="#4dabf7"
                  strokeWidth={2}
                  dot={false}
                  name="Memory %"
                />
                <Line
                  type="monotone"
                  dataKey="cacheHitRate"
                  stroke="#51cf66"
                  strokeWidth={2}
                  dot={false}
                  name="Cache Hit %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </Grid.Cell>

      <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
        <Card title="Response Time Analysis">
          <div style={{ height: '300px', padding: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="avgLatency"
                  stroke="#ff8787"
                  fill="#ffe3e3"
                  strokeWidth={2}
                  name="Avg Latency (ms)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </Grid.Cell>

      <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
        <Card title="Recent Alerts">
          <div style={{ padding: '16px', maxHeight: '400px', overflowY: 'auto' }}>
            {alerts.length === 0 ? (
              <Text variant="bodyMd" color="subdued" alignment="center">
                No performance alerts
              </Text>
            ) : (
              <Stack spacing="tight">
                {alerts.map((alert) => (
                  <div key={alert.id} style={{
                    padding: '12px',
                    border: `1px solid ${alert.type === 'critical' ? '#ff6b6b' : alert.type === 'warning' ? '#ffa500' : '#e3e3e3'}`,
                    borderRadius: '8px',
                    backgroundColor: alert.type === 'critical' ? '#ffe3e3' : alert.type === 'warning' ? '#fff3cd' : '#f8f9fa'
                  }}>
                    <Stack spacing="tight">
                      <Stack.Item>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <Badge status={alert.type === 'critical' ? 'critical' : alert.type === 'warning' ? 'attention' : 'info'}>
                            {alert.type.toUpperCase()}
                          </Badge>
                          <Text variant="headingSm" as="h3" fontWeight="semibold">
                            {alert.title}
                          </Text>
                        </div>
                      </Stack.Item>
                      <Text variant="bodySm">{alert.description}</Text>
                      <Text variant="bodySm" color="subdued">{alert.recommendation}</Text>
                      <Text variant="bodyXs" color="subdued">
                        {new Date(alert.timestamp).toLocaleString()}
                      </Text>
                    </Stack>
                  </div>
                ))}
              </Stack>
            )}
          </div>
        </Card>
      </Grid.Cell>

      <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
        <Card title="System Health Score">
          <div style={{ padding: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                backgroundColor: '#51cf66',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto'
              }}>
                <Text variant="heading3xl" as="p" color="white">
                  {calculateHealthScore(latestMetric)}
                </Text>
              </div>
              <Text variant="headingMd" as="h3" marginTop="tight">
                System Health
              </Text>
            </div>

            <Stack spacing="loose">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="bodySm">Request Success Rate</Text>
                <Badge status="success">95.2%</Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="bodySm">Error Rate</Text>
                <Badge status="success">0.8%</Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="bodySm">Cache Efficiency</Text>
                <Badge status="attention">72%</Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="bodySm">Resource Utilization</Text>
                <Badge status="success">Optimal</Badge>
              </div>
            </Stack>
          </div>
        </Card>
      </Grid.Cell>
    </Grid>
  )

  const renderAIPerformanceTab = () => (
    <Grid>
      <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
        <Card title="AI Response Times">
          <div style={{ height: '300px', padding: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.slice(-10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                />
                <Bar dataKey="avgLatency" fill="#ff6b6b" name="Response Time (ms)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </Grid.Cell>

      <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
        <Card title="Token Processing Rate">
          <div style={{ height: '300px', padding: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                />
                <Area
                  type="monotone"
                  dataKey="tokensPerSecond"
                  stroke="#4dabf7"
                  fill="#d0ebff"
                  strokeWidth={2}
                  name="Tokens/Second"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </Grid.Cell>

      <Grid.Cell columnSpan={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}>
        <Card title="AI Performance Metrics">
          <div style={{ padding: '16px' }}>
            <Grid>
              <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                <Text variant="headingMd" as="h3">Average Response Time</Text>
                <Text variant="headingLg" as="p">{latestMetric.avgLatency?.toFixed(0) || 0}ms</Text>
                <Text variant="bodySm" color="subdued">Last 24 hours</Text>
              </Grid.Cell>
              <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                <Text variant="headingMd" as="h3">Tokens Processed</Text>
                <Text variant="headingLg" as="p">{latestMetric.tokensPerSecond?.toFixed(0) || 0}/sec</Text>
                <Text variant="bodySm" color="subdued">Current rate</Text>
              </Grid.Cell>
              <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                <Text variant="headingMd" as="h3">Cache Hit Rate</Text>
                <Text variant="headingLg" as="p">{latestMetric.cacheHitRate?.toFixed(1) || 0}%</Text>
                <Text variant="bodySm" color="subdued">AI responses</Text>
              </Grid.Cell>
              <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                <Text variant="headingMd" as="h3">Cost Efficiency</Text>
                <Text variant="headingLg" as="p">${(latestMetric.cost || 0).toFixed(3)}</Text>
                <Text variant="bodySm" color="subdued">Per request</Text>
              </Grid.Cell>
            </Grid>
          </div>
        </Card>
      </Grid.Cell>
    </Grid>
  )

  const renderCacheAnalysisTab = () => {
    const cacheData = [
      { name: 'Hit', value: latestMetric.cacheHitRate || 0, color: '#51cf66' },
      { name: 'Miss', value: 100 - (latestMetric.cacheHitRate || 0), color: '#ff6b6b' }
    ]

    return (
      <Grid>
        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
          <Card title="Cache Hit Rate Distribution">
            <div style={{ height: '300px', padding: '16px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={cacheData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {cacheData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Grid.Cell>

        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
          <Card title="Cache Performance Trends">
            <div style={{ height: '300px', padding: '16px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="cacheHitRate"
                    stroke="#51cf66"
                    strokeWidth={2}
                    dot={false}
                    name="Hit Rate %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Grid.Cell>

        <Grid.Cell columnSpan={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}>
          <Card title="Cache Optimization Recommendations">
            <div style={{ padding: '16px' }}>
              <Stack spacing="loose">
                <div>
                  <Text variant="headingMd" as="h3">Enable Semantic Caching</Text>
                  <Text variant="bodySm" color="subdued">
                    Implement semantic similarity matching to improve cache hit rates for similar but not identical queries.
                  </Text>
                  <Button marginTop="tight">Implement</Button>
                </div>

                <Divider />

                <div>
                  <Text variant="headingMd" as="h3">Optimize TTL Settings</Text>
                  <Text variant="bodySm" color="subdued">
                    Adjust time-to-live values based on content volatility and usage patterns.
                  </Text>
                  <Button marginTop="tight">Configure</Button>
                </div>

                <Divider />

                <div>
                  <Text variant="headingMd" as="h3">Implement Predictive Preloading</Text>
                  <Text variant="bodySm" color="subdued">
                    Preload cache entries based on user behavior patterns and request sequences.
                  </Text>
                  <Button marginTop="tight">Enable</Button>
                </div>
              </Stack>
            </div>
          </Card>
        </Grid.Cell>
      </Grid>
    )
  }

  const renderCostAnalysisTab = () => {
    const costData = metrics.map(m => ({
      time: new Date(m.timestamp).toLocaleTimeString(),
      cost: m.cost,
      requests: m.requests
    }))

    return (
      <Grid>
        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
          <Card title="Cost Trends">
            <div style={{ height: '300px', padding: '16px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={costData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="cost"
                    stroke="#fa5252"
                    fill="#ffc9c9"
                    strokeWidth={2}
                    name="Cost ($)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Grid.Cell>

        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
          <Card title="Request Volume vs Cost">
            <div style={{ height: '300px', padding: '16px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={costData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="requests"
                    stroke="#4dabf7"
                    strokeWidth={2}
                    dot={false}
                    name="Requests"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="cost"
                    stroke="#fa5252"
                    strokeWidth={2}
                    dot={false}
                    name="Cost ($)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Grid.Cell>

        <Grid.Cell columnSpan={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}>
          <Card title="Cost Optimization Summary">
            <div style={{ padding: '16px' }}>
              <Grid>
                <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                  <Text variant="headingMd" as="h3">Total Cost Today</Text>
                  <Text variant="headingLg" as="p">$12.45</Text>
                  <Text variant="bodySm" color="subdued">↓ 15% from yesterday</Text>
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                  <Text variant="headingMd" as="h3">Cost per Request</Text>
                  <Text variant="headingLg" as="p">$0.042</Text>
                  <Text variant="bodySm" color="subdued">↓ 8% from average</Text>
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                  <Text variant="headingMd" as="h3">Saved by Caching</Text>
                  <Text variant="headingLg" as="p">$3.21</Text>
                  <Text variant="bodySm" color="subdued">25.8% of total</Text>
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                  <Text variant="headingMd" as="h3">Projected Monthly</Text>
                  <Text variant="headingLg" as="p">$374</Text>
                  <Text variant="bodySm" color="subdued">On current trend</Text>
                </Grid.Cell>
              </Grid>
            </div>
          </Card>
        </Grid.Cell>
      </Grid>
    )
  }

  const renderAlertsTab = () => (
    <Card title="Performance Alerts & Recommendations">
      <div style={{ padding: '16px' }}>
        {alerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <Text variant="headingMd" as="h3">All Systems Optimal</Text>
            <Text variant="bodyMd" color="subdued">
              No performance alerts detected. All systems are running within optimal parameters.
            </Text>
          </div>
        ) : (
          <Stack spacing="loose">
            {alerts.map((alert) => (
              <div key={alert.id} style={{
                padding: '16px',
                border: `1px solid ${alert.type === 'critical' ? '#ff6b6b' : alert.type === 'warning' ? '#ffa500' : '#e3e3e3'}`,
                borderRadius: '8px',
                backgroundColor: alert.type === 'critical' ? '#ffe3e3' : alert.type === 'warning' ? '#fff3cd' : '#f8f9fa'
              }}>
                <Stack spacing="tight">
                  <Stack.Item>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Badge status={alert.type === 'critical' ? 'critical' : alert.type === 'warning' ? 'attention' : 'info'}>
                          {alert.type.toUpperCase()}
                        </Badge>
                        <Text variant="headingSm" as="h3" fontWeight="semibold" marginLeft="tight">
                          {alert.title}
                        </Text>
                      </div>
                      <Text variant="bodyXs" color="subdued">
                        {new Date(alert.timestamp).toLocaleString()}
                      </Text>
                    </div>
                  </Stack.Item>
                  <Text variant="bodySm">{alert.description}</Text>
                  <Divider />
                  <div>
                    <Text variant="bodySm" fontWeight="semibold">Impact:</Text>
                    <Text variant="bodySm" color="subdued">{alert.impact}</Text>
                  </div>
                  <div>
                    <Text variant="bodySm" fontWeight="semibold">Recommendation:</Text>
                    <Text variant="bodySm" color="subdued">{alert.recommendation}</Text>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <Button size="small" primary>Apply Fix</Button>
                    <Button size="small">Dismiss</Button>
                    <Button size="small" monochrome>Learn More</Button>
                  </div>
                </Stack>
              </div>
            ))}
          </Stack>
        )}
      </div>
    </Card>
  )

  const calculateHealthScore = (metric: PerformanceMetrics): number => {
    let score = 100

    // CPU impact (25% weight)
    if (metric.cpu > 90) score -= 25
    else if (metric.cpu > 80) score -= 15
    else if (metric.cpu > 70) score -= 8

    // Memory impact (25% weight)
    if (metric.memory > 95) score -= 25
    else if (metric.memory > 85) score -= 15
    else if (metric.memory > 75) score -= 8

    // Latency impact (25% weight)
    if (metric.avgLatency > 2000) score -= 25
    else if (metric.avgLatency > 1000) score -= 15
    else if (metric.avgLatency > 500) score -= 8

    // Cache hit rate impact (15% weight)
    if (metric.cacheHitRate < 50) score -= 15
    else if (metric.cacheHitRate < 70) score -= 8
    else if (metric.cacheHitRate < 85) score -= 3

    // Error rate impact (10% weight)
    if (metric.errorRate > 5) score -= 10
    else if (metric.errorRate > 2) score -= 5
    else if (metric.errorRate > 1) score -= 2

    return Math.max(0, Math.min(100, Math.round(score)))
  }

  return (
    <Page
      title="Performance Dashboard"
      subtitle="Real-time monitoring and optimization insights"
      primaryAction={{
        content: isRealTime ? 'Pause' : 'Resume',
        onAction: () => setIsRealTime(!isRealTime),
        icon: isRealTime ? CircleMajor : AnalyticsMajor
      }}
      secondaryActions={[
        {
          content: 'Export Report',
          onAction: () => console.log('Export performance report'),
          icon: AnalyticsMajor
        },
        {
          content: 'Settings',
          onAction: () => console.log('Open performance settings'),
          icon: CircleMajor
        }
      ]}
    >
      <Layout>
        <Layout.Section>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['1h', '6h', '24h', '7d'].map((range) => (
                  <Button
                    key={range}
                    size="small"
                    primary={selectedTimeRange === range}
                    onClick={() => setSelectedTimeRange(range as any)}
                  >
                    {range}
                  </Button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: isRealTime ? '#51cf66' : '#868e96',
                  animation: isRealTime ? 'pulse 2s infinite' : 'none'
                }} />
                <Text variant="bodySm" color="subdued">
                  {isRealTime ? 'Live' : 'Paused'}
                </Text>
              </div>
            </div>

            <div style={{ borderBottom: '1px solid #e1e3e5', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '24px' }}>
                {tabs.map((tab, index) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedTab(index)}
                    style={{
                      padding: '12px 0',
                      border: 'none',
                      background: 'none',
                      borderBottom: selectedTab === index ? '2px solid #202223' : 'none',
                      color: selectedTab === index ? '#202223' : '#6d7175',
                      cursor: 'pointer',
                      fontWeight: selectedTab === index ? '600' : '400'
                    }}
                  >
                    {tab.content}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {selectedTab === 0 && renderOverviewTab()}
          {selectedTab === 1 && renderAIPerformanceTab()}
          {selectedTab === 2 && renderCacheAnalysisTab()}
          {selectedTab === 3 && renderCostAnalysisTab()}
          {selectedTab === 4 && renderAlertsTab()}
        </Layout.Section>
      </Layout>

      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </Page>
  )
}