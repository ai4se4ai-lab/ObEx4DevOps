import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Insight, InsightLevel } from '../../../../shared/types/insights';

/**
 * Handles loading and filling HTML templates for OBEX panels
 */
export class TemplateLoader {
    private readonly _extensionPath: string;
    private _templateCache: Map<string, string> = new Map();
    
    constructor(extensionPath: string) {
        this._extensionPath = extensionPath;
    }
    
    /**
     * Get the main panel HTML
     */
    public getMainPanelHtml(
        insights: Insight[], 
        currentLevel: InsightLevel,
        groupedInsights: Record<string, Insight[]>, 
        categoryCounts: Record<string, { high: number, medium: number, low: number, total: number }>
    ): string {
        // Filter insights by current level
        const filteredInsights = insights.filter(insight => insight.level === currentLevel);
        
        // Count insights by severity
        const counts = {
            high: filteredInsights.filter(i => i.severity === 'high').length,
            medium: filteredInsights.filter(i => i.severity === 'medium').length,
            low: filteredInsights.filter(i => i.severity === 'low').length,
            total: filteredInsights.length
        };
        
        // Generate categories HTML
        const categoriesHtml = this._generateCategoriesHtml(groupedInsights, categoryCounts);
        
        // Load and fill main panel template
        const mainTemplate = this._loadTemplate('mainPanel.html');
        return this._fillTemplate(mainTemplate, {
            currentLevel,
            counts,
            insights,
            filteredInsights,
            categoriesHtml
        });
    }
    
    /**
     * Get the explanation panel HTML
     */
    public getExplanationHtml(insight: Insight): string {
        // Generate recommendations HTML
        const recommendationsHtml = insight.recommendations
            .map(rec => `<li>${rec}</li>`)
            .join('');
        
        // Generate evidence HTML
        const evidenceHtml = insight.evidence
            .map(ev => `
                <div class="evidence-item">
                    <h3>${ev.type}</h3>
                    <p>${ev.description}</p>
                    ${ev.source ? `<div><strong>Source:</strong> ${ev.source}</div>` : ''}
                    ${ev.location ? `
                        <div class="location" onclick="openFile('${ev.location.file}', ${ev.location.line})">
                            <i class="codicon codicon-go-to-file"></i>
                            ${ev.location.file}:${ev.location.line}
                        </div>
                    ` : ''}
                </div>
            `)
            .join('');
        
        // Format explanation text with line breaks
        const explanation = insight.explanation.replace(/\n/g, '<br/>');
        
        // Load and fill explanation panel template
        const template = this._loadTemplate('explanationPanel.html');
        return this._fillTemplate(template, {
            id: insight.id,
            title: insight.title,
            summary: insight.summary,
            explanation,
            severity: insight.severity.toLowerCase(),
            confidence: insight.confidence,
            level: insight.level,
            category: insight.category,
            location: insight.location,
            fixable: insight.fixable,
            recommendationsHtml,
            evidenceHtml
        });
    }
    
    /**
     * Generate HTML for categories
     */
    private _generateCategoriesHtml(
        groupedInsights: Record<string, Insight[]>, 
        categoryCounts: Record<string, { high: number, medium: number, low: number, total: number }>
    ): string {
        // Sort categories to show high severity first
        const sortedCategories = Object.keys(groupedInsights).sort((a, b) => {
            if (categoryCounts[a].high !== categoryCounts[b].high) {
                return categoryCounts[b].high - categoryCounts[a].high;
            }
            if (categoryCounts[a].medium !== categoryCounts[b].medium) {
                return categoryCounts[b].medium - categoryCounts[a].medium;
            }
            return categoryCounts[b].total - categoryCounts[a].total;
        });
        
        // Generate HTML for each category
        return sortedCategories.map(category => {
            const insights = groupedInsights[category];
            const counts = categoryCounts[category];
            
            // Generate HTML for insights in this category
            const insightsHtml = insights.map(insight => this._generateInsightHtml(insight)).join('');
            
            // Load and fill category template
            const template = this._loadTemplate('category.html');
            return this._fillTemplate(template, {
                category,
                highCount: counts.high,
                mediumCount: counts.medium,
                lowCount: counts.low,
                insightsHtml
            });
        }).join('');
    }
    
