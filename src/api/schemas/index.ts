// JSON Schema validation definitions for API requests and responses

// Base schemas
export const PaginationParamsSchema = {
  type: 'object',
  properties: {
    page: {
      type: 'integer',
      minimum: 1,
      default: 1
    },
    limit: {
      type: 'integer',
      minimum: 1,
      maximum: 100,
      default: 20
    },
    sort: {
      type: 'string'
    },
    order: {
      type: 'string',
      enum: ['asc', 'desc'],
      default: 'desc'
    }
  }
}

export const UUIDSchema = {
  type: 'string',
  format: 'uuid',
  pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
}

// Project schemas
export const CreateProjectRequestSchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      pattern: '^[\\w\\s\\-_.]+$'
    },
    description: {
      type: 'string',
      maxLength: 500
    },
    prompt: {
      type: 'string',
      maxLength: 2000
    },
    template: {
      type: 'string',
      enum: [
        'blank',
        'dashboard',
        'e-commerce',
        'blog',
        'portfolio',
        'saas',
        'landing-page',
        'admin-panel',
        'multi-page-app',
        'cin7-sales',
        'cin7-inventory',
        'cin7-analytics',
        'mobile-commerce'
      ]
    },
    framework: {
      type: 'string',
      enum: ['vanilla', 'react', 'vue', 'angular', 'svelte', 'preact', 'solid']
    },
    settings: {
      type: 'object',
      properties: {
        theme: { $ref: '#/schemas/ThemeSettingsSchema' },
        editor: { $ref: '#/schemas/EditorSettingsSchema' },
        preview: { $ref: '#/schemas/PreviewSettingsSchema' },
        ai: { $ref: '#/schemas/AISettingsSchema' },
        collaboration: { $ref: '#/schemas/CollaborationSettingsSchema' }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false
}

export const UpdateProjectRequestSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      pattern: '^[\\w\\s\\-_.]+$'
    },
    description: {
      type: 'string',
      maxLength: 500
    },
    prompt: {
      type: 'string',
      maxLength: 2000
    },
    status: {
      type: 'string',
      enum: ['draft', 'active', 'archived', 'deleted', 'building', 'deployed', 'error']
    },
    metadata: {
      type: 'object',
      properties: {
        architecture: { $ref: '#/schemas/ProjectArchitectureSchema' },
        framework: { $ref: '#/schemas/FrameworkSchema' },
        template: { $ref: '#/schemas/TemplateSchema' },
        build_config: { $ref: '#/schemas/ProjectBuildConfigSchema' },
        deployment: { $ref: '#/schemas/DeploymentConfigSchema' },
        tags: {
          type: 'array',
          items: { type: 'string', maxLength: 50 },
          maxItems: 10
        },
        version: {
          type: 'string',
          pattern: '^\\d+\\.\\d+\\.\\d+$'
        }
      },
      additionalProperties: false
    },
    settings: {
      type: 'object',
      properties: {
        theme: { $ref: '#/schemas/ThemeSettingsSchema' },
        editor: { $ref: '#/schemas/EditorSettingsSchema' },
        preview: { $ref: '#/schemas/PreviewSettingsSchema' },
        ai: { $ref: '#/schemas/AISettingsSchema' },
        collaboration: { $ref: '#/schemas/CollaborationSettingsSchema' }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false,
  minProperties: 1
}

export const ProjectListParamsSchema = {
  ...PaginationParamsSchema,
  properties: {
    ...PaginationParamsSchema.properties,
    status: {
      type: 'string',
      enum: ['draft', 'active', 'archived', 'deleted', 'building', 'deployed', 'error']
    },
    search: {
      type: 'string',
      minLength: 1,
      maxLength: 100
    },
    sort: {
      type: 'string',
      enum: ['created_at', 'updated_at', 'name'],
      default: 'updated_at'
    }
  }
}

// AI schemas
export const GenerateRequestSchema = {
  type: 'object',
  required: ['prompt'],
  properties: {
    prompt: {
      type: 'string',
      minLength: 1,
      maxLength: 5000
    },
    existing_files: {
      type: 'array',
      items: { $ref: '#/schemas/ProjectFileSchema' }
    },
    chat_history: {
      type: 'array',
      items: { $ref: '#/schemas/ChatMessageSchema' }
    },
    context: {
      type: 'object',
      properties: {
        project_id: { $ref: '#/schemas/UUIDSchema' },
        framework: { $ref: '#/schemas/FrameworkSchema' },
        template: { $ref: '#/schemas/TemplateSchema' },
        architecture: { $ref: '#/schemas/ProjectArchitectureSchema' },
        constraints: {
          type: 'array',
          items: { type: 'string', maxLength: 200 },
          maxItems: 20
        },
        examples: {
          type: 'array',
          items: { $ref: '#/schemas/ExampleSchema' },
          maxItems: 10
        }
      },
      additionalProperties: false
    },
    options: {
      type: 'object',
      properties: {
        temperature: {
          type: 'number',
          minimum: 0,
          maximum: 2
        },
        max_tokens: {
          type: 'integer',
          minimum: 1,
          maximum: 32000
        },
        stream: {
          type: 'boolean'
        },
        include_tests: {
          type: 'boolean'
        },
        include_docs: {
          type: 'boolean'
        }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false
}

export const ChatRequestSchema = {
  type: 'object',
  required: ['message'],
  properties: {
    message: {
      type: 'string',
      minLength: 1,
      maxLength: 2000
    },
    project_id: { $ref: '#/schemas/UUIDSchema' },
    context: {
      type: 'object',
      additionalProperties: true
    },
    stream: {
      type: 'boolean',
      default: false
    }
  },
  additionalProperties: false
}

export const AnalyzeRequestSchema = {
  type: 'object',
  required: ['code'],
  properties: {
    code: {
      type: 'string',
      minLength: 1
    },
    file_path: {
      type: 'string',
      maxLength: 500
    },
    language: {
      type: 'string',
      maxLength: 50
    },
    analysis_type: {
      type: 'string',
      enum: ['security', 'performance', 'quality', 'suggestions', 'all'],
      default: 'all'
    }
  },
  additionalProperties: false
}

// File schemas
export const CreateFileRequestSchema = {
  type: 'object',
  required: ['name', 'type', 'content'],
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
      pattern: '^[\\w\\-_.]+$'
    },
    type: {
      type: 'string',
      enum: ['html', 'css', 'javascript', 'typescript', 'jsx', 'tsx', 'json', 'md', 'txt', 'image', 'other']
    },
    content: {
      type: 'string',
      maxLength: 1000000 // 1MB limit
    },
    path: {
      type: 'string',
      maxLength: 500,
      pattern: '^[\\w\\-/]+$'
    }
  },
  additionalProperties: false
}

export const UpdateFileRequestSchema = {
  type: 'object',
  required: ['content'],
  properties: {
    content: {
      type: 'string',
      maxLength: 1000000 // 1MB limit
    },
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
      pattern: '^[\\w\\-_.]+$'
    }
  },
  additionalProperties: false,
  minProperties: 1
}

export const FileListParamsSchema = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['html', 'css', 'javascript', 'typescript', 'jsx', 'tsx', 'json', 'md', 'txt', 'image', 'other']
    }
  },
  additionalProperties: false
}

