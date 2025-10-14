import { ProjectPackager, ExportOptions } from '@/lib/projectPackager'
import { Project } from '@/types'

export interface ExportProgress {
  stage: 'preparing' | 'packaging' | 'building' | 'uploading' | 'completed' | 'error'
  progress: number
  message: string
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