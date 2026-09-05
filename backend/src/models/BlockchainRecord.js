const mongoose = require('mongoose');

const blockchainRecordSchema = new mongoose.Schema({
  recordId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  recordHash: {
    type: String,
    required: true
  },
  txHash: {
    type: String,
    required: true
  },
  blockNumber: {
    type: Number,
    default: 1042100
  },
  sender: {
    type: String,
    default: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
  },
  source: {
    type: String,
    default: 'AuditRegistry Smart Contract (Local Chain)'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('BlockchainRecord', blockchainRecordSchema);
