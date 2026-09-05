const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app, startServer } = require('../src/server');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Project = require('../src/models/Project');
const { evaluateProjectRisk, getRiskLevel } = require('../src/services/riskService');
const blockchainService = require('../src/services/blockchainService');

const { ensureDefaultAccounts } = require('../src/utils/initAccounts');

let adminToken = '';
let investigatorToken = '';
let citizenToken = '';

test.before(async () => {
  await connectDB();
  await ensureDefaultAccounts();
});

test.after(async () => {
  await disconnectDB();
});

test('1. AUTHENTICATION: Mandatory Single-Form Smart Login', async (t) => {
  await t.test('Case 1: Existing Admin login with correct password returns role ADMIN', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@demo.com', password: 'Admin@123' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.user.role, 'ADMIN');
    assert.ok(res.body.token);
    adminToken = res.body.token;
  });

  await t.test('Case 2: Existing Admin login with WRONG password returns 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@demo.com', password: 'WrongPassword999' });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  await t.test('Case 3: Existing Investigator login returns role INVESTIGATOR', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'investigator@demo.com', password: 'Investigator@123' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.role, 'INVESTIGATOR');
    investigatorToken = res.body.token;
  });

  await t.test('Case 4: Unknown email automatically registers and logs in as USER', async () => {
    const randomEmail = `citizen_${Date.now()}@testgov.in`;
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: randomEmail, password: 'CitizenPassword@123' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.user.role, 'USER');
    assert.ok(res.body.token);
    citizenToken = res.body.token;

    // Verify user was stored in MongoDB with bcrypt hash
    const savedUser = await User.findOne({ email: randomEmail });
    assert.ok(savedUser);
    assert.strictEqual(savedUser.role, 'USER');
    assert.notStrictEqual(savedUser.passwordHash, 'CitizenPassword@123');
  });
});

test('2. RBAC AUTHORIZATION: Backend Security Enforcement', async (t) => {
  await t.test('Admin route /api/users is accessible by Admin', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.users));
  });

  await t.test('Admin route /api/users returns 403 Forbidden when called by Investigator', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${investigatorToken}`);

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
  });

  await t.test('Admin route /api/users returns 403 Forbidden when called by standard USER', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${citizenToken}`);

    assert.strictEqual(res.status, 403);
  });

  await t.test('Unauthenticated request to protected endpoint returns 401 Access Denied', async () => {
    const res = await request(app).get('/api/projects');
    assert.strictEqual(res.status, 401);
  });
});

test('3. ANOMALY ENGINE & EXPLAINABLE AI', async (t) => {
  await t.test('Risk Service properly flags cost overruns and severe timeline delays', async () => {
    const mockProject = {
      projectId: 'TEST-ANOM-001',
      projectName: 'Test Overrun Road Construction',
      estimatedCost: 2000000,
      actualCost: 3200000, // 60% overrun
      startDate: new Date('2024-01-01'),
      expectedCompletionDate: new Date('2024-06-01'),
      actualCompletionDate: null,
      projectStatus: 'DELAYED',
      paymentAmount: 2800000,
      numberOfMilestones: 4,
      completedMilestones: 1, // 87.5% paid vs 25% completed milestones
      beneficiaryCount: 500
    };

    const mockContractor = {
      name: 'High Risk Contractor Ltd',
      delayRate: 65,
      costOverrunRate: 50,
      anomalyRate: 70,
      verifiedIssueRate: 35
    };

    const result = await evaluateProjectRisk(mockProject, mockContractor, []);

    assert.ok(result.aiScore >= 60, `Expected High/Critical score, got ${result.aiScore}`);
    assert.ok(['HIGH', 'CRITICAL'].includes(result.riskLevel));
    assert.ok(result.riskFactors.length >= 5);
    assert.ok(result.anomalyReasons.length > 0);
    assert.strictEqual(result.costDeviationPct, 60.0);
  });

  await t.test('Risk Service evaluates benign normal project as LOW risk', async () => {
    const normalProject = {
      projectId: 'TEST-NORM-001',
      projectName: 'Normal Community Center',
      estimatedCost: 2500000,
      actualCost: 2550000, // 2% deviation
      startDate: new Date(),
      expectedCompletionDate: new Date(Date.now() + 180 * 24 * 3600 * 1000),
      actualCompletionDate: null,
      projectStatus: 'IN_PROGRESS',
      paymentAmount: 1250000,
      numberOfMilestones: 4,
      completedMilestones: 2,
      beneficiaryCount: 1200
    };

    const normalContractor = {
      name: 'Standard Builders',
      delayRate: 8,
      costOverrunRate: 5,
      anomalyRate: 5,
      verifiedIssueRate: 0
    };

    const result = await evaluateProjectRisk(normalProject, normalContractor, []);
    assert.ok(result.aiScore < 40, `Expected low/normal score, got ${result.aiScore}`);
  });
});

test('4. BLOCKCHAIN TAMPER-EVIDENT INTEGRITY LEDGER', async (t) => {
  const testRecordId = `EVD-TEST-${Date.now()}`;
  const testHash = 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e';

  await t.test('Register SHA-256 hash on ledger', async () => {
    const regRes = await blockchainService.registerRecord(testRecordId, testHash);
    assert.strictEqual(regRes.success, true);
    assert.strictEqual(regRes.recordHash, testHash);
    assert.ok(regRes.txHash);
  });

  await t.test('Verify identical hash matches blockchain ledger (Integrity Verified)', async () => {
    const vRes = await blockchainService.verifyRecord(testRecordId, testHash);
    assert.strictEqual(vRes.verified, true);
    assert.strictEqual(vRes.status, 'INTEGRITY_VERIFIED');
  });

  await t.test('Verify altered/tampered hash fails integrity check', async () => {
    const tamperedHash = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';
    const vRes = await blockchainService.verifyRecord(testRecordId, tamperedHash);
    assert.strictEqual(vRes.verified, false);
    assert.strictEqual(vRes.status, 'INTEGRITY_CHECK_FAILED');
  });
});
