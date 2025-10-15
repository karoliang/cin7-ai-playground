# CIN7 AI Playground Development Activation Guide

## 🚀 Quick Start Activation

### 1. BMad Framework Activation

The BMad Method framework is already installed and configured. To activate it:

```
/bmad-orchestrator
```

This will:
- Load the BMad Orchestrator persona
- Display all available commands and agents
- Give you access to specialized development agents

### 2. Multi-Agent Mode Activation

Once in BMad Orchestrator mode, you can:

**List Available Agents:**
```
*agent
```

**Transform into Specific Agents:**
```
*agent architect     # For architecture and system design
*agent dev          # For development tasks
*agent pm           # For project management
*agent qa           # For quality assurance
*agent po           # For product ownership
*agent sm           # For scrum master duties
*agent analyst      # For business analysis
*agent ux-expert    # For UX/UI design
```

### 3. Compounding Engineering Methods

The compounding engineering agents are automatically available when you use the `/Task` tool. Available specialist agents:

- **architecture-strategist** - System design and architecture review
- **best-practices-researcher** - Research and documentation gathering
- **code-simplicity-reviewer** - Code quality and simplicity reviews
- **data-integrity-guardian** - Database and data model review
- **dhh-rails-reviewer** - Rails-specific code reviews
- **every-style-editor** - Content editing and style guide compliance
- **feedback-codifier** - Review pattern analysis and improvement
- **framework-docs-researcher** - Framework documentation research
- **git-history-analyzer** - Code evolution analysis
- **kieran-python-reviewer** - Python code quality reviews
- **kieran-rails-reviewer** - Rails code quality reviews
- **kieran-typescript-reviewer** - TypeScript code quality reviews
- **pattern-recognition-specialist** - Design pattern analysis
- **performance-oracle** - Performance optimization
- **pr-comment-resolver** - Pull request comment resolution
- **repo-research-analyst** - Repository research and analysis
- **security-sentinel** - Security audits and vulnerability assessment

## 🛠 Development Workflow Activation

### Option 1: Full BMad Workflow (Recommended)

1. **Start BMad Orchestrator:**
   ```
   /bmad-orchestrator
   ```

2. **Get Workflow Guidance:**
   ```
   *workflow-guidance
   ```

3. **Choose Your Workflow:**
   - New feature development
   - Architecture design
   - Quality assurance
   - Project planning

### Option 2: Direct Agent Access

1. **Jump straight to a specialist:**
   ```
   /agent
   ```
   Then select the compounding engineering agent you need

2. **Or use multi-agent mode for parallel tasks:**
   ```python
   # Example: Run multiple agents in parallel
   [Launch architecture review agent]
   [Launch performance analysis agent]
   [Launch security review agent]
   ```

### Option 3: Task-Based Development

1. **Create a development plan:**
   ```
   /bmad-orchestrator
   *plan
   ```

2. **Execute specific tasks:**
   ```
   *task create-next-story
   *task review-story
   *task qa-gate
   ```

## 🎯 Recommended Activation Sequence

### For Phase 1 Development:

1. **Activate BMad Orchestrator:**
   ```
   /bmad-orchestrator
   ```

2. **Transform to Architect Agent:**
   ```
   *agent architect
   ```

3. **Create Architecture Plan:**
   ```
   *task create-doc
   ```
   (Select architecture document)

4. **Switch to Development Agent:**
   ```
   *agent dev
   ```

5. **Begin Development Stories:**
   ```
   *task create-next-story
   ```

### For Feature Development:

1. **Use Multiple Agents in Parallel:**
   ```
   /Task
   subagent_type: architecture-strategist
   description: "Review new feature architecture"

   /Task
   subagent_type: security-sentinel
   description: "Security review of new feature"

   /Task
   subagent_type: performance-oracle
   description: "Performance analysis of new feature"
   ```

2. **Synthesize Results:**
   The agents will provide comprehensive analysis that you can use to guide development

## 🔧 Advanced Configuration

### Multi-Agent Coordination

You can run multiple agents simultaneously for complex tasks:

```python
# Example: Comprehensive code review
[
  Task("code-review", "Review implementation for best practices", "kieran-typescript-reviewer"),
  Task("security-review", "Check for security vulnerabilities", "security-sentinel"),
  Task("performance-review", "Analyze performance characteristics", "performance-oracle"),
  Task("architecture-review", "Validate architectural decisions", "architecture-strategist")
]
```

### Compounding Engineering Integration

The compounding engineering method automatically:
- Builds on previous work
- Maintains context across sessions
- Applies learnings from one task to the next
- Ensures quality gates are passed at each stage

### Custom Workflow Creation

1. **Define your workflow:**
   ```
   *plan
   ```

2. **Add specific tasks and agents:**
   ```
   *task create-next-story
   *agent qa
   *task qa-gate
   ```

3. **Execute and track progress:**
   ```
   *status
   *plan-status
   ```

## 📋 Development Commands Reference

### BMad Commands (all start with *)
- `*help` - Show all available commands
- `*agent [name]` - Transform into specialist agent
- `*task [name]` - Execute specific task
- `*workflow [name]` - Start predefined workflow
- `*workflow-guidance` - Get help selecting workflow
- `*plan` - Create development plan
- `*status` - Show current context and progress
- `*kb-mode` - Access full BMad knowledge base
- `*exit` - Exit current mode

### Compounding Engineering Commands
- `/Task` - Launch specialized agent
- `/Task` with multiple agents for parallel execution
- Agents automatically coordinate and share context

## 🎯 Getting Started Now

**Ready to begin development? Choose your activation method:**

1. **Quick Start**: `/bmad-orchestrator` then `*workflow-guidance`
2. **Feature Development**: `/Task` with your desired specialist agent
3. **Full Project Planning**: `/bmad-orchestrator` then `*plan`

The system is now fully configured with GLM integration and ready for multi-agent, compounding engineering development!