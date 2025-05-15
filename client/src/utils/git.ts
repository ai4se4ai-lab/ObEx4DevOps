import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as util from 'util';

/**
 * Execute git command and return output
 */
export async function gitExec(cwd: string, args: string[]): Promise<string> {
    const execPromise = util.promisify(exec);
    
    const command = `git ${args.join(' ')}`;
    
    try {
        const { stdout, stderr } = await execPromise(command, { cwd });
        
        if (stderr) {
            console.warn(`Git command warning: ${stderr}`);
        }
        
        return stdout.trim();
    } catch (error) {
        console.error(`Error executing git command: ${command}`, error);
        throw error;
    }
}

/**
 * Get the current branch name
 */
export async function getCurrentBranch(workspaceFolder: string): Promise<string | null> {
    try {
        return await gitExec(workspaceFolder, ['rev-parse', '--abbrev-ref', 'HEAD']);
    } catch (error) {
        console.error('Error getting current branch:', error);
        return null;
    }
}

/**
 * Get the remote URL for origin
 */
export async function getRemoteUrl(workspaceFolder: string): Promise<string | null> {
    try {
        return await gitExec(workspaceFolder, ['config', '--get', 'remote.origin.url']);
    } catch (error) {
        console.error('Error getting remote URL:', error);
        return null;
    }
}

/**
 * Get the latest commit hash
 */
export async function getLatestCommit(workspaceFolder: string): Promise<string | null> {
    try {
        return await gitExec(workspaceFolder, ['rev-parse', 'HEAD']);
    } catch (error) {
        console.error('Error getting latest commit:', error);
        return null;
    }
}

/**
 * Get diff for a specific file
 */
export async function getFileDiff(workspaceFolder: string, filePath: string): Promise<string | null> {
    try {
        // Check if file is tracked by git
        const isTracked = await gitExec(workspaceFolder, ['ls-files', '--error-unmatch', filePath])
            .then(() => true)
            .catch(() => false);
        
        if (!isTracked) {
            // Get diff for untracked file (comparing to empty)
            const fileContent = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
            return Buffer.from(fileContent).toString('utf8');
        } else {
            // Get diff for tracked file
            return await gitExec(workspaceFolder, ['diff', 'HEAD', '--', filePath]);
        }
    } catch (error) {
        console.error(`Error getting diff for file ${filePath}:`, error);
        return null;
    }
}

/**
 * Get the list of uncommitted changes
 */
export async function getUncommittedChanges(workspaceFolder: string): Promise<string[]> {
    try {
        const status = await gitExec(workspaceFolder, ['status', '--porcelain']);
        
        if (!status) {
            return [];
        }
        
        return status
            .split('\n')
            .filter(Boolean)
            .map(line => {
                // Extract file path from status line (remove status markers)
                const match = line.match(/^..\s+(.+)$/);
                return match ? match[1] : null;
            })
            .filter(Boolean) as string[];
    } catch (error) {
        console.error('Error getting uncommitted changes:', error);
        return [];
    }
}

/**
 * Get GitHub repository information from remote URL
 */
export async function getGitHubInfo(workspaceFolder: string): Promise<{ owner: string; repo: string } | null> {
    try {
        const remoteUrl = await getRemoteUrl(workspaceFolder);
        
        if (!remoteUrl) {
            return null;
        }
        
        // Match GitHub URL formats
        // https://github.com/owner/repo.git
        // git@github.com:owner/repo.git
        const httpsMatch = remoteUrl.match(/https:\/\/github\.com\/([^\/]+)\/([^\.]+)(?:\.git)?/);
        const sshMatch = remoteUrl.match(/git@github\.com:([^\/]+)\/([^\.]+)(?:\.git)?/);
        
        const match = httpsMatch || sshMatch;
        
        if (!match) {
            return null;
        }
        
        return {
            owner: match[1],
            repo: match[2]
        };
    } catch (error) {
        console.error('Error getting GitHub info:', error);
        return null;
    }
}