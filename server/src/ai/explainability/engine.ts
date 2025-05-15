import { Insight, AnalysisContext } from '../../../../shared/types/insights';
import { logger } from '../../utils/logger';

/**
 * Enhances AI-generated insights with human-readable explanations
 */
export class ExplainabilityEngine {
    /**
     * Enhance explanations for insights
     */
    public async enhanceExplanations(insights: Insight[], context: AnalysisContext): Promise<Insight[]> {
        logger.info(`Enhancing explanations for ${insights.length} insights`);
        
        // Process each insight
        const enhancedInsights = await Promise.all(
            insights.map(insight => this.enhanceInsight(insight, context))
        );
        
        return enhancedInsights;
    }
    
    /**
     * Enhance a single insight
     */
    private async enhanceInsight(insight: Insight, context: AnalysisContext): Promise<Insight> {
        try {
            // Create a copy of the insight to avoid mutating the original
            const enhanced: Insight = { ...insight };
            
            // Apply enhancement strategies based on insight category
            switch (insight.category) {
                case 'Security':
                    this.enhanceSecurityInsight(enhanced, context);
                    break;
                case 'Efficiency':
                    this.enhanceEfficiencyInsight(enhanced, context);
                    break;
                case 'Maintenance':
                    this.enhanceMaintenanceInsight(enhanced, context);
                    break;
                default:
                    // Apply general enhancement for other categories
                    this.enhanceGeneralInsight(enhanced, context);
                    break;
            }
            
            // Add contextual relevance explanations
            this.addContextualRelevance(enhanced, context);
            
            // Add potential impact section to explanation if not already present
            if (!enhanced.explanation.includes('Potential impact:')) {
                enhanced.explanation += this.generateImpactExplanation(enhanced);
            }
            
            // Add confidence reasoning if high confidence
            if (enhanced.confidence > 90 && !enhanced.explanation.includes('Confidence:')) {
                enhanced.explanation += this.generateConfidenceExplanation(enhanced);
            }
            
            return enhanced;
        } catch (error) {
            logger.error(`Error enhancing insight ${insight.id}:`, error);
            // Return original insight if enhancement fails
            return insight;
        }
    }
    
    /**
     * Enhance security-related insights
     */
    private enhanceSecurityInsight(insight: Insight, context: AnalysisContext): void {
        // Add security severity context
        switch (insight.severity) {
            case 'high':
                insight.explanation += `\n\nThis is classified as a high severity security concern because it could potentially lead to unauthorized access, code execution, or data exposure if exploited.`;
                break;
            case 'medium':
                insight.explanation += `\n\nThis is classified as a medium severity security concern because it represents a security weakness that could be exploited under specific circumstances or requires additional factors to become a critical vulnerability.`;
                break;
            case 'low':
                insight.explanation += `\n\nThis is classified as a low severity security concern. While it follows security best practices to address this issue, the risk of exploitation is limited.`;
                break;
        }
        
        // Add OWASP reference if applicable
        if (insight.title.includes('injection') || insight.explanation.includes('injection')) {
            insight.explanation += `\n\nThis issue relates to the OWASP category "Injection", which is a common security vulnerability where untrusted data is sent to an interpreter as part of a command or query.`;
        } else if (insight.title.includes('permission') || insight.explanation.includes('permission')) {
            insight.explanation += `\n\nThis issue relates to the principle of least privilege, a core security concept that recommends providing only the minimum access rights necessary to perform required functions.`;
        }
    }
    
    /**
     * Enhance efficiency-related insights
     */
    private enhanceEfficiencyInsight(insight: Insight, context: AnalysisContext): void {
        // Add efficiency impact context
        switch (insight.severity) {
            case 'high':
                insight.explanation += `\n\nThis efficiency issue may significantly impact your workflow performance, potentially adding minutes to your build times or consuming excessive resources.`;
                break;
            case 'medium':
                insight.explanation += `\n\nThis efficiency issue could moderately impact your workflow performance, potentially adding seconds to your build times or increasing resource consumption.`;
                break;
            case 'low':
                insight.explanation += `\n\nThis efficiency issue has a minor impact on performance but represents an opportunity to optimize your workflow following best practices.`;
                break;
        }
        
        // Add resource usage context if applicable
        if (insight.title.includes('cache') || insight.explanation.includes('cache')) {
            insight.explanation += `\n\nCaching can typically reduce build times by 30-70% for steps that install dependencies, depending on the size of your project and dependencies.`;
        } else if (insight.title.includes('checkout') || insight.explanation.includes('checkout')) {
            insight.explanation += `\n\nOptimizing git checkout operations can save bandwidth and reduce checkout times, especially in repositories with long histories.`;
        }
    }
    
