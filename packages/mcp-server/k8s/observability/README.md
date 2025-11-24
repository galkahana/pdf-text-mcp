# Observability Stack for PDF MCP Server

Complete observability solution with metrics, logging, and alerting for the PDF Text Extraction MCP Server.

## Components

### Metrics & Monitoring
- **Prometheus** - Metrics collection and storage
- **Grafana** - Visualization dashboards
- **Alertmanager** - Alert routing and notifications

### Logging
- **Loki** - Log aggregation and storage
- **Promtail** - Log collection agent (DaemonSet)

## Quick Start

### Deploy Full Stack

```bash
# Deploy all observability components
kubectl apply -f observability/

# Or deploy individually
kubectl apply -f observability/prometheus.yaml
kubectl apply -f observability/loki.yaml
kubectl apply -f observability/promtail.yaml
kubectl apply -f observability/alertmanager.yaml
kubectl apply -f observability/grafana.yaml
```

### Access Grafana UI

**Minikube:**
```bash
# Grafana is exposed via NodePort on port 30300
minikube service grafana -n pdf-text-mcp

# Or use port-forward
kubectl port-forward -n pdf-text-mcp svc/grafana 3000:80
```

**Default Credentials:**
- Username: `admin`
- Password: `admin`
- Anonymous access is enabled with Admin role

### Access Prometheus UI (Optional)

```bash
# Port-forward to access Prometheus directly
kubectl port-forward -n pdf-text-mcp svc/prometheus 9090:9090

# Open http://localhost:9090
```

### Access Alertmanager UI (Optional)

```bash
# Port-forward to access Alertmanager
kubectl port-forward -n pdf-text-mcp svc/alertmanager 9093:9093

# Open http://localhost:9093
```

## Grafana Dashboards

### Pre-configured Dashboards

1. **PDF MCP Server - Overview**
   - Request rate by tool and status
   - Error rate percentage
   - Latency percentiles (P50, P95, P99)
   - PDF file size distribution
   - Memory usage
   - HTTP request metrics

2. **PDF MCP Server - Logs**
   - Recent log stream with filtering
   - Log level distribution
   - Error rate over time
   - Correlation ID tracking

### Dashboard Features

- **Correlation ID Search**: Find all logs for a specific request
- **Tool-specific Metrics**: Filter by `extract_text` or `extract_metadata`
- **Time Range Selection**: Analyze historical data
- **Auto-refresh**: Dashboards refresh every 30 seconds

## Metrics Available

### MCP Tool Metrics
- `mcp_tool_invocations_total` - Total tool invocations (by tool, status)
- `mcp_tool_execution_duration_seconds` - Tool execution time histogram

### PDF Processing Metrics
- `pdf_file_size_bytes` - Processed PDF file sizes
- `pdf_page_count` - Page counts in processed PDFs
- `pdf_processing_duration_seconds` - Native addon processing time

### HTTP Metrics
- `http_requests_total` - Total HTTP requests (by method, path, status)
- `http_request_duration_seconds` - HTTP request latency

### System Metrics
- `memory_usage_bytes` - Memory usage (rss, heapTotal, heapUsed)
- `cpu_usage_percent` - CPU usage
- `server_uptime_seconds` - Server uptime

### Error Metrics
- `errors_total` - Total errors (by type, tool)

## Alert Rules

### Configured Alerts

1. **HighErrorRate**
   - Triggers when error rate > 5% for 2 minutes
   - Severity: Warning

2. **HighLatency**
   - Triggers when P95 latency > 30 seconds for 5 minutes
   - Severity: Warning

3. **ServiceDown**
   - Triggers when no metrics received for 2 minutes
   - Severity: Critical

4. **PodRestartingFrequently**
   - Triggers when pod restarts > 0.1/second for 5 minutes
   - Severity: Warning

5. **HighMemoryUsage**
   - Triggers when heap usage > 80% for 10 minutes
   - Severity: Warning

### Configuring Alert Notifications

Edit `alertmanager.yaml` to configure notification channels:

**Slack:**
```yaml
slack_configs:
  - api_url: 'YOUR_SLACK_WEBHOOK_URL'
    channel: '#alerts'
    title: 'Alert'
    text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
```

**Email:**
```yaml
email_configs:
  - to: 'oncall@example.com'
    from: 'alertmanager@pdf-text-mcp.com'
    smarthost: 'smtp.example.com:587'
    auth_username: 'alertmanager'
    auth_password: 'PASSWORD'
```

