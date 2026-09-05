/**
 * Simple schema validator helpers for backend requests
 */

const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
};

const validatePassword = (password) => {
  return typeof password === 'string' && password.length >= 6;
};

const validateProjectPayload = (data) => {
  const errors = [];
  if (!data.projectName || data.projectName.trim().length === 0) errors.push('Project name is required');
  if (!data.state) errors.push('State is required');
  if (!data.district) errors.push('District is required');
  if (!data.category) errors.push('Category is required');
  if (data.sanctionedAmount === undefined || isNaN(Number(data.sanctionedAmount))) errors.push('Valid sanctioned amount is required');
  if (data.estimatedCost === undefined || isNaN(Number(data.estimatedCost))) errors.push('Valid estimated cost is required');
  return errors;
};

module.exports = {
  validateEmail,
  validatePassword,
  validateProjectPayload
};
