import * as vscode from 'vscode';
import { ApiClient } from '../../api/client';

/**
 * Tree data provider for OBEX insights at different scopes
 */
class ObexTreeDataProvider implements vscode.TreeDataProvider<InsightTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<InsightTreeItem | undefined | void> = new vscode.EventEmitter<InsightTreeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<InsightTreeItem | undefined | void> = this._onDidChangeTreeData.event;
    
    private insights: Map<string, any[]> = new Map();
    private refreshInterval: NodeJS.Timeout | null = null;
    private viewType: 'micro' | 'meso' | 'macro';
    
    constructor(
        private apiClient: ApiClient,
        viewType: 'micro' | 'meso' | 'macro'
    ) {
        this.viewType = viewType;
        
        // Setup periodic refresh (every 30 seconds)
        this.refreshInterval = setInterval(() => this.refresh(), 30000);
        
        // Initial fetch
        this.fetchInsights();
    }
    
    dispose() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
    
    async refresh(): Promise<void> {
        await this.fetchInsights();
        this._onDidChangeTreeData.fire();
    }
    
    private async fetchInsights(): Promise<void> {
        try {
            const response = await this.apiClient.getInsightsByLevel(this.viewType);
            this.insights.set(this.viewType, response.items || []);
        } catch (error) {
            console.error(`Error fetching ${this.viewType} insights:`, error);
            this.insights.set(this.viewType, []);
        }
    }
    
    getTreeItem(element: InsightTreeItem): vscode.TreeItem {
        return element;
    }
    
    async getChildren(element?: InsightTreeItem): Promise<InsightTreeItem[]> {
        if (element) {
            // Child items for a specific category
            return element.children || [];
        } else {
            // Root level items (categories)
            const insights = this.insights.get(this.viewType) || [];
            
            // Group insights by category
            const categories = new Map<string, any[]>();
            
            for (const insight of insights) {
                const category = insight.category || 'General';
                if (!categories.has(category)) {
                    categories.set(category, []);
                }
                categories.get(category)?.push(insight);
            }
            
            // Create tree items for each category
            const items: InsightTreeItem[] = [];
            
            for (const [category, categoryInsights] of categories.entries()) {
                // Count insights by severity
                const severityCounts = {
                    high: 0,
                    medium: 0,
                    low: 0
                };
                
                // Create child items
                const children: InsightTreeItem[] = [];
                
                for (const insight of categoryInsights) {
                    // Update severity counts
                    const severity = insight.severity.toLowerCase();
                    if (severity === 'high' || severity === 'medium' || severity === 'low') {
                        severityCounts[severity]++;
                    }
                    
                    // Create tree item for this insight
                    children.push(new InsightTreeItem(
                        insight.title,
                        vscode.TreeItemCollapsibleState.None,
                        {
                            command: 'obex.viewInsight',
                            title: 'View Insight',
                            arguments: [insight.id]
                        },
                        this.getIconForSeverity(severity),
                        insight.summary,
                        []
                    ));
                }
                
                // Determine category icon based on highest severity
                let categoryIcon = '';
                if (severityCounts.high > 0) {
                    categoryIcon = 'warning-high';
                } else if (severityCounts.medium > 0) {
                    categoryIcon = 'warning-medium';
                } else if (severityCounts.low > 0) {
                    categoryIcon = 'info';
                }
                
                // Create summary description
                const description = [
                    severityCounts.high > 0 ? `${severityCounts.high} high` : null,
                    severityCounts.medium > 0 ? `${severityCounts.medium} medium` : null,
                    severityCounts.low > 0 ? `${severityCounts.low} low` : null
                ].filter(Boolean).join(', ');
                
                // Add category item with children
                items.push(new InsightTreeItem(
                    category,
                    vscode.TreeItemCollapsibleState.Expanded,
                    undefined,
                    categoryIcon,
                    description,
                    children
                ));
            }
            
            return items;
        }
    }
    
    private getIconForSeverity(severity: string): string {
        switch (severity.toLowerCase()) {
            case 'high':
                return 'warning-high';
            case 'medium':
                return 'warning-medium';
            case 'low':
            default:
                return 'info';
        }
    }
}

/**
 * Tree item class for insights
 */
class InsightTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command,
        iconName?: string,
        description?: string,
        public readonly children?: InsightTreeItem[]
    ) {
        super(label, collapsibleState);
        
        this.description = description;
        
        if (iconName) {
            this.iconPath = {
                light: vscode.Uri.parse(`resource:resources/${iconName}-light.svg`),
                dark: vscode.Uri.parse(`resource:resources/${iconName}-dark.svg`)
            };
        }
    }
}

/**
 * Register tree views for all levels
 */
export function registerTreeViews(
    context: vscode.ExtensionContext,
    apiClient: ApiClient
): void {
    // Create tree data providers for each level
    const microProvider = new ObexTreeDataProvider(apiClient, 'micro');
    const mesoProvider = new ObexTreeDataProvider(apiClient, 'meso');
    const macroProvider = new ObexTreeDataProvider(apiClient, 'macro');
    
    // Register tree views
    const microTreeView = vscode.window.createTreeView('obex-micro', {
        treeDataProvider: microProvider,
        showCollapseAll: true
    });
    
    const mesoTreeView = vscode.window.createTreeView('obex-meso', {
        treeDataProvider: mesoProvider,
        showCollapseAll: true
    });
    
    const macroTreeView = vscode.window.createTreeView('obex-macro', {
        treeDataProvider: macroProvider,
        showCollapseAll: true
    });
    
    // Register command to view insight details
    const viewInsightCommand = vscode.commands.registerCommand(
        'obex.viewInsight',
        (insightId: string) => {
            vscode.commands.executeCommand('obex.showPanel');
            // The panel will handle showing the specific insight
            vscode.commands.executeCommand('obex.showInsightDetails', insightId);
        }
    );
    
    // Register refresh commands
    const refreshMicroCommand = vscode.commands.registerCommand(
        'obex.refreshMicro',
        () => microProvider.refresh()
    );
    
    const refreshMesoCommand = vscode.commands.registerCommand(
        'obex.refreshMeso',
        () => mesoProvider.refresh()
    );
    
    const refreshMacroCommand = vscode.commands.registerCommand(
        'obex.refreshMacro',
        () => macroProvider.refresh()
    );
    
    // Add to context subscriptions
    context.subscriptions.push(
        microTreeView,
        mesoTreeView,
        macroTreeView,
        viewInsightCommand,
        refreshMicroCommand,
        refreshMesoCommand,
        refreshMacroCommand,
        { dispose: () => microProvider.dispose() },
        { dispose: () => mesoProvider.dispose() },
        { dispose: () => macroProvider.dispose() }
    );
}