// User schemas
export const UpdateProfileRequestSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      pattern: '^[\\w\\s\\-_.]+$'
    },
    avatar: {
      type: 'string',
      format: 'uri',
      maxLength: 500
    }
  },
  additionalProperties: false,
  minProperties: 1
}

export const UpdateSettingsRequestSchema = {
  type: 'object',
  properties: {
    theme: { $ref: '#/schemas/ThemeSettingsSchema' },
    notifications: {
      type: 'object',
      properties: {
        email: { type: 'boolean' },
        push: { type: 'boolean' },
        project_updates: { type: 'boolean' },
        ai_suggestions: { type: 'boolean' }
      },
      additionalProperties: false
    },
    privacy: {
      type: 'object',
      properties: {
        profile_visibility: {
          type: 'string',
          enum: ['public', 'private']
        },
        share_projects: { type: 'boolean' }
      },
      additionalProperties: false
    },
    preferences: {
      type: 'object',
      properties: {
        language: {
          type: 'string',
          pattern: '^[a-z]{2}-[A-Z]{2}$'
        },
        timezone: {
          type: 'string',
          pattern: '^[A-Za-z_]+/[A-Za-z_]+$'
        },
        auto_save: { type: 'boolean' }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false,
  minProperties: 1
}

// Reusable component schemas
export const ThemeSettingsSchema = {
  type: 'object',
  properties: {
    mode: {
      type: 'string',
      enum: ['light', 'dark', 'auto']
    },
    primary_color: {
      type: 'string',
      pattern: '^#[0-9A-Fa-f]{6}$'
    },
    custom_css: {
      type: 'string',
      maxLength: 10000
    },
    framework: {
      type: 'string',
      maxLength: 50
    }
  },
  additionalProperties: false
}

export const EditorSettingsSchema = {
  type: 'object',
  properties: {
    tab_size: {
      type: 'integer',
      minimum: 1,
      maximum: 8
    },
    word_wrap: { type: 'boolean' },
    minimap: { type: 'boolean' },
    line_numbers: { type: 'boolean' },
    font_size: {
      type: 'integer',
      minimum: 8,
      maximum: 32
    },
    theme: {
      type: 'string',
      maxLength: 50
    }
  },
  additionalProperties: false
}

export const PreviewSettingsSchema = {
  type: 'object',
  properties: {
    auto_refresh: { type: 'boolean' },
    device: {
      type: 'string',
      enum: ['desktop', 'tablet', 'mobile']
    },
    orientation: {
      type: 'string',
      enum: ['portrait', 'landscape']
    },
    size: {
      type: 'object',
      properties: {
        width: {
          type: 'integer',
          minimum: 100,
          maximum: 4000
        },
        height: {
          type: 'integer',
          minimum: 100,
          maximum: 4000
        }
      },
      required: ['width', 'height'],
      additionalProperties: false
    }
  },
  additionalProperties: false
}

export const AISettingsSchema = {
  type: 'object',
  properties: {
    model: {
      type: 'string',
      maxLength: 100
    },
    temperature: {
      type: 'number',
      minimum: 0,
      maximum: 2
    },
    max_tokens: {
      type: 'integer',
      minimum: 1,
      maximum: 32000
    },
    context_window: {
      type: 'integer',
      minimum: 1
    },
    auto_suggestions: { type: 'boolean' },
    code_completion: { type: 'boolean' }
  },
  additionalProperties: false
}

export const CollaborationSettingsSchema = {
  type: 'object',
  properties: {
    real_time: { type: 'boolean' },
    share_link: {
      type: 'string',
      maxLength: 500
    },
    permissions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          user_id: { $ref: '#/schemas/UUIDSchema' },
          role: {
            type: 'string',
            enum: ['viewer', 'editor', 'admin']
          },
          granted_at: {
            type: 'string',
            format: 'date-time'
          }
        },
        required: ['user_id', 'role'],
        additionalProperties: false
      }
    }
  },
  additionalProperties: false
}