    /**
     * Generate HTML for a single insight
     */
    private _generateInsightHtml(insight: Insight): string {
        // Get file name from path if location is available
        const locationDisplay = insight.location 
            ? path.basename(insight.location.file) + ':' + insight.location.line
            : '';
        
        // Get severity initial
        const severityInitial = insight.severity.charAt(0).toUpperCase();
        
        // Load and fill insight template
        const template = this._loadTemplate('insightItem.html');
        return this._fillTemplate(template, {
            id: insight.id,
            title: insight.title,
            summary: insight.summary,
            severity: insight.severity.toLowerCase(),
            severityInitial,
            confidence: insight.confidence,
            location: insight.location,
            locationDisplay,
            fixable: insight.fixable
        });
    }
    
    /**
     * Load template from file
     */
    private _loadTemplate(templateName: string): string {
        // Check cache first
        if (this._templateCache.has(templateName)) {
            return this._templateCache.get(templateName)!;
        }
        
        // Load template from file
        const templatePath = path.join(this._extensionPath, 'src', 'ui', 'templates', templateName);
        try {
            const template = fs.readFileSync(templatePath, 'utf8');
            
            // Cache template
            this._templateCache.set(templateName, template);
            
            return template;
        } catch (error) {
            console.error(`Error loading template ${templateName}:`, error);
            
            // Return fallback template on error
            return this._getFallbackTemplate(templateName);
        }
    }
    
    /**
     * Get fallback template in case the file cannot be loaded
     */
    private _getFallbackTemplate(templateName: string): string {
        switch (templateName) {
            case 'mainPanel.html':
                return `<!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>OBEX Insights</title>
                    <style>
                        body { font-family: var(--vscode-font-family); padding: 20px; }
                        .error { color: var(--vscode-errorForeground); }
                    </style>
                </head>
                <body>
                    <h1>OBEX Insights</h1>
                    <div class="error">
                        <p>Error: Could not load template file 'mainPanel.html'</p>
                        <p>Please ensure the extension is installed correctly.</p>
                    </div>
                    <button id="refresh-button">Refresh</button>
                    <script>
                        document.getElementById('refresh-button').addEventListener('click', () => {
                            const vscode = acquireVsCodeApi();
                            vscode.postMessage({ command: 'refresh' });
                        });
                    </script>
                </body>
                </html>`;
                
            case 'explanationPanel.html':
                return `<!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>OBEX Explanation</title>
                    <style>
                        body { font-family: var(--vscode-font-family); padding: 20px; }
                        .error { color: var(--vscode-errorForeground); }
                    </style>
                </head>
                <body>
                    <h1>Insight Explanation</h1>
                    <div class="error">
                        <p>Error: Could not load template file 'explanationPanel.html'</p>
                        <p>Please ensure the extension is installed correctly.</p>
                    </div>
                </body>
                </html>`;
                
            case 'category.html':
                return `<div>
                    <h2>${category}</h2>
                    <div>${insightsHtml}</div>
                </div>`;
                
            case 'insightItem.html':
                return `<div>
                    <h3>${title}</h3>
                    <p>${summary}</p>
                </div>`;
                
            default:
                return `<div class="error">Template '${templateName}' not found</div>`;
        }
    }
    
    /**
     * Fill template with variables
     */
    private _fillTemplate(template: string, variables: Record<string, any>): string {
        // Replace template variables with actual values
        let result = template;
        
        for (const [key, value] of Object.entries(variables)) {
            // Skip if value is undefined
            if (value === undefined) {
                continue;
            }
            
            // Replace ${key} with value
            const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
            
            // Handle different value types
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                result = result.replace(regex, String(value));
            } else if (value === null) {
                result = result.replace(regex, '');
            } else if (typeof value === 'object') {
                // For objects, we do nothing here - object properties should be explicitly accessed in templates
                // This avoids JSON stringifying complex objects and breaking the template
            }
        }
        
        // Handle conditional sections using <!-- if condition -->...<!-- endif -->
        result = this._processConditionals(result, variables);
        
        // Handle loops using <!-- foreach items as item -->...<!-- endforeach -->
        result = this._processLoops(result, variables);
        
