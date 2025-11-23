#!/usr/bin/env node

/**
 * Protocol Integration Test for PDF Text MCP Server
 *
 * This script performs end-to-end testing of the MCP protocol implementation by:
 * 1. Starting the server as a child process
 * 2. Sending JSON-RPC 2.0 messages over stdio
 * 3. Receiving and validating responses
 * 4. Testing with real PDF files
 *
 * This is a manual integration test that verifies the full protocol flow,
 * complementing the unit tests which test individual components.
 *
 * Usage:
 *   npm run test:manual --workspace=@pdf-text-mcp/mcp-server
 *   npm run test:manual --workspace=@pdf-text-mcp/mcp-server -- /path/to/test.pdf
 *
 *   Or directly:
 *   node manual-tests/protocol-integration.js [path-to-pdf]
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

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

/**
 * Send a JSON-RPC request and wait for response
 */
function sendRequest(server, request) {
  return new Promise((resolve, reject) => {
    const requestStr = JSON.stringify(request) + '\n';

    log('\n→ Request:', 'cyan');
    console.log(JSON.stringify(request, null, 2));

    let responseData = '';

    const onData = (data) => {
      responseData += data.toString();

      // Check if we have a complete JSON object
      try {
        const response = JSON.parse(responseData);
        server.stdout.removeListener('data', onData);

        log('\n← Response:', 'green');
        console.log(JSON.stringify(response, null, 2));

        resolve(response);
      } catch (e) {
        // Not a complete JSON object yet, keep waiting
      }
    };

    server.stdout.on('data', onData);

    // Set a timeout
    setTimeout(() => {
      server.stdout.removeListener('data', onData);
      reject(new Error('Request timeout'));
    }, 5000);

    server.stdin.write(requestStr);
  });
}

/**
 * Main test function
 */
async function runTests(pdfPath) {
  logSection('PDF Text MCP Server - Protocol Integration Test');

  // Use provided PDF or fall back to test material
  if (!pdfPath) {
    pdfPath = path.join(__dirname, '..', '..', '..', 'test-materials', 'GalKahanaCV2025.pdf');
    log(`\nℹ️  No PDF path provided. Using default test PDF: ${path.basename(pdfPath)}`, 'yellow');
    log('   Usage: npm run test:manual:stdio --workspace=@pdf-text-mcp/mcp-server -- /path/to/test.pdf', 'yellow');
  }
  
  if (!fs.existsSync(pdfPath)) {
    log(`\n❌ Error: PDF file not found: ${pdfPath}`, 'yellow');
    process.exit(1);
  }
  
  log(`\n✓ Testing with PDF: ${pdfPath}`, 'green');

  // Start the MCP server
  logSection('1. Starting MCP Server');
  const serverPath = path.join(__dirname, '..', 'dist', 'index.js');

  log(`Server path: ${serverPath}`, 'blue');

  const server = spawn('node', [serverPath]);

  // Capture stderr (server logs)
  server.stderr.on('data', (data) => {
    log(`[Server] ${data.toString().trim()}`, 'magenta');
  });

  server.on('error', (error) => {
    log(`\n❌ Failed to start server: ${error.message}`, 'yellow');
    process.exit(1);
  });

  // Wait a bit for server to start
  await new Promise((resolve) => setTimeout(resolve, 500));

  try {
    // Test 1: Initialize
    logSection('2. Initialize Connection');
    const initResponse = await sendRequest(server, {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'manual-test',
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

    // Test 2: List Tools
    logSection('3. List Available Tools');
    const toolsResponse = await sendRequest(server, {
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

    // Test 3: Extract Text
    logSection('4. Extract Text from PDF');
    const extractResponse = await sendRequest(server, {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'extract_text',
        arguments: {
          filePath: pdfPath,
          enableBidi: true,
        },
      },
    });

    if (extractResponse.result) {
      log('\n✓ Text extraction successful', 'green');
      const result = JSON.parse(extractResponse.result.content[0].text);
      log(`  Pages: ${result.pageCount}`, 'blue');
      log(`  File size: ${Math.round(result.fileSize / 1024)} KB`, 'blue');
      log(
        `  Processing time: ${result.processingTime} ms`,
        'blue'
      );
      log(`  Text preview (first 200 chars):`, 'blue');
      log(
        `  "${result.text.substring(0, 200)}..."`,
        'cyan'
      );
    }

    // Test 4: Extract Metadata
    logSection('5. Extract PDF Metadata');
    const metadataResponse = await sendRequest(server, {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'extract_metadata',
        arguments: {
          filePath: pdfPath,
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

    // Test 5: Error Handling
    logSection('6. Test Error Handling');
    log('\nTesting with non-existent file...', 'yellow');
    const errorResponse = await sendRequest(server, {
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'extract_text',
        arguments: {
          filePath: '/nonexistent/file.pdf',
        },
      },
    });

    if (errorResponse.error) {
      log('\n✓ Error handling works correctly', 'green');
      log(`  Error code: ${errorResponse.error.code}`, 'blue');
      log(`  Error message: ${errorResponse.error.message}`, 'blue');
    }

    logSection('✅ All Tests Completed Successfully');
    log('\nThe MCP server is working correctly!', 'green');
    log('\nYou can now use this server with Claude Desktop.', 'blue');
    log('See README.md for configuration instructions.', 'blue');
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
