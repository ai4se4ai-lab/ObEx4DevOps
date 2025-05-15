import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { json, urlencoded } from 'body-parser';
import apiRoutes from './api/routes';
import { logger } from './utils/logger';

// Create Express application
const app = express();
const port = process.env.PORT || 3000;

// Apply middleware
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(cors()); // Enable CORS
app.use(json({ limit: '10mb' })); // Parse JSON bodies (limit size to 10mb)
app.use(urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies

// Add request logging middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
});

// Register API routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error:', err);
    
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    });
});

// Start server
app.listen(port, () => {
    logger.info(`OBEX server is running on port ${port}`);
    logger.info(`Server environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    // Close server and database connections
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    // Close server and database connections
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.critical('Uncaught exception:', err);
    // In production, you might want to restart the process or notify an admin
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.critical('Unhandled promise rejection:', reason);
    // In production, you might want to restart the process or notify an admin
});

export default app;