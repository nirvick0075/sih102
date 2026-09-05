const express = require('express');
const cors = require('cors');
const path = require('path');
const env = require('./config/env');
const { connectDB } = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

// Route imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const contractorRoutes = require('./routes/contractorRoutes');
const investigationRoutes = require('./routes/investigationRoutes');
const evidenceRoutes = require('./routes/evidenceRoutes');
const alertRoutes = require('./routes/alertRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const mlRoutes = require('./routes/mlRoutes');
const blockchainRoutes = require('./routes/blockchainRoutes');
const auditRoutes = require('./routes/auditRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static File Hosting
const frontendDir = path.join(__dirname, '../../frontend');
const uploadsDir = path.join(__dirname, '../../uploads');

app.use(express.static(frontendDir));
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/contractors', contractorRoutes);
app.use('/api/investigations', investigationRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/audit-logs', auditRoutes);

// System Health Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    system: 'MPLAD Intelligence & Anomaly Detection System',
    problemStatement: 'SIH26102',
    timestamp: new Date().toISOString()
  });
});

// Single Page Application Fallback for Frontend Pages
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = env.port;

// Start Server after connecting to MongoDB
const startServer = async () => {
  try {
    await connectDB();
    
    // Initialize essential administrative accounts if not present
    const { ensureDefaultAccounts } = require('./utils/initAccounts');
    await ensureDefaultAccounts();

    const server = app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 MPLAD Intelligence System (SIH26102) Backend Running`);
      console.log(`📡 URL: http://localhost:${PORT}`);
      console.log(`🖥️  Frontend Served at: http://localhost:${PORT}/index.html`);
      console.log(`🔒 Single-Form Auth Active (ADMIN: admin@demo.com, INVESTIGATOR: investigator@demo.com)`);
      console.log(`=======================================================`);
    });

    return server;
  } catch (err) {
    console.error('Fatal Server Initialization Error:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
