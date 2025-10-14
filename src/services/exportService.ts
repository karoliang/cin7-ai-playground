import { ProjectPackager, ExportOptions } from '@/lib/projectPackager'
import { Project } from '@/types'
import { getUserProjects } from './projectService'

export interface ExportProgress {
  stage: 'preparing' | 'packaging' | 'building' | 'uploading' | 'completed' | 'error'
  progress: number
  message: string
}

export interface BulkExportProgress extends ExportProgress {
  currentProject?: string
  totalProjects: number
  completedProjects: number
  failedProjects: number
  currentProjectIndex: number
}

export interface BulkExportOptions extends ExportOptions {
  projectFilter?: {
    status?: string[]
    template?: string[]
    dateRange?: {
      start: Date
      end: Date
    }
    frameworks?: string[]
  }
  includeMetadata?: boolean
  generateManifest?: boolean
  compressionLevel?: 'low' | 'medium' | 'high'
}

export interface BulkExportResult {
  success: boolean
  blob?: Blob
  url?: string
  size?: number
  error?: string
  filename?: string
  summary: {
    totalProjects: number
    successfulExports: number
    failedExports: number
    skippedProjects: number
    totalSize: number
    exportedProjects: Array<{
      name: string
      size: number
      status: 'success' | 'failed' | 'skipped'
      error?: string
    }>
  }
  manifest?: {
    exportDate: string
    version: string
    options: BulkExportOptions
    projects: Array<{
      id: string
      name: string
      description?: string
      framework?: string
      template?: string
      status: string
      exportedAt: string
      size: number
    }>
  }
}

export interface ExportResult {
  success: boolean
  blob?: Blob
  url?: string
  size?: number
  error?: string
  filename?: string
}

export class ExportService {
  private static instance: ExportService
  private exportCallbacks: Map<string, (progress: ExportProgress) => void> = new Map()

