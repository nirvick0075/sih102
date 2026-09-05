const express = require('express');
const router = express.Router();
const blockchainController = require('../controllers/blockchainController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(authenticate);

router.get('/ledger', blockchainController.getBlockchainLedger);
router.get('/verify/:recordId', blockchainController.verifyRecordHash);
router.post('/register', authorize(['INVESTIGATOR', 'ADMIN']), blockchainController.registerRecordHash);

module.exports = router;
