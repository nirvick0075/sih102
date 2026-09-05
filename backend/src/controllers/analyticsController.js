const Project = require('../models/Project');
const Contractor = require('../models/Contractor');
const Investigation = require('../models/Investigation');

/**
 * High-level executive KPI metrics for dashboard
 */
const getOverviewMetrics = async (req, res, next) => {
  try {
    const [
      totalProjects,
      flaggedProjects,
      criticalProjects,
      highProjects,
      mediumProjects,
      lowProjects,
      underInvestigation,
      verifiedIssues,
      totalContractors,
      financialAgg
    ] = await Promise.all([
      Project.countDocuments(),
      Project.countDocuments({ aiScore: { $gte: 60 } }),
      Project.countDocuments({ riskLevel: 'CRITICAL' }),
      Project.countDocuments({ riskLevel: 'HIGH' }),
      Project.countDocuments({ riskLevel: 'MEDIUM' }),
      Project.countDocuments({ riskLevel: 'LOW' }),
      Investigation.countDocuments({ status: 'UNDER_INVESTIGATION' }),
      Investigation.countDocuments({ status: 'VERIFIED_ISSUE' }),
      Contractor.countDocuments(),
      Project.aggregate([
        {
          $group: {
            _id: null,
            totalSanctioned: { $sum: '$sanctionedAmount' },
            totalEstimated: { $sum: '$estimatedCost' },
            totalActual: { $sum: '$actualCost' },
            totalPaid: { $sum: '$paymentAmount' },
            avgAiScore: { $avg: '$aiScore' }
          }
        }
      ])
    ]);

    const stats = financialAgg[0] || {
      totalSanctioned: 0,
      totalEstimated: 0,
      totalActual: 0,
      totalPaid: 0,
      avgAiScore: 0
    };

    const costOverrunTotal = Math.max(0, stats.totalActual - stats.totalEstimated);

    res.status(200).json({
      success: true,
      data: {
        totalProjects,
        flaggedProjects,
        criticalProjects,
        highProjects,
        mediumProjects,
        lowProjects,
        underInvestigation,
        verifiedIssues,
        totalContractors,
        totalSanctioned: stats.totalSanctioned,
        totalEstimated: stats.totalEstimated,
        totalActual: stats.totalActual,
        totalPaid: stats.totalPaid,
        costOverrunTotal,
        avgAiScore: Math.round(stats.avgAiScore || 0)
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Risk distribution breakdown and category heat breakdown
 */
const getRiskDistribution = async (req, res, next) => {
  try {
    const [distribution, categoryAgg] = await Promise.all([
      Project.aggregate([
        { $group: { _id: '$riskLevel', count: { $sum: 1 }, avgScore: { $avg: '$aiScore' } } }
      ]),
      Project.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            avgScore: { $avg: '$aiScore' },
            flaggedCount: {
              $sum: { $cond: [{ $gte: ['$aiScore', 60] }, 1, 0] }
            },
            totalSanctioned: { $sum: '$sanctionedAmount' }
          }
        },
        { $sort: { avgScore: -1 } }
      ])
    ]);

    const formattedDist = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0
    };

    distribution.forEach(d => {
      if (d._id && formattedDist[d._id] !== undefined) {
        formattedDist[d._id] = d.count;
      }
    });

    res.status(200).json({
      success: true,
      distribution: formattedDist,
      byCategory: categoryAgg
    });
  } catch (err) {
    next(err);
  }
};

/**
 * State-wise comparative analysis
 */
const getStateAnalysis = async (req, res, next) => {
  try {
    const states = await Project.aggregate([
      {
        $group: {
          _id: '$state',
          totalProjects: { $sum: 1 },
          flaggedProjects: {
            $sum: { $cond: [{ $gte: ['$aiScore', 60] }, 1, 0] }
          },
          avgRiskScore: { $avg: '$aiScore' },
          totalSanctioned: { $sum: '$sanctionedAmount' },
          totalActual: { $sum: '$actualCost' }
        }
      },
      { $sort: { avgRiskScore: -1 } }
    ]);

    const formatted = states.map(s => ({
      state: s._id,
      totalProjects: s.totalProjects,
      flaggedProjects: s.flaggedProjects,
      avgRiskScore: Math.round(s.avgRiskScore),
      anomalyRate: Math.round((s.flaggedProjects / Math.max(1, s.totalProjects)) * 100),
      totalSanctioned: s.totalSanctioned,
      totalActual: s.totalActual
    }));

    res.status(200).json({
      success: true,
      states: formatted
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOverviewMetrics,
  getRiskDistribution,
  getStateAnalysis
};
