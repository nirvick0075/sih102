const Investigation = require('../models/Investigation');
const Project = require('../models/Project');
const Evidence = require('../models/Evidence');
const { logAction } = require('../services/auditService');
const { recalculateContractorStats } = require('./contractorController');
const { hashObject } = require('../utils/hash');
const blockchainService = require('../services/blockchainService');

/**
 * Start a new investigation on a project
 */
const startInvestigation = async (req, res, next) => {
  try {
    const { projectId, notes = 'Initial investigation initiated based on high AI anomaly priority score.' } = req.body;

    if (!projectId) {
      return res.status(400).json({ success: false, message: 'projectId is required.' });
    }

    const project = await Project.findOne({ projectId });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    let investigation = await Investigation.findOne({ projectId });
    if (investigation) {
      return res.status(400).json({
        success: false,
        message: 'An active investigation already exists for this project.',
        investigationId: investigation.investigationId
      });
    }

    const investigationId = `INV-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;

    investigation = new Investigation({
      investigationId,
      projectId,
      investigatorId: req.user._id,
      investigatorName: req.user.name,
      status: 'UNDER_INVESTIGATION',
      notes: [{
        authorId: String(req.user._id),
        authorName: req.user.name,
        text: notes,
        timestamp: new Date()
      }]
    });

    await investigation.save();

    // Update project state
    project.investigationStatus = 'UNDER_INVESTIGATION';
    await project.save();

    await logAction({
      user: req.user,
      action: 'INVESTIGATION_STARTED',
      resourceType: 'INVESTIGATION',
      resourceId: investigationId,
      details: { projectId, projectAiScore: project.aiScore },
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: `Investigation ${investigationId} initiated for project ${projectId}.`,
      investigation
    });
  } catch (err) {
    next(err);
  }
};

/**
 * List all investigations with filtering and status breakdown
 */
const getInvestigations = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) {
      query.status = status.toUpperCase();
    }

    if (search) {
      query.$or = [
        { investigationId: { $regex: search, $options: 'i' } },
        { projectId: { $regex: search, $options: 'i' } },
        { investigatorName: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [investigations, total] = await Promise.all([
      Investigation.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limitNum),
      Investigation.countDocuments(query)
    ]);

    // Enhance with project title and risk score
    const projectIds = investigations.map(i => i.projectId);
    const projects = await Project.find({ projectId: { $in: projectIds } }).select('projectId projectName district state aiScore riskLevel');
    const projectMap = new Map(projects.map(p => [p.projectId, p]));

    const enhanced = investigations.map(inv => {
      const p = projectMap.get(inv.projectId);
      return {
        ...inv.toObject(),
        projectName: p ? p.projectName : 'Unknown Project',
        district: p ? p.district : '',
        state: p ? p.state : '',
        aiScore: p ? p.aiScore : 0,
        riskLevel: p ? p.riskLevel : 'LOW'
      };
    });

    res.status(200).json({
      success: true,
      investigations: enhanced,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get investigation by ID
 */
const getInvestigationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const investigation = await Investigation.findOne({
      $or: [{ investigationId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
    });

    if (!investigation) {
      return res.status(404).json({ success: false, message: 'Investigation not found.' });
    }

    const [project, evidence] = await Promise.all([
      Project.findOne({ projectId: investigation.projectId }),
      Evidence.find({ investigationId: investigation.investigationId }).sort({ uploadedAt: -1 })
    ]);

    res.status(200).json({
      success: true,
      investigation,
      project,
      evidence
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update investigation findings, notes, or status
 */
const updateInvestigation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, findings, noteText, recommendedAction } = req.body;

    const investigation = await Investigation.findOne({
      $or: [{ investigationId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
    });

    if (!investigation) {
      return res.status(404).json({ success: false, message: 'Investigation record not found.' });
    }

    const previousStatus = investigation.status;

    if (status && ['NOT_INVESTIGATED', 'UNDER_INVESTIGATION', 'VERIFIED_ISSUE', 'NO_ISSUE_FOUND', 'ESCALATED', 'CLOSED'].includes(status)) {
      investigation.status = status;
    }

    if (findings !== undefined) investigation.findings = findings;
    if (recommendedAction !== undefined) investigation.recommendedAction = recommendedAction;

    if (noteText && noteText.trim()) {
      investigation.notes.push({
        authorId: String(req.user._id),
        authorName: req.user.name,
        text: noteText.trim(),
        timestamp: new Date()
      });
    }

    // Register integrity hash if closing or completing findings
    if (investigation.status === 'VERIFIED_ISSUE' || investigation.status === 'NO_ISSUE_FOUND' || investigation.status === 'CLOSED') {
      const reportPayload = {
        investigationId: investigation.investigationId,
        projectId: investigation.projectId,
        status: investigation.status,
        findings: investigation.findings,
        recommendedAction: investigation.recommendedAction,
        closedAt: new Date().toISOString()
      };
      const reportHash = hashObject(reportPayload);
      investigation.reportHash = reportHash;

      // Register on blockchain
      const blockchainRes = await blockchainService.registerRecord(
        investigation.investigationId,
        reportHash,
        { type: 'INVESTIGATION_REPORT', projectId: investigation.projectId, status: investigation.status }
      );
      investigation.blockchainTx = blockchainRes.txHash;
      investigation.blockchainTimestamp = blockchainRes.timestamp;
    }

    await investigation.save();

    // Update associated project status
    const project = await Project.findOne({ projectId: investigation.projectId });
    if (project) {
      project.investigationStatus = investigation.status;
      await project.save();

      // Recalculate contractor track record
      if (project.contractorId) {
        await recalculateContractorStats(project.contractorId);
      }
    }

    await logAction({
      user: req.user,
      action: 'INVESTIGATION_UPDATED',
      resourceType: 'INVESTIGATION',
      resourceId: investigation.investigationId,
      details: {
        previousStatus,
        newStatus: investigation.status,
        blockchainRegistered: !!investigation.blockchainTx
      },
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Investigation updated successfully.',
      investigation
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  startInvestigation,
  getInvestigations,
  getInvestigationById,
  updateInvestigation
};
