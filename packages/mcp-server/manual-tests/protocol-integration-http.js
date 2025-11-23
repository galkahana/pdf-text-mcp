#!/usr/bin/env node

/**
 * Protocol Integration Test for PDF Text MCP Server (HTTP Transport)
 *
 * This script performs end-to-end testing of the MCP protocol implementation over HTTP by:
 * 1. Starting the server in HTTP mode
 * 2. Sending JSON-RPC 2.0 messages over HTTP
 * 3. Receiving and validating responses
 * 4. Testing with real PDF files (base64 encoded)
 *
 * This is a manual integration test that verifies the full protocol flow,
 * complementing the unit tests which test individual components.
 *
 * Usage:
 *   npm run test:manual:http --workspace=@pdf-text-mcp/mcp-server
 *   npm run test:manual:http --workspace=@pdf-text-mcp/mcp-server -- /path/to/test.pdf
 *
 *   Or directly:
 *   node manual-tests/protocol-integration-http.js [path-to-pdf]
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(70));
  log(title, 'bright');
  console.log('='.repeat(70));
}

// Generate a unique session ID for this test run
// Note: Even in stateless mode, the SDK may require this header
//const SESSION_ID = '`test-session-${Date.now()}-${Math.random().toString(36).substring(7)}`;

/**
 * Send an HTTP request to the MCP server
 */
function sendHttpRequest(request, port = 3000) {
  return new Promise((resolve, reject) => {
    const requestStr = JSON.stringify(request);

    log('\n→ Request:', 'cyan');
    // Truncate fileContent for display to avoid flooding console
    const displayRequest = JSON.parse(JSON.stringify(request));
    if (displayRequest.params?.arguments?.fileContent) {
      const content = displayRequest.params.arguments.fileContent;
      displayRequest.params.arguments.fileContent = 
        `<base64 data: ${content.length} chars, ~${Math.round(content.length / 1024)}KB>`;
    }
    console.log(JSON.stringify(displayRequest, null, 2));

    const options = {
      hostname: 'localhost',
      port: port,
      path: '/mcp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        //'Mcp-Session-Id': SESSION_ID,
        'Content-Length': Buffer.byteLength(requestStr),
      },
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        // Check for HTTP error status codes
        if (res.statusCode >= 400) {
          log(`\n← HTTP Error: ${res.statusCode}`, 'yellow');
          log('Response body:', 'yellow');
          console.log(responseData);
          reject(new Error(`HTTP ${res.statusCode}: ${responseData.substring(0, 200)}`));
          return;
        }

        try {
          let response;
          
          // Check if response is SSE format
          if (res.headers['content-type']?.includes('text/event-stream')) {
            // Parse SSE format: "event: message\ndata: <json>\n\n"
            const lines = responseData.split('\n');
            const dataLine = lines.find(line => line.startsWith('data: '));
            if (dataLine) {
              const jsonData = dataLine.substring(6); // Remove "data: " prefix
              response = JSON.parse(jsonData);
            } else {
              throw new Error('No data line found in SSE response');
            }
          } else {
            // Plain JSON response
            response = JSON.parse(responseData);
          }

          // Check for JSON-RPC error in response
          if (response.error) {
            log('\n← JSON-RPC Error:', 'yellow');
            console.log(JSON.stringify(response.error, null, 2));
            reject(new Error(`JSON-RPC Error ${response.error.code}: ${response.error.message}`));
            return;
          }

          log('\n← Response:', 'green');
          console.log(JSON.stringify(response, null, 2));

          resolve(response);
        } catch (e) {
          log('\n← Raw Response (parse failed):', 'yellow');
          console.log(responseData);
          log(`\nHTTP Status: ${res.statusCode}`, 'yellow');
          log(`Content-Type: ${res.headers['content-type']}`, 'yellow');
          reject(new Error(`Failed to parse response: ${e.message}\nRaw: ${responseData.substring(0, 200)}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(requestStr);
    req.end();
  });
}

/**
 * Wait for server to be ready
 */
async function waitForServer(port = 3000, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${port}/health`, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            if (res.statusCode === 200) {
              resolve();
            } else {
              reject(new Error(`Server returned ${res.statusCode}`));
            }
          });
        });
        req.on('error', reject);
        req.setTimeout(500);
      });
      return true;
    } catch (e) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  return false;
}

/**
 * Main test function
 */
