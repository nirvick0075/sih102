const Contractor = require('../models/Contractor');
const Project = require('../models/Project');
const Investigation = require('../models/Investigation');

/**
 * List all contractors with computed risk scorecards
 */
const getContractors = async (req, res, next) => {
  try {
    const { search, state, district, sortBy = 'anomalyRate', order = 'desc', page = 1, limit = 20 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { contractorId: { $regex: search, $options: 'i' } },
        { registrationNumber: { $regex: search, $options: 'i' } }
      ];
    }

    if (state) query.state = state;
    if (district) query.district = district;

    const sortObj = {};
    sortObj[sortBy] = order === 'asc' ? 1 : -1;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [contractors, total] = await Promise.all([
      Contractor.find(query).sort(sortObj).skip(skip).limit(limitNum),
      Contractor.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      contractors,
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
 * Get Contractor details by contractorId with project portfolio
 */
const getContractorById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const contractor = await Contractor.findOne({
      $or: [{ contractorId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
    });

    if (!contractor) {
      return res.status(404).json({
        success: false,
        message: 'Contractor not found.'
      });
    }

    const projects = await Project.find({ contractorId: contractor.contractorId }).sort({ aiScore: -1 });

    res.status(200).json({
      success: true,
      contractor,
      projects
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Recalculate contractor performance features from live project & investigation data
 */
const recalculateContractorStats = async (contractorId) => {
  const projects = await Project.find({ contractorId });
  if (projects.length === 0) return null;

  const total = projects.length;
  let delayed = 0;
  let costOverruns = 0;
  let anomalous = 0;
  let totalCostDeviation = 0;

  projects.forEach(p => {
    if (p.delayDays > 30 || p.projectStatus === 'DELAYED') delayed++;
    if (p.costDeviationPct > 10) {
      costOverruns++;
      totalCostDeviation += p.costDeviationPct;
    }
    if (p.aiScore >= 60) anomalous++;
  });

  const projectIds = projects.map(p => p.projectId);
  const investigations = await Investigation.find({ projectId: { $in: projectIds } });
  const verifiedIssues = investigations.filter(i => i.status === 'VERIFIED_ISSUE').length;

  const delayRate = Math.round((delayed / total) * 100);
  const costOverrunRate = Math.round((costOverruns / total) * 100);
  const anomalyRate = Math.round((anomalous / total) * 100);
  const verifiedIssueRate = Math.round((verifiedIssues / Math.max(1, investigations.length)) * 100);
  const averageCostDeviation = costOverruns > 0 ? Math.round(totalCostDeviation / costOverruns) : 0;

  const riskScore = Math.min(100, Math.round((delayRate * 0.3) + (costOverrunRate * 0.3) + (anomalyRate * 0.4)));

  return await Contractor.findOneAndUpdate(
    { contractorId },
    {
      totalProjects: total,
      delayedProjects: delayed,
      totalCostOverruns: costOverruns,
      anomalousProjects: anomalous,
      investigatedProjects: investigations.length,
      verifiedIssueProjects: verifiedIssues,
      delayRate,
      costOverrunRate,
      anomalyRate,
      verifiedIssueRate,
      averageCostDeviation,
      riskScore
    },
    { new: true }
  );
};

module.exports = {
  getContractors,
  getContractorById,
  recalculateContractorStats
};
