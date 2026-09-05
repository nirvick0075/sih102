const blockchainService = require('../services/blockchainService');
const { logAction } = require('../services/auditService');

/**
 * Register a hash on the blockchain audit ledger
 */
const registerRecordHash = async (req, res, next) => {
  try {
    const { recordId, recordHash, metadata } = req.body;

    if (!recordId || !recordHash) {
      return res.status(400).json({
        success: false,
        message: 'recordId and recordHash are required.'
      });
    }

    const receipt = await blockchainService.registerRecord(recordId, recordHash, metadata);

    await logAction({
      user: req.user,
      action: 'BLOCKCHAIN_HASH_REGISTERED',
      resourceType: 'BLOCKCHAIN_AUDIT',
      resourceId: recordId,
      details: { recordHash, txHash: receipt.txHash },
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Cryptographic hash anchored to blockchain ledger.',
      receipt
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Verify a record against blockchain ledger
 */
const verifyRecordHash = async (req, res, next) => {
  try {
    const { recordId } = req.params;
    const { currentHash } = req.query;

    if (!currentHash) {
      return res.status(400).json({
        success: false,
        message: 'currentHash query parameter is required for comparison.'
      });
    }

    const result = await blockchainService.verifyRecord(recordId, currentHash);

    res.status(200).json({
      success: true,
      verification: result
    });
  } catch (err) {
    next(err);
  }
};

/**
 * List all entries in the blockchain audit ledger
 */
const getBlockchainLedger = async (req, res, next) => {
  try {
    const records = await blockchainService.getAllRegisteredRecords();

    res.status(200).json({
      success: true,
      records,
      totalEntries: records.length,
      network: 'Local Hardhat Node / Cryptographic SHA-256 State Ledger',
      smartContract: 'AuditRegistry.sol (0x5FbDB2315678afecb367f032d93F642f64180aa3)'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  registerRecordHash,
  verifyRecordHash,
  getBlockchainLedger
};
