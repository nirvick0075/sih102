const mongoose = require('mongoose');

const modelVersionSchema = new mongoose.Schema({
  versionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  versionTag: {
    type: String,
    required: true
  },
  modelType: {
    type: String,
    enum: ['Isolation Forest', 'Random Forest', 'Rule-Based Ensemble'],
    default: 'Isolation Forest'
  },
  trainingDate: {
    type: Date,
    default: Date.now
  },
  trainingRows: {
    type: Number,
    default: 0
  },
  features: [{
    type: String
  }],
  metrics: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  modelFile: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: false,
    index: true
  },
  status: {
    type: String,
    enum: ['TRAINED', 'ACTIVE', 'ARCHIVED'],
    default: 'TRAINED'
  },
  activatedAt: {
    type: Date,
    default: null
  },
  description: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ModelVersion', modelVersionSchema);
