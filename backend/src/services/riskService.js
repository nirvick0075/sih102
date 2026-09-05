const Contractor = require('../models/Contractor');
const Project = require('../models/Project');
const mlService = require('./mlService');

// Configurable weights (Default total = 100)
let RISK_WEIGHTS = {
  COST: 25,
  DELAY: 20,
  CONTRACTOR: 20,
  PAYMENT: 20,
  DUPLICATE_GEO: 15
};

/**
 * Updates risk weighting parameters (Admin privilege)
 */
const updateRiskWeights = (newWeights) => {
  RISK_WEIGHTS = { ...RISK_WEIGHTS, ...newWeights };
  return RISK_WEIGHTS;
};

const getRiskWeights = () => ({ ...RISK_WEIGHTS });

/**
 * Determines Risk Level label from score
 */
const getRiskLevel = (score) => {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 30) return 'MEDIUM';
  return 'LOW';
};

/**
 * Calculates project delay in days
 */
const calculateDelayDays = (expectedDate, actualDate, status) => {
  if (!expectedDate) return 0;
  const exp = new Date(expectedDate);
  const nowOrActual = actualDate ? new Date(actualDate) : new Date();
  
  if (status === 'COMPLETED' && actualDate) {
    const diff = (new Date(actualDate).getTime() - exp.getTime()) / (1000 * 3600 * 24);
    return Math.max(0, Math.round(diff));
  }
  
  if (status !== 'COMPLETED') {
    const diff = (nowOrActual.getTime() - exp.getTime()) / (1000 * 3600 * 24);
    return Math.max(0, Math.round(diff));
  }
  
  return 0;
};

/**
 * Evaluates duplicate / similar project patterns
 */
const checkDuplicatesAndCluster = async (project, allProjects) => {
  let similarityScore = 0;
  let reason = null;
  let duplicateClusterId = null;

  if (!allProjects || allProjects.length === 0) return { score: 0, reason: null, clusterId: null };

  const pName = (project.projectName || '').toLowerCase().trim();
  const pDistrict = (project.district || '').toLowerCase().trim();
  const pCategory = (project.category || '').toLowerCase().trim();
  const pCost = Number(project.estimatedCost || 0);

  for (const other of allProjects) {
    if (other.projectId === project.projectId) continue;

    const oName = (other.projectName || '').toLowerCase().trim();
    const oDistrict = (other.district || '').toLowerCase().trim();
    const oCategory = (other.category || '').toLowerCase().trim();
    const oCost = Number(other.estimatedCost || 0);

    // Exact or near-identical name in the same district/category
    const isSameDistrict = pDistrict === oDistrict;
    const isSameCategory = pCategory === oCategory;
    const costDiffPct = pCost > 0 ? Math.abs(pCost - oCost) / pCost : 0;

    if (isSameDistrict && isSameCategory && costDiffPct < 0.1) {
      if (pName === oName || pName.includes(oName) || oName.includes(pName)) {
        similarityScore = 85;
        duplicateClusterId = `CLUSTER-${pDistrict.toUpperCase().slice(0, 4)}-${Math.min(pCost, oCost)}`;
        reason = `Potential duplicate project detected: matches '${other.projectName}' (${other.projectId}) in ${project.district}`;
        break;
      }
    }
  }

  return {
    score: similarityScore,
    reason,
    clusterId: duplicateClusterId
  };
};

/**
 * Core Anomaly Assessment & Explainable AI Calculation Engine
 */
