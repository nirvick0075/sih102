const bcrypt = require('bcryptjs');
const User = require('../models/User');

/**
 * Ensures system administrative and investigator accounts exist without seeding fake projects
 */
const ensureDefaultAccounts = async () => {
  try {
    const adminExists = await User.findOne({ email: 'admin@demo.com' });
    if (!adminExists) {
      const hashedAdminPassword = await bcrypt.hash('Admin@123', 10);
      await User.create({
        name: 'System Administrator',
        email: 'admin@demo.com',
        password: hashedAdminPassword,
        role: 'ADMIN',
        department: 'Ministry of Statistics and Programme Implementation',
        designation: 'Central Oversight Director'
      });
      console.log('[Auth Init] Initialized system account: admin@demo.com (ADMIN)');
    }

    const investigatorExists = await User.findOne({ email: 'investigator@demo.com' });
    if (!investigatorExists) {
      const hashedInvPassword = await bcrypt.hash('Investigator@123', 10);
      await User.create({
        name: 'Lead Field Auditor',
        email: 'investigator@demo.com',
        password: hashedInvPassword,
        role: 'INVESTIGATOR',
        department: 'National Anti-Corruption & Quality Audit Division',
        designation: 'Senior Quality Inspector'
      });
      console.log('[Auth Init] Initialized system account: investigator@demo.com (INVESTIGATOR)');
    }
  } catch (err) {
    console.warn('[Auth Init] Note during account initialization:', err.message);
  }
};

module.exports = { ensureDefaultAccounts };
