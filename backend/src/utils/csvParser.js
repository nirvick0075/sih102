const fs = require('fs');
const csv = require('csv-parser');

const REQUIRED_PROJECT_COLUMNS = [
  'projectName',
  'state',
  'district',
  'category',
  'sanctionedAmount',
  'estimatedCost'
];

/**
 * Parses a project CSV file and returns valid records along with error report
 */
const parseProjectCsv = (filePath) => {
  return new Promise((resolve, reject) => {
    const validRows = [];
    const invalidRows = [];
    let rowNumber = 1; // Header is row 1

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        rowNumber++;
        const errors = [];

        // Check required fields
        for (const col of REQUIRED_PROJECT_COLUMNS) {
          if (!data[col] || String(data[col]).trim() === '') {
            errors.push(`Missing or empty required field '${col}'`);
          }
        }

        // Numeric checks
        const estCost = parseFloat(data.estimatedCost || data.sanctionedAmount || 0);
        if (isNaN(estCost) || estCost <= 0) {
          errors.push('estimatedCost must be a positive number');
        }

        if (errors.length > 0) {
          invalidRows.push({
            rowNumber,
            data,
            errors
          });
        } else {
          validRows.push({
            projectId: data.projectId || `MPLAD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`,
            projectName: data.projectName.trim(),
            state: data.state.trim(),
            district: data.district.trim(),
            constituency: (data.constituency || data.district).trim(),
            location: (data.location || data.district).trim(),
            latitude: parseFloat(data.latitude || 20.5937),
            longitude: parseFloat(data.longitude || 78.9629),
            category: data.category.trim(),
            sanctionedAmount: parseFloat(data.sanctionedAmount || estCost),
            estimatedCost: estCost,
            actualCost: parseFloat(data.actualCost || estCost),
            startDate: data.startDate ? new Date(data.startDate) : new Date(Date.now() - 180 * 24 * 3600 * 1000),
            expectedCompletionDate: data.expectedCompletionDate ? new Date(data.expectedCompletionDate) : new Date(Date.now() + 180 * 24 * 3600 * 1000),
            actualCompletionDate: data.actualCompletionDate ? new Date(data.actualCompletionDate) : null,
            projectStatus: data.projectStatus || 'IN_PROGRESS',
            contractorId: data.contractorId || 'CONT-DEFAULT',
            contractorName: data.contractorName || 'Registered Local Contractor',
            numberOfMilestones: parseInt(data.numberOfMilestones || 4, 10),
            completedMilestones: parseInt(data.completedMilestones || 2, 10),
            paymentAmount: parseFloat(data.paymentAmount || (estCost * 0.5)),
            numberOfPayments: parseInt(data.numberOfPayments || 2, 10),
            inspectionStatus: data.inspectionStatus || 'PENDING',
            beneficiaryCount: parseInt(data.beneficiaryCount || 1000, 10),
            description: data.description || 'MPLADS Community Infrastructure Initiative'
          });
        }
      })
      .on('end', () => {
        resolve({
          totalRows: rowNumber - 1,
          validCount: validRows.length,
          invalidCount: invalidRows.length,
          validRows,
          invalidRows: invalidRows.slice(0, 50) // Return first 50 errors for preview
        });
      })
      .on('error', (err) => reject(err));
  });
};

module.exports = {
  parseProjectCsv,
  REQUIRED_PROJECT_COLUMNS
};