  static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService()
    }
    return ExportService.instance
  }

  // Add progress callback for an export
  addProgressCallback(exportId: string, callback: (progress: ExportProgress) => void) {
    this.exportCallbacks.set(exportId, callback)
  }

  // Remove progress callback
  removeProgressCallback(exportId: string) {
    this.exportCallbacks.delete(exportId)
  }

  // Update progress for an export
  private updateProgress(exportId: string, progress: ExportProgress) {
    const callback = this.exportCallbacks.get(exportId)
    if (callback) {
      callback(progress)
    }
  }

  // Export project with progress tracking
  async exportProject(
    project: Project,
    options: ExportOptions,
    exportId: string = Date.now().toString()
  ): Promise<ExportResult> {
    try {
      this.updateProgress(exportId, {
        stage: 'preparing',
        progress: 0,
        message: 'Preparing export...'
      })

      // Validate project
      if (!project.files || project.files.length === 0) {
        throw new Error('Project has no files to export')
      }

      this.updateProgress(exportId, {
        stage: 'preparing',
        progress: 10,
        message: 'Analyzing project structure...'
      })

      // Detect framework and setup
      const hasReact = project.files.some(f => f.name.includes('.jsx'))
      const hasVue = project.files.some(f => f.name.includes('.vue'))
      const hasVite = project.files.some(f => f.name === 'vite.config.js' || f.name === 'vite.config.ts')

      this.updateProgress(exportId, {
        stage: 'packaging',
        progress: 30,
        message: 'Packaging files...'
      })

      let result: ExportResult

      switch (options.format) {
        case 'zip':
          result = await this.exportAsZip(project, options, exportId)
          break
        case 'github':
          result = await this.exportToGitHub(project, options, exportId)
          break
        case 'docker':
          result = await this.exportAsDocker(project, options, exportId)
          break
        default:
          throw new Error(`Unsupported export format: ${options.format}`)
      }

      this.updateProgress(exportId, {
        stage: 'completed',
        progress: 100,
        message: 'Export completed successfully!'
      })

      return result

    } catch (error) {
      this.updateProgress(exportId, {
        stage: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Export failed'
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    } finally {
      // Clean up callback after export is complete
      setTimeout(() => {
        this.removeProgressCallback(exportId)
      }, 5000)
    }
  }

  private async exportAsZip(
    project: Project,
    options: ExportOptions,
    exportId: string
  ): Promise<ExportResult> {
    this.updateProgress(exportId, {
      stage: 'packaging',
      progress: 40,
      message: 'Creating ZIP archive...'
    })

    const blob = await ProjectPackager.exportAsZip(project, options)

    this.updateProgress(exportId, {
      stage: 'packaging',
      progress: 70,
      message: 'Finalizing package...'
    })

    const filename = `${project.name.toLowerCase().replace(/\s+/g, '-')}-v1.0.0.zip`
    const size = blob.size

    return {
      success: true,
      blob,
      filename,
      size
    }
  }

  private async exportToGitHub(
    project: Project,
    options: ExportOptions,
    exportId: string
  ): Promise<ExportResult> {
    this.updateProgress(exportId, {
      stage: 'building',
      progress: 50,
      message: 'Connecting to GitHub...'
    })

    // For now, return a placeholder
    return {
      success: false,
      error: 'GitHub export not implemented yet'
    }
  }

  private async exportAsDocker(
    project: Project,
    options: ExportOptions,
    exportId: string
  ): Promise<ExportResult> {
    this.updateProgress(exportId, {
      stage: 'building',
      progress: 40,
      message: 'Building Docker container...'
    })

    const blob = await ProjectPackager.exportAsDocker(project, options)

    this.updateProgress(exportId, {
      stage: 'packaging',
      progress: 70,
      message: 'Packaging Docker files...'
    })

    const filename = `${project.name.toLowerCase().replace(/\s+/g, '-')}-docker.zip`
    const size = blob.size

    return {
      success: true,
      blob,
      filename,
      size
    }
  }

  // Download file to user's computer
  downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Get default export options
  getDefaultExportOptions(): ExportOptions {
    return {
      format: 'zip',
      includeDependencies: true,
      includeReadme: true,
      includeBuildScripts: true,
      minifyCode: false
    }
  }

  // Get default bulk export options
  getDefaultBulkExportOptions(): BulkExportOptions {
    return {
      ...this.getDefaultExportOptions(),
      includeMetadata: true,
      generateManifest: true,
      compressionLevel: 'medium'
    }
  }

  // Export all user projects with progress tracking
  async exportAllProjects(
    userId: string,
    options: BulkExportOptions,
    exportId: string = Date.now().toString()
  ): Promise<BulkExportResult> {
    try {
      this.updateProgress(exportId, {
        stage: 'preparing',
        progress: 0,
        message: 'Fetching projects...',
        totalProjects: 0,
        completedProjects: 0,
        failedProjects: 0,
        currentProjectIndex: 0
      } as BulkExportProgress)

      // Get all user projects
      const allProjects = await getUserProjects(userId)

      if (!allProjects || allProjects.length === 0) {
        return {
          success: false,
          error: 'No projects found for this user',
          summary: {
            totalProjects: 0,
            successfulExports: 0,
            failedExports: 0,
            skippedProjects: 0,
            totalSize: 0,
            exportedProjects: []
          }
        }
      }

      // Apply filters
      const filteredProjects = this.filterProjects(allProjects, options.projectFilter)

      if (filteredProjects.length === 0) {
        return {
          success: false,
          error: 'No projects found matching the selected criteria',
          summary: {
            totalProjects: 0,
            successfulExports: 0,
            failedExports: 0,
            skippedProjects: 0,
            totalSize: 0,
            exportedProjects: []
          }
        }
      }

      this.updateProgress(exportId, {
        stage: 'preparing',
        progress: 5,
        message: `Found ${filteredProjects.length} projects to export`,
        totalProjects: filteredProjects.length,
        completedProjects: 0,
        failedProjects: 0,
        currentProjectIndex: 0
      } as BulkExportProgress)

      let result: BulkExportResult

      switch (options.format) {
        case 'zip':
          result = await this.exportAllAsZip(filteredProjects, options, exportId)
          break
        case 'github':
          result = await this.exportAllToGitHub(filteredProjects, options, exportId)
          break
        case 'docker':
          result = await this.exportAllAsDocker(filteredProjects, options, exportId)
          break
        default:
          throw new Error(`Unsupported export format: ${options.format}`)
      }

      this.updateProgress(exportId, {
        stage: 'completed',
        progress: 100,
        message: 'Bulk export completed successfully!',
        totalProjects: filteredProjects.length,
        completedProjects: result.summary.successfulExports,
        failedProjects: result.summary.failedExports,
        currentProjectIndex: filteredProjects.length
      } as BulkExportProgress)

      return result

    } catch (error) {
      this.updateProgress(exportId, {
        stage: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Bulk export failed',
        totalProjects: 0,
        completedProjects: 0,
        failedProjects: 1,
        currentProjectIndex: 0
      } as BulkExportProgress)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        summary: {
          totalProjects: 0,
          successfulExports: 0,
          failedExports: 1,
          skippedProjects: 0,
          totalSize: 0,
          exportedProjects: []
        }
      }
    } finally {
      setTimeout(() => {
        this.removeProgressCallback(exportId)
      }, 10000)
    }
  }

  // Filter projects based on criteria
  private filterProjects(projects: Project[], filters?: BulkExportOptions['projectFilter']): Project[] {
    if (!filters) return projects

    return projects.filter(project => {
      // Filter by status
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(project.status)) {
          return false
        }
      }

      // Filter by template
      if (filters.template && filters.template.length > 0) {
        if (!project.metadata.template || !filters.template.includes(project.metadata.template)) {
          return false
        }
      }

      // Filter by date range
      if (filters.dateRange) {
        const projectDate = new Date(project.updated_at)
        if (projectDate < filters.dateRange.start || projectDate > filters.dateRange.end) {
          return false
        }
      }

      // Filter by framework
      if (filters.frameworks && filters.frameworks.length > 0) {
        const projectFramework = this.detectProjectFramework(project)
        if (!projectFramework || !filters.frameworks.includes(projectFramework)) {
          return false
        }
      }

      return true
    })
  }

  // Detect project framework
  private detectProjectFramework(project: Project): string | null {
    const hasReact = project.files.some(f => f.name.includes('.jsx') || f.name.includes('.tsx'))
    const hasVue = project.files.some(f => f.name.includes('.vue'))
    const hasTypeScript = project.files.some(f => f.name.includes('.ts') || f.name.includes('.tsx'))

    if (hasReact) return hasTypeScript ? 'react-typescript' : 'react'
    if (hasVue) return 'vue'
    if (hasTypeScript) return 'typescript'
    return 'vanilla'
  }

  // Export all projects as a comprehensive ZIP
  private async exportAllAsZip(
    projects: Project[],
    options: BulkExportOptions,
    exportId: string
  ): Promise<BulkExportResult> {
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()

    const exportedProjects: BulkExportResult['summary']['exportedProjects'] = []
    let successfulExports = 0
    let failedExports = 0
    let skippedProjects = 0
    let totalSize = 0

    // Create projects folder
    const projectsFolder = zip.folder('projects')

    // Check if this is a large export (>50 projects or >100MB estimated)
    const isLargeExport = projects.length > 50 || projects.reduce((acc, p) =>
      acc + ProjectPackager.getExportSize(p, options), 0) > 100_000_000

    if (isLargeExport) {
      this.updateProgress(exportId, {
        stage: 'preparing',
        progress: 8,
        message: `Processing large export (${projects.length} projects)...`,
        totalProjects: projects.length,
        completedProjects: 0,
        failedProjects: 0,
        currentProjectIndex: 0
      } as BulkExportProgress)
    }

    // Generate manifest if requested
    let manifest: BulkExportResult['manifest'] | undefined
    if (options.generateManifest) {
      manifest = {
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        options: options,
        projects: []
      }
    }

    // Process projects in batches for memory efficiency
    const batchSize = isLargeExport ? 10 : projects.length
    for (let batchStart = 0; batchStart < projects.length; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, projects.length)
      const currentBatch = projects.slice(batchStart, batchEnd)

      for (let i = 0; i < currentBatch.length; i++) {
        const project = currentBatch[i]
        const globalIndex = batchStart + i
        const projectProgress = (globalIndex / projects.length) * 80 + 10 // 10-90% progress range

        this.updateProgress(exportId, {
          stage: 'packaging',
          progress: Math.round(projectProgress),
          message: `Exporting ${project.name}...`,
          currentProject: project.name,
          totalProjects: projects.length,
          completedProjects: successfulExports,
          failedProjects: failedExports,
          currentProjectIndex: globalIndex + 1
        } as BulkExportProgress)

        try {
          // Skip projects with no files
          if (!project.files || project.files.length === 0) {
            exportedProjects.push({
              name: project.name,
              size: 0,
              status: 'skipped',
              error: 'No files to export'
            })
            skippedProjects++
            continue
          }

        // Create project folder
          const projectFolder = projectsFolder?.folder(this.sanitizeFileName(project.name))
          if (!projectFolder) {
            throw new Error(`Failed to create project folder for ${project.name}`)
          }

          // Add project files
          for (const file of project.files) {
            let content = file.content
            if (options.minifyCode && (file.name.endsWith('.js') || file.name.endsWith('.jsx'))) {
              content = content
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/\/\/.*$/gm, '')
                .replace(/\s+/g, ' ')
                .trim()
            }
            projectFolder.file(file.name, content)
          }

          // Add configuration files
          if (options.includeDependencies) {
            const packageJson = ProjectPackager.generatePackageJson(project, options)
            projectFolder.file('package.json', JSON.stringify(packageJson, null, 2))
          }

          if (options.includeReadme) {
            const readme = ProjectPackager.generateReadme(project, options)
            projectFolder.file('README.md', readme)
          }

          projectFolder.file('.gitignore', ProjectPackager.generateGitignore())

          // Add build configurations
          const buildConfigs = ProjectPackager.generateBuildConfig(project, options)
          Object.entries(buildConfigs).forEach(([filename, content]) => {
            projectFolder.file(filename, content)
          })

          // Add metadata if requested
          if (options.includeMetadata) {
            const metadata = {
              id: project.id,
              name: project.name,
              description: project.description,
              status: project.status,
              created_at: project.created_at,
              updated_at: project.updated_at,
              metadata: project.metadata,
              settings: project.settings
            }
            projectFolder.file('project-metadata.json', JSON.stringify(metadata, null, 2))
          }

          // Calculate project size
          const projectSize = ProjectPackager.getExportSize(project, options)
          totalSize += projectSize

          exportedProjects.push({
            name: project.name,
            size: projectSize,
            status: 'success'
          })

          // Add to manifest
          if (manifest) {
            manifest.projects.push({
              id: project.id,
              name: project.name,
              description: project.description,
              framework: this.detectProjectFramework(project),
              template: project.metadata.template,
              status: project.status,
              exportedAt: new Date().toISOString(),
              size: projectSize
            })
          }

          successfulExports++

        } catch (error) {
          console.error(`Failed to export project ${project.name}:`, error)
          exportedProjects.push({
            name: project.name,
            size: 0,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          })
          failedExports++
        }
      }

      // Optional: Add small delay between batches for memory cleanup
      if (isLargeExport && batchEnd < projects.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // Add export summary and manifest
    if (options.generateManifest && manifest) {
      zip.file('export-manifest.json', JSON.stringify(manifest, null, 2))
    }

    const summary = {
      exportDate: new Date().toISOString(),
      totalProjects: projects.length,
      successfulExports,
      failedExports,
      skippedProjects,
      totalSize,
      options: options
    }
    zip.file('export-summary.json', JSON.stringify(summary, null, 2))

    // Finalize ZIP
    this.updateProgress(exportId, {
      stage: 'packaging',
      progress: 95,
      message: 'Creating final archive...',
      totalProjects: projects.length,
      completedProjects: successfulExports,
      failedProjects: failedExports,
      currentProjectIndex: projects.length
    } as BulkExportProgress)

    const blob = await zip.generateAsync({
      type: 'blob',
      compression: options.compressionLevel === 'high' ? 'DEFLATE' :
                   options.compressionLevel === 'low' ? 'STORE' : 'DEFLATE'
    })

    const filename = `cin7-projects-bulk-export-${new Date().toISOString().split('T')[0]}.zip`

    return {
      success: true,
      blob,
      filename,
      size: blob.size,
      manifest,
      summary: {
        totalProjects: projects.length,
        successfulExports,
        failedExports,
        skippedProjects,
        totalSize,
        exportedProjects
      }
    }
  }

  // Export all to GitHub (placeholder)
  private async exportAllToGitHub(
    projects: Project[],
    options: BulkExportOptions,
    exportId: string
  ): Promise<BulkExportResult> {
    return {
      success: false,
      error: 'Bulk GitHub export not implemented yet',
      summary: {
        totalProjects: projects.length,
        successfulExports: 0,
        failedExports: projects.length,
        skippedProjects: 0,
        totalSize: 0,
        exportedProjects: projects.map(p => ({
          name: p.name,
          size: 0,
          status: 'failed' as const,
          error: 'GitHub export not implemented'
        }))
      }
    }
  }

  // Export all as Docker (placeholder)
  private async exportAllAsDocker(
    projects: Project[],
    options: BulkExportOptions,
    exportId: string
  ): Promise<BulkExportResult> {
    return {
      success: false,
      error: 'Bulk Docker export not implemented yet',
      summary: {
        totalProjects: projects.length,
        successfulExports: 0,
        failedExports: projects.length,
        skippedProjects: 0,
        totalSize: 0,
        exportedProjects: projects.map(p => ({
          name: p.name,
          size: 0,
          status: 'failed' as const,
          error: 'Docker export not implemented'
        }))
      }
    }
  }

  // Sanitize filename for safe file system usage
  private sanitizeFileName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50) // Limit length
  }

  // Validate export options
  validateExportOptions(options: Partial<ExportOptions>): ExportOptions {
    const defaults = this.getDefaultExportOptions()
    return {
      format: options.format || defaults.format,
      includeDependencies: options.includeDependencies ?? defaults.includeDependencies,
      includeReadme: options.includeReadme ?? defaults.includeReadme,
      includeBuildScripts: options.includeBuildScripts ?? defaults.includeBuildScripts,
      minifyCode: options.minifyCode ?? defaults.minifyCode,
      framework: options.framework
    }
  }

  // Get estimated export info
  getExportInfo(project: Project, options: ExportOptions): {
    estimatedSize: number
    fileCount: number
    framework: string
    buildTool: string
    dependencies: string[]
  } {
    const hasReact = project.files.some(f => f.name.includes('.jsx'))
    const hasVue = project.files.some(f => f.name.includes('.vue'))
    const hasVite = project.files.some(f => f.name === 'vite.config.js' || f.name === 'vite.config.ts')
    const hasTypeScript = project.files.some(f => f.name.includes('.ts') || f.name.includes('.tsx'))

    const dependencies: string[] = []

    if (hasReact) {
      dependencies.push('react', 'react-dom')
    }
    if (hasVue) {
      dependencies.push('vue')
    }
    if (project.files.some(f => f.content.includes('@shopify/polaris'))) {
      dependencies.push('@shopify/polaris', '@shopify/polaris-icons')
    }
    if (project.files.some(f => f.content.includes('@tailwind'))) {
      dependencies.push('tailwindcss', 'autoprefixer', 'postcss')
    }

    return {
      estimatedSize: ProjectPackager.getExportSize(project, options),
      fileCount: project.files.length,
      framework: hasReact ? 'React' : hasVue ? 'Vue' : 'Vanilla JS',
      buildTool: hasVite ? 'Vite' : 'Webpack',
      dependencies: dependencies.slice(0, 5) // Show first 5 dependencies
    }
  }

  // Preview export content
  async previewExport(project: Project, options: ExportOptions): Promise<{
    packageJson: any
    readme: string
    fileStructure: Array<{ name: string; size: number; type: string }>
  }> {
    const packageJson = ProjectPackager.generatePackageJson(project, options)
    const readme = ProjectPackager.generateReadme(project, options)

    const fileStructure = project.files.map(file => ({
      name: file.name,
      size: new Blob([file.content]).size,
      type: file.name.split('.').pop() || 'unknown'
    }))

    return {
      packageJson,
      readme,
      fileStructure
    }
  }
}

// Export singleton instance
export const exportService = ExportService.getInstance()