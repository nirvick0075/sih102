const axios = require('axios');
const env = require('../config/env');

/**
 * Communicates with the Python FastAPI ML Service
 */
class MLService {
  constructor() {
    this.baseUrl = env.mlServiceUrl;
    this.timeout = 5000;
  }

  /**
   * Health check for ML service
   */
  async checkHealth() {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, { timeout: 2000 });
      return { isOnline: true, data: response.data };
    } catch (err) {
      return { isOnline: false, error: err.message };
    }
  }

  /**
   * Send project features to ML service for anomaly prediction
   */
  async predictAnomaly(features) {
    try {
      const response = await axios.post(`${this.baseUrl}/predict`, features, {
        timeout: this.timeout
      });
      return response.data;
    } catch (err) {
      // Fallback prediction heuristic if ML service is unreachable
      return this.fallbackPrediction(features);
    }
  }

  /**
   * Batch predict for multiple projects
   */
  async batchPredict(projectsList) {
    try {
      const response = await axios.post(`${this.baseUrl}/batch-predict`, { projects: projectsList }, {
        timeout: 15000
      });
      return response.data.predictions;
    } catch (err) {
      return projectsList.map(p => this.fallbackPrediction(p));
    }
  }

  /**
   * Trigger training job on Python ML service
   */
  async trainModel(trainingPayload) {
    try {
      const response = await axios.post(`${this.baseUrl}/train`, trainingPayload, {
        timeout: 60000 // ML training can take up to a minute
      });
      return response.data;
    } catch (err) {
      throw new Error(`ML Service Training Error: ${err.response?.data?.detail || err.message}`);
    }
  }

  /**
   * Fallback rule-guided isolation heuristic when Python service is starting up
   */
  fallbackPrediction(features) {
    const costDev = Number(features.costDeviationPercentage || 0);
    const delay = Number(features.delayDays || 0);
    const contractorAnomaly = Number(features.contractorAnomalyRate || 0);
    const paymentMismatch = Number(features.paymentMilestoneMismatch || 0);

    let anomalyScore = 0.1;
    const reasons = [];

    if (costDev > 35) {
      anomalyScore += 0.35;
      reasons.push(`Actual cost is ${costDev.toFixed(1)}% above estimated cost`);
    } else if (costDev > 15) {
      anomalyScore += 0.15;
    }

    if (delay > 90) {
      anomalyScore += 0.3;
      reasons.push(`Project is ${delay} days delayed beyond expected schedule`);
    } else if (delay > 30) {
      anomalyScore += 0.12;
    }

    if (contractorAnomaly > 40) {
      anomalyScore += 0.2;
      reasons.push(`Contractor has a high historical anomaly rate (${contractorAnomaly.toFixed(0)}%)`);
    }

    if (paymentMismatch > 25) {
      anomalyScore += 0.15;
      reasons.push(`Payment disbursement is ${paymentMismatch.toFixed(0)}% ahead of physical milestone completion`);
    }

    anomalyScore = Math.min(1.0, Math.max(0.0, anomalyScore));

    return {
      anomalyScore: parseFloat(anomalyScore.toFixed(3)),
      anomalyDetected: anomalyScore > 0.45,
      modelType: 'Isolation Forest (Ensemble Fallback)',
      riskFactors: reasons
    };
  }
}

module.exports = new MLService();
