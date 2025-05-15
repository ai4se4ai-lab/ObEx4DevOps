/**
 * Simple logger utility for server-side logging
 */
export const logger = {
    /**
     * Log info message
     */
    info: (message: string, ...args: any[]): void => {
        console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
    },
    
    /**
     * Log debug message
     */
    debug: (message: string, ...args: any[]): void => {
        if (process.env.DEBUG === 'true') {
            console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
        }
    },
    
    /**
     * Log warning message
     */
    warn: (message: string, ...args: any[]): void => {
        console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
    },
    
    /**
     * Log error message
     */
    error: (message: string, ...args: any[]): void => {
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
    },
    
    /**
     * Log critical error message
     */
    critical: (message: string, ...args: any[]): void => {
        console.error(`[CRITICAL] ${new Date().toISOString()} - ${message}`, ...args);
        
        // In a production environment, you might want to send an alert or notification
        // for critical errors (e.g., sending to an error monitoring service)
    }
};