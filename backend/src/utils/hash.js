const crypto = require('crypto');
const fs = require('fs');

/**
 * Calculates SHA-256 hash of a plain string or buffer
 */
const sha256 = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Generates canonical JSON SHA-256 hash of an object
 */
const hashObject = (obj) => {
  const sortedKeys = Object.keys(obj).sort();
  const canonicalObj = {};
  for (const key of sortedKeys) {
    canonicalObj[key] = obj[key];
  }
  return sha256(JSON.stringify(canonicalObj));
};

/**
 * Calculates SHA-256 hash of a file on disk
 */
const hashFile = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
};

module.exports = {
  sha256,
  hashObject,
  hashFile
};