    /**
     * Enhance maintenance-related insights
     */
    private enhanceMaintenanceInsight(insight: Insight, context: AnalysisContext): void {
        // Add maintenance context
        switch (insight.severity) {
            case 'high':
                insight.explanation += `\n\nThis maintenance issue requires prompt attention as it may cause immediate failures or will be incompatible in the near future.`;
                break;
            case 'medium':
                insight.explanation += `\n\nThis maintenance issue should be addressed in your regular update cycle to prevent potential future problems.`;
                break;
            case 'low':
                insight.explanation += `\n\nThis maintenance issue represents a technical debt item that could be addressed when convenient to keep your configurations up-to-date with current best practices.`;
                break;
        }
        
        // Add version context if applicable
        if (insight.title.includes('version') || insight.title.includes('deprecated')) {
            insight.explanation += `\n\nKeeping dependencies and actions up-to-date ensures you benefit from the latest features, performance improvements, and security patches while avoiding compatibility issues when other components are updated.`;
        }
    }
    
    /**
     * Enhance general insights
     */
    private enhanceGeneralInsight(insight: Insight, context: AnalysisContext): void {
        // Add general context based on severity
        switch (insight.severity) {
            case 'high':
                insight.explanation += `\n\nThis issue is categorized as high severity and should be addressed promptly as it may have significant impact on your project.`;
                break;
            case 'medium':
                insight.explanation += `\n\nThis issue is categorized as medium severity and should be addressed as part of your regular maintenance cycle.`;
                break;
            case 'low':
                insight.explanation += `\n\nThis issue is categorized as low severity and represents an opportunity for improvement that can be addressed when convenient.`;
                break;
        }
    }
    
    /**
     * Add contextual relevance explanations
     */
    private addContextualRelevance(insight: Insight, context: AnalysisContext): void {
        // Add context about how this insight relates to the specific project
        if (context.git && context.git.available) {
            // If this is a public repository or has many contributors, emphasize maintenance
            if (context.git.github && context.workspace && context.workspace.package) {
                const packageName = context.workspace.package.name;
                if (packageName) {
                    insight.explanation += `\n\nFor a project like '${packageName}', addressing this issue is particularly important for maintaining a robust CI/CD pipeline.`;
                }
            }
            
            // Add branch-specific context
            if (context.git.branch) {
                const branch = context.git.branch;
                
                if (branch === 'main' || branch === 'master') {
                    insight.explanation += `\n\nSince this was detected on your '${branch}' branch, it may affect all derived branches and your production deployments.`;
                } else if (branch.startsWith('feature/') || branch.includes('feature')) {
                    insight.explanation += `\n\nSince this was detected on a feature branch ('${branch}'), addressing it now will prevent it from being merged into your main branch.`;
                } else if (branch.includes('release')) {
                    insight.explanation += `\n\nThis issue was detected on what appears to be a release branch ('${branch}'). Addressing it is important before finalizing the release.`;
                }
            }
        }
        
        // Add specific context based on the insight level
        switch (insight.level) {
            case 'micro':
                insight.explanation += `\n\nThis local branch-level issue should be addressed before pushing your changes to remote or creating a pull request.`;
                break;
            case 'meso':
                insight.explanation += `\n\nThis integration-level issue may affect how your changes interact with the broader codebase and CI/CD pipeline.`;
                break;
            case 'macro':
                insight.explanation += `\n\nThis production-level issue may impact your deployed applications and services.`;
                break;
        }
    }
    
    /**
     * Generate impact explanation
     */
    private generateImpactExplanation(insight: Insight): string {
        let impact = `\n\nPotential impact: `;
        
        switch (insight.category) {
            case 'Security':
                impact += `This security issue could ${insight.severity === 'high' ? 'significantly compromise' : insight.severity === 'medium' ? 'potentially expose' : 'slightly weaken'} your system's security posture. `;
                break;
            case 'Efficiency':
                impact += `This efficiency issue could ${insight.severity === 'high' ? 'substantially increase' : insight.severity === 'medium' ? 'moderately extend' : 'slightly lengthen'} your build times and resource usage. `;
                break;
            case 'Maintenance':
                impact += `This maintenance issue could ${insight.severity === 'high' ? 'cause immediate failures' : insight.severity === 'medium' ? 'lead to future compatibility problems' : 'contribute to technical debt'} in your project. `;
                break;
            default:
                impact += `Addressing this issue will improve the overall health and reliability of your project. `;
                break;
        }
        
        return impact;
    }
    
    /**
     * Generate confidence explanation
     */
    private generateConfidenceExplanation(insight: Insight): string {
        return `\n\nConfidence: This insight is provided with ${insight.confidence}% confidence based on clearly identified patterns and well-established best practices in the industry.`;
    }
}