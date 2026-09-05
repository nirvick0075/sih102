const express = require('express');
const router = express.Router();
const contractorController = require('../controllers/contractorController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/', contractorController.getContractors);
router.get('/:id', contractorController.getContractorById);

module.exports = router;
