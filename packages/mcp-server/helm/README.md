# Helm Chart for PDF Text MCP Server

Production-ready Helm chart for flexible, multi-environment deployments.

## Quick Start

```bash
# Install with default values (3 replicas, ClusterIP)
helm install pdf-mcp ./packages/mcp-server/helm/pdf-text-mcp-server

# Install for Minikube/local development
helm install pdf-mcp ./packages/mcp-server/helm/pdf-text-mcp-server \
  -f ./packages/mcp-server/helm/pdf-text-mcp-server/values-minikube.yaml

# Install for production with custom values
helm install pdf-mcp ./packages/mcp-server/helm/pdf-text-mcp-server \
  -f ./packages/mcp-server/helm/pdf-text-mcp-server/values-prod.yaml \
  --set image.tag=v1.0.0 \
  --set apiKey=your-secret-key
```

## When to Use This

- **Production deployments** - Full-featured with autoscaling, ingress, TLS
- **Multiple environments** - Different configs for dev/staging/prod
- **Easy management** - Single command for install/upgrade/rollback
- **Customization** - Override any value without editing YAMLs

## Values Files

### 1. `values.yaml` (Default)
Production-ready defaults:
- 3 replicas, ClusterIP service
- Standard resources (512Mi-1Gi memory)
- Health/readiness probes
- Uses `optimized` image tag

### 2. `values-prod.yaml` (Full Production)
High-availability configuration:
- 5-20 replicas with autoscaling
- Ingress with TLS (Let's Encrypt)
- High resources (1-2Gi memory)
- Pod anti-affinity for HA
- Prometheus annotations
- GCP Workload Identity support

### 3. `values-minikube.yaml` (Local Development)
Minimal configuration for local testing:
- 1 replica, NodePort service
- Minimal resources (256-512Mi)
- Faster probes for quick feedback
- Lower file size limit (50MB)

### 4. `values-dev.yaml` (Development)
Similar to minikube, uses `dev` image tag

## Usage Examples

### Minikube Development

```bash
# Install
helm install pdf-mcp ./packages/mcp-server/helm/pdf-text-mcp-server \
  -f ./packages/mcp-server/helm/pdf-text-mcp-server/values-minikube.yaml \
  --create-namespace --namespace pdf-text-mcp

# Access service
minikube service pdf-mcp-pdf-text-mcp-server -n pdf-text-mcp
```

### Production GKE/EKS

```bash
# Install with production values
helm install pdf-mcp ./packages/mcp-server/helm/pdf-text-mcp-server \
  -f ./packages/mcp-server/helm/pdf-text-mcp-server/values-prod.yaml \
  --set image.repository=gcr.io/your-project/pdf-text-mcp-server \
  --set image.tag=v1.0.0 \
  --set ingress.hosts[0].host=mcp.yourdomain.com \
  --set apiKey="${MCP_API_KEY}" \
  --namespace pdf-text-mcp \
  --create-namespace
```

### Custom Configuration

```bash
# Override specific values
helm install pdf-mcp ./packages/mcp-server/helm/pdf-text-mcp-server \
  --set replicaCount=10 \
  --set resources.limits.memory=4Gi \
  --set config.maxFileSize=209715200 \
  --set service.type=LoadBalancer
```

## Management Commands

```bash
# Upgrade to new version
helm upgrade pdf-mcp ./packages/mcp-server/helm/pdf-text-mcp-server \
  --set image.tag=v1.1.0

# Rollback to previous version
helm rollback pdf-mcp

# View current values
helm get values pdf-mcp -n pdf-text-mcp

# View all resources
kubectl get all -n pdf-text-mcp

# Uninstall
helm uninstall pdf-mcp -n pdf-text-mcp
```

## Configuration Options

Common values you can override:

```yaml
# Replicas and autoscaling
replicaCount: 3
autoscaling:
  enabled: true
  minReplicas: 5
  maxReplicas: 20

# Image configuration
image:
  repository: pdf-text-mcp-server
  tag: "v1.0.0"
  pullPolicy: IfNotPresent

# Resources
resources:
  limits:
    cpu: 2000m
    memory: 2Gi
  requests:
    cpu: 1000m
    memory: 1Gi

# Application configuration
config:
  transportMode: "http"
  port: 3000
  maxFileSize: 104857600  # 100MB
  timeout: 30000          # 30s

# Ingress with TLS
ingress:
  enabled: true
  className: "nginx"
  hosts:
    - host: mcp.example.com
  tls:
    - secretName: pdf-text-mcp-tls
      hosts:
        - mcp.example.com

# API Key authentication
apiKey: "your-secret-key"
```

## For Simple Deployments

If you just need a quick deployment without Helm, use the **raw Kubernetes manifests**:

📄 **K8s Manifests:** [../k8s/](../k8s/)

```bash
kubectl apply -f packages/mcp-server/k8s/
```

## Validation

```bash
# Lint the chart
helm lint ./packages/mcp-server/helm/pdf-text-mcp-server

# Dry-run to see what would be created
helm install pdf-mcp ./packages/mcp-server/helm/pdf-text-mcp-server \
  --dry-run --debug

# Generate manifests without installing
helm template pdf-mcp ./packages/mcp-server/helm/pdf-text-mcp-server \
  -f values-prod.yaml > manifests.yaml
```

## Troubleshooting

```bash
# Check pod status
kubectl get pods -n pdf-text-mcp

# View logs
kubectl logs -n pdf-text-mcp -l app.kubernetes.io/name=pdf-text-mcp-server

# Describe pod
kubectl describe pod -n pdf-text-mcp <pod-name>

# Test health endpoint
kubectl port-forward -n pdf-text-mcp svc/pdf-mcp-pdf-text-mcp-server 8080:80
curl http://localhost:8080/health
```

## Chart Structure

```
helm/pdf-text-mcp-server/
├── Chart.yaml              # Chart metadata
├── values.yaml             # Default values (production-ready)
├── values-prod.yaml        # Production overrides
├── values-dev.yaml         # Development overrides
├── values-minikube.yaml    # Minikube overrides
└── templates/
    ├── NOTES.txt           # Post-install instructions
    ├── _helpers.tpl        # Template helpers
    ├── configmap.yaml      # Application configuration
    ├── deployment.yaml     # Pod deployment
    ├── service.yaml        # Service exposure
    ├── ingress.yaml        # Ingress (optional)
    ├── secret.yaml         # API key secret (optional)
    └── serviceaccount.yaml # Service account
```
