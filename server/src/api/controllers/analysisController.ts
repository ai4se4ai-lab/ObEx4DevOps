import { Request, Response } from 'express';
import { orchestrationService } from '../../ai/orchestration/service';
import { logger } from '../../utils/logger';
import { AnalysisContext, Insight, InsightLevel } from '../../../../shared/types/insights';

/**
 * Controller for handling analysis-related API endpoints
 */
export class AnalysisController {
    /**
     * Analyze code and context
     */
    public async analyze(req: Request, res: Response): Promise<void> {
        try {
            const context: AnalysisContext = req.body;
            
            logger.info(`Received analysis request: ${context.eventType || 'general'}`);
            logger.debug('Analysis context:', context);
            
            // Validate context
            if (!context || !context.timestamp) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid analysis context'
                });
                return;
            }
            
            // Perform analysis
            const results = await orchestrationService.analyze(context);
            
            // Extract insights
            const insights = results.flatMap(result => result.insights);
            
            // Return insights
            res.status(200).json({
                success: true,
                insights,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Error in analyze endpoint:', error);
            
            res.status(500).json({
                success: false,
                error: error.message || 'Internal server error'
            });
        }
    }
    
    /**
     * Analyze pre-build context
     */
    public async analyzePreBuild(req: Request, res: Response): Promise<void> {
        try {
            const context: AnalysisContext = req.body;
            
            logger.info('Received pre-build analysis request');
            
            // Validate context
            if (!context || !context.timestamp || !context.task) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid pre-build context'
                });
                return;
            }
            
            // Add event type if not specified
            if (!context.eventType) {
                context.eventType = 'taskStart';
            }
            
            // Perform analysis with specific agents
            const results = await orchestrationService.analyze(context, {
                agentIds: ['codeImpact', 'githubActions', 'defectPredictor']
            });
            
            // Extract insights
            const insights = results.flatMap(result => result.insights);
            
            // Return insights
            res.status(200).json({
                success: true,
                insights,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Error in analyzePreBuild endpoint:', error);
            
            res.status(500).json({
                success: false,
                error: error.message || 'Internal server error'
            });
        }
    }
    
    /**
     * Analyze post-build context
     */
    public async analyzePostBuild(req: Request, res: Response): Promise<void> {
        try {
            const context: AnalysisContext = req.body;
            
            logger.info('Received post-build analysis request');
            
            // Validate context
            if (!context || !context.timestamp || !context.task) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid post-build context'
                });
                return;
            }
            
            // Add event type if not specified
            if (!context.eventType) {
                context.eventType = 'taskEnd';
            }
            
            // Perform analysis with specific agents
            const results = await orchestrationService.analyze(context, {
                agentIds: ['githubActions', 'rootCause']
            });
            
            // Extract insights
            const insights = results.flatMap(result => result.insights);
            
            // Return insights
            res.status(200).json({
                success: true,
                insights,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Error in analyzePostBuild endpoint:', error);
            
            res.status(500).json({
                success: false,
                error: error.message || 'Internal server error'
            });
        }
    }
    
    /**
     * Analyze build log
     */
    public async analyzeBuildLog(req: Request, res: Response): Promise<void> {
        try {
            const context: AnalysisContext = req.body;
            
            logger.info('Received build log analysis request');
            
            // Validate context
            if (!context || !context.timestamp || !context.buildLog) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid build log context'
                });
                return;
            }
            
            // Add event type if not specified
            if (!context.eventType) {
                context.eventType = 'buildLogAnalysis';
            }
            
            // Perform analysis with specific agents
            const results = await orchestrationService.analyze(context, {
                agentIds: ['githubActions', 'rootCause']
            });
            
            // Extract insights
            const insights = results.flatMap(result => result.insights);
            
            // Return insights
            res.status(200).json({
                success: true,
                insights,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Error in analyzeBuildLog endpoint:', error);
            
            res.status(500).json({
                success: false,
                error: error.message || 'Internal server error'
            });
        }
    }
    
    /**
     * Analyze pre-test context
     */
    public async analyzePreTest(req: Request, res: Response): Promise<void> {
        try {
            const context: AnalysisContext = req.body;
            
            logger.info('Received pre-test analysis request');
            
            // Validate context
            if (!context || !context.timestamp || !context.testRun) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid pre-test context'
                });
                return;
            }
            
            // Add event type if not specified
            if (!context.eventType) {
                context.eventType = 'testRunStart';
            }
            
            // Perform analysis with specific agents
            const results = await orchestrationService.analyze(context, {
                agentIds: ['testRelevance']
            });
            
            // Extract insights
            const insights = results.flatMap(result => result.insights);
            
            // Return insights
            res.status(200).json({
                success: true,
                insights,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Error in analyzePreTest endpoint:', error);
            
            res.status(500).json({
                success: false,
                error: error.message || 'Internal server error'
            });
        }
    }
    
    /**
     * Analyze post-test context
     */
    public async analyzePostTest(req: Request, res: Response): Promise<void> {
        try {
            const context: AnalysisContext = req.body;
            
            logger.info('Received post-test analysis request');
            
            // Validate context
            if (!context || !context.timestamp || !context.testRunResults) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid post-test context'
                });
                return;
            }
            
            // Add event type if not specified
            if (!context.eventType) {
                context.eventType = 'testRunEnd';
            }
            
            // Perform analysis with specific agents
            const results = await orchestrationService.analyze(context, {
                agentIds: ['testRelevance', 'rootCause']
            });
            
            // Extract insights
            const insights = results.flatMap(result => result.insights);
            
            // Return insights
            res.status(200).json({
                success: true,
                insights,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Error in analyzePostTest endpoint:', error);
            
            res.status(500).json({
                success: false,
                error: error.message || 'Internal server error'
            });
        }
    }
    
    /**
     * Get latest insights
     */
    public async getLatestInsights(req: Request, res: Response): Promise<void> {
        try {
            logger.info('Received request for latest insights');
            
            // In a real implementation, this would fetch from a database
            // For this example, we'll return a mock response
            const mockInsights: Insight[] = [
                {
                    id: 'mock-insight-1',
                    title: 'Potential security vulnerability in GitHub Actions workflow',
                    summary: 'Your GitHub Actions workflow uses deprecated commands that could expose credentials.',
                    explanation: 'The workflow uses the deprecated set-env command which can lead to credential exposure through environment variables. GitHub has deprecated this command due to this security risk.',
                    level: 'meso',
                    severity: 'high',
                    confidence: 95,
                    category: 'Security',
                    location: {
                        file: '.github/workflows/ci.yml',
                        line: 42
                    },
                    fixable: true,
                    recommendations: [
                        'Replace ::set-env name=foo:: with echo "foo=$value" >> $GITHUB_ENV',
                        'Update all GitHub Actions workflow commands to the latest syntax'
                    ],
                    evidence: [
                        {
                            type: 'Pattern Match',
                            description: 'Found deprecated workflow command ::set-env',
                            source: '.github/workflows/ci.yml'
                        }
                    ],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: 'mock-insight-2',
                    title: 'Inefficient dependency caching in GitHub Actions',
                    summary: 'Your GitHub Actions workflow is not caching dependencies, leading to slower builds.',
                    explanation: 'This workflow installs npm dependencies but doesn\'t use the GitHub Actions cache action. Adding dependency caching can significantly reduce workflow run times by reusing previously downloaded packages.',
                    level: 'meso',
                    severity: 'medium',
                    confidence: 90,
                    category: 'Efficiency',
                    location: {
                        file: '.github/workflows/ci.yml',
                        line: 25
                    },
                    fixable: true,
                    recommendations: [
                        'Add the actions/cache action to cache npm dependencies',
                        'Use a cache key that includes the hash of package-lock.json'
                    ],
                    evidence: [
                        {
                            type: 'Pattern Match',
                            description: 'Found npm install without caching',
                            source: '.github/workflows/ci.yml'
                        }
                    ],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            ];
            
            res.status(200).json({
                items: mockInsights,
                count: mockInsights.length,
                total: mockInsights.length,
                hasMore: false
            });
        } catch (error) {
            logger.error('Error in getLatestInsights endpoint:', error);
            
            res.status(500).json({
                success: false,
                error: error.message || 'Internal server error'
            });
        }
    }
    
    /**
     * Get insights by level
     */
    public async getInsightsByLevel(req: Request, res: Response): Promise<void> {
        try {
            const level = req.params.level as InsightLevel;
            
            logger.info(`Received request for ${level} level insights`);
            
            // Validate level
            if (!level || !['micro', 'meso', 'macro'].includes(level)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid level parameter'
                });
                return;
            }
            
            // In a real implementation, this would fetch from a database filtered by level
            // For this example, we'll return a mock response
            const mockInsights: Insight[] = [
                {
                    id: `mock-${level}-insight-1`,
                    title: `${level.charAt(0).toUpperCase() + level.slice(1)} level insight example`,
                    summary: `This is an example insight at the ${level} level.`,
                    explanation: `The ${level} level corresponds to ${level === 'micro' ? 'local branch' : level === 'meso' ? 'integration branch' : 'production'} scope. This insight provides recommendations specific to this scope.`,
                    level: level,
                    severity: 'medium',
                    confidence: 85,
                    category: 'General',
                    fixable: false,
                    recommendations: [
                        `Example recommendation for ${level} level`
                    ],
                    evidence: [
                        {
                            type: 'Example',
                            description: `Example evidence for ${level} level insight`
                        }
                    ],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            ];
            
            res.status(200).json({
                items: mockInsights,
                count: mockInsights.length,
                total: mockInsights.length,
                hasMore: false
            });
        } catch (error) {
            logger.error('Error in getInsightsByLevel endpoint:', error);
            
            res.status(500).json({
                success: false,
                error: error.message || 'Internal server error'
            });
        }
    }
    
    /**
     * Get code annotations
     */
    public async getCodeAnnotations(req: Request, res: Response): Promise<void> {
        try {
            logger.info('Received request for code annotations');
            
            // In a real implementation, this would fetch from a database
            // For this example, we'll return a mock response
            const mockAnnotations = [
                {
                    id: 'mock-annotation-1',
                    title: 'Potential security vulnerability',
                    summary: 'This code may be vulnerable to injection attacks',
                    severity: 'high',
                    confidence: 90,
                    location: {
                        file: 'src/utils/parser.ts',
                        line: 42,
                        column: 10,
                        endLine: 42,
                        endColumn: 50
                    },
                    insightId: 'related-insight-1'
                },
                {
                    id: 'mock-annotation-2',
                    title: 'Inefficient code pattern',
                    summary: 'This loop could be optimized for better performance',
                    severity: 'medium',
                    confidence: 85,
                    location: {
                        file: 'src/services/dataProcessor.ts',
                        line: 78,
                        column: 5,
                        endLine: 85,
                        endColumn: 6
                    },
                    insightId: 'related-insight-2'
                }
            ];
            
            res.status(200).json({
                annotations: mockAnnotations,
                count: mockAnnotations.length
            });
        } catch (error) {
            logger.error('Error in getCodeAnnotations endpoint:', error);
            
            res.status(500).json({
                success: false,
                error: error.message || 'Internal server error'
            });
        }
    }
    
    /**
     * Get fix for issue
     */
    public async getFixForIssue(req: Request, res: Response): Promise<void> {
        try {
            const issueId = req.params.id;
            
            logger.info(`Received request for fix for issue ${issueId}`);
            
            // In a real implementation, this would fetch from a database or generate dynamically
            // For this example, we'll return a mock response
            const mockFix = {
                applicable: true,
                description: 'Fix GitHub Actions workflow to use recommended patterns',
                severity: 'medium',
                location: {
                    file: '.github/workflows/ci.yml',
                    line: 25
                },
                changes: [
                    {
                        oldCode: 'run: echo ::set-env name=FOO::bar',
                        newCode: 'run: echo "FOO=bar" >> $GITHUB_ENV',
                        description: 'Replace deprecated set-env command with environment file'
                    }
                ]
            };
            
            res.status(200).json(mockFix);
        } catch (error) {
            logger.error('Error in getFixForIssue endpoint:', error);
            
            res.status(500).json({
                success: false,
                error: error.message || 'Internal server error'
            });
        }
    }
    
    /**
     * Apply fix for issue
     */
    public async applyFix(req: Request, res: Response): Promise<void> {
        try {
            const issueId = req.params.id;
            
            logger.info(`Received request to apply fix for issue ${issueId}`);
            
            // In a real implementation, this would modify files or apply changes
            // For this example, we'll return a mock response
            const mockResult = {
                success: true,
                message: 'Fix applied successfully',
                appliedChanges: 1
            };
            
            res.status(200).json(mockResult);
        } catch (error) {
            logger.error('Error in applyFix endpoint:', error);
            
            res.status(500).json({
                success: false,
                error: error.message || 'Internal server error'
            });
        }
    }
}

// Export singleton instance
export const analysisController = new AnalysisController();