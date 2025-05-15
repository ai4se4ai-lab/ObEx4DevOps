import * as vscode from 'vscode';
import * as path from 'path';
import { ContextAggregator } from '../context/aggregator';
import { ApiClient } from '../api/client';
import { gitExec, getCurrentBranch } from '../utils/git';

/**
 * Listens for Git branch operations and triggers analysis
 */
export class BranchOperationListener implements vscode.Disposable {
    private disposables: vscode.Disposable[] = [];
    private currentBranch: string | null = null;
    private watcherDisposable: vscode.Disposable | null = null;
    
    constructor(
        private contextAggregator: ContextAggregator,
        private apiClient: ApiClient
    ) {
        // Get initial branch
        this.updateCurrentBranch();
        
        // Setup git folder watcher for the active workspace
        this.setupGitWatcher();
        
        // Listen for window state changes to refresh git status
        this.disposables.push(
            vscode.window.onDidChangeWindowState(this.onWindowStateChanged.bind(this))
        );
        
        // Listen for workspace folder changes
        this.disposables.push(
            vscode.workspace.onDidChangeWorkspaceFolders(this.onWorkspaceFoldersChanged.bind(this))
        );
    }
    
    /**
     * Setup watcher for .git directory changes
     */
    private setupGitWatcher(): void {
        // Clean up existing watcher
        if (this.watcherDisposable) {
            this.watcherDisposable.dispose();
            this.watcherDisposable = null;
        }
        
        // Get workspace folder
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return;
        }
        
        const workspaceFolder = workspaceFolders[0].uri.fsPath;
        const gitDirPath = path.join(workspaceFolder, '.git');
        
        // Create a file system watcher for HEAD and refs changes
        const headWatcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(gitDirPath, 'HEAD')
        );
        
        const refsWatcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(gitDirPath, 'refs/heads/**')
        );
        
        // Watch for changes
        headWatcher.onDidChange(this.onGitChanged.bind(this));
        refsWatcher.onDidChange(this.onGitChanged.bind(this));
        refsWatcher.onDidCreate(this.onGitChanged.bind(this));
        refsWatcher.onDidDelete(this.onGitChanged.bind(this));
        
        // Create composite disposable
        this.watcherDisposable = vscode.Disposable.from(headWatcher, refsWatcher);
        
        // Add to disposables
        this.disposables.push(this.watcherDisposable);
    }
    
    /**
     * Handle git changes (branch switch, merge, etc.)
     */
    private async onGitChanged(uri: vscode.Uri): Promise<void> {
        const previousBranch = this.currentBranch;
        const newBranch = await this.updateCurrentBranch();
        
        // If branch has changed, trigger analysis
        if (previousBranch !== null && newBranch !== null && previousBranch !== newBranch) {
            await this.onBranchChanged(previousBranch, newBranch);
        }
    }
    
    /**
     * Handle branch change event
     */
    private async onBranchChanged(previousBranch: string, newBranch: string): Promise<void> {
        try {
            console.log(`OBEX: Branch changed from "${previousBranch}" to "${newBranch}"`);
            
            // Get current context
            const context = await this.contextAggregator.gatherContext({
                previousBranch,
                newBranch,
                eventType: 'branchChange'
            });
            
            // Request analysis from the API
            await this.apiClient.requestAnalysis(context);
            
            // Show notification
            this.showBranchChangeNotification(previousBranch, newBranch);
        } catch (error) {
            console.error('Error handling branch change:', error);
        }
    }
    
    /**
     * Update current branch and return it
     */
    private async updateCurrentBranch(): Promise<string | null> {
        try {
            // Get workspace folder
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                this.currentBranch = null;
                return null;
            }
            
            const workspaceFolder = workspaceFolders[0].uri.fsPath;
            
            // Get current branch
            const branchName = await getCurrentBranch(workspaceFolder);
            
            // Update current branch
            this.currentBranch = branchName;
            
            return branchName;
        } catch (error) {
            console.error('Error updating current branch:', error);
            return null;
        }
    }
    
    /**
     * Handle window state changes (focus, etc.)
     */
    private async onWindowStateChanged(e: vscode.WindowState): Promise<void> {
        if (e.focused) {
            // Check for branch changes when window gets focus
            const previousBranch = this.currentBranch;
            const newBranch = await this.updateCurrentBranch();
            
            if (previousBranch !== null && newBranch !== null && previousBranch !== newBranch) {
                await this.onBranchChanged(previousBranch, newBranch);
            }
        }
    }
    
    /**
     * Handle workspace folder changes
     */
    private onWorkspaceFoldersChanged(): void {
        // Reset current branch
        this.currentBranch = null;
        
        // Update watchers for new workspace
        this.setupGitWatcher();
        
        // Update current branch
        this.updateCurrentBranch();
    }
    
    /**
     * Show branch change notification
     */
    private showBranchChangeNotification(previousBranch: string, newBranch: string): void {
        const message = `Switched from branch "${previousBranch}" to "${newBranch}"`;
        
        // Create status bar item
        const statusBar = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        statusBar.text = `OBEX: ${message}`;
        statusBar.tooltip = 'OBEX is analyzing branch change impacts';
        statusBar.command = 'obex.showPanel';
        statusBar.show();
        
        // Hide after 5 seconds
        setTimeout(() => {
            statusBar.dispose();
        }, 5000);
        
        // Show info message with "Show Insights" button
        const showInsights = 'Show Insights';
        vscode.window.showInformationMessage(
            `OBEX: ${message}. Analysis in progress...`,
            showInsights
        ).then(selection => {
            if (selection === showInsights) {
                vscode.commands.executeCommand('obex.showPanel');
            }
        });
    }
    
    dispose(): void {
        // Clean up all disposables
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        
        if (this.watcherDisposable) {
            this.watcherDisposable.dispose();
        }
    }
}