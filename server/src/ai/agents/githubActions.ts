import { Agent, AnalysisContext, AnalysisResult } from '../types';
import { Insight } from '../../../shared/types/insights';

/**
 * AI agent for analyzing GitHub Actions workflows
 */
export class GitHubActionsWorkflowAgent implements Agent {
    private name = 'GitHub Actions Workflow Analysis Agent';
    
    /**
     * Analyze GitHub Actions workflows
     */
    public async analyze(context: AnalysisContext): Promise<AnalysisResult> {
        // Skip if GitHub Actions information is not available
        if (!context.githubActions || !context.githubActions.available) {
            return {
                agentName: this.name,
                insights: []
            };
        }
        
        const insights: Insight[] = [];
        
        // Analyze each workflow file
        for (const workflow of context.githubActions.workflows) {
            const workflowInsights = await this.analyzeWorkflow(workflow, context);
            insights.push(...workflowInsights);
        }
        
        return {
            agentName: this.name,
            insights
        };
    }
    
    /**
     * Analyze a single workflow file
     */
    private async analyzeWorkflow(workflow: any, context: AnalysisContext): Promise<Insight[]> {
        const insights: Insight[] = [];
        
        const workflowContent = workflow.content;
        
        // Check for security issues
        insights.push(...this.checkSecurityIssues(workflow, workflowContent, context));
        
        // Check for efficiency issues
        insights.push(...this.checkEfficiencyIssues(workflow, workflowContent, context));
        
        // Check for syntax issues
        insights.push(...this.checkSyntaxIssues(workflow, workflowContent, context));
        
        return insights;
    }
    
