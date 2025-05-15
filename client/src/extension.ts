import * as vscode from 'vscode';
import { ObexPanel } from './ui/panels/obexPanel';
import { CodeChangeListener } from './listeners/codeChange';
import { BranchOperationListener } from './listeners/branchOps';
import { BuildTriggerListener } from './listeners/buildTrigger';
import { ContextAggregator } from './context/aggregator';
import { ApiClient } from './api/client';
import { registerTreeViews } from './ui/views/treeViews';
import { registerCodeAnnotations } from './ui/annotations/codeAnnotations';

/**
 * Main activation function for the OBEX extension
 */
export async function activate(context: vscode.ExtensionContext) {
    console.log('OBEX Integration Tool is now active');

    // Initialize components
    const contextAggregator = new ContextAggregator();
    const apiClient = new ApiClient();
    
    // Initialize listeners
    const codeChangeListener = new CodeChangeListener(contextAggregator, apiClient);
    const branchOpListener = new BranchOperationListener(contextAggregator, apiClient);
    const buildTriggerListener = new BuildTriggerListener(contextAggregator, apiClient);
    
    // Register tree views for different scopes
    registerTreeViews(context, apiClient);
    
    // Register code annotations
    const annotationManager = registerCodeAnnotations(context, apiClient);
    
    // Register commands
    const startCommand = vscode.commands.registerCommand('obex.start', () => {
        vscode.window.showInformationMessage('Starting OBEX Analysis...');
        startAnalysis(contextAggregator, apiClient);
    });
    
    const showPanelCommand = vscode.commands.registerCommand('obex.showPanel', () => {
        ObexPanel.createOrShow(context.extensionUri, apiClient);
    });
    
    const configureCommand = vscode.commands.registerCommand('obex.configure', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'obex');
    });
    
    // Register status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(pulse) OBEX";
    statusBarItem.tooltip = "View OBEX integration insights";
    statusBarItem.command = 'obex.showPanel';
    statusBarItem.show();
    
    // Add all disposables to context
    context.subscriptions.push(
        startCommand,
        showPanelCommand,
        configureCommand,
        statusBarItem,
        codeChangeListener,
        branchOpListener,
        buildTriggerListener,
        annotationManager
    );
    
    // Automatically start if enabled in settings
    const config = vscode.workspace.getConfiguration('obex');
    if (config.get('autoStart', true)) {
        startAnalysis(contextAggregator, apiClient);
    }
}

/**
 * Start the OBEX analysis process
 */
async function startAnalysis(
    contextAggregator: ContextAggregator,
    apiClient: ApiClient
) {
    try {
        // Get current context
        const context = await contextAggregator.gatherContext();
        
        // Validate GitHub token
        const config = vscode.workspace.getConfiguration('obex');
        const token = config.get<string>('github.token');
        if (!token) {
            const setToken = 'Set Token';
            const response = await vscode.window.showWarningMessage(
                'GitHub token not configured. OBEX requires a GitHub token to analyze your repository.',
                setToken
            );
            
            if (response === setToken) {
                vscode.commands.executeCommand('obex.configure');
            }
            return;
        }
        
        // Request initial analysis
        const result = await apiClient.requestAnalysis(context);
        
        if (result.success) {
            vscode.window.showInformationMessage('OBEX Analysis complete. View insights in the OBEX panel.');
            ObexPanel.createOrShow(vscode.Uri.parse(''), apiClient);
        } else {
            vscode.window.showErrorMessage(`OBEX Analysis failed: ${result.error}`);
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Error starting OBEX Analysis: ${error.message}`);
    }
}

export function deactivate() {
    console.log('OBEX Integration Tool is now deactivated');
}