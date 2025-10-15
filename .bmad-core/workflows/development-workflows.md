# CIN7 AI Playground Development Workflows

## Phase 1 Development Workflow

### workflow: phase-1-setup
name: "Phase 1 Infrastructure Setup"
description: "Set up the complete development infrastructure for Phase 1"
steps:
  1. **Architecture Setup**
     - Agent: architect
     - Task: create-doc (architecture)
     - Deliverables: System architecture, technical specifications

  2. **Development Environment**
     - Agent: dev
     - Task: create-next-story
     - Deliverables: Development stories, environment setup

  3. **Quality Gates**
     - Agent: qa
     - Task: qa-gate
     - Deliverables: Quality criteria, testing strategy

### workflow: feature-development
name: "Feature Development Pipeline"
description: "Complete feature development from idea to deployment"
steps:
  1. **Requirements Analysis**
     - Agent: analyst
     - Task: advanced-elicitation
     - Deliverables: Requirements document, user stories

  2. **Architecture Design**
     - Agent: architect
     - Task: create-doc (technical design)
     - Deliverables: Technical design, architecture decisions

  3. **Development Implementation**
     - Agent: dev
     - Task: create-next-story
     - Deliverables: Implementation stories, code

  4. **Quality Assurance**
     - Agent: qa
     - Task: qa-gate
     - Deliverables: Test results, quality approval

  5. **Review & Approval**
     - Agent: po
     - Task: review-story
     - Deliverables: Acceptance criteria, product approval

### workflow: code-review-pipeline
name: "Comprehensive Code Review Pipeline"
description: "Multi-agent code review process"
agents:
  - architecture-strategist
  - security-sentinel
  - performance-oracle
  - code-simplicity-reviewer
  - kieran-typescript-reviewer
parallel_execution: true
deliverables:
  - Architecture compliance report
  - Security vulnerability assessment
  - Performance analysis
  - Code quality review
  - TypeScript best practices review

### workflow: multi-agent-analysis
name: "Multi-Agent Analysis"
description: "Parallel multi-agent analysis for complex tasks"
agents:
  - pattern-recognition-specialist
  - repo-research-analyst
  - best-practices-researcher
  - framework-docs-researcher
parallel_execution: true
deliverables:
  - Pattern analysis report
  - Repository research findings
  - Best practices documentation
  - Framework documentation research

## Emergency Response Workflows

### workflow: critical-bug-fix
name: "Critical Bug Fix Response"
description: "Rapid response for critical bugs"
steps:
  1. **Bug Analysis**
     - Agent: dev
     - Task: brownfield-create-story
     - Priority: Critical

  2. **Impact Assessment**
     - Agent: qa
     - Task: nfr-assess
     - Priority: Critical

  3. **Fix Implementation**
     - Agent: dev
     - Task: execute-checklist
     - Priority: Critical

  4. **Validation**
     - Agent: qa
     - Task: apply-qa-fixes
     - Priority: Critical

### workflow: security-incident
name: "Security Incident Response"
description: "Security incident response workflow"
steps:
  1. **Security Analysis**
     - Agent: security-sentinel
     - Task: Security audit
     - Priority: Critical

  2. **Impact Assessment**
     - Agent: architect
     - Task: Risk assessment
     - Priority: Critical

  3. **Fix Implementation**
     - Agent: dev
     - Task: Security fixes
     - Priority: Critical

  4. **Validation**
     - Agent: security-sentinel
     - Task: Security validation
     - Priority: Critical

## Quality Assurance Workflows

### workflow: comprehensive-qa
name: "Comprehensive Quality Assurance"
description: "Full QA process for releases"
agents:
  - qa
  - security-sentinel
  - performance-oracle
  - data-integrity-guardian
parallel_execution: true
deliverables:
  - QA test report
  - Security assessment
  - Performance benchmarks
  - Data integrity validation

### workflow: pre-release-checks
name: "Pre-Release Quality Gates"
description: "All quality checks before release"
steps:
  1. **Code Quality Review**
     - Agent: kieran-typescript-reviewer
     - Task: Code review

  2. **Security Review**
     - Agent: security-sentinel
     - Task: Security audit

  3. **Performance Review**
     - Agent: performance-oracle
     - Task: Performance analysis

  4. **Final QA Gate**
     - Agent: qa
     - Task: qa-gate

## Project Management Workflows

### workflow: sprint-planning
name: "Sprint Planning Workflow"
description: "Complete sprint planning process"
steps:
  1. **Sprint Goal Definition**
     - Agent: po
     - Task: create-doc (sprint goals)

  2. **Story Creation**
     - Agent: dev
     - Task: create-next-story

  3. **Capacity Planning**
     - Agent: sm
     - Task: facilitate-brainstorming-session

  4. **Sprint Backlog Finalization**
     - Agent: pm
     - Task: review-story

### workflow: release-planning
name: "Release Planning Workflow"
description: "Complete release planning process"
steps:
  1. **Release Scope Definition**
     - Agent: po
     - Task: create-doc (release scope)

  2. **Technical Planning**
     - Agent: architect
     - Task: create-doc (release architecture)

  3. **Resource Planning**
     - Agent: pm
     - Task: facilitate-brainstorming-session

  4. **Risk Assessment**
     - Agent: analyst
     - Task: risk-profile

## Usage Instructions

### Activating Workflows

1. **Start BMad Orchestrator:**
   ```
   /bmad-orchestrator
   ```

2. **Get Workflow Guidance:**
   ```
   *workflow-guidance
   ```

3. **Start Specific Workflow:**
   ```
   *workflow phase-1-setup
   *workflow feature-development
   *workflow code-review-pipeline
   ```

### Multi-Agent Parallel Execution

For workflows that support parallel execution, you can launch multiple agents simultaneously:

```python
# Example: Comprehensive code review
Task("architecture-review", "Review architecture compliance", "architecture-strategist")
Task("security-review", "Conduct security audit", "security-sentinel")
Task("performance-review", "Analyze performance", "performance-oracle")
Task("code-quality-review", "Review code quality", "code-simplicity-reviewer")
```

### Custom Workflow Creation

1. **Create Custom Plan:**
   ```
   *plan
   ```

2. **Add Tasks and Agents:**
   ```
   *task create-next-story
   *agent architect
   *task create-doc
   ```

3. **Save and Execute:**
   ```
   *plan-update
   *status
   ```

## Workflow Templates

### Template: Custom Feature Development
1. **Analysis Phase**
   - Agent: analyst
   - Task: advanced-elicitation

2. **Design Phase**
   - Agent: architect
   - Task: create-doc

3. **Development Phase**
   - Agent: dev
   - Task: create-next-story

4. **Quality Phase**
   - Agent: qa
   - Task: qa-gate

### Template: Emergency Response
1. **Immediate Assessment**
   - Agent: sm
   - Task: facilitate-brainstorming-session

2. **Rapid Development**
   - Agent: dev
   - Task: brownfield-create-story

3. **Quick Validation**
   - Agent: qa
   - Task: apply-qa-fixes

4. **Deployment**
   - Agent: dev
   - Task: execute-checklist

These workflows can be customized and combined based on specific project needs.