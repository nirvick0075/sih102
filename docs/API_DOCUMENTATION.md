# API Specifications & Endpoint Catalog
## MPLAD Intelligence & Anomaly Detection System (SIH26102)

Base URL: `http://localhost:5000/api`

### 1. Authentication & Session
- `POST /auth/login`: Single entrypoint. Checks credentials or auto-registers standard `USER`.
- `GET /auth/me`: Fetches profile of currently authenticated JWT session.

### 2. Projects & CSV Ingestion
- `GET /projects`: List projects with search, filter (state, district, category, riskLevel, projectStatus), and pagination.
- `GET /projects/:id`: Get full 360° project dossier with milestones, payments, contractor, and evidence.
- `POST /projects`: Create single project (ADMIN only).
- `POST /projects/import`: Multipart CSV upload (ADMIN only).
- `POST /projects/:id/re-evaluate`: Recalculate AI score & Explainable AI factors (INVESTIGATOR, ADMIN).

### 3. Executing Contractors
- `GET /contractors`: List contractors sorted by anomaly index or delay frequency.
- `GET /contractors/:id`: Get contractor details and full project portfolio.

### 4. Investigation Cases
- `GET /investigations`: List investigation cases with status filters.
- `GET /investigations/:id`: Get case file details, findings, notes, and attached evidence.
- `POST /investigations`: Start a new investigation on a project (INVESTIGATOR, ADMIN).
- `PUT /investigations/:id`: Update status, notes, and findings (INVESTIGATOR, ADMIN).

### 5. Evidence & Blockchain Integrity
- `POST /evidence`: Multipart file upload. Computes SHA-256 and registers on blockchain (INVESTIGATOR, ADMIN).
- `POST /evidence/:id/verify`: Validates candidate file SHA-256 against on-chain smart contract hash.
- `GET /blockchain/ledger`: Lists all registered SHA-256 audit ledger entries.
- `GET /blockchain/verify/:recordId`: Validates an arbitrary record against blockchain ledger.

### 6. Analytics & Reports
- `GET /analytics/overview`: High-level executive KPIs (projects count, flagged count, cost overrun totals).
- `GET /analytics/risk-distribution`: Counts by risk tier (LOW, MEDIUM, HIGH, CRITICAL).
- `GET /analytics/state-analysis`: State-wise comparative anomaly rates.
- `GET /alerts`: Notification feed for high-priority triggers.
- `PUT /alerts/:id/read`: Mark alert as read.

### 7. Administration & ML Governance
- `GET /users`: List system users (ADMIN only).
- `POST /users`: Explicitly create user account with designated role (ADMIN only).
- `PUT /users/:id`: Change role or deactivate/activate account (ADMIN only).
- `GET /audit-logs`: System compliance audit trail (ADMIN only).
- `GET /ml/models`: List registered ML model versions and active weights.
- `POST /ml/train`: Retrain Isolation Forest / Random Forest on dataset (ADMIN only).
- `POST /ml/models/:id/activate`: Activate candidate model version for live inference (ADMIN only).
- `PUT /ml/config`: Update anomaly scoring weights (ADMIN only).
