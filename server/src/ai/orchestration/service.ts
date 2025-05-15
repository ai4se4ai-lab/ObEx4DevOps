import { Agent, AnalysisContext, AnalysisResult } from '../types';
import { GitHubActionsWorkflowAgent } from '../agents/githubActions';
import { CodeImpactAgent } from '../agents/codeImpact';
import { BranchConflictAgent } from '../agents/branchConflict';
import { TestRelevanceAgent } from '../agents/testRelevance';
import { DefectPredictorAgent } from '../agents/defectPredictor';
import { AnomalyDetectorAgent } from '../agents/anomalyDetector';
import { RootCauseAgent } from '../agents/rootCause';
import { ExplainabilityEngine } from '../explainability/engine';
import { Insight, InsightLevel } from '../../../../shared/types/insights';
import { logger } from '../../utils/logger';

/**
 * Orchestrates multiple AI agents for integrated analysis
 */
export class OrchestrationService {
    private agents: Map<string, Agent> = new Map();
    private explainabilityEngine: ExplainabilityEngine;
    
    constructor() {
        // Initialize explainability engine
        this.explainabilityEngine = new ExplainabilityEngine();
        
        // Register default agents
        this.registerAgent('githubActions', new GitHubActionsWorkflowAgent());
        
        // These would be implemented similarly to the GitHubActionsWorkflowAgent
        // Uncomment when implemented
        /*
        this.registerAgent('codeImpact', new CodeImpactAgent());
        this.registerAgent('branchConflict', new BranchConflictAgent());
        this.registerAgent('testRelevance', new TestRelevanceAgent());
        this.registerAgent('defectPredictor', new DefectPredictorAgent());
        this.registerAgent('anomalyDetector', new AnomalyDetectorAgent());
        this.registerAgent('rootCause', new RootCauseAgent());
        */
    }
    
    /**
     * Register a new agent
     */
    public registerAgent(id: string, agent: Agent): void {
        this.agents.set(id, agent);
    }
    
    /**
     * Remove an agent
     */
    public removeAgent(id: string): boolean {
        return this.agents.delete(id);
    }
    
    /**
     * Get a list of registered agents
     */
    public getRegisteredAgents(): string[] {
        return Array.from(this.agents.keys());
    }
    
    /**
     * Analyze context with appropriate agents
     */
    public async analyze(
        context: AnalysisContext, 
        options: {
            level?: InsightLevel;
            agentIds?: string[];
            minConfidence?: number;
        } = {}
    ): Promise<AnalysisResult[]> {
        const startTime = Date.now();
        logger.info(`Starting analysis with ${this.agents.size} registered agents`);
        
        // Determine which agents to use
        let agentsToUse: Agent[] = [];
        
        if (options.agentIds && options.agentIds.length > 0) {
            // Use specified agents
            agentsToUse = options.agentIds
                .filter(id => this.agents.has(id))
                .map(id => this.agents.get(id)!);
            
            if (agentsToUse.length !== options.agentIds.length) {
                const missingAgents = options.agentIds.filter(id => !this.agents.has(id));
                logger.warn(`Requested agents not found: ${missingAgents.join(', ')}`);
            }
        } else {
            // Use all registered agents
            agentsToUse = Array.from(this.agents.values());
        }
        
        // Run analysis with selected agents in parallel
        const analysisPromises = agentsToUse.map(agent => {
            return agent.analyze(context)
                .catch(error => {
                    logger.error(`Error in agent ${agent.constructor.name}:`, error);
                    return {
                        agentName: agent.constructor.name,
                        insights: [],
                        error: error.message
                    };
                });
        });
        
        const results = await Promise.all(analysisPromises);
        
        // Filter insights by level if specified
        if (options.level) {
            for (const result of results) {
                result.insights = result.insights.filter(insight => insight.level === options.level);
            }
        }
        
        // Filter insights by minimum confidence if specified
        if (options.minConfidence !== undefined) {
            for (const result of results) {
                result.insights = result.insights.filter(insight => insight.confidence >= options.minConfidence!);
            }
        }
        
        // Process insights with explainability engine
        for (const result of results) {
            if (result.insights.length > 0) {
                result.insights = await this.explainabilityEngine.enhanceExplanations(result.insights, context);
            }
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Log analysis summary
        const totalInsights = results.reduce((sum, result) => sum + result.insights.length, 0);
        logger.info(`Analysis completed in ${duration}ms with ${totalInsights} insights from ${results.length} agents`);
        
        return results;
    }
    
    /**
     * Analyze a specific file
     */
    public async analyzeFile(filePath: string, fileContent: string, context: AnalysisContext): Promise<Insight[]> {
        // Create file-specific context
        const fileContext: AnalysisContext = {
            ...context,
            file: {
                path: filePath,
                content: fileContent
            }
        };
        
        // Run analysis focused on file
        const results = await this.analyze(fileContext, {
            // Use specific agents that are relevant for file analysis
            agentIds: ['codeImpact', 'defectPredictor']
        });
        
        // Flatten and return insights
        return results.flatMap(result => result.insights);
    }
    
    /**
     * Analyze a pull request
     */
    public async analyzePullRequest(prContext: any, context: AnalysisContext): Promise<Insight[]> {
        // Create PR-specific context
        const prAnalysisContext: AnalysisContext = {
            ...context,
            pullRequest: prContext
        };
        
        // Run analysis focused on PR
        const results = await this.analyze(prAnalysisContext, {
            level: 'meso', // PR analysis is typically meso level
            agentIds: ['branchConflict', 'githubActions', 'testRelevance']
        });
        
        // Flatten and return insights
        return results.flatMap(result => result.insights);
    }
    
    /**
     * Analyze Github Actions workflow
     */
    public async analyzeGitHubActionsWorkflow(
        workflowPath: string, 
        workflowContent: string,
        context: AnalysisContext
    ): Promise<Insight[]> {
        // Create workflow-specific context
        const workflowContext: AnalysisContext = {
            ...context,
            githubActions: {
                available: true,
                workflows: [{
                    name: path.basename(workflowPath),
                    path: workflowPath,
                    content: workflowContent
                }]
            }
        };
        
        // Run analysis focused on GitHub Actions workflow
        const results = await this.analyze(workflowContext, {
            agentIds: ['githubActions']
        });
        
        // Flatten and return insights
        return results.flatMap(result => result.insights);
    }
}

// For convenience, create a singleton instance
import * as path from 'path';
export const orchestrationService = new OrchestrationService();