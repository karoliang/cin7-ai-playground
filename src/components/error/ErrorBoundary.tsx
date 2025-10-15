import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Card, Text, Button, Page, Layout, BlockStack, InlineStack } from '@shopify/polaris'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Page title="Something went wrong">
          <Layout>
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Oops! Something went wrong</Text>
                  <Text variant="bodyMd" as="p">
                    An unexpected error occurred while rendering this page. Please try refreshing the page or contact support if the problem persists.
                  </Text>

                  {process.env.NODE_ENV === 'development' && this.state.error && (
                    <BlockStack gap="200">
                      <Text variant="headingSm" as="h3">Error Details (Development Only)</Text>
                      <div style={{
                        backgroundColor: 'var(--p-color-bg-surface-subdued)',
                        padding: '1rem',
                        borderRadius: '4px',
                        fontSize: '0.875rem',
                        fontFamily: 'monospace',
                        maxHeight: '200px',
                        overflow: 'auto'
                      }}>
                        <strong>Error:</strong> {this.state.error.message}
                        {this.state.errorInfo && (
                          <div style={{ marginTop: '0.5rem' }}>
                            <strong>Component Stack:</strong>
                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                              {this.state.errorInfo.componentStack}
                            </pre>
                          </div>
                        )}
                      </div>
                    </BlockStack>
                  )}

                  <InlineStack gap="200">
                    <Button onClick={this.handleReset}>Try Again</Button>
                    <Button onClick={() => window.location.reload()}>Refresh Page</Button>
                  </InlineStack>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        </Page>
      )
    }

    return this.props.children
  }
}
