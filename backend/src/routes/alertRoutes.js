const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/', alertController.getAlerts);
router.put('/:id/read', alertController.markAlertAsRead);
router.put('/mark-all-read', alertController.markAllAsRead);

module.exports = router;
