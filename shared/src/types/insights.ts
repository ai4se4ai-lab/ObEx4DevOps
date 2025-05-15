/**
 * Insight levels
 */
export type InsightLevel = 'micro' | 'meso' | 'macro';

/**
 * Insight severity levels
 */
export type InsightSeverity = 'high' | 'medium' | 'low';

/**
 * Location in code
 */
export interface CodeLocation {
    file: string;
    line: number;
    column?: number;
    endLine?: number;
    endColumn?: number;
}

/**
 * Evidence type for insights
 */
export interface Evidence {
    type: string;
    description: string;
    source?: string;
    location?: CodeLocation;
    details?: any;
}

/**
 * Insight item structure
 */
export interface Insight {
    id: string;
    title: string;
    summary: string;
    explanation: string;
    level: InsightLevel;
    severity: InsightSeverity;
    confidence: number; // 0-100
    category: string;
    location?: CodeLocation;
    fixable: boolean;
    recommendations: string[];
    evidence: Evidence[];
    createdAt: string;
    updatedAt: string;
}

/**
 * Response structure for insights
 */
export interface InsightResponse {
    items: Insight[];
    count: number;
    total: number;
    hasMore: boolean;
    nextCursor?: string;
}

/**
 * Code annotation structure
 */
export interface CodeAnnotation {
    id: string;
    title: string;
    summary: string;
    severity: InsightSeverity;
    confidence: number; // 0-100
    location: CodeLocation;
    insightId: string;
}

/**
 * Response structure for code annotations
 */
export interface AnnotationResponse {
    annotations: CodeAnnotation[];
    count: number;
}

/**
 * Fix information for an issue
 */
export interface FixInfo {
    applicable: boolean;
    description: string;
    severity: InsightSeverity;
    location?: CodeLocation;
    changes?: {
        oldCode: string;
        newCode: string;
        description: string;
    }[];
}

/**
 * Response structure for fix application
 */
export interface FixApplicationResponse {
    success: boolean;
    error?: string;
    message?: string;
    appliedChanges?: number;
}

/**
 * Analysis context for GitHub commit
 */
export interface GithubCommitContext {
    repository: {
        owner: string;
        name: string;
    };
    commit: {
        sha: string;
        message: string;
        author: {
            name: string;
            email: string;
        };
        committer: {
            name: string;
            email: string;
        };
        files: {
            filename: string;
            status: string;
            additions: number;
            deletions: number;
            changes: number;
            patch?: string;
        }[];
    };
}

/**
 * Analysis context for GitHub pull request
 */
export interface GithubPullRequestContext {
    repository: {
        owner: string;
        name: string;
    };
    pullRequest: {
        number: number;
        title: string;
        body?: string;
        state: string;
        base: {
            ref: string;
            sha: string;
        };
        head: {
            ref: string;
            sha: string;
            repo: {
                owner: string;
                name: string;
            };
        };
        author: {
            login: string;
        };
        files: {
            filename: string;
            status: string;
            additions: number;
            deletions: number;
            changes: number;
            patch?: string;
        }[];
    };
}

/**
 * Analysis context for GitHub Actions workflow
 */
export interface GithubWorkflowContext {
    repository: {
        owner: string;
        name: string;
    };
    workflow: {
        id: number;
        name: string;
        path: string;
        content: string;
    };
    run?: {
        id: number;
        name: string;
        workflow_id: number;
        event: string;
        status: string;
        conclusion?: string;
        started_at: string;
        updated_at: string;
        jobs: {
            id: number;
            name: string;
            status: string;
            conclusion?: string;
            steps: {
                name: string;
                status: string;
                conclusion?: string;
                number: number;
                started_at: string;
                completed_at?: string;
            }[];
        }[];
    };
}

/**
 * Event types for analysis
 */
export type AnalysisEventType = 
    | 'save'
    | 'edit'
    | 'branchChange'
    | 'taskStart'
    | 'taskEnd'
    | 'testRunStart'
    | 'testRunEnd'
    | 'buildLogAnalysis';

/**
 * Analysis context for the server
 */
export interface AnalysisContext {
    timestamp: string;
    workspace: any;
    git: any;
    editor: any;
    githubActions: any;
    system: any;
    extensions: any;
    [key: string]: any;
}