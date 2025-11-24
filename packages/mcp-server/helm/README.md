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

### 1. `values.yaml` (Default/Base)
Production-ready base configuration with observability support:
- 3 replicas, ClusterIP service
- Standard resources (512Mi-1Gi memory)
- Health/readiness probes
- Uses `optimized` image tag
- **Observability disabled by default** (can be enabled via flags)
- Full observability stack configuration (Prometheus, Loki, Grafana, Alertmanager)

### 2. `values-minikube.yaml` (Local Development/Testing)
Optimized for local Minikube development with full observability enabled:
- 1 replica, NodePort service
- Minimal resources (256-512Mi)
- Faster probes for quick feedback
- Lower file size limit (50MB)
- **✅ Observability ENABLED** - Full monitoring stack deployed:
  - Prometheus for metrics collection
  - Loki for log aggregation
  - Promtail for log shipping
  - Grafana with pre-configured dashboards
  - Alertmanager for alert routing
- Perfect for testing observability features locally

### 3. `values-prod.yaml` (Production)
High-availability production configuration:
- 5-20 replicas with autoscaling
- Ingress with TLS (Let's Encrypt)
- High resources (1-2Gi memory)
- Pod anti-affinity for HA
- GCP Workload Identity support
- **Observability DISABLED by default** (enable in production as needed)
- To enable observability in production, add:
  ```yaml
  observability:
    prometheus:
      enabled: true
    loki:
      enabled: true
  ```

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

# Observability (metrics, logs, alerts, dashboards)
observability:
  prometheus:
    enabled: true  # Enable Prometheus metrics collection
  loki:
    enabled: true  # Enable Loki log aggregation
```

## Observability

The chart includes a complete observability stack via subchart dependencies:

### Enabling Observability

**Development (enabled by default in values-minikube.yaml):**
```bash
helm install pdf-mcp ./packages/mcp-server/helm/pdf-text-mcp-server \
  -f ./packages/mcp-server/helm/pdf-text-mcp-server/values-minikube.yaml
```

**Production (enable explicitly):**
```bash
helm install pdf-mcp ./packages/mcp-server/helm/pdf-text-mcp-server \
  -f ./packages/mcp-server/helm/pdf-text-mcp-server/values-prod.yaml \
  --set observability.prometheus.enabled=true \
  --set observability.loki.enabled=true
```

### What Gets Deployed

When observability is enabled:
- **Prometheus** - Metrics collection and storage (7-day retention)
- **Grafana** - Visualization with 2 pre-configured dashboards:
  - PDF MCP Overview (metrics: request rate, errors, latency, memory)
  - PDF MCP Logs (structured log viewer)
- **Alertmanager** - Alert routing with 4 pre-configured alerts:
  - High error rate (>5% for 2 minutes)
  - High latency (P95 >30s for 5 minutes)
  - Service down (no metrics for 2 minutes)
  - High memory usage (>80% for 10 minutes)
- **Loki** - Log aggregation and storage
- **Promtail** - Log collection from all pods

### Accessing Grafana

```bash
# Get Grafana URL (NodePort in minikube)
kubectl get svc -n pdf-text-mcp | grep grafana

# Port forward to access locally
kubectl port-forward -n pdf-text-mcp svc/pdf-mcp-grafana 3000:80

# Access at http://localhost:3000
# Default credentials: admin/admin
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
├── Chart.yaml                      # Chart metadata with observability dependencies
├── Chart.lock                      # Dependency lock file
├── values.yaml                     # Base values (observability disabled)
├── values-minikube.yaml            # Minikube values (observability enabled)
├── values-prod.yaml                # Production values (observability disabled)
├── charts/                         # Downloaded chart dependencies (gitignored)
│   ├── kube-prometheus-stack-*.tgz # Prometheus, Grafana, Alertmanager
│   └── loki-stack-*.tgz            # Loki and Promtail
└── templates/
    ├── NOTES.txt                   # Post-install instructions
    ├── _helpers.tpl                # Template helpers
    ├── configmap.yaml              # Application configuration
    ├── deployment.yaml             # Pod deployment
    ├── service.yaml                # Service exposure
    ├── ingress.yaml                # Ingress (optional)
    ├── secret.yaml                 # API key secret (optional)
    ├── serviceaccount.yaml         # Service account
    ├── servicemonitor.yaml         # Prometheus ServiceMonitor (observability)
    ├── prometheusrule.yaml         # Prometheus alerts (observability)
    └── grafana-dashboards.yaml     # Grafana dashboards ConfigMaps (observability)
```