async function runTests(pdfPath) {
  logSection('PDF Text MCP Server - HTTP Protocol Integration Test');

  // Use provided PDF or fall back to test material
  if (!pdfPath) {
    pdfPath = path.join(__dirname, '..', '..', '..', 'test-materials', 'GalKahanaCV2025.pdf');
    log(`\nℹ️  No PDF path provided. Using default test PDF: ${path.basename(pdfPath)}`, 'yellow');
    log('   Usage: npm run test:manual:http --workspace=@pdf-text-mcp/mcp-server -- /path/to/test.pdf', 'yellow');
  }

  if (!fs.existsSync(pdfPath)) {
    log(`\n❌ Error: PDF file not found: ${pdfPath}`, 'yellow');
    process.exit(1);
  }

  log(`\n✓ Testing with PDF: ${pdfPath}`, 'green');
  // Read PDF and convert to base64
  const pdfBuffer = fs.readFileSync(pdfPath);
  const pdfContent = pdfBuffer.toString('base64');
  log(`  PDF size: ${Math.round(pdfBuffer.length / 1024)} KB`, 'blue');
  log(`  Base64 size: ${Math.round(pdfContent.length / 1024)} KB`, 'blue');

  // Start the MCP server in HTTP mode
  logSection('1. Starting MCP Server (HTTP Mode)');
  const serverPath = path.join(__dirname, '..', 'dist', 'index.js');

  log(`Server path: ${serverPath}`, 'blue');

  const server = spawn('node', [serverPath], {
    env: {
      ...process.env,
      TRANSPORT_MODE: 'http',
      PORT: '3000',
      HOST: 'localhost',
    },
  });

  // Capture stderr (server logs)
  server.stderr.on('data', (data) => {
    log(`[Server] ${data.toString().trim()}`, 'magenta');
  });

  server.on('error', (error) => {
    log(`\n❌ Failed to start server: ${error.message}`, 'yellow');
    process.exit(1);
  });

  // Wait for server to be ready
  log('\nWaiting for server to start...', 'yellow');
  const serverReady = await waitForServer(3000);

  if (!serverReady) {
    log('\n❌ Server failed to start within timeout', 'yellow');
    server.kill();
    process.exit(1);
  }

  log('✓ Server is ready', 'green');

  try {
    // Test 1: Health check
    logSection('2. Health Check');
    await new Promise((resolve, reject) => {
      http.get('http://localhost:3000/health', (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          const health = JSON.parse(data);
          log('\n✓ Health check passed', 'green');
          log(`  Status: ${health.status}`, 'blue');
          log(`  Timestamp: ${health.timestamp}`, 'blue');
          resolve();
        });
      }).on('error', reject);
    });

    // Test 2: Initialize
    logSection('3. Initialize Connection');
    const initResponse = await sendHttpRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'manual-test-http',
          version: '1.0.0',
        },
      },
    });

    if (initResponse.result) {
      log('\n✓ Server initialized successfully', 'green');
      log(
        `  Server: ${initResponse.result.serverInfo.name} v${initResponse.result.serverInfo.version}`,
        'blue'
      );
      log('  Capabilities:', 'blue');
      Object.keys(initResponse.result.capabilities).forEach((cap) => {
        log(`    - ${cap}`, 'blue');
      });
    }

    // Test 3: List Tools
    logSection('4. List Available Tools');
    const toolsResponse = await sendHttpRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {},
    });

    if (toolsResponse.result) {
      log(`\n✓ Found ${toolsResponse.result.tools.length} tools:`, 'green');
      toolsResponse.result.tools.forEach((tool) => {
        log(`\n  ${tool.name}`, 'bright');
        log(`  ${tool.description}`, 'blue');
        log(`  Parameters:`, 'blue');
        Object.entries(tool.inputSchema.properties).forEach(([name, prop]) => {
          const required = tool.inputSchema.required?.includes(name)
            ? ' (required)'
            : ' (optional)';
          log(`    - ${name}: ${prop.type}${required}`, 'blue');
          log(`      ${prop.description}`, 'blue');
        });
      });
    }

    // Test 4: Extract Text
    logSection('5. Extract Text from PDF');
    const extractResponse = await sendHttpRequest({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'extract_text',
        arguments: {
          fileContent: pdfContent,
        },
      },
    });

    if (extractResponse.result) {
      log('\n✓ Text extraction successful', 'green');
      const result = JSON.parse(extractResponse.result.content[0].text);
      log(`  Pages: ${result.pageCount}`, 'blue');
      log(`  File size: ${Math.round(result.fileSize / 1024)} KB`, 'blue');
      log(`  Processing time: ${result.processingTime} ms`, 'blue');
      log(`  Text preview (first 200 chars):`, 'blue');
      log(`  "${result.text.substring(0, 200)}..."`, 'cyan');
    }

    // Test 5: Extract Metadata
    logSection('6. Extract PDF Metadata');
    const metadataResponse = await sendHttpRequest({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'extract_metadata',
        arguments: {
          fileContent: pdfContent,
        },
      },
    });

    if (metadataResponse.result) {
      log('\n✓ Metadata extraction successful', 'green');
      const metadata = JSON.parse(metadataResponse.result.content[0].text);
      Object.entries(metadata).forEach(([key, value]) => {
        if (value) {
          log(`  ${key}: ${value}`, 'blue');
        }
      });
    }

    // Test 6: Error Handling
    logSection('7. Test Error Handling');
    log('\nTesting with invalid base64 content...', 'yellow');
    const errorResponse = await sendHttpRequest({
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'extract_text',
        arguments: {
          fileContent: 'invalid-base64!!!',
        },
      },
    });

    if (errorResponse.error) {
      log('\n✓ Error handling works correctly', 'green');
      log(`  Error code: ${errorResponse.error.code}`, 'blue');
      log(`  Error message: ${errorResponse.error.message}`, 'blue');
    }

    // Test 7: Metrics
    logSection('8. Check Metrics');
    await new Promise((resolve, reject) => {
      http.get('http://localhost:3000/metrics', (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          const metrics = JSON.parse(data);
          log('\n✓ Metrics retrieved', 'green');
          log(`  Requests: ${metrics.requests}`, 'blue');
          log(`  Errors: ${metrics.errors}`, 'blue');
          log(`  Uptime: ${Math.round(metrics.uptime)} seconds`, 'blue');
          log(
            `  Memory: ${Math.round(metrics.memory.heapUsed / 1024 / 1024)} MB`,
            'blue'
          );
          resolve();
        });
      }).on('error', reject);
    });

    logSection('✅ All Tests Completed Successfully');
    log('\nThe MCP HTTP server is working correctly!', 'green');
    log('\nYou can now use this server with web-based AI assistants.', 'blue');
    log('See README.md for deployment instructions.', 'blue');
  } catch (error) {
    log(`\n❌ Test failed: ${error.message}`, 'yellow');
    console.error(error);
  } finally {
    // Clean up
    server.kill();
    process.exit(0);
  }
}

// Get PDF path from command line
const pdfPath = process.argv[2];

// Run the tests
runTests(pdfPath).catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
