import * as vscode from 'vscode';
import * as path from 'path';
import { ApiClient } from '../../api/client';
import { Insight, InsightLevel } from '../../../../shared/types/insights';
import { TemplateLoader } from '../templates/templateLoader';

/**
 * WebviewPanel that displays OBEX insights and explanations
 */
export class ObexPanel {
    public static currentPanel: ObexPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _templateLoader: TemplateLoader;
    private _disposables: vscode.Disposable[] = [];
    private _apiClient: ApiClient;
    private _insights: Insight[] = [];
    private _currentLevel: InsightLevel = 'micro';

    /**
     * Create or show the OBEX panel
     */
    public static createOrShow(extensionUri: vscode.Uri, apiClient: ApiClient): ObexPanel {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : vscode.ViewColumn.One;

        // If we already have a panel, show it
        if (ObexPanel.currentPanel) {
            ObexPanel.currentPanel._panel.reveal(column);
            return ObexPanel.currentPanel;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            'obexPanel',
            'OBEX Insights',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media'),
                    vscode.Uri.joinPath(extensionUri, 'src', 'ui', 'templates')
                ],
                retainContextWhenHidden: true
            }
        );

        ObexPanel.currentPanel = new ObexPanel(panel, extensionUri, apiClient);
        return ObexPanel.currentPanel;
    }

    /**
     * Private constructor to instantiate the panel
     */
    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        apiClient: ApiClient
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._apiClient = apiClient;
        this._templateLoader = new TemplateLoader(extensionUri.fsPath);

        // Set the webview's initial html content
        this._updateWebview();

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Update the content when the panel becomes visible again
        this._panel.onDidChangeViewState(
            e => {
                if (this._panel.visible) {
                    this._updateWebview();
                }
            },
            null,
            this._disposables
        );

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'refresh':
                        await this._fetchInsights();
                        break;
                    case 'openFile':
                        if (message.file && message.line) {
                            this._openFileAtLocation(message.file, message.line);
                        }
                        break;
                    case 'fixIssue':
                        if (message.issueId) {
                            this._applyFix(message.issueId);
                        }
                        break;
                    case 'viewExplanation':
                        if (message.insightId) {
                            this._showDetailedExplanation(message.insightId);
                        }
                        break;
                    case 'changeLevel':
                        if (message.level && ['micro', 'meso', 'macro'].includes(message.level)) {
                            this._currentLevel = message.level as InsightLevel;
                            this._updateWebview();
                        }
                        break;
                }
            },
            null,
            this._disposables
        );

        // Initial fetch of insights
        this._fetchInsights();
    }

    /**
     * Clean up resources when panel is closed
     */
    public dispose() {
        ObexPanel.currentPanel = undefined;

        // Clean up resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    /**
     * Show insight details for a specific ID
     */
    public showInsightDetails(insightId: string): void {
        const insight = this._insights.find(i => i.id === insightId);
        if (insight) {
            this._showDetailedExplanation(insightId);
        } else {
            // Try to fetch the specific insight
            this._fetchInsightDetails(insightId);
        }
    }

    /**
     * Fetch insights from the API
     */
    private async _fetchInsights(): Promise<void> {
        try {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Fetching OBEX insights...",
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0 });
                
                // Fetch insights for current level
                const response = await this._apiClient.getInsightsByLevel(this._currentLevel);
                
                if (response && response.items) {
                    this._insights = response.items;
                } else {
                    this._insights = [];
                }
                
                progress.report({ increment: 100 });
                this._updateWebview();
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to fetch insights: ${error.message}`);
            this._insights = [];
            this._updateWebview();
        }
    }

    /**
     * Fetch details for a specific insight
     */
    private async _fetchInsightDetails(insightId: string): Promise<void> {
        try {
            // This would be implemented to fetch a specific insight by ID
            // For now, we'll show a message that it's not available
            vscode.window.showInformationMessage(`Insight details not available for ID: ${insightId}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to fetch insight details: ${error.message}`);
        }
    }

    /**
     * Update the webview content
     */
    private _updateWebview(): void {
        if (!this._panel.visible) {
            return;
        }

        // Group insights by category
        const groupedInsights: Record<string, Insight[]> = {};
        const filteredInsights = this._insights.filter(insight => insight.level === this._currentLevel);
        
        filteredInsights.forEach(insight => {
            const category = insight.category || 'General';
            if (!groupedInsights[category]) {
                groupedInsights[category] = [];
            }
            groupedInsights[category].push(insight);
        });
        
        // Count insights by severity for each category
        const categoryCounts: Record<string, { high: number, medium: number, low: number, total: number }> = {};
        for (const category in groupedInsights) {
            categoryCounts[category] = { high: 0, medium: 0, low: 0, total: 0 };
            groupedInsights[category].forEach(insight => {
                categoryCounts[category].total++;
                if (insight.severity === 'high') categoryCounts[category].high++;
                if (insight.severity === 'medium') categoryCounts[category].medium++;
                if (insight.severity === 'low') categoryCounts[category].low++;
            });
        }

        // Get HTML from template loader
        this._panel.webview.html = this._templateLoader.getMainPanelHtml(
            this._insights, 
            this._currentLevel, 
            groupedInsights, 
            categoryCounts
        );
    }

    /**
     * Open a file at a specific line
     */
    private async _openFileAtLocation(filePath: string, line: number): Promise<void> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error("No workspace folder open");
            }
            
            // Try to resolve the path relative to workspace root
            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            const absolutePath = filePath.startsWith('/') 
                ? filePath 
                : vscode.Uri.joinPath(workspaceFolders[0].uri, filePath).fsPath;
            
            const document = await vscode.workspace.openTextDocument(absolutePath);
            const editor = await vscode.window.showTextDocument(document);
            
            // Ensure line is within bounds
            const lineNumber = Math.min(Math.max(line - 1, 0), document.lineCount - 1);
            
            const range = editor.document.lineAt(lineNumber).range;
            editor.selection = new vscode.Selection(range.start, range.end);
            editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open file: ${error.message}`);
        }
    }

    /**
     * Apply an automated fix for an issue
     */
    private async _applyFix(issueId: string): Promise<void> {
        try {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Getting fix details...",
                cancellable: false
            }, async (progress) => {
                const fix = await this._apiClient.getFixForIssue(issueId);
                
                if (!fix.applicable) {
                    vscode.window.showInformationMessage(
                        'No automated fix is available for this issue.'
                    );
                    return;
                }
                
                // Ask for confirmation before applying the fix
                const apply = 'Apply Fix';
                const viewChanges = 'View Changes';
                const response = await vscode.window.showInformationMessage(
                    `Apply fix for issue: ${fix.description}?`,
                    apply,
                    viewChanges,
                    'Cancel'
                );
                
                if (response === viewChanges) {
                    // Show diff between old and new code
                    this._showFixDiff(fix);
                    return;
                }
                
                if (response === apply) {
                    progress.report({ message: "Applying fix..." });
                    
                    // Apply the fix and report success/failure
                    const result = await this._apiClient.applyFix(issueId);
                    if (result.success) {
                        vscode.window.showInformationMessage('Fix applied successfully.');
                        this._fetchInsights(); // Refresh insights
                    } else {
                        vscode.window.showErrorMessage(`Failed to apply fix: ${result.error}`);
                    }
                }
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Error applying fix: ${error.message}`);
        }
    }

    /**
     * Show diff for a fix
     */
    private _showFixDiff(fix: any): void {
        if (!fix.changes || fix.changes.length === 0) {
            vscode.window.showInformationMessage('No changes available to preview.');
            return;
        }
        
        // Create a temporary untitled document to show the diff
        vscode.workspace.openTextDocument({ 
            content: this._generateDiffContent(fix),
            language: 'diff'
        }).then(document => {
            vscode.window.showTextDocument(document);
        });
    }
    
    /**
     * Generate diff content for the fix preview
     */
    private _generateDiffContent(fix: any): string {
        let content = `Fix for: ${fix.description}\n\n`;
        
        fix.changes.forEach((change: any, index: number) => {
            content += `--- a/${fix.location?.file || 'unknown-file'}\n`;
            content += `+++ b/${fix.location?.file || 'unknown-file'}\n`;
            content += `@@ -${fix.location?.line || 0},1 +${fix.location?.line || 0},1 @@\n`;
            content += `- ${change.oldCode}\n`;
            content += `+ ${change.newCode}\n\n`;
            
            if (change.description) {
                content += `# ${change.description}\n\n`;
            }
        });
        
        return content;
    }

    /**
     * Show detailed explanation for an insight
     */
    private _showDetailedExplanation(insightId: string): void {
        // Find the insight by ID
        const insight = this._insights.find(item => item.id === insightId);
        if (!insight) {
            vscode.window.showInformationMessage(`Insight not found: ${insightId}`);
            return;
        }
        
        // Show the detailed explanation in a new webview panel
        const panel = vscode.window.createWebviewPanel(
            'obexExplanation',
            `Explanation: ${insight.title}`,
            vscode.ViewColumn.Beside,
            { 
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );
        
        // Get HTML from template loader
        panel.webview.html = this._templateLoader.getExplanationHtml(insight);
        
        // Handle messages from the explanation webview
        panel.webview.onDidReceiveMessage(async message => {
            switch (message.command) {
                case 'openFile':
                    if (message.file && message.line) {
                        this._openFileAtLocation(message.file, message.line);
                    }
                    break;
                case 'fixIssue':
                    if (message.issueId) {
                        this._applyFix(message.issueId);
                    }
                    break;
            }
        });
    }
}