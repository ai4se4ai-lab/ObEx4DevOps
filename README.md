# ObEx4DevOps Integration Tool for DevOps

ObEx4DevOps is a VS Code Extension with Enhanced GitHub Focus for observability-driven explainable DevOps integration.

## Overview

ObEx4DevOps (Observability-Driven Explainable for DevOps) Integration Tool is a VS Code extension tailored specifically to support developers using GitHub for version control and GitHub Actions for CI/CD. The core goal is to create an intelligent system that ingests and correlates data from various points in the GitHub-centric development and deployment lifecycle, leveraging AI and machine learning to proactively predict and explain potential issues.

ObEx4DevOps provides these insights directly within the developer's IDE (VS Code) at different scopes:
- **Micro**: Local branch level
- **Meso**: Integration/development branch level (pull requests)
- **Macro**: Production level

## Architecture

The system consists of three main components:

1. **VS Code Extension (Client-Side)**:
   - UI/UX Layer with information panels, code annotations, and contextual views
   - Local event listeners for code changes, branch operations, and build triggers
   - Context aggregator for collecting relevant information
   - API client for communicating with the backend

2. **ObEx4DevOps Backend Engine (Server-Side)**:
   - Data ingestion layer with connectors for GitHub, GitHub Actions, and observability platforms
   - Data processing and storage layer
   - AI-powered analytics and explainability core
   - RESTful API layer

3. **AI Agents**:
   - Code Impact Assessment Agent
   - Cross-Branch Interference Agent
   - GitHub Actions Workflow Analysis Agent
   - QA Test Relevance & Impact Agent
   - Predictive Defect Agent
   - Observability Anomaly Detection Agent
   - Root Cause Explanation Agent

## Key Features

- Real-time analysis of code changes and potential conflicts
- Proactive detection of GitHub Actions workflow issues
- Integration insights for pull requests and branch merges
- Test impact analysis and prioritization
- Root cause analysis for build and test failures
- Code annotations highlighting potential issues
- Multi-level feedback loops (micro, meso, macro)

## Project Structure

```
obex/
├── client/                    # VS Code Extension (Client-Side)
│   ├── package.json           # Extension manifest
│   ├── tsconfig.json          # TypeScript configuration
│   ├── src/
│   │   ├── extension.ts       # Entry point
│   │   ├── ui/                
│   │   │   ├── panels/        
│   │   │   │   └── obexPanel.ts # Main information panel
│   │   │   ├── annotations/   
│   │   │   │   └── codeAnnotations.ts # Code highlighting
│   │   │   └── views/         
│   │   │       └── treeViews.ts # Tree views for different contexts
│   │   ├── listeners/         
│   │   │   ├── codeChange.ts   # For file changes
│   │   │   ├── branchOps.ts    # For git branch operations
│   │   │   └── buildTrigger.ts # For build/test operations
│   │   ├── context/           
│   │   │   └── aggregator.ts   # Gathers IDE context
│   │   ├── api/               
│   │   │   └── client.ts       # API client
│   │   └── utils/             
│   │       └── git.ts          # Git operations utility
│
├── server/                     # OBEX Backend Engine (Server-Side)
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts            # Entry point
│   │   ├── api/               
│   │   │   ├── routes/        
│   │   │   │   └── index.ts   # API routes definition
│   │   │   └── controllers/   
│   │   │       └── analysisController.ts # Request handler
│   │   ├── ai/                
│   │   │   ├── types.ts       # AI agent interfaces
│   │   │   ├── orchestration/ 
│   │   │   │   └── service.ts # Orchestration service
│   │   │   ├── agents/        
│   │   │   │   └── githubActions.ts # GitHub Actions analysis agent
│   │   │   └── explainability/ 
│   │   │       └── engine.ts  # Explainability engine
│   │   └── utils/             
│   │       └── logger.ts      # Logging utility
│
└── shared/                     # Shared code between client and server
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── index.ts           # Entry point
    │   └── types/             
    │       └── insights.ts    # Insight and context types
```
## Development

This project is structured as a monorepo with three packages:

- `client`: VS Code extension (TypeScript)
- `server`: Backend API and AI engine (TypeScript/Node.js)
- `shared`: Shared types and utilities (TypeScript)

### Prerequisites

- Node.js (v14+)
- npm (v7+)
- VS Code
- Git

### Setup

1. Clone the repository
   ```bash
   git clone https://github.com/ai4se4ai-lab/ObEx4DevOps.git
   cd ObEx4DevOps
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Build all packages
   ```bash
   npm run build
   ```

### Development Workflow

- Start the server in development mode:
  ```bash
  npm run dev:server
  ```

- Watch for changes in the VS Code extension:
  ```bash
  npm run dev:client
  ```

- Run tests:
  ```bash
  npm test
  ```

- Lint code:
  ```bash
  npm run lint
  ```

### Running the Extension

1. Open the project in VS Code
2. Press F5 to start debugging the extension in a new VS Code window
3. Ensure the ObEx4DevOps server is running