export const ProjectArchitectureSchema = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['single-page', 'multi-page', 'dashboard', 'e-commerce', 'portfolio', 'custom']
    },
    pages: {
      type: 'array',
      items: { $ref: '#/schemas/PageConfigSchema' }
    },
    routing: { $ref: '#/schemas/RoutingConfigSchema' },
    components: {
      type: 'array',
      items: { $ref: '#/schemas/ComponentConfigSchema' }
    }
  },
  additionalProperties: false
}

export const PageConfigSchema = {
  type: 'object',
  required: ['id', 'name', 'path', 'title'],
  properties: {
    id: {
      type: 'string',
      minLength: 1,
      maxLength: 50
    },
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 100
    },
    path: {
      type: 'string',
      minLength: 1,
      maxLength: 200,
      pattern: '^/[\\w\\-/]*$'
    },
    title: {
      type: 'string',
      minLength: 1,
      maxLength: 200
    },
    description: {
      type: 'string',
      maxLength: 500
    },
    components: {
      type: 'array',
      items: { type: 'string' }
    },
    meta: {
      type: 'object',
      additionalProperties: true
    }
  },
  additionalProperties: false
}

export const RoutingConfigSchema = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['client-side', 'server-side', 'static']
    },
    base_path: {
      type: 'string',
      maxLength: 100
    },
    routes: {
      type: 'array',
      items: { $ref: '#/schemas/RouteConfigSchema' }
    }
  },
  additionalProperties: false
}

