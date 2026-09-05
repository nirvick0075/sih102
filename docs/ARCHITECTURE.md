# System Architecture & Technical Specifications
## SIH26102 — MPLAD Intelligence & Anomaly Detection System

### 1. Architectural Philosophy
The MPLAD Intelligence System is structured following a high-reliability, multi-tier design optimized for government informatics:
- **Presentation Tier**: Pure HTML5, modern Vanilla CSS, and modular Vanilla ES6 JavaScript. No heavy frontend framework dependencies.
- **Application & Business Tier**: Node.js & Express.js MVC backend implementing strict Role-Based Access Control (RBAC), streaming CSV parsers, Explainable AI factor decomposition, and an audit trail engine.
- **Inference Tier**: Python FastAPI microservice utilizing Scikit-learn (Isolation Forest & Random Forest) for multivariate anomaly scoring.
- **Integrity Tier**: Solidity smart contract (`AuditRegistry.sol`) anchoring immutable SHA-256 cryptographic fingerprints.

---

### 2. Anomaly Scoring Mathematical Model

The **Investigation Priority Score ($S_{total}$)** is computed as an interpretable composite index ranging from 0 to 100:

$$S_{total} = \min\left(100, 0.70 \cdot S_{rules} + 0.30 \cdot (100 \cdot S_{ML})\right)$$

Where the rule-based ensemble score $S_{rules}$ is calculated across 5 weighted vectors:

$$S_{rules} = \frac{W_c \cdot S_c + W_d \cdot S_d + W_k \cdot S_k + W_p \cdot S_p + W_g \cdot S_g}{\sum W}$$

#### Anomaly Vectors & Default Weights:
1. **Cost Escalation Vector ($S_c$, $W_c = 25\%$)**:
   $$\Delta_{cost} = \frac{\text{Actual Cost} - \text{Estimated Cost}}{\text{Estimated Cost}} \times 100$$
2. **Timeline Delay Vector ($S_d$, $W_d = 20\%$)**:
   $$\text{Delay Days} = \max(0, \text{Date}_{current/actual} - \text{Date}_{expected})$$
3. **Contractor Historical Profile ($S_k$, $W_k = 20\%$)**:
   $$S_k = 0.25 \cdot R_{delay} + 0.25 \cdot R_{overrun} + 0.30 \cdot R_{anomaly} + 0.20 \cdot R_{verified\_issues}$$
4. **Disbursement vs Milestone Progress ($S_p$, $W_p = 20\%$)**:
   $$\Delta_{payment} = \left(\frac{\text{Payment Disbursed}}{\text{Estimated Cost}} \times 100\right) - \left(\frac{\text{Completed Milestones}}{\text{Total Milestones}} \times 100\right)$$
5. **Duplicate & Geospatial Concentration ($S_g$, $W_g = 15\%$)**:
   String token similarity + geographic proximity + cost variance check.

---

### 3. Explainable AI (XAI) Attribution
For every project evaluated, the contribution of each vector is normalized:

$$\text{Contribution}_i (\%) = \frac{S_i \cdot \frac{W_i}{100}}{\sum_{j} S_j \cdot \frac{W_j}{100}} \times 100$$

This produces clear, plain-language explanations (e.g. "Cost escalation contributed 34% to the High Priority score").
