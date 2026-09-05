const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { uploadCsv } = require('../middleware/uploadMiddleware');

// Public read for authenticated users (USER, INVESTIGATOR, ADMIN)
router.get('/', authenticate, projectController.getProjects);
router.get('/:id', authenticate, projectController.getProjectById);

// Admin-only creation, update & CSV import
router.post('/', authenticate, authorize(['ADMIN']), projectController.createProject);
router.put('/:id', authenticate, authorize(['ADMIN']), projectController.updateProject);
router.post('/import', authenticate, authorize(['ADMIN']), uploadCsv.single('file'), projectController.importProjectsCsv);
router.post('/import-csv', authenticate, authorize(['ADMIN']), uploadCsv.single('file'), projectController.importProjectsCsv);

// Anomaly re-evaluation for Admin and Investigator
router.post('/:id/re-evaluate', authenticate, authorize(['ADMIN', 'INVESTIGATOR']), projectController.reevaluateProject);

module.exports = router;
