const Project = require('../models/Project');
const Contractor = require('../models/Contractor');
const Milestone = require('../models/Milestone');
const Payment = require('../models/Payment');
const Investigation = require('../models/Investigation');
const Evidence = require('../models/Evidence');
const Alert = require('../models/Alert');
const { parseProjectCsv } = require('../utils/csvParser');
const { evaluateProjectRisk } = require('../services/riskService');
const { logAction } = require('../services/auditService');

/**
 * List projects with comprehensive filtering, search, sorting and pagination
 */
const getProjects = async (req, res, next) => {
  try {
    const {
      search,
      state,
      district,
      category,
      riskLevel,
      projectStatus,
      contractor,
      minScore,
      maxScore,
      sortBy = 'aiScore',
      order = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { projectId: { $regex: search, $options: 'i' } },
        { projectName: { $regex: search, $options: 'i' } },
        { district: { $regex: search, $options: 'i' } },
        { state: { $regex: search, $options: 'i' } },
        { contractorName: { $regex: search, $options: 'i' } }
      ];
    }

    if (state) query.state = state;
    if (district) query.district = district;
    if (category) query.category = category;
    if (riskLevel) query.riskLevel = riskLevel.toUpperCase();
    if (projectStatus) query.projectStatus = projectStatus.toUpperCase();
    if (contractor) {
      query.$or = [
        { contractorId: contractor },
        { contractorName: { $regex: contractor, $options: 'i' } }
      ];
    }

    if (minScore !== undefined || maxScore !== undefined) {
      query.aiScore = {};
      if (minScore !== undefined) query.aiScore.$gte = Number(minScore);
      if (maxScore !== undefined) query.aiScore.$lte = Number(maxScore);
    }

    const sortObj = {};
    sortObj[sortBy] = order === 'asc' ? 1 : -1;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [projects, total] = await Promise.all([
      Project.find(query).sort(sortObj).skip(skip).limit(limitNum),
      Project.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      projects,
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
 * Get full 360-degree project dossier by ID
 */
const getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const project = await Project.findOne({
      $or: [{ projectId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    // Fetch related datasets
    const [contractor, milestones, payments, investigation, evidence] = await Promise.all([
      Contractor.findOne({ contractorId: project.contractorId }),
      Milestone.find({ projectId: project.projectId }).sort({ expectedDate: 1 }),
      Payment.find({ projectId: project.projectId }).sort({ paymentDate: -1 }),
      Investigation.findOne({ projectId: project.projectId }),
      Evidence.find({ projectId: project.projectId }).sort({ uploadedAt: -1 })
    ]);

    res.status(200).json({
      success: true,
      project,
      contractor: contractor || {
        contractorId: project.contractorId,
        name: project.contractorName,
        totalProjects: 1,
        delayRate: 0,
        costOverrunRate: 0,
        anomalyRate: 0
      },
      milestones,
      payments,
      investigation,
      evidence
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new single project record (Admin only)
 */
const createProject = async (req, res, next) => {
  try {
    const data = req.body;
    const projectId = data.projectId || `MPLAD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;

    const contractor = await Contractor.findOne({ contractorId: data.contractorId });
    const existingProjects = await Project.find({ district: data.district }).limit(50);

    const riskEval = await evaluateProjectRisk(data, contractor, existingProjects);

    const newProject = new Project({
      ...data,
      projectId,
      aiScore: riskEval.aiScore,
      riskLevel: riskEval.riskLevel,
      mlAnomalyScore: riskEval.mlAnomalyScore,
      costDeviationPct: riskEval.costDeviationPct,
      delayDays: riskEval.delayDays,
      riskFactors: riskEval.riskFactors,
      anomalyReasons: riskEval.anomalyReasons,
      duplicateClusterId: riskEval.duplicateClusterId
    });

    await newProject.save();

    // Create high-risk alert if required
    if (['HIGH', 'CRITICAL'].includes(riskEval.riskLevel)) {
      await Alert.create({
        alertId: `ALT-${Date.now().toString(36).toUpperCase()}`,
        projectId: newProject.projectId,
        projectName: newProject.projectName,
        riskLevel: riskEval.riskLevel,
        aiScore: riskEval.aiScore,
        message: `Project ${newProject.projectId} has been classified as ${riskEval.riskLevel} investigation priority (Score: ${riskEval.aiScore}/100).`,
        category: 'HIGH_RISK_TRIGGER'
      });
    }

    await logAction({
      user: req.user,
      action: 'PROJECT_CREATED',
      resourceType: 'PROJECT',
      resourceId: newProject.projectId,
      details: { projectName: newProject.projectName, aiScore: newProject.aiScore, riskLevel: newProject.riskLevel },
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Project created and analyzed successfully.',
      project: newProject
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Import projects from uploaded CSV file (Admin only)
 */
const importProjectsCsv = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a valid CSV file.'
      });
    }

    const parseResult = await parseProjectCsv(req.file.path);
    const { validRows, totalRows, validCount, invalidCount, invalidRows } = parseResult;

    if (validCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid project records found in uploaded CSV.',
        invalidRows
      });
    }

    const importedProjects = [];
    const createdAlerts = [];
    const allExisting = await Project.find({}).limit(500);

    for (const row of validRows) {
      const contractor = await Contractor.findOne({ contractorId: row.contractorId });
      const riskEval = await evaluateProjectRisk(row, contractor, allExisting);

      const projectDoc = {
        ...row,
        aiScore: riskEval.aiScore,
        riskLevel: riskEval.riskLevel,
        mlAnomalyScore: riskEval.mlAnomalyScore,
        costDeviationPct: riskEval.costDeviationPct,
        delayDays: riskEval.delayDays,
        riskFactors: riskEval.riskFactors,
        anomalyReasons: riskEval.anomalyReasons,
        duplicateClusterId: riskEval.duplicateClusterId
      };

      // Upsert project
      const saved = await Project.findOneAndUpdate(
        { projectId: row.projectId },
        projectDoc,
        { upsert: true, new: true }
      );
      importedProjects.push(saved);

      // Check if alert needed
      if (['HIGH', 'CRITICAL'].includes(riskEval.riskLevel)) {
        createdAlerts.push({
          alertId: `ALT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000)}`,
          projectId: saved.projectId,
          projectName: saved.projectName,
          riskLevel: riskEval.riskLevel,
          aiScore: riskEval.aiScore,
          message: `Project ${saved.projectId} has been classified as ${riskEval.riskLevel} investigation priority (Score: ${riskEval.aiScore}/100).`,
          category: 'CSV_IMPORT_HIGH_RISK'
        });
      }
    }

    if (createdAlerts.length > 0) {
      await Alert.insertMany(createdAlerts);
    }

    await logAction({
      user: req.user,
      action: 'DATASET_CSV_IMPORTED',
      resourceType: 'PROJECT',
      details: {
        totalRows,
        validImported: importedProjects.length,
        invalidRows: invalidCount,
        alertsCreated: createdAlerts.length
      },
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: `CSV processed successfully: ${importedProjects.length} projects imported, ${invalidCount} invalid rows skipped.`,
      summary: {
        totalRows,
        validCount: importedProjects.length,
        invalidCount,
        alertsGenerated: createdAlerts.length,
        invalidPreview: invalidRows
      }
    });

  } catch (err) {
    next(err);
  }
};

/**
 * Re-evaluate project anomaly indicators
 */
const reevaluateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const project = await Project.findOne({ projectId: id });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const contractor = await Contractor.findOne({ contractorId: project.contractorId });
    const existingProjects = await Project.find({ district: project.district, projectId: { $ne: project.projectId } }).limit(50);

    const riskEval = await evaluateProjectRisk(project, contractor, existingProjects);

    project.aiScore = riskEval.aiScore;
    project.riskLevel = riskEval.riskLevel;
    project.mlAnomalyScore = riskEval.mlAnomalyScore;
    project.costDeviationPct = riskEval.costDeviationPct;
    project.delayDays = riskEval.delayDays;
    project.riskFactors = riskEval.riskFactors;
    project.anomalyReasons = riskEval.anomalyReasons;
    project.duplicateClusterId = riskEval.duplicateClusterId;

    await project.save();

    res.status(200).json({
      success: true,
      message: 'Project anomaly indicators re-evaluated successfully.',
      project
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update existing project details (Admin only)
 */
const updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const project = await Project.findOne({
      $or: [{ projectId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    // Merge updates
    Object.assign(project, updates);

    // Re-evaluate risk with updated parameters
    const contractor = await Contractor.findOne({ contractorId: project.contractorId });
    const existingProjects = await Project.find({ district: project.district, projectId: { $ne: project.projectId } }).limit(50);
    const riskEval = await evaluateProjectRisk(project, contractor, existingProjects);

    project.aiScore = riskEval.aiScore;
    project.riskLevel = riskEval.riskLevel;
    project.mlAnomalyScore = riskEval.mlAnomalyScore;
    project.costDeviationPct = riskEval.costDeviationPct;
    project.delayDays = riskEval.delayDays;
    project.riskFactors = riskEval.riskFactors;
    project.anomalyReasons = riskEval.anomalyReasons;
    project.duplicateClusterId = riskEval.duplicateClusterId;

    await project.save();

    // Trigger alert if elevated to high risk
    if (['HIGH', 'CRITICAL'].includes(riskEval.riskLevel)) {
      const existingAlert = await Alert.findOne({ projectId: project.projectId, isRead: false });
      if (!existingAlert) {
        await Alert.create({
          alertId: `ALT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000)}`,
          projectId: project.projectId,
          projectName: project.projectName,
          riskLevel: riskEval.riskLevel,
          aiScore: riskEval.aiScore,
          message: `Updated project ${project.projectId} classified as ${riskEval.riskLevel} (AI Risk Score: ${riskEval.aiScore}/100).`,
          category: 'PROJECT_UPDATED_HIGH_RISK'
        });
      }
    }

    await logAction({
      user: req.user,
      action: 'PROJECT_UPDATED',
      resourceType: 'PROJECT',
      resourceId: project.projectId,
      details: { updates, newAiScore: project.aiScore, newRiskLevel: project.riskLevel },
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Project updated and re-evaluated successfully in database.',
      project
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  importProjectsCsv,
  reevaluateProject
};
