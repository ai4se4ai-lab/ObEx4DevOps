import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ContextAggregator } from '../context/aggregator';
import { ApiClient } from '../api/client';

/**
 * Detects when builds or tests are triggered locally
 */
export class BuildTriggerListener implements vscode.Disposable {
    private disposables: vscode.Disposable[] = [];
    private taskTerminals: Map<string, vscode.Terminal> = new Map();
    
    constructor(
        private contextAggregator: ContextAggregator,
        private apiClient: ApiClient
    ) {
        // Listen for terminal creation
        this.disposables.push(
            vscode.window.onDidOpenTerminal(this.onTerminalOpened.bind(this))
        );
        
        // Listen for terminal close
        this.disposables.push(
            vscode.window.onDidCloseTerminal(this.onTerminalClosed.bind(this))
        );
        
        // Listen for task start
        this.disposables.push(
            vscode.tasks.onDidStartTask(this.onTaskStarted.bind(this))
        );
        
        // Listen for task end
        this.disposables.push(
            vscode.tasks.onDidEndTask(this.onTaskEnded.bind(this))
        );
        
        // Listen for test run start
        if (vscode.tests) {
            this.disposables.push(
                vscode.tests.onDidStartTestRun(this.onTestRunStarted.bind(this))
            );
            
            this.disposables.push(
                vscode.tests.onDidFinishTestRun(this.onTestRunFinished.bind(this))
            );
        }
    }
    
    /**
     * Handle terminal opening
     */
    private onTerminalOpened(terminal: vscode.Terminal): void {
        // We'll monitor this terminal to detect certain command executions
        // This is limited since we can't easily get the command being executed
        // But we can check for certain patterns later
    }
    
    /**
     * Handle terminal closing
     */
    private onTerminalClosed(terminal: vscode.Terminal): void {
        // Remove from tracked terminals if it's a task terminal
        for (const [id, trackedTerminal] of this.taskTerminals.entries()) {
            if (trackedTerminal === terminal) {
                this.taskTerminals.delete(id);
                break;
            }
        }
    }
    
    /**
     * Handle task starting
     */
    private async onTaskStarted(event: vscode.TaskStartEvent): Promise<void> {
        const task = event.execution.task;
        
        // Track the terminal used for this task
        if (event.execution.terminal) {
            this.taskTerminals.set(task.name, event.execution.terminal);
        }
        
        // Check if this is a build or test task
        if (this.isBuildOrTestTask(task)) {
            await this.handleBuildOrTestStart(task);
        }
    }
    
    /**
     * Handle task ending
     */
    private async onTaskEnded(event: vscode.TaskEndEvent): Promise<void> {
        const task = event.execution.task;
        
        // Check if this is a build or test task
        if (this.isBuildOrTestTask(task)) {
            await this.handleBuildOrTestEnd(task);
        }
        
        // Remove from tracked terminals
        if (this.taskTerminals.has(task.name)) {
            this.taskTerminals.delete(task.name);
        }
    }
    
    /**
     * Handle test run starting
     */
    private async onTestRunStarted(event: vscode.TestRunStartEvent): Promise<void> {
        await this.handleTestRunStart(event);
    }
    
    /**
     * Handle test run finishing
     */
    private async onTestRunFinished(event: vscode.TestRunFinishedEvent): Promise<void> {
        await this.handleTestRunEnd(event);
    }
    
    /**
     * Check if a task is a build or test task
     */
    private isBuildOrTestTask(task: vscode.Task): boolean {
        // Check if the task is a build or test task based on name and type
        const name = task.name.toLowerCase();
        const buildKeywords = ['build', 'compile', 'webpack', 'bundle', 'make', 'gradle', 'maven'];
        const testKeywords = ['test', 'jest', 'mocha', 'junit', 'karma', 'cypress', 'selenium'];
        
        // Check task type
        const isBuildType = task.group === vscode.TaskGroup.Build;
        const isTestType = task.group === vscode.TaskGroup.Test;
        
        // Check task name for keywords
        const containsBuildKeyword = buildKeywords.some(keyword => name.includes(keyword));
        const containsTestKeyword = testKeywords.some(keyword => name.includes(keyword));
        
        return isBuildType || isTestType || containsBuildKeyword || containsTestKeyword;
    }
    
    /**
     * Handle build or test task starting
     */
    private async handleBuildOrTestStart(task: vscode.Task): Promise<void> {
        try {
            console.log(`OBEX: Build/Test task started: ${task.name}`);
            
            // Get task information
            const taskInfo = {
                name: task.name,
                type: task.source,
                definition: task.definition,
                isTestTask: task.group === vscode.TaskGroup.Test,
                isBuildTask: task.group === vscode.TaskGroup.Build,
            };
            
            // Get current context
            const context = await this.contextAggregator.gatherContext({
                task: taskInfo,
                eventType: 'taskStart'
            });
            
            // Request analysis from the API
            await this.apiClient.requestPreBuildAnalysis(context);
            
            // Show notification
            this.showTaskNotification(`OBEX is analyzing build/test task: ${task.name}`);
        } catch (error) {
            console.error(`Error handling build/test task start: ${error}`);
        }
    }
    
    /**
     * Handle build or test task ending
     */
    private async handleBuildOrTestEnd(task: vscode.Task): Promise<void> {
        try {
            console.log(`OBEX: Build/Test task ended: ${task.name}`);
            
            // Get task information
            const taskInfo = {
                name: task.name,
                type: task.source,
                definition: task.definition,
                isTestTask: task.group === vscode.TaskGroup.Test,
                isBuildTask: task.group === vscode.TaskGroup.Build,
            };
            
            // Get current context
            const context = await this.contextAggregator.gatherContext({
                task: taskInfo,
                eventType: 'taskEnd'
            });
            
            // Request analysis from the API
            await this.apiClient.requestPostBuildAnalysis(context);
            
            // Check if there are any build logs to analyze
            await this.checkForBuildLogs(task);
            
            // Show notification
            this.showTaskNotification(`OBEX has analyzed build/test results for: ${task.name}`);
        } catch (error) {
            console.error(`Error handling build/test task end: ${error}`);
        }
    }
    