        return result;
    }
    
    /**
     * Process conditional sections in template
     */
    private _processConditionals(template: string, variables: Record<string, any>): string {
        // Match if statements: <!-- if condition -->...<!-- endif -->
        const ifRegex = /<!-- if (.+?) -->(.+?)<!-- endif -->/gs;
        
        let result = template;
        let match;
        
        // Replace all if statements
        while ((match = ifRegex.exec(result)) !== null) {
            const condition = match[1].trim();
            const content = match[2];
            const fullMatch = match[0];
            
            // Evaluate condition
            let conditionMet = false;
            try {
                // Create a function that evaluates the condition with the variables in scope
                const keys = Object.keys(variables);
                const values = Object.values(variables);
                
                // Simple cases
                if (condition.includes('===')) {
                    const [left, right] = condition.split('===').map(s => s.trim());
                    conditionMet = variables[left] === variables[right] || 
                                  variables[left] === right || 
                                  left === variables[right];
                } else if (condition.includes('!==')) {
                    const [left, right] = condition.split('!==').map(s => s.trim());
                    conditionMet = variables[left] !== variables[right] && 
                                  variables[left] !== right && 
                                  left !== variables[right];
                } else if (condition.includes('==')) {
                    const [left, right] = condition.split('==').map(s => s.trim());
                    // eslint-disable-next-line eqeqeq
                    conditionMet = variables[left] == variables[right] || 
                                 // eslint-disable-next-line eqeqeq
                                 variables[left] == right || 
                                 // eslint-disable-next-line eqeqeq
                                 left == variables[right];
                } else if (condition.includes('!=')) {
                    const [left, right] = condition.split('!=').map(s => s.trim());
                    // eslint-disable-next-line eqeqeq
                    conditionMet = variables[left] != variables[right] && 
                                 // eslint-disable-next-line eqeqeq
                                 variables[left] != right && 
                                 // eslint-disable-next-line eqeqeq
                                 left != variables[right];
                } else if (condition.includes('>')) {
                    const [left, right] = condition.split('>').map(s => s.trim());
                    conditionMet = (variables[left] || Number(left)) > (variables[right] || Number(right));
                } else if (condition.includes('<')) {
                    const [left, right] = condition.split('<').map(s => s.trim());
                    conditionMet = (variables[left] || Number(left)) < (variables[right] || Number(right));
                } else if (condition.includes('>=')) {
                    const [left, right] = condition.split('>=').map(s => s.trim());
                    conditionMet = (variables[left] || Number(left)) >= (variables[right] || Number(right));
                } else if (condition.includes('<=')) {
                    const [left, right] = condition.split('<=').map(s => s.trim());
                    conditionMet = (variables[left] || Number(left)) <= (variables[right] || Number(right));
                } else {
                    // Simple variable or negation
                    if (condition.startsWith('!')) {
                        const varName = condition.substring(1).trim();
                        conditionMet = !variables[varName];
                    } else {
                        conditionMet = !!variables[condition];
                    }
                }
            } catch (e) {
                console.error(`Error evaluating condition: ${condition}`, e);
                conditionMet = false;
            }
            
            // Replace if statement with content or empty string
            result = result.replace(fullMatch, conditionMet ? content : '');
        }
        
        return result;
    }
    
    /**
     * Process loops in template
     */
    private _processLoops(template: string, variables: Record<string, any>): string {
        // Match foreach loops: <!-- foreach items as item -->...<!-- endforeach -->
        const foreachRegex = /<!-- foreach (.+?) as (.+?) -->(.+?)<!-- endforeach -->/gs;
        
        let result = template;
        let match;
        
        // Replace all foreach statements
        while ((match = foreachRegex.exec(result)) !== null) {
            const itemsName = match[1].trim();
            const itemName = match[2].trim();
            const content = match[3];
            const fullMatch = match[0];
            
            // Get items to iterate over
            const items = variables[itemsName] || [];
            
            if (!Array.isArray(items)) {
                // Skip if items is not an array
                result = result.replace(fullMatch, '');
                continue;
            }
            
            // Generate content for each item
            const generatedContent = items.map(item => {
                // Create a scope with the current item
                const itemScope = { ...variables, [itemName]: item };
                
                // Replace variables in content
                return this._fillTemplate(content, itemScope);
            }).join('');
            
            // Replace foreach statement with generated content
            result = result.replace(fullMatch, generatedContent);
        }
        
        return result;
    }
}