**PagerDuty:**
```yaml
pagerduty_configs:
  - service_key: 'YOUR_PAGERDUTY_SERVICE_KEY'
```

## Log Collection

### Log Format

The MCP server emits structured JSON logs:

```json
{
  "level": "info",
  "timestamp": "2025-11-19T10:00:00.000Z",
  "message": "Tool request completed",
  "service": "pdf-text-mcp-server",
  "correlationId": "uuid-here",
  "toolName": "extract_text",
  "fileSize": 1048576,
  "pageCount": 10,
  "processingTime": 250
}
```

### Querying Logs in Grafana

**Find all logs for a correlation ID:**
```
{namespace="pdf-text-mcp"} | json | correlationId="uuid-here"
```

**Find all errors:**
```
{namespace="pdf-text-mcp"} | json | level="error"
```

**Find slow requests:**
```
{namespace="pdf-text-mcp"} | json | processingTime > 5000
```

## Resource Requirements

### Default Resource Allocations

| Component | Memory Request | Memory Limit | CPU Request | CPU Limit |
|-----------|---------------|--------------|-------------|-----------|
| Prometheus | 512Mi | 1Gi | 250m | 500m |
| Loki | 256Mi | 512Mi | 100m | 200m |
| Promtail | 128Mi | 256Mi | 100m | 200m |
| Grafana | 256Mi | 512Mi | 100m | 200m |
| Alertmanager | 128Mi | 256Mi | 100m | 200m |

### Data Retention

- **Prometheus**: 7 days (configurable via `--storage.tsdb.retention.time`)
- **Loki**: 7 days (configurable in `loki.yaml`)

### Storage

All components use `emptyDir` volumes by default (data lost on pod restart).

**For production**, replace with persistent volumes:

```yaml
volumes:
  - name: data
    persistentVolumeClaim:
      claimName: prometheus-data
```

## Troubleshooting

### Prometheus Not Scraping Metrics

**Check pod labels:**
```bash
kubectl get pods -n pdf-text-mcp --show-labels
```

The MCP server pods must have label `app=pdf-text-mcp-server`.

**Check Prometheus targets:**
```bash
kubectl port-forward -n pdf-text-mcp svc/prometheus 9090:9090
# Open http://localhost:9090/targets
```

### No Logs in Grafana

**Check Promtail is running:**
```bash
kubectl get pods -n pdf-text-mcp -l app=promtail
```

**Check Promtail logs:**
```bash
kubectl logs -n pdf-text-mcp -l app=promtail
```

**Verify Loki is receiving logs:**
```bash
kubectl port-forward -n pdf-text-mcp svc/loki 3100:3100
curl http://localhost:3100/ready
```

### Grafana Dashboards Not Loading

**Check ConfigMaps are mounted:**
```bash
kubectl describe pod -n pdf-text-mcp -l app=grafana
```

**Check Grafana logs:**
```bash
kubectl logs -n pdf-text-mcp -l app=grafana
```

## Customization

### Adding Custom Dashboards

1. Create dashboard in Grafana UI
2. Export dashboard JSON
3. Add to ConfigMap in `grafana.yaml`
4. Redeploy: `kubectl apply -f observability/grafana.yaml`

### Modifying Alert Rules

1. Edit `prometheus.yaml` under `alert-rules.yml`
2. Redeploy: `kubectl apply -f observability/prometheus.yaml`
3. Reload Prometheus: `kubectl rollout restart -n pdf-text-mcp deployment/prometheus`

### Adjusting Scrape Intervals

Edit `prometheus.yml` in `prometheus.yaml`:
```yaml
global:
  scrape_interval: 15s  # Change this
  evaluation_interval: 15s  # And this
```

## Production Recommendations

1. **Persistent Storage**: Use PersistentVolumeClaims for Prometheus and Loki
2. **High Availability**: Run multiple replicas with proper configuration
3. **Security**: Disable anonymous access to Grafana, use proper authentication
4. **Resource Limits**: Adjust based on actual usage patterns
5. **Alert Channels**: Configure Slack, PagerDuty, or email notifications
6. **Retention**: Adjust data retention based on compliance requirements
7. **Backup**: Regular backups of Grafana dashboards and Prometheus data

## Next Steps

- [Configure alert notifications](#configuring-alert-notifications)
- [Set up persistent storage](#storage)
- [Customize dashboards](#adding-custom-dashboards)
- [Integrate with external monitoring tools](#production-recommendations)