    /**
     * Check for security issues in workflow
     */
    private checkSecurityIssues(workflow: any, content: string, context: AnalysisContext): Insight[] {
        const insights: Insight[] = [];
        
        // Check for third-party actions without version pinning
        const thirdPartyActionRegex = /uses:\s+([^@]+)@([^$\n]+)/g;
        let match;
        
        while ((match = thirdPartyActionRegex.exec(content)) !== null) {
            const actionName = match[1];
            const actionVersion = match[2];
            
            // Skip GitHub-owned actions
            if (actionName.startsWith('actions/')) {
                continue;
            }
            
            // Check if version is pinned to a specific SHA
            if (!actionVersion.match(/^[0-9a-f]{40}$/)) {
                insights.push({
                    id: `github-actions-workflow-${workflow.name}-unpinned-action-${actionName}`,
                    title: `Unpinned third-party action: ${actionName}`,
                    summary: `The workflow "${workflow.name}" uses the third-party action "${actionName}" without pinning to a specific SHA, which is a security risk.`,
                    explanation: `Using third-party actions without pinning to a specific SHA allows the action author to potentially modify the action's behavior without your knowledge, which could introduce security vulnerabilities or unexpected behavior. It's recommended to pin third-party actions to a specific SHA to ensure the action doesn't change unexpectedly.`,
                    level: 'meso',
                    severity: 'medium',
                    confidence: 90,
                    category: 'Security',
                    location: {
                        file: workflow.path,
                        line: this.getLineNumber(content, match[0]),
                        column: match.index
                    },
                    fixable: true,
                    recommendations: [
                        `Pin the action to a specific SHA instead of ${actionVersion}.`,
                        `Visit the action's repository to find the SHA for the version you want to use.`,
                        `Use the format: uses: ${actionName}@<full-sha>`
                    ],
                    evidence: [
                        {
                            type: 'Pattern Match',
                            description: `Found unpinned third-party action: ${actionName}@${actionVersion}`,
                            source: workflow.path
                        },
                        {
                            type: 'Best Practice',
                            description: 'Third-party actions should be pinned to specific SHAs for security'
                        }
                    ],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }
        }
        
        // Check for overly permissive token permissions
        if (content.includes('permissions:') && content.includes('write-all')) {
            insights.push({
                id: `github-actions-workflow-${workflow.name}-overly-permissive-token`,
                title: `Overly permissive token permissions in "${workflow.name}"`,
                summary: `The workflow "${workflow.name}" uses "write-all" permissions, which grants more access than may be necessary.`,
                explanation: `Using "write-all" permissions in GitHub Actions workflows grants the GITHUB_TOKEN broad access to your repository, which violates the principle of least privilege. This could potentially allow a compromised action to make unintended changes to your repository. It's recommended to limit permissions to only what's necessary for the workflow to function.`,
                level: 'meso',
                severity: 'high',
                confidence: 95,
                category: 'Security',
                location: {
                    file: workflow.path,
                    line: this.getLineNumber(content, 'write-all')
                },
                fixable: true,
                recommendations: [
                    'Limit permissions to only what is necessary for the workflow.',
                    'Specify individual permissions instead of using "write-all".',
                    'Use the "permissions:" key to define granular token scopes.'
                ],
                evidence: [
                    {
                        type: 'Pattern Match',
                        description: 'Found "write-all" permissions in workflow',
                        source: workflow.path
                    },
                    {
                        type: 'Best Practice',
                        description: 'GitHub recommends following the principle of least privilege for workflow permissions'
                    }
                ],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
        
        // Check for potentially dangerous script injections
        if (content.includes('${{ github.event.issue.title }}') || 
            content.includes('${{ github.event.issue.body }}') ||
            content.includes('${{ github.event.pull_request.title }}') ||
            content.includes('${{ github.event.pull_request.body }}')) {
            
            insights.push({
                id: `github-actions-workflow-${workflow.name}-script-injection`,
                title: `Potential script injection vulnerability in "${workflow.name}"`,
                summary: `The workflow "${workflow.name}" uses user-controllable input in a way that might allow script injection.`,
                explanation: `This workflow uses values from issue or PR titles/bodies directly in commands or scripts. Since these values can be submitted by external users, they could potentially be used for script injection attacks. User-supplied inputs should be properly sanitized before use in workflows, especially in commands, scripts, or API calls.`,
                level: 'meso',
                severity: 'high',
                confidence: 85,
                category: 'Security',
                location: {
                    file: workflow.path,
                    line: this.getLineNumber(content, 'github.event')
                },
                fixable: false,
                recommendations: [
                    'Avoid using user-controllable inputs directly in commands or scripts.',
                    'If necessary, sanitize the inputs before use.',
                    'Consider using GitHub\'s Actions security hardening features like GITHUB_TOKEN restrictions.'
                ],
                evidence: [
                    {
                        type: 'Pattern Match',
                        description: 'Found potentially unsafe use of user-controllable input',
                        source: workflow.path
                    },
                    {
                        type: 'Security Vulnerability',
                        description: 'Script injection in GitHub Actions can lead to repository compromise'
                    }
                ],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
        
        return insights;
    }
    
    /**
     * Check for efficiency issues in workflow
     */
    private checkEfficiencyIssues(workflow: any, content: string, context: AnalysisContext): Insight[] {
        const insights: Insight[] = [];
        
        // Check for missing cache usage
        if ((content.includes('npm ci') || content.includes('npm install')) && 
            !content.includes('actions/cache')) {
            
            insights.push({
                id: `github-actions-workflow-${workflow.name}-missing-cache`,
                title: `Missing dependency caching in "${workflow.name}"`,
                summary: `The workflow "${workflow.name}" installs dependencies but doesn't use caching to speed up builds.`,
                explanation: `This workflow installs npm dependencies but doesn't use the actions/cache action to cache them between runs. Adding dependency caching can significantly reduce workflow run times by reusing previously downloaded packages. For npm, you should cache the 'node_modules' directory or the npm cache directory.`,
                level: 'meso',
                severity: 'medium',
                confidence: 80,
                category: 'Efficiency',
                location: {
                    file: workflow.path,
                    line: this.getLineNumber(content, 'npm ci') || this.getLineNumber(content, 'npm install')
                },
                fixable: true,
                recommendations: [
                    'Add the actions/cache action to cache npm dependencies.',
                    'For npm, cache the ~/.npm directory or node_modules.',
                    'Use a cache key that includes the hash of package-lock.json or package.json.'
                ],
                evidence: [
                    {
                        type: 'Pattern Match',
                        description: 'Found npm dependency installation without caching',
                        source: workflow.path
                    },
                    {
                        type: 'Best Practice',
                        description: 'GitHub recommends caching dependencies to improve workflow speed'
                    }
                ],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
        
        // Check for inefficient checkout (fetching all history)
        if (content.includes('actions/checkout@') && content.includes('fetch-depth: 0')) {
            insights.push({
                id: `github-actions-workflow-${workflow.name}-inefficient-checkout`,
                title: `Inefficient git checkout in "${workflow.name}"`,
                summary: `The workflow "${workflow.name}" fetches the complete git history, which may be unnecessary and slow.`,
                explanation: `This workflow uses 'fetch-depth: 0' with actions/checkout, which downloads the entire git history. This can significantly increase checkout time and network usage. Unless you specifically need the full history (e.g., for generating changelogs or version numbers based on commits), it's more efficient to use a shallow clone.`,
                level: 'meso',
                severity: 'low',
                confidence: 85,
                category: 'Efficiency',
                location: {
                    file: workflow.path,
                    line: this.getLineNumber(content, 'fetch-depth: 0')
                },
                fixable: true,
                recommendations: [
                    'Remove the "fetch-depth: 0" setting if the full history is not needed.',
                    'Use a smaller fetch depth (e.g., fetch-depth: 1) for most operations.',
                    'Only fetch the full history when specifically needed for operations like git log.'
                ],
                evidence: [
                    {
                        type: 'Pattern Match',
                        description: 'Found checkout action with fetch-depth: 0',
                        source: workflow.path
                    },
                    {
                        type: 'Performance Impact',
                        description: 'Fetching complete git history increases checkout time and network usage'
                    }
                ],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
        
        // Check for redundant or excessive steps
        const buildSteps = (content.match(/\s+- name: /g) || []).length;
        if (buildSteps > 20) {
            insights.push({
                id: `github-actions-workflow-${workflow.name}-excessive-steps`,
                title: `Excessive number of steps in "${workflow.name}"`,
                summary: `The workflow "${workflow.name}" contains ${buildSteps} steps, which may indicate inefficiency or complexity.`,
                explanation: `This workflow has a large number of steps (${buildSteps}), which could make it harder to maintain and increase the likelihood of failures. Consider refactoring the workflow to use composite actions, reusable workflows, or scripts to encapsulate related steps. This can improve readability, maintainability, and potentially execution time.`,
                level: 'meso',
                severity: 'low',
                confidence: 70,
                category: 'Efficiency',
                location: {
                    file: workflow.path,
                    line: 1
                },
                fixable: false,
                recommendations: [
                    'Consider refactoring related steps into composite actions.',
                    'Use scripts to combine multiple command-line steps.',
                    'Look for opportunities to use reusable workflows for common patterns.',
                    'Remove any redundant or unnecessary steps.'
                ],
                evidence: [
                    {
                        type: 'Metric',
                        description: `Workflow contains ${buildSteps} steps`,
                        source: workflow.path
                    },
                    {
                        type: 'Best Practice',
                        description: 'GitHub recommends keeping workflows concise and modular for better maintainability'
                    }
                ],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
        
        return insights;
    }
    
    /**
     * Check for syntax issues in workflow
     */
    private checkSyntaxIssues(workflow: any, content: string, context: AnalysisContext): Insight[] {
        const insights: Insight[] = [];
        
        // Check for deprecated Node.js versions
        const nodeVersionRegex = /node-version:\s*['"](8|10|12|14|16)['"]/g;
        let match;
        
        while ((match = nodeVersionRegex.exec(content)) !== null) {
            const nodeVersion = match[1];
            
            insights.push({
                id: `github-actions-workflow-${workflow.name}-deprecated-node-${nodeVersion}`,
                title: `Deprecated Node.js version ${nodeVersion} in "${workflow.name}"`,
                summary: `The workflow "${workflow.name}" uses Node.js version ${nodeVersion}, which is deprecated or nearing end-of-life.`,
                explanation: `This workflow uses Node.js version ${nodeVersion}, which has reached or is nearing its end-of-life. Using deprecated Node.js versions can expose your workflow to security vulnerabilities and compatibility issues. It's recommended to update to a newer, supported version of Node.js.`,
                level: 'meso',
                severity: 'medium',
                confidence: 95,
                category: 'Maintenance',
                location: {
                    file: workflow.path,
                    line: this.getLineNumber(content, match[0])
                },
                fixable: true,
                recommendations: [
                    `Update the Node.js version from ${nodeVersion} to a current LTS version.`,
                    'Consider using "node-version: lts/*" to automatically use the latest LTS version.',
                    'If specific Node.js features are needed, specify the minimum required version.'
                ],
                evidence: [
                    {
                        type: 'Pattern Match',
                        description: `Found deprecated Node.js version: ${nodeVersion}`,
                        source: workflow.path
                    },
                    {
                        type: 'End of Life',
                        description: `Node.js ${nodeVersion} has reached or is nearing end-of-life`
                    }
                ],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
        
        // Check for deprecated GitHub Actions syntax
        if (content.includes('::set-output') || content.includes('::set-env')) {
            insights.push({
                id: `github-actions-workflow-${workflow.name}-deprecated-workflow-commands`,
                title: `Deprecated workflow commands in "${workflow.name}"`,
                summary: `The workflow "${workflow.name}" uses deprecated workflow commands like set-output or set-env.`,
                explanation: `This workflow uses deprecated workflow commands such as "::set-output" or "::set-env". These commands were deprecated in GitHub Actions and have been replaced with environment files. Using deprecated commands may result in warnings or failures in the future.`,
                level: 'meso',
                severity: 'medium',
                confidence: 95,
                category: 'Maintenance',
                location: {
                    file: workflow.path,
                    line: this.getLineNumber(content, '::set-output') || this.getLineNumber(content, '::set-env')
                },
                fixable: true,
                recommendations: [
                    'Replace "::set-output name=foo::" with "echo "foo=$value" >> $GITHUB_OUTPUT"',
                    'Replace "::set-env name=foo::" with "echo "foo=$value" >> $GITHUB_ENV"',
                    'Review the GitHub Actions documentation for the latest workflow command syntax'
                ],
                evidence: [
                    {
                        type: 'Pattern Match',
                        description: 'Found deprecated workflow commands',
                        source: workflow.path
                    },
                    {
                        type: 'Deprecation Notice',
                        description: 'GitHub has officially deprecated these workflow commands'
                    }
                ],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
        
        // Check for potentially invalid or deprecated action versions
        const deprecatedActionsRegex = /uses:\s+actions\/checkout@v1|uses:\s+actions\/setup-node@v1/g;
        
        while ((match = deprecatedActionsRegex.exec(content)) !== null) {
            insights.push({
                id: `github-actions-workflow-${workflow.name}-deprecated-action-${match[0]}`,
                title: `Deprecated GitHub Action version in "${workflow.name}"`,
                summary: `The workflow "${workflow.name}" uses a deprecated version of a GitHub Action.`,
                explanation: `This workflow uses an older version of a GitHub-provided action. Older versions may lack important features, bug fixes, or security updates. It's recommended to update to the latest major version of the action.`,
                level: 'meso',
                severity: 'low',
                confidence: 90,
                category: 'Maintenance',
                location: {
                    file: workflow.path,
                    line: this.getLineNumber(content, match[0])
                },
                fixable: true,
                recommendations: [
                    'Update the action to a newer major version.',
                    'Check the action\'s repository for changelog and migration guide.',
                    'Consider using version wildcard for minor versions (e.g., v3.x) to get automatic updates'
                ],
                evidence: [
                    {
                        type: 'Pattern Match',
                        description: `Found deprecated action version: ${match[0]}`,
                        source: workflow.path
                    },
                    {
                        type: 'Best Practice',
                        description: 'GitHub recommends keeping actions updated to the latest stable versions'
                    }
                ],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
        
        return insights;
    }
    
    /**
     * Get line number for a string in content
     */
    private getLineNumber(content: string, searchString: string): number {
        if (!content.includes(searchString)) {
            return 1; // Default to line 1 if not found
        }
        
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(searchString)) {
                return i + 1; // Line numbers are 1-based
            }
        }
        
        return 1;
    }
}