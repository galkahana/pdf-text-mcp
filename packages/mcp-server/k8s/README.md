# Kubernetes Manifests

Simple, ready-to-use Kubernetes manifests for quick deployments.

## Quick Start

```bash
# Deploy to Kubernetes
kubectl apply -f packages/mcp-server/k8s/

# Check deployment
kubectl get all -n pdf-text-mcp

# Access via port-forward
kubectl port-forward -n pdf-text-mcp svc/pdf-text-mcp-server 8080:80
curl http://localhost:8080/health
```

## When to Use This

- **Quick testing** - Fast deployment without additional tools
- **Learning** - Easy to read and understand raw Kubernetes resources
- **CI/CD** - Some pipelines prefer raw manifests
- **Simple deployments** - No customization needed

## Files

- `namespace.yaml` - Creates pdf-text-mcp namespace
- `configmap.yaml` - Application configuration (PORT, MAX_FILE_SIZE, etc.)
- `deployment.yaml` - 3-replica deployment with health checks
- `service.yaml` - ClusterIP service exposing port 80

## For Production Deployments

For production environments with multiple configurations, autoscaling, ingress, and easier management, use the **Helm chart** instead:

📦 **Helm Chart:** [../helm/pdf-text-mcp-server/](../helm/pdf-text-mcp-server/)

Benefits of Helm:
- Single command deployment
- Environment-specific values (dev, prod, minikube)
- Easy upgrades and rollbacks
- Parameterized configuration
- No YAML editing needed

```bash
helm install pdf-mcp ./packages/mcp-server/helm/pdf-text-mcp-server \
  -f ./packages/mcp-server/helm/pdf-text-mcp-server/values-prod.yaml
```

## Configuration

To modify configuration, edit `configmap.yaml`:
- `TRANSPORT_MODE`: "http" or "stdio"
- `PORT`: Server port (default: 3000)
- `MAX_FILE_SIZE`: Max PDF size in bytes (default: 100MB)
- `TIMEOUT`: Extraction timeout in ms (default: 30s)

## Cleanup

```bash
kubectl delete namespace pdf-text-mcp
```
