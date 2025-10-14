import {
  ImportProgress,
  ImportResult,
  ImportOptions,
  ImportSource,
  ImportValidation,
  GitHubRepoInfo,
  Project,
  ProjectFile,
  SupportedFramework,
  FileType
} from '@/types'
import { saveProjectToDB } from '@/services/projectService'

export class ImportService {
  private static instance: ImportService
  private importCallbacks: Map<string, (progress: ImportProgress) => void> = new Map()

  static getInstance(): ImportService {
    if (!ImportService.instance) {
      ImportService.instance = new ImportService()
    }
    return ImportService.instance
  }

  // Add progress callback for an import
  addProgressCallback(importId: string, callback: (progress: ImportProgress) => void) {
    this.importCallbacks.set(importId, callback)
  }

  // Remove progress callback
  removeProgressCallback(importId: string) {
    this.importCallbacks.delete(importId)
  }

  // Update progress for an import
  private updateProgress(importId: string, progress: ImportProgress) {
    const callback = this.importCallbacks.get(importId)
    if (callback) {
      callback(progress)
    }
  }

  // Import project with progress tracking
  async importProject(
    source: ImportSource,
    options: ImportOptions,
    importId: string = Date.now().toString()
  ): Promise<ImportResult> {
    try {
      this.updateProgress(importId, {
        stage: 'analyzing',
        progress: 0,
        message: 'Analyzing import source...'
      })

      // Validate import source
      const validation = await this.validateImportSource(source)
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '))
      }

      this.updateProgress(importId, {
        stage: 'validating',
        progress: 10,
        message: 'Validating project structure...'
      })

      let projectFiles: ProjectFile[] = []
      let projectName = options.projectName || 'Imported Project'
      let projectDescription = options.projectDescription || 'Imported project'

      if (source.type === 'file' && source.file) {
        projectFiles = await this.extractZipFile(source.file, importId)
        if (!projectName) {
          projectName = source.file.name.replace('.zip', '').replace(/-/g, ' ')
        }
      } else if (source.type === 'github' && source.url) {
        const repoInfo = await this.getGitHubRepoInfo(source.url)
        projectFiles = await this.fetchGitHubRepository(source.url, source.branch || repoInfo.defaultBranch, importId)
        projectName = repoInfo.name
        projectDescription = repoInfo.description || projectDescription
      } else {
        throw new Error('Invalid import source')
      }

      this.updateProgress(importId, {
        stage: 'processing',
        progress: 60,
        message: 'Processing project files...',
        currentFile: 'Analyzing structure'
      })

      // Detect framework if enabled
      let detectedFramework: SupportedFramework | undefined
      if (options.frameworkDetection) {
        detectedFramework = this.detectFramework(projectFiles)
      }

      // Create project
      const project: Project = {
        id: Date.now().toString(),
        name: projectName,
        description: projectDescription,
        files: projectFiles,
        messages: [],
        metadata: {
          framework: detectedFramework,
          architecture: this.detectArchitecture(projectFiles),
          version: '1.0.0'
        },
        settings: this.getDefaultProjectSettings(detectedFramework),
        status: 'draft',
        user_id: 'current-user', // This should come from auth context
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      this.updateProgress(importId, {
        stage: 'completed',
        progress: 90,
        message: 'Saving project to database...'
      })

      // Save project to database
      try {
        await saveProjectToDB(project)
      } catch (dbError) {
        console.error('Failed to save project to database:', dbError)
        throw new Error('Failed to save imported project to database')
      }

      this.updateProgress(importId, {
        stage: 'completed',
        progress: 100,
        message: 'Import completed successfully!'
      })

      return {
        success: true,
        project,
        importedFiles: projectFiles.length
      }

    } catch (error) {
      this.updateProgress(importId, {
        stage: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Import failed'
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    } finally {
      // Clean up callback after import is complete
      setTimeout(() => {
        this.removeProgressCallback(importId)
      }, 5000)
    }
  }

  // Validate import source
  async validateImportSource(source: ImportSource): Promise<ImportValidation> {
    const errors: string[] = []
    const warnings: string[] = []

    if (source.type === 'file') {
      if (!source.file) {
        errors.push('No file provided')
        return { isValid: false, errors, warnings }
      }

      if (!source.file.name.endsWith('.zip')) {
        errors.push('Only ZIP files are supported')
      }

      if (source.file.size > 50 * 1024 * 1024) { // 50MB limit
        errors.push('File size exceeds 50MB limit')
      }
    } else if (source.type === 'github') {
      if (!source.url) {
        errors.push('GitHub URL is required')
        return { isValid: false, errors, warnings }
      }

      try {
        const url = new URL(source.url)
        if (!url.hostname.includes('github.com')) {
          errors.push('Invalid GitHub URL')
        }
      } catch {
        errors.push('Invalid URL format')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  // Extract ZIP file
  private async extractZipFile(file: File, importId: string): Promise<ProjectFile[]> {
    this.updateProgress(importId, {
      stage: 'extracting',
      progress: 20,
      message: 'Extracting ZIP file...'
    })

    // In a real implementation, you would use a library like JSZip
    // For now, we'll simulate the extraction
    const files: ProjectFile[] = []

    // Simulate processing files
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Add some example files based on common project structures
    files.push(
      {
        id: '1',
        name: 'index.html',
        type: 'html',
        content: '<!DOCTYPE html>\n<html>\n<head>\n  <title>Imported Project</title>\n</head>\n<body>\n  <div id="app"></div>\n</body>\n</html>',
        language: 'html'
      },
      {
        id: '2',
        name: 'styles.css',
        type: 'css',
        content: 'body { margin: 0; font-family: Arial, sans-serif; }',
        language: 'css'
      },
      {
        id: '3',
        name: 'script.js',
        type: 'javascript',
        content: 'console.log("Hello from imported project!");',
        language: 'javascript'
      }
    )

    this.updateProgress(importId, {
      stage: 'extracting',
      progress: 50,
      message: `Extracted ${files.length} files`
    })

    return files
  }

  // Fetch GitHub repository
  private async fetchGitHubRepository(url: string, branch: string, importId: string): Promise<ProjectFile[]> {
    this.updateProgress(importId, {
      stage: 'extracting',
      progress: 20,
      message: 'Fetching GitHub repository...'
    })

    // In a real implementation, you would use GitHub API
    // For now, we'll simulate the repository fetch
    const files: ProjectFile[] = []

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Add some example files
    files.push(
      {
        id: '1',
        name: 'README.md',
        type: 'md',
        content: '# Imported Project\n\nThis project was imported from GitHub.',
        language: 'markdown'
      },
      {
        id: '2',
        name: 'package.json',
        type: 'json',
        content: JSON.stringify({
          name: 'imported-project',
          version: '1.0.0',
          description: 'Project imported from GitHub',
          scripts: {
            start: 'node index.js'
          }
        }, null, 2),
        language: 'json'
      },
      {
        id: '3',
        name: 'index.js',
        type: 'javascript',
        content: 'console.log("Hello from GitHub repository!");',
        language: 'javascript'
      }
    )

    this.updateProgress(importId, {
      stage: 'extracting',
      progress: 50,
      message: `Fetched ${files.length} files from repository`
    })

    return files
  }

  // Get GitHub repository information
  private async getGitHubRepoInfo(url: string): Promise<GitHubRepoInfo> {
    // In a real implementation, you would use GitHub API
    // For now, return mock data
    return {
      name: 'sample-repo',
      description: 'A sample repository for import',
      defaultBranch: 'main',
      languages: ['JavaScript', 'HTML', 'CSS'],
      size: 1024,
      isPrivate: false,
      fileCount: 15
    }
  }

  // Detect framework from files
  private detectFramework(files: ProjectFile[]): SupportedFramework | undefined {
    const hasReact = files.some(f =>
      f.name.includes('.jsx') ||
      f.name.includes('.tsx') ||
      f.content.includes('import React')
    )
    const hasVue = files.some(f =>
      f.name.includes('.vue') ||
      f.content.includes('Vue.createApp')
    )
    const hasAngular = files.some(f =>
      f.content.includes('@angular/core') ||
      f.name.includes('.component.ts')
    )
    const hasSvelte = files.some(f =>
      f.name.includes('.svelte')
    )

    if (hasReact) return 'react'
    if (hasVue) return 'vue'
    if (hasAngular) return 'angular'
    if (hasSvelte) return 'svelte'
    return 'vanilla'
  }

  // Detect project architecture
  private detectArchitecture(files: ProjectFile[]) {
    const hasRouter = files.some(f =>
      f.content.includes('react-router') ||
      f.content.includes('vue-router')
    )
    const hasMultiplePages = files.filter(f =>
      f.type === 'html' && f.name !== 'index.html'
    ).length > 1

    if (hasMultiplePages || hasRouter) {
      return {
        type: 'multi-page' as const,
        pages: []
      }
    }

    return {
      type: 'single-page' as const,
      pages: []
    }
  }

  // Get default project settings
  private getDefaultProjectSettings(framework?: SupportedFramework) {
    return {
      theme: {
        mode: 'light' as const,
        framework: framework || 'vanilla'
      },
      editor: {
        tab_size: 2,
        word_wrap: true,
        minimap: false,
        line_numbers: true,
        font_size: 14,
        theme: 'vs-dark'
      },
      preview: {
        auto_refresh: true,
        device: 'desktop' as const,
        orientation: 'landscape' as const,
        size: { width: 1920, height: 1080 }
      },
      ai: {
        model: 'gpt-4',
        temperature: 0.7,
        max_tokens: 4000,
        context_window: 8000,
        auto_suggestions: true,
        code_completion: true
      },
      collaboration: {
        real_time: false,
        permissions: []
      }
    }
  }

  // Get default import options
  getDefaultImportOptions(): ImportOptions {
    return {
      format: 'zip',
      createNewProject: true,
      overwriteExisting: false,
      skipDependencies: false,
      includeTests: true,
      frameworkDetection: true
    }
  }

  // Validate import options
  validateImportOptions(options: Partial<ImportOptions>): ImportOptions {
    const defaults = this.getDefaultImportOptions()
    return {
      format: options.format || defaults.format,
      createNewProject: options.createNewProject ?? defaults.createNewProject,
      projectName: options.projectName,
      projectDescription: options.projectDescription,
      overwriteExisting: options.overwriteExisting ?? defaults.overwriteExisting,
      skipDependencies: options.skipDependencies ?? defaults.skipDependencies,
      includeTests: options.includeTests ?? defaults.includeTests,
      frameworkDetection: options.frameworkDetection ?? defaults.frameworkDetection
    }
  }
}

// Export singleton instance
export const importService = ImportService.getInstance()