const evaluateProjectRisk = async (projectData, contractorRecord = null, existingProjects = []) => {
  const reasons = [];
  const riskFactors = [];

  const estimatedCost = Number(projectData.estimatedCost || projectData.sanctionedAmount || 1);
  const actualCost = Number(projectData.actualCost || estimatedCost);
  const paymentAmount = Number(projectData.paymentAmount || 0);
  const numberOfMilestones = Math.max(1, Number(projectData.numberOfMilestones || 4));
  const completedMilestones = Number(projectData.completedMilestones || 0);

  // 1. Cost Anomaly Vector (Weight: 25%)
  const costDeviationPct = estimatedCost > 0 ? ((actualCost - estimatedCost) / estimatedCost) * 100 : 0;
  let costScore = 0;
  if (costDeviationPct >= 50) {
    costScore = 100;
    reasons.push(`Actual cost is ${costDeviationPct.toFixed(1)}% above estimated budget (Critical budget overrun)`);
  } else if (costDeviationPct >= 30) {
    costScore = 75;
    reasons.push(`Actual cost is ${costDeviationPct.toFixed(1)}% above estimated budget`);
  } else if (costDeviationPct >= 15) {
    costScore = 40;
    reasons.push(`Moderate cost escalation of ${costDeviationPct.toFixed(1)}% observed`);
  } else if (costDeviationPct < -20) {
    costScore = 30; // Suspicious under-spending / incomplete work
    reasons.push(`Reported cost is ${Math.abs(costDeviationPct).toFixed(1)}% lower than sanctioned estimate`);
  }

  // 2. Delay Anomaly Vector (Weight: 20%)
  const delayDays = calculateDelayDays(
    projectData.expectedCompletionDate,
    projectData.actualCompletionDate,
    projectData.projectStatus
  );
  let delayScore = 0;
  if (delayDays >= 180) {
    delayScore = 100;
    reasons.push(`Project is severely delayed by ${delayDays} days past expected completion`);
  } else if (delayDays >= 90) {
    delayScore = 70;
    reasons.push(`Project is delayed by ${delayDays} days beyond schedule`);
  } else if (delayDays >= 30) {
    delayScore = 40;
    reasons.push(`Project timeline is delayed by ${delayDays} days`);
  }

  // 3. Contractor Track Record Vector (Weight: 20%)
  let contractorScore = 0;
  if (contractorRecord) {
    const delayRate = Number(contractorRecord.delayRate || 0);
    const costOverrunRate = Number(contractorRecord.costOverrunRate || 0);
    const anomalyRate = Number(contractorRecord.anomalyRate || 0);
    const verifiedIssueRate = Number(contractorRecord.verifiedIssueRate || 0);

    contractorScore = (delayRate * 0.25) + (costOverrunRate * 0.25) + (anomalyRate * 0.3) + (verifiedIssueRate * 0.2);

    if (anomalyRate >= 40) {
      reasons.push(`Contractor '${contractorRecord.name}' has high historical anomaly frequency (${anomalyRate.toFixed(0)}%)`);
    }
    if (verifiedIssueRate >= 20) {
      reasons.push(`Contractor has ${contractorRecord.verifiedIssueProjects || 1} past verified inspection issues`);
    }
  }

  // 4. Payment vs Milestone Alignment Vector (Weight: 20%)
  const milestoneProgressPct = (completedMilestones / numberOfMilestones) * 100;
  const paymentDisbursedPct = estimatedCost > 0 ? (paymentAmount / estimatedCost) * 100 : 0;
  const paymentMilestoneGap = paymentDisbursedPct - milestoneProgressPct;

  let paymentScore = 0;
  if (paymentMilestoneGap >= 40) {
    paymentScore = 100;
    reasons.push(`Payment disbursement (${paymentDisbursedPct.toFixed(0)}%) significantly exceeds physical milestone progress (${milestoneProgressPct.toFixed(0)}%)`);
  } else if (paymentMilestoneGap >= 20) {
    paymentScore = 60;
    reasons.push(`Payment disbursement is ${paymentMilestoneGap.toFixed(0)}% ahead of completed physical milestones`);
  } else if (paymentDisbursedPct > 100) {
    paymentScore = 80;
    reasons.push(`Total payments exceed 100% of sanctioned estimated cost`);
  }

  // 5. Duplicate & Geographic Density Vector (Weight: 15%)
  const duplicateResult = await checkDuplicatesAndCluster(projectData, existingProjects);
  let duplicateGeoScore = duplicateResult.score;
  if (duplicateResult.reason) {
    reasons.push(duplicateResult.reason);
  }

  // Call Python ML Service Isolation Forest (with fallback)
  const mlFeatures = {
    costDeviationPercentage: costDeviationPct,
    delayDays: delayDays,
    paymentCount: Number(projectData.numberOfPayments || 1),
    paymentAmount: paymentAmount,
    milestoneCompletionRate: milestoneProgressPct,
    paymentMilestoneMismatch: paymentMilestoneGap,
    contractorDelayRate: contractorRecord ? contractorRecord.delayRate : 15,
    contractorCostOverrunRate: contractorRecord ? contractorRecord.costOverrunRate : 10,
    contractorAnomalyRate: contractorRecord ? contractorRecord.anomalyRate : 10,
    costPerBeneficiary: Number(projectData.beneficiaryCount || 0) > 0 ? estimatedCost / Number(projectData.beneficiaryCount) : 0,
    projectDuration: 365,
    duplicateSimilarity: duplicateGeoScore
  };

  const mlResult = await mlService.predictAnomaly(mlFeatures);
  const mlAnomalyScore = (mlResult.anomalyScore || 0) * 100;

  // Weighted Aggregation
  const totalWeight = RISK_WEIGHTS.COST + RISK_WEIGHTS.DELAY + RISK_WEIGHTS.CONTRACTOR + RISK_WEIGHTS.PAYMENT + RISK_WEIGHTS.DUPLICATE_GEO;
  
  const rawRuleScore = (
    (costScore * RISK_WEIGHTS.COST) +
    (delayScore * RISK_WEIGHTS.DELAY) +
    (contractorScore * RISK_WEIGHTS.CONTRACTOR) +
    (paymentScore * RISK_WEIGHTS.PAYMENT) +
    (duplicateGeoScore * RISK_WEIGHTS.DUPLICATE_GEO)
  ) / (totalWeight || 100);

  // Blend Rule-Based Ensemble (70%) with ML Isolation Forest (30%)
  const combinedScore = Math.min(100, Math.max(0, Math.round((rawRuleScore * 0.7) + (mlAnomalyScore * 0.3))));
  const riskLevel = getRiskLevel(combinedScore);

  // Compute Explainable AI Contribution Percentages
  const componentPoints = {
    COST: (costScore * (RISK_WEIGHTS.COST / 100)),
    DELAY: (delayScore * (RISK_WEIGHTS.DELAY / 100)),
    CONTRACTOR: (contractorScore * (RISK_WEIGHTS.CONTRACTOR / 100)),
    PAYMENT: (paymentScore * (RISK_WEIGHTS.PAYMENT / 100)),
    DUPLICATE_GEO: (duplicateGeoScore * (RISK_WEIGHTS.DUPLICATE_GEO / 100))
  };

  const totalPoints = Object.values(componentPoints).reduce((a, b) => a + b, 0) || 1;

  riskFactors.push({
    name: 'Cost Escalation & Deviation',
    category: 'COST',
    score: Math.round(costScore),
    weight: RISK_WEIGHTS.COST,
    contributionPct: Math.round((componentPoints.COST / totalPoints) * 100),
    description: `Cost deviation of ${costDeviationPct.toFixed(1)}% against estimate`
  });

  riskFactors.push({
    name: 'Project Timeline & Delay',
    category: 'DELAY',
    score: Math.round(delayScore),
    weight: RISK_WEIGHTS.DELAY,
    contributionPct: Math.round((componentPoints.DELAY / totalPoints) * 100),
    description: `${delayDays} days deviation from scheduled target`
  });

  riskFactors.push({
    name: 'Contractor Risk Profile',
    category: 'CONTRACTOR',
    score: Math.round(contractorScore),
    weight: RISK_WEIGHTS.CONTRACTOR,
    contributionPct: Math.round((componentPoints.CONTRACTOR / totalPoints) * 100),
    description: contractorRecord ? `${contractorRecord.name} historical anomaly index` : 'Baseline contractor profile'
  });

  riskFactors.push({
    name: 'Payment vs Milestone Progress',
    category: 'PAYMENT',
    score: Math.round(paymentScore),
    weight: RISK_WEIGHTS.PAYMENT,
    contributionPct: Math.round((componentPoints.PAYMENT / totalPoints) * 100),
    description: `Disbursement: ${paymentDisbursedPct.toFixed(0)}% vs Milestones: ${milestoneProgressPct.toFixed(0)}%`
  });

  riskFactors.push({
    name: 'Duplicate & Geographic Cluster',
    category: 'DUPLICATE',
    score: Math.round(duplicateGeoScore),
    weight: RISK_WEIGHTS.DUPLICATE_GEO,
    contributionPct: Math.round((componentPoints.DUPLICATE_GEO / totalPoints) * 100),
    description: duplicateResult.reason || 'No duplicate clusters detected in district'
  });

  if (reasons.length === 0) {
    reasons.push('Parameters are within standard operational benchmarks');
  }

  return {
    aiScore: combinedScore,
    riskLevel,
    mlAnomalyScore: mlResult.anomalyScore || 0,
    costDeviationPct: parseFloat(costDeviationPct.toFixed(1)),
    delayDays,
    riskFactors,
    anomalyReasons: reasons,
    duplicateClusterId: duplicateResult.clusterId
  };
};

module.exports = {
  evaluateProjectRisk,
  calculateDelayDays,
  getRiskLevel,
  updateRiskWeights,
  getRiskWeights
};
