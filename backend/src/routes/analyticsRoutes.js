const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/overview', analyticsController.getOverviewMetrics);
router.get('/risk-distribution', analyticsController.getRiskDistribution);
router.get('/state-analysis', analyticsController.getStateAnalysis);

module.exports = router;