export const RouteConfigSchema = {
  type: 'object',
  required: ['path', 'component'],
  properties: {
    path: {
      type: 'string',
      minLength: 1,
      maxLength: 200
    },
    component: {
      type: 'string',
      minLength: 1,
      maxLength: 100
    },
    exact: { type: 'boolean' },
    meta: {
      type: 'object',
      additionalProperties: true
    }
  },
  additionalProperties: false
}

export const ComponentConfigSchema = {
  type: 'object',
  required: ['name', 'type'],
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 100
    },
    type: {
      type: 'string',
      enum: ['page', 'layout', 'ui', 'business']
    },
    props: {
      type: 'object',
      additionalProperties: true
    },
    dependencies: {
      type: 'array',
      items: { type: 'string' }
    }
  },
  additionalProperties: false
}

export const ProjectBuildConfigSchema = {
  type: 'object',
  properties: {
    bundler: {
      type: 'string',
      enum: ['vite', 'webpack', 'rollup', 'esbuild']
    },
    output_dir: {
      type: 'string',
      maxLength: 100
    },
    public_path: {
      type: 'string',
      maxLength: 100
    },
    minify: { type: 'boolean' },
    sourcemap: { type: 'boolean' },
    optimization: {
      type: 'object',
      properties: {
        split_chunks: { type: 'boolean' },
        tree_shaking: { type: 'boolean' },
        compression: { type: 'boolean' }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false
}

export const DeploymentConfigSchema = {
  type: 'object',
  properties: {
    platform: {
      type: 'string',
      enum: ['netlify', 'vercel', 'github-pages', 'custom']
    },
    url: {
      type: 'string',
      format: 'uri',
      maxLength: 500
    },
    environment: {
      type: 'object',
      patternProperties: {
        '^[A-Z_][A-Z0-9_]*$': { type: 'string' }
      },
      additionalProperties: false
    },
    build_command: {
      type: 'string',
      maxLength: 200
    },
    output_dir: {
      type: 'string',
      maxLength: 100
    }
  },
  additionalProperties: false
}

export const FrameworkSchema = {
  type: 'string',
  enum: ['vanilla', 'react', 'vue', 'angular', 'svelte', 'preact', 'solid']
}

export const TemplateSchema = {
  type: 'string',
  enum: [
    'blank',
    'dashboard',
    'e-commerce',
    'blog',
    'portfolio',
    'saas',
    'landing-page',
    'admin-panel',
    'multi-page-app',
    'cin7-sales',
    'cin7-inventory',
    'cin7-analytics',
    'mobile-commerce'
  ]
}

export const ProjectFileSchema = {
  type: 'object',
  required: ['id', 'name', 'type', 'content'],
  properties: {
    id: { $ref: '#/schemas/UUIDSchema' },
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 255
    },
    type: {
      type: 'string',
      enum: ['html', 'css', 'javascript', 'typescript', 'jsx', 'tsx', 'json', 'md', 'txt', 'image', 'other']
    },
    content: { type: 'string' },
    language: {
      type: 'string',
      maxLength: 50
    },
    path: {
      type: 'string',
      maxLength: 500
    },
    size: {
      type: 'integer',
      minimum: 0
    },
    created_at: {
      type: 'string',
      format: 'date-time'
    },
    updated_at: {
      type: 'string',
      format: 'date-time'
    }
  },
  additionalProperties: false
}

export const ChatMessageSchema = {
  type: 'object',
  required: ['id', 'role', 'content', 'timestamp'],
  properties: {
    id: { $ref: '#/schemas/UUIDSchema' },
    role: {
      type: 'string',
      enum: ['user', 'assistant', 'system']
    },
    content: { type: 'string' },
    timestamp: {
      type: 'string',
      format: 'date-time'
    },
    metadata: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { $ref: '#/schemas/ProjectFileSchema' }
        },
        operations: {
          type: 'array',
          items: { $ref: '#/schemas/FileOperationSchema' }
        },
        reasoning: { type: 'string' },
        confidence: {
          type: 'number',
          minimum: 0,
          maximum: 1
        }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false
}

export const FileOperationSchema = {
  type: 'object',
  required: ['type', 'file'],
  properties: {
    type: {
      type: 'string',
      enum: ['create', 'update', 'delete', 'move']
    },
    file: { type: 'string' },
    content: { type: 'string' },
    from: { type: 'string' },
    to: { type: 'string' },
    reason: { type: 'string' }
  },
  additionalProperties: false
}

export const ExampleSchema = {
  type: 'object',
  required: ['description', 'code', 'language'],
  properties: {
    description: { type: 'string' },
    code: { type: 'string' },
    language: { type: 'string' }
  },
  additionalProperties: false
}

// Response schemas
export const APIResponseSchema = {
  type: 'object',
  required: ['success'],
  properties: {
    success: { type: 'boolean' },
    data: {},
    error: { type: 'string' },
    message: { type: 'string' },
    code: { type: 'string' },
    details: {
      type: 'object',
      additionalProperties: true
    },
    timestamp: {
      type: 'string',
      format: 'date-time'
    }
  },
  additionalProperties: false
}

export const ErrorResponseSchema = {
  type: 'object',
  required: ['success', 'error'],
  properties: {
    success: { type: 'boolean', const: false },
    error: { type: 'string' },
    code: { type: 'string' },
    details: {
      type: 'object',
      additionalProperties: true
    },
    timestamp: {
      type: 'string',
      format: 'date-time'
    }
  },
  additionalProperties: false
}

export const ValidationErrorSchema = {
  ...ErrorResponseSchema,
  properties: {
    ...ErrorResponseSchema.properties,
    code: { type: 'string', const: 'VALIDATION_ERROR' },
    details: {
      type: 'array',
      items: {
        type: 'object',
        required: ['field', 'message'],
        properties: {
          field: { type: 'string' },
          message: { type: 'string' }
        },
        additionalProperties: false
      }
    }
  }
}

export const RateLimitErrorSchema = {
  ...ErrorResponseSchema,
  properties: {
    ...ErrorResponseSchema.properties,
    code: { type: 'string', const: 'RATE_LIMITED' },
    details: {
      type: 'object',
      required: ['retry_after'],
      properties: {
        retry_after: { type: 'integer', minimum: 1 }
      },
      additionalProperties: false
    }
  }
}

// Schema registry for easy lookup
export const Schemas = {
  // Request schemas
  CreateProjectRequest: CreateProjectRequestSchema,
  UpdateProjectRequest: UpdateProjectRequestSchema,
  ProjectListParams: ProjectListParamsSchema,
  GenerateRequest: GenerateRequestSchema,
  ChatRequest: ChatRequestSchema,
  AnalyzeRequest: AnalyzeRequestSchema,
  CreateFileRequest: CreateFileRequestSchema,
  UpdateFileRequest: UpdateFileRequestSchema,
  FileListParams: FileListParamsSchema,
  UpdateProfileRequest: UpdateProfileRequestSchema,
  UpdateSettingsRequest: UpdateSettingsRequestSchema,

  // Response schemas
  APIResponse: APIResponseSchema,
  ErrorResponse: ErrorResponseSchema,
  ValidationError: ValidationErrorSchema,
  RateLimitError: RateLimitErrorSchema,

  // Component schemas
  ThemeSettings: ThemeSettingsSchema,
  EditorSettings: EditorSettingsSchema,
  PreviewSettings: PreviewSettingsSchema,
  AISettings: AISettingsSchema,
  CollaborationSettings: CollaborationSettingsSchema,
  ProjectArchitecture: ProjectArchitectureSchema,
  PageConfig: PageConfigSchema,
  RoutingConfig: RoutingConfigSchema,
  RouteConfig: RouteConfigSchema,
  ComponentConfig: ComponentConfigSchema,
  ProjectBuildConfig: ProjectBuildConfigSchema,
  DeploymentConfig: DeploymentConfigSchema,

  // Base schemas
  UUID: UUIDSchema,
  PaginationParams: PaginationParamsSchema
} as const

export type SchemaName = keyof typeof Schemas