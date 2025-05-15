import * as vscode from 'vscode';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

/**
 * Client for communicating with the OBEX backend API
 */
export class ApiClient {
    private axiosInstance: AxiosInstance;
    
    constructor() {
        // Initialize axios instance
        this.axiosInstance = axios.create({
            timeout: 30000 // 30 seconds
        });
        
        // Add request interceptor for auth
        this.axiosInstance.interceptors.request.use(
            (config) => {
                // Get GitHub token from settings
                const githubToken = vscode.workspace.getConfiguration('obex').get<string>('github.token');
                
                if (githubToken) {
                    config.headers['X-GitHub-Token'] = githubToken;
                }
                
                // Add server URL
                const serverUrl = vscode.workspace.getConfiguration('obex').get<string>('server.url');
                if (serverUrl && !config.url?.startsWith('http')) {
                    config.url = `${serverUrl}${config.url}`;
                }
                
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );
    }
    
    /**
     * Request code analysis
     */
    public async requestAnalysis(context: any): Promise<any> {
        try {
            const response = await this.axiosInstance.post('/api/analyze', context);
            return response.data;
        } catch (error) {
            this.handleApiError('Error requesting analysis', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Request pre-build analysis
     */
    public async requestPreBuildAnalysis(context: any): Promise<any> {
        try {
            const response = await this.axiosInstance.post('/api/analyze/pre-build', context);
            return response.data;
        } catch (error) {
            this.handleApiError('Error requesting pre-build analysis', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Request post-build analysis
     */
    public async requestPostBuildAnalysis(context: any): Promise<any> {
        try {
            const response = await this.axiosInstance.post('/api/analyze/post-build', context);
            return response.data;
        } catch (error) {
            this.handleApiError('Error requesting post-build analysis', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Request build log analysis
     */
    public async requestBuildLogAnalysis(context: any): Promise<any> {
        try {
            const response = await this.axiosInstance.post('/api/analyze/build-log', context);
            return response.data;
        } catch (error) {
            this.handleApiError('Error requesting build log analysis', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Request pre-test analysis
     */
    public async requestPreTestAnalysis(context: any): Promise<any> {
        try {
            const response = await this.axiosInstance.post('/api/analyze/pre-test', context);
            return response.data;
        } catch (error) {
            this.handleApiError('Error requesting pre-test analysis', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Request post-test analysis
     */
    public async requestPostTestAnalysis(context: any): Promise<any> {
        try {
            const response = await this.axiosInstance.post('/api/analyze/post-test', context);
            return response.data;
        } catch (error) {
            this.handleApiError('Error requesting post-test analysis', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Get latest insights
     */
    public async getLatestInsights(): Promise<any> {
        try {
            const response = await this.axiosInstance.get('/api/insights/latest');
            return response.data;
        } catch (error) {
            this.handleApiError('Error fetching latest insights', error);
            throw error;
        }
    }
    
    /**
     * Get insights by level
     */
    public async getInsightsByLevel(level: 'micro' | 'meso' | 'macro'): Promise<any> {
        try {
            const response = await this.axiosInstance.get(`/api/insights/level/${level}`);
            return response.data;
        } catch (error) {
            this.handleApiError(`Error fetching ${level} insights`, error);
            throw error;
        }
    }
    
    /**
     * Get code annotations
     */
    public async getCodeAnnotations(): Promise<any> {
        try {
            const response = await this.axiosInstance.get('/api/annotations');
            return response.data;
        } catch (error) {
            this.handleApiError('Error fetching code annotations', error);
            throw error;
        }
    }
    
    /**
     * Get fix for issue
     */
    public async getFixForIssue(issueId: string): Promise<any> {
        try {
            const response = await this.axiosInstance.get(`/api/fixes/${issueId}`);
            return response.data;
        } catch (error) {
            this.handleApiError(`Error fetching fix for issue ${issueId}`, error);
            throw error;
        }
    }
    
    /**
     * Apply fix for issue
     */
    public async applyFix(issueId: string): Promise<any> {
        try {
            const response = await this.axiosInstance.post(`/api/fixes/${issueId}/apply`);
            return response.data;
        } catch (error) {
            this.handleApiError(`Error applying fix for issue ${issueId}`, error);
            throw error;
        }
    }
    
    /**
     * Handle API errors
     */
    private handleApiError(message: string, error: any): void {
        console.error(message, error);
        
        let errorMessage = 'Unknown error';
        
        if (axios.isAxiosError(error)) {
            if (error.response) {
                // Server responded with error status
                errorMessage = error.response.data?.message || 
                    `Server error: ${error.response.status} ${error.response.statusText}`;
            } else if (error.request) {
                // Request made but no response received
                errorMessage = 'No response from OBEX server. Please check server connection.';
            } else {
                // Error during request setup
                errorMessage = error.message;
            }
        } else {
            // Non-axios error
            errorMessage = error.message || errorMessage;
        }
        
        // Only show notification if server is configured
        const serverUrl = vscode.workspace.getConfiguration('obex').get<string>('server.url');
        if (serverUrl) {
            vscode.window.showErrorMessage(`OBEX: ${errorMessage}`);
        }
    }
}