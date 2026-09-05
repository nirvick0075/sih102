const express = require('express');
const router = express.Router();
const mlController = require('../controllers/mlController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { uploadCsv } = require('../middleware/uploadMiddleware');

router.use(authenticate);

// List model versions and risk weights
router.get('/models', mlController.getModelVersions);

// Training, model activation, and risk weight configuration restricted strictly to ADMIN
router.post('/train', authorize(['ADMIN']), uploadCsv.single('dataset'), mlController.trainModel);
router.post('/models/:id/activate', authorize(['ADMIN']), mlController.activateModelVersion);
router.put('/config', authorize(['ADMIN']), mlController.updateWeightsConfig);

module.exports = router;
