import { Insight, AnalysisContext } from '../../shared/types/insights';

/**
 * Interface for AI agent analysis results
 */
export interface AnalysisResult {
    agentName: string;
    insights: Insight[];
    metadata?: any;
}

/**
 * Interface for AI agent
 */
export interface Agent {
    analyze(context: AnalysisContext): Promise<AnalysisResult>;
}