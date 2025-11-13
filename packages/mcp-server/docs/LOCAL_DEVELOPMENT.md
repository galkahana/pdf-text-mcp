# Local Development Guide

This guide covers how to develop and test the PDF Text MCP Server locally using Docker and Minikube.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Docker Development](#docker-development)
- [Minikube Development](#minikube-development)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools

1. **Docker** - For containerization
   ```bash
   # macOS
   brew install --cask docker

   # Verify installation
   docker --version
   ```

2. **Minikube** - For local Kubernetes testing
   ```bash
   # macOS
   brew install minikube

   # Verify installation
   minikube version
   ```

3. **Kubectl** - Kubernetes CLI
   ```bash
   # macOS
   brew install kubectl

   # Verify installation
   kubectl version --client
   ```

4. **Helm** - Kubernetes package manager
   ```bash
   # macOS
   brew install helm

   # Verify installation
   helm version
   ```

5. **Just** - Command runner (already installed for the project)
   ```bash
   # Verify installation
   just --version
   ```

## Docker Development

### Quick Start

1. **Build the Docker image:**
   ```bash
   cd packages/mcp-server
   just docker-build
   ```

2. **Run the container:**
   ```bash
   just docker-run
   ```

3. **Test the endpoints:**
   ```bash
   # In another terminal
   just docker-test
   ```

### Available Docker Commands

```bash
# Build for development
just docker-build

# Build for production with version tag
just docker-build-prod v1.0.0

# Run container (foreground)
just docker-run

# Run with API key authentication
just docker-run-secure your-secret-key

# Run in background
just docker-run-bg

# Stop background container
just docker-stop

# Test container health
just docker-test

# Using docker-compose
just docker-compose-up      # Start services
just docker-compose-logs    # View logs
just docker-compose-down    # Stop services
```

### Testing the Docker Container

Once the container is running:

```bash
# Health check
curl http://localhost:3000/health

# Readiness check
curl http://localhost:3000/ready

# Metrics
curl http://localhost:3000/metrics

# MCP endpoint (requires MCP client)
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"1.0"}}'
```

## Minikube Development

Minikube provides a complete local Kubernetes environment for testing the full deployment stack.

### Quick Start

The fastest way to get started:

```bash
cd packages/mcp-server

# Start minikube, build image, and deploy
just minikube-all
```

This command will:
1. Start minikube with 4 CPUs and 8GB RAM
2. Build the Docker image in minikube's Docker daemon
3. Deploy using Helm with development values
4. Show you the next steps

### Step-by-Step Workflow

If you prefer to run steps individually:

```bash
# 1. Start minikube
just minikube-start

# 2. Build the Docker image
# This builds directly in minikube's Docker daemon (no registry needed!)
just minikube-build

# 3. Deploy using Helm
just minikube-deploy

# 4. Get the service URL
just minikube-url

# 5. Test the deployment
just minikube-test
```

### Development Iteration Cycle

When making code changes:

```bash
# 1. Make your code changes

# 2. Rebuild and redeploy
just minikube-full

# 3. View logs to see changes
just minikube-logs

# 4. Test the updated service
just minikube-test
```

### Available Minikube Commands

```bash
# Cluster Management
just minikube-start          # Start minikube
just minikube-stop           # Stop minikube
just minikube-delete         # Delete minikube cluster
just minikube-dashboard      # Open Kubernetes dashboard

# Build & Deploy
just minikube-build          # Build image in minikube
just minikube-deploy         # Deploy with Helm
just minikube-full           # Build + Deploy

# Testing & Monitoring
just minikube-url            # Get service URL
just minikube-test           # Test all endpoints
just minikube-logs           # View application logs

# Complete Workflow
just minikube-all            # Start + Build + Deploy
```

### Accessing the Service

#### Option 1: NodePort (Recommended for testing)

```bash
# Get the URL
URL=$(just minikube-url)
echo $URL

# Test it
curl $URL/health
```

#### Option 2: Port Forwarding

```bash
# Forward to localhost
kubectl port-forward -n pdf-text-mcp svc/pdf-text-mcp-server 8080:80

# Access via localhost
curl http://localhost:8080/health
```

### Viewing Logs

```bash
# Follow logs in real-time
just minikube-logs

# Or using kubectl directly
kubectl logs -n pdf-text-mcp -l app.kubernetes.io/name=pdf-text-mcp-server -f
```

### Checking Pod Status

```bash
# Get pod status
kubectl get pods -n pdf-text-mcp

# Describe pod for detailed info
kubectl describe pod -n pdf-text-mcp -l app.kubernetes.io/name=pdf-text-mcp-server

# Get all resources
kubectl get all -n pdf-text-mcp
```

## Testing

### Manual Testing with MCP Protocol

Once the service is running (Docker or Minikube), you can test the MCP protocol:

```bash
# Get the service URL
URL="http://localhost:3000"  # Docker
# OR
URL=$(just minikube-url)     # Minikube

# 1. Initialize connection
curl -X POST $URL/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "1.0",
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'

# 2. List available tools
curl -X POST $URL/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'

# 3. Extract text (using base64-encoded PDF)
# First, encode a PDF file
PDF_BASE64=$(base64 -i path/to/test.pdf)

curl -X POST $URL/mcp \
  -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"id\": 3,
    \"method\": \"tools/call\",
    \"params\": {
      \"name\": \"extract_text\",
      \"arguments\": {
        \"fileContent\": \"$PDF_BASE64\"
      }
    }
  }"
```

### Testing with API Key

If you've enabled API key authentication:

```bash
# Docker
just docker-run-secure my-secret-key

# Minikube
helm upgrade --install pdf-text-mcp ./helm/pdf-text-mcp-server \
  --namespace pdf-text-mcp \
  -f ./helm/pdf-text-mcp-server/values-dev.yaml \
  --set apiKey=my-secret-key

# Then include the key in requests
curl -X POST $URL/mcp \
  -H "Authorization: Bearer my-secret-key" \
  -H "Content-Type: application/json" \
  -d '...'
```

## Troubleshooting

### Docker Issues

**Problem:** "Cannot connect to Docker daemon"
```bash
# Solution: Start Docker Desktop or Docker daemon
open /Applications/Docker.app
```

**Problem:** Image build fails
```bash
# Clean up and rebuild
docker system prune -f
just docker-build
```

### Minikube Issues

**Problem:** Minikube won't start
```bash
# Delete and recreate
just minikube-delete
just minikube-start
```

**Problem:** Image not found in minikube
```bash
# Make sure you're building in minikube's Docker daemon
eval $(minikube docker-env)
just docker-build

# OR use the minikube-build command
just minikube-build
```

**Problem:** Service not accessible
```bash
# Check pod status
kubectl get pods -n pdf-text-mcp

# Check logs for errors
just minikube-logs

# Verify service
kubectl get svc -n pdf-text-mcp
```

### Helm Issues

**Problem:** Helm chart fails to install
```bash
# Validate chart
just helm-lint

# Preview what will be created
just helm-template

# Uninstall and reinstall
just helm-uninstall
just minikube-deploy
```

### General Debugging

```bash
# Check pod logs
kubectl logs -n pdf-text-mcp -l app.kubernetes.io/name=pdf-text-mcp-server

# Describe pod for events
kubectl describe pod -n pdf-text-mcp -l app.kubernetes.io/name=pdf-text-mcp-server

# Check configmap
kubectl get configmap -n pdf-text-mcp pdf-text-mcp-server -o yaml

# Check service endpoints
kubectl get endpoints -n pdf-text-mcp

# Shell into pod for debugging
kubectl exec -it -n pdf-text-mcp <pod-name> -- /bin/sh
```

## Configuration

### Development Values (values-dev.yaml)

The development configuration includes:
- Single replica (faster startup)
- NodePort service (easy access)
- Lower resource limits (laptop-friendly)
- `imagePullPolicy: IfNotPresent` (uses local images)

### Environment Variables

You can override any configuration:

```bash
# Via docker-compose.yml
environment:
  - MAX_FILE_SIZE=52428800  # 50MB
  - TIMEOUT=60000           # 60 seconds

# Via Helm
helm upgrade --install pdf-text-mcp ./helm/pdf-text-mcp-server \
  -f ./helm/pdf-text-mcp-server/values-dev.yaml \
  --set config.maxFileSize=52428800 \
  --set config.timeout=60000
```

## Next Steps

Once you've tested locally:

1. **Production Deployment:** See [README.md](../README.md) for GKE deployment
2. **CI/CD Integration:** Set up GitHub Actions or similar
3. **Monitoring:** Configure Prometheus and Grafana (Phase 6)
4. **Example Agent:** Test with the example-agent package

## Resources

- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [Minikube Documentation](https://minikube.sigs.k8s.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)
- [Kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
