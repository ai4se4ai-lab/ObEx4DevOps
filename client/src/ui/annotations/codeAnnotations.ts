import * as vscode from 'vscode';
import { ApiClient } from '../../api/client';

/**
 * Manages code annotations (decorations) that highlight issues in code
 */
export function registerCodeAnnotations(
    context: vscode.ExtensionContext, 
    apiClient: ApiClient
): vscode.Disposable {
    // Create decoration types for different severity levels
    const highSeverityDecoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: new vscode.ThemeColor('editorError.background'),
        borderColor: new vscode.ThemeColor('editorError.border'),
        borderWidth: '1px',
        borderStyle: 'solid',
        after: {
            margin: '0 0 0 1em',
            contentIconPath: context.asAbsolutePath('resources/warning-high.svg')
        }
    });
    
    const mediumSeverityDecoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: new vscode.ThemeColor('editorWarning.background'),
        borderColor: new vscode.ThemeColor('editorWarning.border'),
        borderWidth: '1px',
        borderStyle: 'solid',
        after: {
            margin: '0 0 0 1em',
            contentIconPath: context.asAbsolutePath('resources/warning-medium.svg')
        }
    });
    
    const lowSeverityDecoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: new vscode.ThemeColor('editorInfo.background'),
        borderColor: new vscode.ThemeColor('editorInfo.border'),
        borderWidth: '1px',
        borderStyle: 'solid',
        after: {
            margin: '0 0 0 1em',
            contentIconPath: context.asAbsolutePath('resources/info.svg')
        }
    });
    
    // Track current annotations
    let currentAnnotations: Map<string, any[]> = new Map();
    
    // Update annotations when editor changes
    const updateAnnotations = async (editor: vscode.TextEditor | undefined) => {
        if (!editor) return;
        
        // Clear existing decorations
        editor.setDecorations(highSeverityDecoration, []);
        editor.setDecorations(mediumSeverityDecoration, []);
        editor.setDecorations(lowSeverityDecoration, []);
        
        try {
            // Get the file path relative to workspace
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) return;
            
            const filePath = editor.document.uri.fsPath;
            const workspaceFolder = workspaceFolders[0];
            const relativePath = vscode.workspace.asRelativePath(filePath, false);
            
            // Skip if file is not in workspace
            if (relativePath === filePath) return;
            
            // Get annotations for this file
            const annotations = currentAnnotations.get(relativePath) || [];
            
            // Group decorations by severity
            const highSeverityRanges: vscode.DecorationOptions[] = [];
            const mediumSeverityRanges: vscode.DecorationOptions[] = [];
            const lowSeverityRanges: vscode.DecorationOptions[] = [];
            
            for (const annotation of annotations) {
                // Create range for the annotation
                const startLine = annotation.location.line - 1; // 0-based
                const startChar = annotation.location.column || 0;
                const endLine = annotation.location.endLine 
                    ? annotation.location.endLine - 1
                    : startLine;
                const endChar = annotation.location.endColumn || 1000;
                
                const range = new vscode.Range(
                    new vscode.Position(startLine, startChar),
                    new vscode.Position(endLine, endChar)
                );
                
                // Create decoration options
                const decorationOptions: vscode.DecorationOptions = {
                    range,
                    hoverMessage: new vscode.MarkdownString(
                        `**${annotation.title}** (${annotation.confidence}% confidence)\n\n${annotation.summary}`
                    )
                };
                
                // Add to the appropriate severity group
                switch (annotation.severity.toLowerCase()) {
                    case 'high':
                        highSeverityRanges.push(decorationOptions);
                        break;
                    case 'medium':
                        mediumSeverityRanges.push(decorationOptions);
                        break;
                    case 'low':
                    default:
                        lowSeverityRanges.push(decorationOptions);
                        break;
                }
            }
            
            // Apply decorations
            editor.setDecorations(highSeverityDecoration, highSeverityRanges);
            editor.setDecorations(mediumSeverityDecoration, mediumSeverityRanges);
            editor.setDecorations(lowSeverityDecoration, lowSeverityRanges);
        } catch (error) {
            console.error('Error updating annotations:', error);
        }
    };
    
    // Event handlers
    const onDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor(
        async (editor) => {
            await updateAnnotations(editor);
        }
    );
    
    const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument(
        async (event) => {
            // Only update if it's the active editor
            if (vscode.window.activeTextEditor && 
                event.document === vscode.window.activeTextEditor.document) {
                await updateAnnotations(vscode.window.activeTextEditor);
            }
        }
    );
    
    // Fetch and update annotations for all files
    const fetchAndUpdateAnnotations = async () => {
        try {
            const response = await apiClient.getCodeAnnotations();
            
            // Reset annotations map
            currentAnnotations = new Map();
            
            // Group annotations by file path
            for (const annotation of response.annotations) {
                const filePath = annotation.location.file;
                if (!filePath) continue;
                
                // Initialize array if not exists
                if (!currentAnnotations.has(filePath)) {
                    currentAnnotations.set(filePath, []);
                }
                
                // Add annotation to file's array
                currentAnnotations.get(filePath)?.push(annotation);
            }
            
            // Update decorations for current editor
            await updateAnnotations(vscode.window.activeTextEditor);
        } catch (error) {
            console.error('Error fetching annotations:', error);
        }
    };
    
    // Register command to refresh annotations
    const refreshCommand = vscode.commands.registerCommand(
        'obex.refreshAnnotations',
        fetchAndUpdateAnnotations
    );
    
    // Setup periodic refresh (every 30 seconds)
    const refreshInterval = setInterval(fetchAndUpdateAnnotations, 30000);
    
    // Initial fetch
    fetchAndUpdateAnnotations();
    
    // Create composite disposable
    const disposable = vscode.Disposable.from(
        onDidChangeActiveTextEditor,
        onDidChangeTextDocument,
        refreshCommand,
        { dispose: () => clearInterval(refreshInterval) },
        { dispose: () => {
            // Clean up decorations
            vscode.window.visibleTextEditors.forEach(editor => {
                editor.setDecorations(highSeverityDecoration, []);
                editor.setDecorations(mediumSeverityDecoration, []);
                editor.setDecorations(lowSeverityDecoration, []);
            });
            
            // Dispose decoration types
            highSeverityDecoration.dispose();
            mediumSeverityDecoration.dispose();
            lowSeverityDecoration.dispose();
        }}
    );
    
    return disposable;
}