const express = require('express');
const router = express.Router();
const investigationController = require('../controllers/investigationController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(authenticate);

// List and view details
router.get('/', investigationController.getInvestigations);
router.get('/:id', investigationController.getInvestigationById);

// Start and update investigations restricted to INVESTIGATOR and ADMIN
router.post('/', authorize(['INVESTIGATOR', 'ADMIN']), investigationController.startInvestigation);
router.put('/:id', authorize(['INVESTIGATOR', 'ADMIN']), investigationController.updateInvestigation);

module.exports = router;
