import * as vscode from 'vscode';
import * as path from 'path';
import { ContextAggregator } from '../context/aggregator';
import { ApiClient } from '../api/client';

/**
 * Listens for code changes (saves, edits) and triggers analysis
 */
export class CodeChangeListener implements vscode.Disposable {
    private disposables: vscode.Disposable[] = [];
    private debounceTimer: NodeJS.Timeout | null = null;
    private debounceDelay = 2000; // ms
    
    constructor(
        private contextAggregator: ContextAggregator,
        private apiClient: ApiClient
    ) {
        // Listen for document saves
        this.disposables.push(
            vscode.workspace.onDidSaveTextDocument(this.onDocumentSaved.bind(this))
        );
        
        // Listen for document changes (with debounce)
        this.disposables.push(
            vscode.workspace.onDidChangeTextDocument(this.onDocumentChanged.bind(this))
        );
    }
    
    /**
     * Handle document saves - trigger immediate analysis
     */
    private async onDocumentSaved(document: vscode.TextDocument): Promise<void> {
        try {
            // Only analyze supported file types
            if (!this.isSupportedFileType(document)) {
                return;
            }
            
            // Get current context
            const context = await this.contextAggregator.gatherContext({
                file: document.fileName,
                eventType: 'save'
            });
            
            // Request analysis from the API
            await this.apiClient.requestAnalysis(context);
            
            // Show status bar notification (optional)
            this.showStatusNotification('OBEX: Analyzing saved changes');
        } catch (error) {
            console.error('Error analyzing saved document:', error);
        }
    }
    
    /**
     * Handle document changes - trigger debounced analysis
     */
    private onDocumentChanged(event: vscode.TextDocumentChangeEvent): void {
        // Only analyze supported file types
        if (!this.isSupportedFileType(event.document)) {
            return;
        }
        
        // Clear existing timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        
        // Start new debounce timer
        this.debounceTimer = setTimeout(async () => {
            try {
                // Get current context
                const context = await this.contextAggregator.gatherContext({
                    file: event.document.fileName,
                    eventType: 'edit'
                });
                
                // Request analysis from the API
                await this.apiClient.requestAnalysis(context);
                
                // Show status bar notification (optional)
                this.showStatusNotification('OBEX: Analyzing recent changes');
            } catch (error) {
                console.error('Error analyzing document changes:', error);
            }
        }, this.debounceDelay);
    }
    
    /**
     * Check if file type is supported for analysis
     */
    private isSupportedFileType(document: vscode.TextDocument): boolean {
        // Skip unsaved documents
        if (document.isUntitled) {
            return false;
        }
        
        // Skip non-file schemes
        if (document.uri.scheme !== 'file') {
            return false;
        }
        
        // Get file extension
        const fileName = document.fileName.toLowerCase();
        
        // List of supported extensions - customize based on your needs
        const supportedExtensions = [
            '.js', '.jsx', '.ts', '.tsx',  // JavaScript/TypeScript
            '.java',                       // Java
            '.py',                         // Python
            '.c', '.cpp', '.h', '.hpp',    // C/C++
            '.cs',                         // C#
            '.go',                         // Go
            '.rb',                         // Ruby
            '.php',                        // PHP
            '.swift',                      // Swift
            '.kt', '.kts',                 // Kotlin
            '.yaml', '.yml',               // YAML (for GitHub Actions)
            '.json',                       // JSON
            '.md',                         // Markdown
            '.html', '.css',               // Web
            '.sh', '.bash',                // Shell scripts
            '.xml'                         // XML
        ];
        
        // Check if file has a supported extension
        return supportedExtensions.some(ext => fileName.endsWith(ext));
    }
    
    /**
     * Show a temporary status bar notification
     */
    private showStatusNotification(message: string): void {
        const statusBar = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        statusBar.text = message;
        statusBar.show();
        
        // Hide after 3 seconds
        setTimeout(() => {
            statusBar.dispose();
        }, 3000);
    }
    
    /**
     * Get current file content
     */
    private getCurrentFileContent(): string | null {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return null;
        }
        
        return editor.document.getText();
    }
    
    dispose(): void {
        // Clean up all disposables
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        
        // Clear any pending timers
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
    }
}