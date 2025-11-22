# Manual Tests for MCP Server

This directory contains manual integration tests for the PDF Text MCP Server.

## Overview

Manual tests are used to verify the full end-to-end behavior of the MCP server, including:
- Protocol initialization and handshake
- Tool discovery and execution
- Error handling
- Real PDF file processing

These tests complement the unit tests by testing the actual protocol communication and integration with the underlying PDF extraction library.

## Tests

### protocol-integration-stdio.js

**Purpose**: End-to-end test of the MCP protocol implementation over STDIO transport

**What it tests**:
1. Server startup and initialization (STDIO mode)
2. Protocol handshake (initialize request/response)
3. Tool discovery (tools/list)
4. Text extraction from real PDF files (file path based)
5. Metadata extraction from real PDF files
6. Error handling with invalid file paths

**Usage**:
```bash
# Run both STDIO and HTTP tests
npm run test:manual --workspace=@pdf-text-mcp/mcp-server

# Test STDIO only without a PDF (basic protocol test only)
npm run test:manual:stdio --workspace=@pdf-text-mcp/mcp-server

# Test STDIO with a specific PDF file
npm run test:manual:stdio --workspace=@pdf-text-mcp/mcp-server -- /path/to/document.pdf

# From the package directory
node manual-tests/protocol-integration-stdio.js /path/to/test.pdf
```

### protocol-integration-http.js

**Purpose**: End-to-end test of the MCP protocol implementation over HTTP transport

**What it tests**:
1. Server startup in HTTP mode
2. Health check endpoint
3. Protocol handshake via HTTP POST
4. Tool discovery (tools/list)
5. Text extraction from PDF content (base64 encoded)
6. Metadata extraction from PDF content
7. Error handling with invalid content
8. Metrics endpoint

**Usage**:
```bash
# Test HTTP only without a PDF (basic protocol test only)
npm run test:manual:http --workspace=@pdf-text-mcp/mcp-server

# Test HTTP with a specific PDF file
npm run test:manual:http --workspace=@pdf-text-mcp/mcp-server -- /path/to/document.pdf

# From the package directory
node manual-tests/protocol-integration-http.js /path/to/test.pdf
```

**Note**: The HTTP test will start the server on port 3000 and expects it to be available during testing.

**What you'll see**:
- Colored output showing request/response flow
- Server logs (configuration, errors)
- Extracted text preview
- Metadata information
- Error handling demonstration

**Requirements**:
- Built server (`npm run build`)
- Optional: A test PDF file for full testing

## Understanding the Output

The test script uses colored output:
- **Cyan**: Outgoing requests (client → server)
- **Green**: Incoming responses (server → client)
- **Magenta**: Server logs (stderr)
- **Blue**: Informational messages
- **Yellow**: Warnings or test status

### Example Output Structure

```
============================================================
1. Starting MCP Server
============================================================
[Server] PDF Text Extraction MCP Server running on stdio

============================================================
2. Initialize Connection
============================================================
→ Request: { "jsonrpc": "2.0", "method": "initialize", ... }
← Response: { "result": { "capabilities": { "tools": {} } } }
✓ Server initialized successfully

... (more tests)
```

## When to Run Manual Tests

- After making changes to the MCP server
- Before deploying or releasing
- When debugging protocol issues
- To verify behavior with specific PDF files
- After updating the MCP SDK dependency

## Debugging Tips

### Server won't start
```bash
# Check if the server is built
ls -la packages/mcp-server/dist/

# Rebuild if needed
npm run build --workspace=@pdf-text-mcp/mcp-server
```

### Test times out
- Increase timeout in protocol-integration.js (currently 5 seconds)
- Check if PDF file is very large or complex
- Verify server logs in magenta color for errors

### Extraction fails
- Ensure PDF file path is correct and accessible
- Check file permissions
- Try with a different, simpler PDF first

### Protocol errors
- Look for error messages in the response
- Check server logs (magenta output)
- Verify JSON-RPC message format

## Adding New Manual Tests

To add a new manual test:

1. Create a new `.js` file in this directory
2. Follow the structure of `protocol-integration.js`
3. Add descriptive comments explaining what's being tested
4. Update this README with the new test details
5. Add an npm script in `package.json` if needed

Example structure:
```javascript
#!/usr/bin/env node
const { spawn } = require('child_process');

async function testFeature() {
  // 1. Start server
  const server = spawn('node', ['dist/index.js']);

  // 2. Send test requests
  // 3. Verify responses
  // 4. Clean up
}

testFeature().catch(console.error);
```

## Integration vs Unit Tests

**Unit Tests** (`__tests__/`):
- Fast, isolated tests
- Mock external dependencies
- Test individual functions/modules
- Run automatically in CI/CD

**Manual Tests** (`manual-tests/`):
- Slower, full integration
- Use real dependencies
- Test end-to-end behavior
- Run manually before releases

Both are important! Unit tests catch logic errors, manual tests catch integration issues.
