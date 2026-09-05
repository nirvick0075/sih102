const mongoose = require('mongoose');

const riskFactorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true }, // 'COST', 'DELAY', 'CONTRACTOR', 'PAYMENT', 'DUPLICATE', 'GEOGRAPHIC'
  score: { type: Number, default: 0 },
  weight: { type: Number, default: 0 },
  contributionPct: { type: Number, default: 0 },
  description: { type: String, default: '' }
}, { _id: false });

const projectSchema = new mongoose.Schema({
  projectId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  projectName: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    required: true,
    index: true
  },
  district: {
    type: String,
    required: true,
    index: true
  },
  constituency: {
    type: String,
    required: true
  },
  location: {
    type: String,
    default: ''
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true, // Roads, Drinking Water, Health, Education, Community Halls, Irrigation, Sanitation, Solar/Power
    index: true
  },
  sanctionedAmount: {
    type: Number,
    required: true
  },
  estimatedCost: {
    type: Number,
    required: true
  },
  actualCost: {
    type: Number,
    default: 0
  },
  startDate: {
    type: Date,
    required: true
  },
  expectedCompletionDate: {
    type: Date,
    required: true
  },
  actualCompletionDate: {
    type: Date,
    default: null
  },
  projectStatus: {
    type: String,
    enum: ['SANCTIONED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'HALTED', 'CANCELLED'],
    default: 'IN_PROGRESS',
    index: true
  },
  contractorId: {
    type: String,
    required: true,
    index: true
  },
  contractorName: {
    type: String,
    required: true
  },
  numberOfMilestones: {
    type: Number,
    default: 0
  },
  completedMilestones: {
    type: Number,
    default: 0
  },
  paymentAmount: {
    type: Number,
    default: 0
  },
  numberOfPayments: {
    type: Number,
    default: 0
  },
  inspectionStatus: {
    type: String,
    enum: ['PENDING', 'PASSED', 'FLAGGED_INSPECTION', 'NOT_REQUIRED', 'COMPLIANT', 'FLAGGED'],
    default: 'PENDING'
  },
  beneficiaryCount: {
    type: Number,
    default: 0
  },
  description: {
    type: String,
    default: ''
  },
  // Anomaly & Risk Analytics
  aiScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
    index: true
  },
  riskLevel: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'LOW',
    index: true
  },
  mlAnomalyScore: {
    type: Number,
    default: 0
  },
  costDeviationPct: {
    type: Number,
    default: 0
  },
  delayDays: {
    type: Number,
    default: 0
  },
  riskFactors: [riskFactorSchema],
  anomalyReasons: [{
    type: String
  }],
  duplicateClusterId: {
    type: String,
    default: null
  },
  investigationStatus: {
    type: String,
    enum: ['NOT_INVESTIGATED', 'UNDER_INVESTIGATION', 'VERIFIED_ISSUE', 'NO_ISSUE_FOUND', 'ESCALATED', 'CLOSED'],
    default: 'NOT_INVESTIGATED',
    index: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Project', projectSchema);
