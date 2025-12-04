const { StringDecoder } = require('node:string_decoder');

function sendJson(res, status, payload) {
  const data = Buffer.from(JSON.stringify(payload));
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  });
  res.end(data);
}

function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const decoder = new StringDecoder('utf8');
    let body = '';
    req.on('data', (chunk) => {
      body += decoder.write(chunk);
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      body += decoder.end();
      if (!body) {
        resolve(null);
        return;
      }
      try {
        const parsed = JSON.parse(body);
        resolve(parsed);
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function parseId(value) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    return null;
  }
  return num;
}

function toPojo(row) {
  return row ? { ...row } : null;
}

function validateDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

module.exports = {
  sendJson,
  sendError,
  readJson,
  parseId,
  toPojo,
  validateDate,
};
