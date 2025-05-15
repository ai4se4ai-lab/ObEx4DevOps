import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { 
    getCurrentBranch, 
    getRemoteUrl, 
    getLatestCommit, 
    getUncommittedChanges,
    getGitHubInfo,
    getFileDiff
} from '../utils/git';

/**
 * Gathers contextual information about the current environment
 */
export class ContextAggregator {
    /**
     * Gather context information for analysis
     */
    public async gatherContext(additionalContext: any = {}): Promise<any> {
        try {
            // Get basic workspace information
            const workspaceInfo = await this.getWorkspaceInfo();
            
            // Get git information
            const gitInfo = await this.getGitInfo();
            
            // Get active editor information
            const editorInfo = this.getActiveEditorInfo();
            
            // Get GitHub Actions workflow information
            const githubActionsInfo = await this.getGitHubActionsInfo();
            
            // Get system information
            const systemInfo = this.getSystemInfo();
            
            // Get VS Code extension information
            const extensionInfo = this.getExtensionInfo();
            
            // Combine all information
            return {
                timestamp: new Date().toISOString(),
                workspace: workspaceInfo,
                git: gitInfo,
                editor: editorInfo,
                githubActions: githubActionsInfo,
                system: systemInfo,
                extensions: extensionInfo,
                ...additionalContext
            };
        } catch (error) {
            console.error('Error gathering context:', error);
            
            // Return minimal context
            return {
                timestamp: new Date().toISOString(),
                error: error.message,
                ...additionalContext
            };
        }
    }
    
    /**
     * Get workspace information
     */
    private async getWorkspaceInfo(): Promise<any> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return {
                available: false
            };
        }
        
        const workspaceFolder = workspaceFolders[0];
        const packageJsonPath = path.join(workspaceFolder.uri.fsPath, 'package.json');
        
        let packageInfo = null;
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
                packageInfo = JSON.parse(packageJsonContent);
            } catch (error) {
                console.error('Error parsing package.json:', error);
            }
        }
        
        return {
            available: true,
            name: workspaceFolder.name,
            path: workspaceFolder.uri.fsPath,
            uri: workspaceFolder.uri.toString(),
            index: workspaceFolder.index,
            package: packageInfo ? {
                name: packageInfo.name,
                version: packageInfo.version,
                dependencies: packageInfo.dependencies,
                devDependencies: packageInfo.devDependencies,
                scripts: packageInfo.scripts
            } : null
        };
    }
    
    /**
     * Get git information
     */
    private async getGitInfo(): Promise<any> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return {
                available: false
            };
        }
        
        const workspaceFolder = workspaceFolders[0].uri.fsPath;
        
        try {
            const [branch, remoteUrl, latestCommit, uncommittedChanges, githubInfo] = await Promise.all([
                getCurrentBranch(workspaceFolder),
                getRemoteUrl(workspaceFolder),
                getLatestCommit(workspaceFolder),
                getUncommittedChanges(workspaceFolder),
                getGitHubInfo(workspaceFolder)
            ]);
            
            return {
                available: true,
                branch,
                remoteUrl,
                latestCommit,
                uncommittedChanges,
                github: githubInfo
            };
        } catch (error) {
            console.error('Error getting git info:', error);
            return {
                available: false,
                error: error.message
            };
        }
    }
    
    /**
     * Get active editor information
     */
    private getActiveEditorInfo(): any {
        const editor = vscode.window.activeTextEditor;
        
        if (!editor) {
            return {
                available: false
            };
        }
        
        const document = editor.document;
        
        return {
            available: true,
            file: {
                path: document.fileName,
                uri: document.uri.toString(),
                languageId: document.languageId,
                lineCount: document.lineCount,
                size: Buffer.from(document.getText()).length
            },
            selection: {
                active: {
                    line: editor.selection.active.line,
                    character: editor.selection.active.character
                },
                anchor: {
                    line: editor.selection.anchor.line,
                    character: editor.selection.anchor.character
                }
            }
        };
    }
    
    /**
     * Get GitHub Actions workflow information
     */
    private async getGitHubActionsInfo(): Promise<any> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return {
                available: false
            };
        }
        
        const workspaceFolder = workspaceFolders[0].uri.fsPath;
        const githubWorkflowsPath = path.join(workspaceFolder, '.github', 'workflows');
        
        if (!fs.existsSync(githubWorkflowsPath)) {
            return {
                available: false
            };
        }
        
        try {
            // Get all workflow files
            const workflowFiles = fs.readdirSync(githubWorkflowsPath)
                .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'));
            
            // Get workflow file contents
            const workflows = await Promise.all(
                workflowFiles.map(async file => {
                    const filePath = path.join(githubWorkflowsPath, file);
                    const content = await fs.promises.readFile(filePath, 'utf8');
                    
                    return {
                        name: file,
                        path: filePath,
                        content
                    };
                })
            );
            
            return {
                available: true,
                workflows
            };
        } catch (error) {
            console.error('Error getting GitHub Actions info:', error);
            return {
                available: false,
                error: error.message
            };
        }
    }
    
    /**
     * Get system information
     */
    private getSystemInfo(): any {
        return {
            platform: os.platform(),
            architecture: os.arch(),
            release: os.release(),
            hostname: os.hostname(),
            username: os.userInfo().username,
            totalmem: os.totalmem(),
            freemem: os.freemem(),
            cpus: os.cpus().map(cpu => ({
                model: cpu.model,
                speed: cpu.speed
            }))
        };
    }
    
    /**
     * Get VS Code extension information
     */
    private getExtensionInfo(): any {
        const extensions = vscode.extensions.all
            .filter(ext => !ext.id.startsWith('vscode.'))  // Filter out built-in extensions
            .map(ext => ({
                id: ext.id,
                version: ext.packageJSON.version,
                name: ext.packageJSON.name,
                displayName: ext.packageJSON.displayName,
                isActive: ext.isActive
            }));
        
        return {
            extensions,
            vscodeVersion: vscode.version
        };
    }
    
    /**
     * Get diff for current file
     */
    public async getCurrentFileDiff(): Promise<string | null> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return null;
        }
        
        const document = editor.document;
        if (document.isUntitled) {
            return null;
        }
        
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return null;
        }
        
        const workspaceFolder = workspaceFolders[0].uri.fsPath;
        
        return await getFileDiff(workspaceFolder, document.fileName);
    }
    
    /**
     * Get dependencies for the project
     */
    public async getProjectDependencies(): Promise<any> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return null;
        }
        
        const workspaceFolder = workspaceFolders[0].uri.fsPath;
        
        // Check for different dependency files
        const dependencyFiles = [
            { file: 'package.json', type: 'npm' },
            { file: 'pom.xml', type: 'maven' },
            { file: 'build.gradle', type: 'gradle' },
            { file: 'build.gradle.kts', type: 'gradle-kotlin' },
            { file: 'requirements.txt', type: 'python' },
            { file: 'Gemfile', type: 'ruby' },
            { file: 'go.mod', type: 'go' },
            { file: 'composer.json', type: 'php' }
        ];
        
        const dependencies = [];
        
        for (const depFile of dependencyFiles) {
            const filePath = path.join(workspaceFolder, depFile.file);
            
            if (fs.existsSync(filePath)) {
                const content = await fs.promises.readFile(filePath, 'utf8');
                
                dependencies.push({
                    type: depFile.type,
                    file: depFile.file,
                    content
                });
            }
        }
        
        return dependencies.length > 0 ? dependencies : null;
    }
}