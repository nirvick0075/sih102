const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: true });

const investigationSchema = new mongoose.Schema({
  investigationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  projectId: {
    type: String,
    required: true,
    index: true
  },
  investigatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  investigatorName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['NOT_INVESTIGATED', 'UNDER_INVESTIGATION', 'VERIFIED_ISSUE', 'NO_ISSUE_FOUND', 'ESCALATED', 'CLOSED'],
    default: 'UNDER_INVESTIGATION',
    index: true
  },
  notes: [noteSchema],
  findings: {
    type: String,
    default: ''
  },
  recommendedAction: {
    type: String,
    default: ''
  },
  reportHash: {
    type: String,
    default: null
  },
  blockchainTx: {
    type: String,
    default: null
  },
  blockchainTimestamp: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Investigation', investigationSchema);
