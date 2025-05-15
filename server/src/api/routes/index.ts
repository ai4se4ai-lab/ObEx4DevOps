import express from 'express';
import { analysisController } from '../controllers/analysisController';

// Create router
const router = express.Router();

// Analysis routes
router.post('/analyze', analysisController.analyze);
router.post('/analyze/pre-build', analysisController.analyzePreBuild);
router.post('/analyze/post-build', analysisController.analyzePostBuild);
router.post('/analyze/build-log', analysisController.analyzeBuildLog);
router.post('/analyze/pre-test', analysisController.analyzePreTest);
router.post('/analyze/post-test', analysisController.analyzePostTest);

// Insights routes
router.get('/insights/latest', analysisController.getLatestInsights);
router.get('/insights/level/:level', analysisController.getInsightsByLevel);

// Annotations routes
router.get('/annotations', analysisController.getCodeAnnotations);

// Fixes routes
router.get('/fixes/:id', analysisController.getFixForIssue);
router.post('/fixes/:id/apply', analysisController.applyFix);

export default router;