    /**
     * Handle test run starting
     */
    private async handleTestRunStart(event: vscode.TestRunStartEvent): Promise<void> {
        try {
            console.log(`OBEX: Test run started`);
            
            // Get selected test items
            const testItems = Array.from(event.selection || []).map(item => ({
                id: item.id,
                label: item.label,
                uri: item.uri?.toString()
            }));
            
            // Get current context
            const context = await this.contextAggregator.gatherContext({
                testRun: {
                    testItems,
                    profile: event.profile ? {
                        id: event.profile.id,
                        label: event.profile.label
                    } : undefined
                },
                eventType: 'testRunStart'
            });
            
            // Request analysis from the API
            await this.apiClient.requestPreTestAnalysis(context);
            
            // Show notification
            this.showTaskNotification(`OBEX is analyzing tests before execution`);
        } catch (error) {
            console.error(`Error handling test run start: ${error}`);
        }
    }
    
    /**
     * Handle test run finishing
     */
    private async handleTestRunEnd(event: vscode.TestRunFinishedEvent): Promise<void> {
        try {
            console.log(`OBEX: Test run finished`);
            
            // Get test results
            const testResults = this.collectTestResults(event);
            
            // Get current context
            const context = await this.contextAggregator.gatherContext({
                testRunResults: testResults,
                eventType: 'testRunEnd'
            });
            
            // Request analysis from the API
            await this.apiClient.requestPostTestAnalysis(context);
            
            // Show notification
            this.showTaskNotification(`OBEX has analyzed test results`);
        } catch (error) {
            console.error(`Error handling test run end: ${error}`);
        }
    }
    
    /**
     * Collect test results from a test run
     */
    private collectTestResults(event: vscode.TestRunFinished): any {
        const results: any = {
            passed: [],
            failed: [],
            skipped: []
        };
        
        // This is a simplification - in reality, we would need to traverse the test items
        // and collect their results, but the exact API depends on the VS Code version
        
        // For now, just return basic information
        return {
            // duration is not available on TestRunFinishedEvent, so omit or set to undefined
            duration: undefined,
            passed: results.passed.length,
            failed: results.failed.length,
            skipped: results.skipped.length
        };
    }
    
    /**
     * Check for and analyze build logs
     */
    private async checkForBuildLogs(task: vscode.Task): Promise<void> {
        try {
            // Get workspace folder
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                return;
            }
            
            const workspaceFolder = workspaceFolders[0].uri.fsPath;
            
            // Common build log locations
            const commonLogLocations = [
                path.join(workspaceFolder, 'build', 'logs'),
                path.join(workspaceFolder, 'target', 'logs'),
                path.join(workspaceFolder, 'logs'),
                path.join(workspaceFolder, '.gradle', 'build'),
                path.join(workspaceFolder, 'npm-debug.log')
            ];
            
            // Check if GitHub Actions local runner logs exist
            const githubActionsLogDir = path.join(workspaceFolder, '.github', 'act-logs');
            if (fs.existsSync(githubActionsLogDir)) {
                const logFiles = fs.readdirSync(githubActionsLogDir)
                    .filter(file => file.endsWith('.log'))
                    .map(file => path.join(githubActionsLogDir, file));
                
                commonLogLocations.push(...logFiles);
            }
            
            // Find and analyze build logs
            for (const logPath of commonLogLocations) {
                if (fs.existsSync(logPath)) {
                    let logContent: string | null = null;
                    
                    if (fs.statSync(logPath).isDirectory()) {
                        // If it's a directory, look for the most recent log file
                        const logFiles = fs.readdirSync(logPath)
                            .filter(file => file.endsWith('.log') || file.endsWith('.txt'))
                            .map(file => ({
                                filePath: path.join(logPath, file),
                                mtime: fs.statSync(path.join(logPath, file)).mtime.getTime()
                            }))
                            .sort((a, b) => b.mtime - a.mtime); // Sort by most recent
                        
                        if (logFiles.length > 0) {
                            logContent = fs.readFileSync(logFiles[0].filePath, 'utf8');
                        }
                    } else if (fs.statSync(logPath).isFile()) {
                        // If it's a file, read it directly
                        logContent = fs.readFileSync(logPath, 'utf8');
                    }
                    
                    if (logContent) {
                        // Get current context with log content
                        const context = await this.contextAggregator.gatherContext({
                            buildLog: {
                                taskName: task.name,
                                logPath,
                                logContent
                            },
                            eventType: 'buildLogAnalysis'
                        });
                        
                        // Request analysis from the API
                        await this.apiClient.requestBuildLogAnalysis(context);
                    }
                }
            }
        } catch (error) {
            console.error(`Error checking for build logs: ${error}`);
        }
    }
    
    /**
     * Show task notification
     */
    private showTaskNotification(message: string): void {
        // Create status bar item
        const statusBar = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        statusBar.text = message;
        statusBar.tooltip = 'Click to view OBEX insights';
        statusBar.command = 'obex.showPanel';
        statusBar.show();
        
        // Hide after 5 seconds
        setTimeout(() => {
            statusBar.dispose();
        }, 5000);
    }
    
    dispose(): void {
        // Clean up all disposables
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
    }
}