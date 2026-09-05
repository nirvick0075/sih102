const Evidence = require('../models/Evidence');
const { hashFile } = require('../utils/hash');
const blockchainService = require('../services/blockchainService');
const { logAction } = require('../services/auditService');

/**
 * Upload an evidence file for an investigation
 */
const uploadEvidenceFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No evidence file uploaded.'
      });
    }

    const { projectId, investigationId = 'INV-GENERAL', title, description } = req.body;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'projectId is required for evidence attachment.'
      });
    }

    const filePath = req.file.path;
    const fileHash = await hashFile(filePath);
    const evidenceId = `EVD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;

    // Register file hash on blockchain
    const blockchainRes = await blockchainService.registerRecord(
      evidenceId,
      fileHash,
      {
        fileName: req.file.originalname,
        projectId,
        uploadedBy: req.user.email
      }
    );

    const evidence = new Evidence({
      evidenceId,
      projectId,
      investigationId,
      uploadedBy: req.user._id,
      uploadedByName: req.user.name,
      title: title || req.file.originalname,
      description: description || '',
      fileName: req.file.originalname,
      filePath: req.file.filename, // Store relative filename
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      fileHash,
      blockchainTransactionHash: blockchainRes.txHash,
      blockchainRegisteredAt: blockchainRes.timestamp,
      uploadedAt: new Date()
    });

    await evidence.save();

    await logAction({
      user: req.user,
      action: 'EVIDENCE_UPLOADED',
      resourceType: 'EVIDENCE',
      resourceId: evidenceId,
      details: {
        projectId,
        fileName: req.file.originalname,
        fileHash,
        blockchainTx: blockchainRes.txHash
      },
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Evidence uploaded and cryptographic hash anchored to blockchain ledger successfully.',
      evidence
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get evidence by ID
 */
const getEvidenceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const evidence = await Evidence.findOne({
      $or: [{ evidenceId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
    });

    if (!evidence) {
      return res.status(404).json({ success: false, message: 'Evidence not found.' });
    }

    res.status(200).json({ success: true, evidence });
  } catch (err) {
    next(err);
  }
};

/**
 * Cryptographically verify evidence integrity against blockchain ledger
 */
const verifyEvidenceIntegrity = async (req, res, next) => {
  try {
    const { id } = req.params;

    const evidence = await Evidence.findOne({
      $or: [{ evidenceId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
    });

    if (!evidence) {
      return res.status(404).json({ success: false, message: 'Evidence not found.' });
    }

    const verificationResult = await blockchainService.verifyRecord(
      evidence.evidenceId,
      evidence.fileHash
    );

    await logAction({
      user: req.user,
      action: 'EVIDENCE_INTEGRITY_VERIFIED',
      resourceType: 'EVIDENCE',
      resourceId: evidence.evidenceId,
      details: { verificationResult },
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      verificationResult
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadEvidenceFile,
  getEvidenceById,
  verifyEvidenceIntegrity
};
