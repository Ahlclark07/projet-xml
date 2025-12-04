const http = require('node:http');
const { init } = require('./db');
const { route } = require('./router');
const { sendError } = require('./utils');

const PORT = process.env.PORT ? Number(process.env.PORT) : 8000;
const HOST = process.env.HOST || '0.0.0.0';

init();

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Max-Age': '600',
    });
    res.end();
    return;
  }
  Promise.resolve(route(req, res)).catch((err) => {
    console.error('Unhandled error', err);
    if (!res.writableEnded) {
      sendError(res, 500, 'Internal error');
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});

server.on('clientError', (err, socket) => {
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});
