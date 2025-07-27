// Load environment variables
require('dotenv').config();

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// BMad-Method Integration
const BMadIntegration = require('./knowledge/bmad-integration');

// Initialize BMad integration
const bmad = new BMadIntegration();

// Path to the directory containing static files.  We serve everything from
// this directory when requests don't match our API routes.
const PUBLIC_DIR = path.join(__dirname, 'public');

// A very small helper to determine content types based on file extension.
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
};

/**
 * Simple static file server.  Given a request, attempts to read the file
 * from the PUBLIC_DIR.  If the file does not exist, a 404 error is
 * returned.  If another error occurs while reading the file, a 500
 * error is sent back to the client.
 *
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
function serveStatic(req, res) {
  // Normalize the requested path to prevent directory traversal attacks.
  const safeSuffix = path.normalize(req.url).replace(/^\/+/, '');
  let filePath = path.join(PUBLIC_DIR, safeSuffix);
  // If the request is to the root, serve index.html
  if (req.url === '/' || req.url === '') {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }
  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    // If the request is for a directory, look for an index.html in that directory.
    if (stats.isDirectory()) {
      const indexPath = path.join(filePath, 'index.html');
      fs.stat(indexPath, (indexErr) => {
        if (!indexErr) {
          serveFile(indexPath, res);
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');
        }
      });
      return;
    }
    serveFile(filePath, res);
  });
}

/**
 * Helper for serving a file.  Reads the file from disk and writes it
 * back to the response with the appropriate Content-Type header.  If
 * an error occurs while reading the file, a 500 error is returned.
 *
 * @param {string} filePath
 * @param {http.ServerResponse} res
 */
function serveFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Server error');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

/**
 * Handler for BMad agent API - provides agent information and switching
 */
function handleBMadAgent(req, res) {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => {
    let payload;
    try {
      payload = JSON.parse(body || '{}');
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      return;
    }

    const action = payload.action;
    let response = {};

    switch (action) {
      case 'list':
        response = { agents: bmad.getAgents(), current: bmad.getCurrentAgent() };
        break;
      case 'switch':
        if (payload.agent && bmad.setAgent(payload.agent)) {
          response = { success: true, agent: bmad.getCurrentAgent(), info: bmad.getAgentInfo() };
        } else {
          response = { success: false, error: 'Invalid agent name' };
        }
        break;
      case 'current':
        response = { agent: bmad.getCurrentAgent(), info: bmad.getAgentInfo() };
        break;
      default:
        response = { error: 'Invalid action' };
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  });
}

/**
 * Handler for the chat API.  Receives a JSON payload of the form
 * `{ messages: [...], model: 'claude-3-haiku-20240307', key: 'sk-ant-...' }` and streams
 * responses back to the client as Server Sent Events.  This proxy
 * exists to avoid CORS issues by hiding the Anthropic API behind our own
 * endpoint.  It uses Node's `https` module directly to avoid any
 * dependencies on Express or other frameworks.
 *
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
function handleChat(req, res) {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => {
    let payload;
    try {
      payload = JSON.parse(body || '{}');
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Invalid JSON payload');
      return;
    }
    
    let messages = Array.isArray(payload.messages) ? payload.messages : [];
    
    // BMad Integration: Check for commands and enhance conversation
    if (process.env.BMAD_ENABLED !== 'false') {
      // Check if the last message contains a BMad command
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === 'user' && bmad.containsCommand(lastMessage.content)) {
        const commandResponse = bmad.processCommand(lastMessage.content);
        if (commandResponse) {
          // Return command response immediately
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          });
          
          // Send the command response as a streaming message
          const responseData = {
            type: 'content_block_delta',
            delta: { text: commandResponse }
          };
          res.write(`data: ${JSON.stringify(responseData)}\n\n`);
          
          // Send completion signal
          const completeData = { type: 'message_stop' };
          res.write(`data: ${JSON.stringify(completeData)}\n\n`);
          res.end();
          return;
        }
      }
      
      // Enhance conversation with BMad context
      const enhanced = bmad.enhanceConversation([...messages]);
      messages = enhanced.messages;
      var systemMessage = enhanced.system;
    }
    
    // Use a sensible default if the client does not specify a model.  Claude 3
    // Haiku is fast and cost-effective.  See index.html for the list of
    // available models.
    const model = typeof payload.model === 'string' ? payload.model : 'claude-3-haiku-20240307';
    // Read optional generation parameters.  These mirror the settings available
    // in the frontend.  If undefined they fall back to Anthropic defaults.
    const maxTokens = typeof payload.max_tokens === 'number' ? payload.max_tokens : 1024;
    const temperature = typeof payload.temperature === 'number' ? payload.temperature : undefined;
    // API key may come from the body or from an environment variable.  We
    // intentionally don't hard-code a default here so that deploying
    // without a key fails loudly instead of silently sending requests
    // without proper authorization.
    const apiKey = payload.key || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      res.writeHead(401, { 'Content-Type': 'text/plain' });
      res.end('Missing Anthropic API key');
      return;
    }

    // Build the payload for Anthropic's Messages API.  We include only the
    // parameters provided by the client to let the API apply its own
    // defaults when values are omitted.  Setting stream:true requests
    // server‑sent events.
    const bodyObj = {
      model,
      messages,
      stream: true,
    };
    bodyObj.max_tokens = maxTokens;
    if (temperature !== undefined) bodyObj.temperature = temperature;
    if (systemMessage !== undefined) bodyObj.system = systemMessage;
    const requestData = JSON.stringify(bodyObj);

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Anthropic uses x-api-key instead of Bearer auth
        'x-api-key': apiKey,
        // The anthropic-version header is required and dictates the API
        // behaviour.  The 2023-06-01 version is stable and supports the
        // Messages API.
        'anthropic-version': '2023-06-01',
      },
    };

    // Forward the request to the Anthropic API.
    const apiReq = https.request(options, (apiRes) => {
      // Use SSE headers so the client can consume the streamed response as
      // events.  Setting these headers early ensures clients know to
      // expect a streaming response.
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      apiRes.on('data', (chunk) => {
        // Forward the chunk as-is.  Anthropic sends SSE data with
        // `event:` and `data:` prefixes.  The frontend parses the
        // `data:` lines to build the assistant's response.
        res.write(chunk);
      });
      apiRes.on('end', () => {
        res.end();
      });
    });
    apiReq.on('error', (err) => {
      console.error('Error contacting Anthropic API:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error contacting Anthropic API');
    });
    apiReq.write(requestData);
    apiReq.end();
  });
}

// Main HTTP server.  Routes API requests to the chat handler and all
// other requests to the static file server.  Additional API routes
// could easily be added here.
const server = http.createServer((req, res) => {
  // Add CORS headers for API endpoints
  if (req.url.startsWith('/api/')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
  }
  
  if (req.url === '/api/chat' && req.method === 'POST') {
    handleChat(req, res);
  } else if (req.url === '/api/bmad-agent' && req.method === 'POST') {
    handleBMadAgent(req, res);
  } else {
    serveStatic(req, res);
  }
});

// Start the server on the configured port.  If no port is specified
// through the PORT environment variable, default to 3000.
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`ECHO server listening on port ${port}`);
  console.log(`BMad-Method integration: ${process.env.BMAD_ENABLED !== 'false' ? 'ENABLED' : 'DISABLED'}`);
  if (process.env.BMAD_ENABLED !== 'false') {
    console.log(`Default BMad agent: ${bmad.getCurrentAgent()}`);
    console.log(`Available agents: ${Object.keys(bmad.getAgents()).join(', ')}`);
  }
});