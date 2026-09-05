const express = require('express');
const router = express.Router();
const evidenceController = require('../controllers/evidenceController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { uploadEvidence } = require('../middleware/uploadMiddleware');

router.use(authenticate);

router.get('/:id', evidenceController.getEvidenceById);
router.post('/:id/verify', evidenceController.verifyEvidenceIntegrity);

// Upload restricted to INVESTIGATOR and ADMIN
router.post('/', authorize(['INVESTIGATOR', 'ADMIN']), uploadEvidence.single('file'), evidenceController.uploadEvidenceFile);

module.exports = router;
