# MPLAD Intelligence & Anomaly Detection System (SIH26102)

[![Smart India Hackathon](https://img.shields.io/badge/SIH-2026-orange.svg)](https://sih.gov.in)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-green.svg)](https://nodejs.org)
[![Python ML](https://img.shields.io/badge/ML%20Service-FastAPI%20%7C%20Scikit--Learn-blue.svg)](https://fastapi.tiangolo.com)
[![Frontend](https://img.shields.io/badge/Frontend-Vanilla%20HTML5%20%7C%20CSS3%20%7C%20JS-yellow.svg)](https://developer.mozilla.org)
[![Blockchain](https://img.shields.io/badge/Blockchain-Solidity%20%7C%20Hardhat-purple.svg)](https://hardhat.org)

An AI-driven decision-support and anomaly detection platform for the **Members of Parliament Local Area Development Scheme (MPLADS)**. The system analyzes cost escalations, schedule delays, historical contractor irregularities, milestone-payment discrepancies, and duplicate project clusters to compute an interpretable **Investigation Priority Score (0–100)** for human auditors.

---

## 🏛️ Core Philosophy: Decision Support (Not Automated Accusation)

> **Important**: The system does **NOT** declare that a project is fraudulent.  
> It generates **Anomaly Indicators**, an **Investigation Priority Score**, a **Risk Level** (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), and **Explainable AI (XAI)** factor contributions.  
> Final legal and administrative determinations remain strictly in the hands of authorized human investigators.

---

## 🚀 Key Features

1. **Unified Single-Form Authentication (Automatic Role Detection)**:
   - Exactly **one login page** with Email & Password.
   - **Zero role dropdowns or selectors**. Role (`ADMIN`, `INVESTIGATOR`, `USER`) is retrieved automatically from MongoDB.
   - Unrecognized emails are automatically provisioned as citizen `USER` accounts with bcrypt password hashing.
2. **6-Vector Anomaly & Explainable AI (XAI) Engine**:
   - **Cost Escalation**: Budget deviation against sanctioned estimates.
   - **Timeline Inefficiencies**: Milestone delays past scheduled completion dates.
   - **Contractor Historical Track Record**: Dynamically aggregated delay and overrun rates.
   - **Payment-Milestone Discrepancies**: Excessive disbursements ahead of physical construction.
   - **Duplicate Project Clustering**: Flagging identical projects sanctioned within the same district/category.
   - **Geospatial Concentration**: Spatial clustering of high-priority anomalies displayed on Leaflet GIS maps.
3. **Dual Machine Learning Workflow**:
   - **Flow A (Project Ingestion)**: Ingest project CSV -> Instant inference with active Isolation Forest & Explainable AI -> Dashboard updates.
   - **Flow B (Model Governance)**: Upload training datasets or export historical closed cases -> FastAPI model training -> Version registration with precision/recall/silhouette metrics -> One-click activation by Admin.
4. **Tamper-Evident Blockchain Audit Trail**:
   - Anchors SHA-256 cryptographic fingerprints of inspection evidence and closed investigation reports to an Ethereum smart contract (`AuditRegistry.sol`).
   - Interactive on-the-fly verification recomputes file hashes in real-time to guarantee evidence integrity.

---

## 🔑 Demonstration Credentials

| Role | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@demo.com` | `Admin@123` | Full access: User management, ML training & activation, CSV imports, audit logs |
| **Senior Investigator** | `investigator@demo.com` | `Investigator@123` | Case file workbench, start investigations, log findings, upload evidence, blockchain verification |
| **Citizen / Viewer** | *Any new email* (e.g. `citizen@gov.in`) | *Any password* (min 6 chars) | Read-only analytics, project directory, GIS map, contractor performance scorecards |

---

## 📂 Project Architecture

```
mplad-intelligence/
├── backend/                  # Node.js + Express MVC API
│   ├── src/
│   │   ├── config/           # MongoDB connection with zero-friction in-memory fallback
│   │   ├── models/           # 10 Mongoose schemas (User, Project, Contractor, etc.)
│   │   ├── controllers/      # Express controllers
│   │   ├── routes/           # REST routes with strict RBAC middleware
│   │   ├── services/         # Risk engine, ML client, blockchain service, audit logging
│   │   ├── utils/            # SHA-256 hash, CSV stream parser, validators
│   │   └── seed/             # Seed scripts (seedUsers.js, seedProjects.js)
│   └── package.json
├── frontend/                 # Clean, modern Vanilla JS / HTML5 / CSS3 Portal
│   ├── index.html            # Entrypoint & Executive Analytics Dashboard
│   ├── login.html            # Mandatory Single-Form Smart Login
│   ├── projects.html         # Filterable Projects Repository with CSV Ingestion
│   ├── project-details.html  # 360° Dossier with Explainable AI & Timeline
│   ├── investigations.html   # Active Inquiry Cases Hub
│   ├── investigation-details.html # Case File Workbench & Evidence Uploader
│   ├── contractors.html      # Contractor Performance Scorecards & Portfolios
│   ├── map.html              # Leaflet.js Interactive GIS Anomaly Map
│   ├── alerts.html           # Real-Time Anomaly Notification Center
│   ├── reports.html          # Standardized Printable / PDF Report Generator
│   ├── blockchain.html       # Blockchain Audit Ledger & Instant Hash Verifier
│   ├── admin.html            # Admin User Management & Compliance Audit Trail
│   ├── ml-management.html    # Model Training, Metrics & Version Activation
│   ├── css/                  # style.css, dashboard.css, forms.css
│   └── js/                   # Modular API, Auth, and Page Controllers
├── ml-service/               # Python FastAPI Machine Learning Service
│   ├── app/
│   │   ├── main.py           # FastAPI entrypoint
│   │   ├── services/         # Isolation Forest & Random Forest services
│   │   └── routes/           # /predict, /batch-predict, /train, /health
│   └── requirements.txt
├── blockchain/               # Hardhat & Solidity Smart Contracts
│   ├── contracts/AuditRegistry.sol # Immutable SHA-256 hash registry
│   └── hardhat.config.js
└── README.md
```

---

## ⚡ Quickstart Guide

### Prerequisites
- Node.js (v18+)
- Python (3.10+)

### 1. Install & Start Backend (Node.js)
```bash
cd backend
npm install

# Run database seed (Creates Admin, Investigator, and 1,200+ synthetic demonstration records)
npm run seed

# Start API Server & Static Frontend
npm start
```
*The backend automatically starts on `http://localhost:5000` and serves the complete frontend portal at `http://localhost:5000/index.html`.*  
*(Note: If local MongoDB is not running, the backend automatically initializes an embedded in-memory MongoDB instance for zero-friction hackathon evaluation!)*

### 2. Start Python ML Service (FastAPI)
```bash
cd ml-service
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*The ML Service runs on `http://127.0.0.1:8000` with interactive API docs at `http://127.0.0.1:8000/docs`.*

### 3. (Optional) Run Local Blockchain Node
```bash
cd blockchain
npm install
npx hardhat node
```

---

## 🛡️ Tamper-Evident Evidence Verification Workflow

1. An investigator attaches a site inspection image/document on `investigation-details.html`.
2. The backend generates a **SHA-256 cryptographic hash** of the raw file and records the transaction receipt onto the `AuditRegistry.sol` smart contract.
3. At any time, an auditor can click **"Verify On Blockchain"** or paste the hash into `blockchain.html`. The engine re-computes the file's binary hash and verifies equality against the immutable blockchain ledger.

---

## ⚖️ Hackathon Disclaimer
*This system is developed as a prototype for Smart India Hackathon problem statement **SIH26102**. Demonstration datasets and synthetic anomaly distributions are for evaluation and illustrative purposes.*
