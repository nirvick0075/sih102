const mongoose = require('mongoose');

const contractorSchema = new mongoose.Schema({
  contractorId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  registrationNumber: {
    type: String,
    required: true,
    unique: true
  },
  state: {
    type: String,
    required: true,
    index: true
  },
  district: {
    type: String,
    required: true
  },
  totalProjects: {
    type: Number,
    default: 0
  },
  completedProjects: {
    type: Number,
    default: 0
  },
  delayedProjects: {
    type: Number,
    default: 0
  },
  cancelledProjects: {
    type: Number,
    default: 0
  },
  totalCostOverruns: {
    type: Number,
    default: 0
  },
  averageCostDeviation: {
    type: Number,
    default: 0
  },
  anomalousProjects: {
    type: Number,
    default: 0
  },
  investigatedProjects: {
    type: Number,
    default: 0
  },
  verifiedIssueProjects: {
    type: Number,
    default: 0
  },
  // Computed Performance Metrics
  delayRate: {
    type: Number,
    default: 0 // percentage 0-100
  },
  costOverrunRate: {
    type: Number,
    default: 0 // percentage 0-100
  },
  anomalyRate: {
    type: Number,
    default: 0 // percentage 0-100
  },
  verifiedIssueRate: {
    type: Number,
    default: 0 // percentage 0-100
  },
  riskScore: {
    type: Number,
    default: 0 // 0-100
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Contractor', contractorSchema);
