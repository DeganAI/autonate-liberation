# Deploying Autonate Liberation on Compute3.ai

## Overview
This guide will help you deploy the Autonate Liberation Organization's AI workforce on Compute3.ai, leveraging their enterprise-grade infrastructure for optimal performance and reliability.

## Prerequisites

- Compute3.ai account with API access (Enterprise tier recommended)
- API keys for: Anthropic, OpenAI, Dialpad, Slack, BatsCRM
- Node.js 20+ and Bun installed locally for initial setup

## Step 1: Prepare Your Compute3 Environment

### 1.1 Set Up Compute3 API Access
First, ensure you have your Compute3 API key ready:

```bash
# Export your Compute3 API key
export COMPUTE3_API_KEY="your_compute3_api_key_here"

# Verify access
curl -H "Authorization: Bearer $COMPUTE3_API_KEY" \
  https://api.compute3.ai/v1/status
```

### 1.2 Create a New Compute3 Project
```bash
# Install Compute3 CLI if not already installed
npm install -g @compute3/cli

# Login with your API key
compute3 auth login --api-key $COMPUTE3_API_KEY

# Create a new project for Autonate
compute3 project create autonate-liberation \
  --tier enterprise \
  --region us-west \
  --description "Auto Transport AI Coordination System"
```

## Step 2: Clone and Configure Autonate

### 2.1 Clone the Repository
```bash
# Clone the Autonate Liberation repository
git clone https://github.com/DeganAI/autonate-liberation
cd autonate-liberation

# Install dependencies
bun install
```

### 2.2 Configure Environment for Compute3
Create a `.env.compute3` file with your configuration:

```env
# === COMPUTE3 DEPLOYMENT ===
COMPUTE3_API_KEY=your_compute3_api_key_here
COMPUTE3_PROJECT_ID=autonate-liberation
DEPLOYMENT_TIER=enterprise
DEPLOYMENT_REGION=us-west
MONITORING_LEVEL=comprehensive

# === CORE AI CONFIGURATION ===
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
ELIZA_MODEL_PROVIDER=anthropic
ELIZA_DEFAULT_MODEL=claude-3-opus-20240229

# === COMMUNICATION INTEGRATIONS ===
# Dialpad (Phone & SMS)
DIALPAD_API_KEY=your_dialpad_api_key_here
DIALPAD_PHONE_NUMBER=+1-555-AUTO-SHIP
DIALPAD_SMS_ENABLED=true
DIALPAD_VOICE_ENABLED=true

# Slack (Team Communication)
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_APP_TOKEN=xapp-your-slack-app-token
SLACK_SIGNING_SECRET=your_slack_signing_secret
SLACK_CUSTOMER_CHANNEL=#customer-updates
SLACK_INTERNAL_CHANNEL=#coordination-hub

# BatsCRM (Customer Management)
BATSCRM_API_KEY=your_batscrm_api_key
BATSCRM_ENDPOINT=https://api.batscrm.com/v2
BATSCRM_WEBHOOK_SECRET=your_webhook_secret
BATSCRM_SYNC_INTERVAL=30000

# === LIBERATION SETTINGS ===
MAX_COORDINATOR_HOURS_PER_WEEK=40
STRESS_MONITORING_ENABLED=true
VACATION_PROTECTION_LEVEL=ABSOLUTE
EMERGENCY_ESCALATION_THRESHOLD=0.8

# === PERFORMANCE ===
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
AUTO_SCALING=true
MIN_INSTANCES=2
MAX_INSTANCES=10
```

## Step 3: Create Compute3 Deployment Configuration

### 3.1 Create compute3.yaml
```yaml
version: '1.0'
name: autonate-liberation
description: AI-Powered Auto Transport Coordination System

# Compute3 specific configuration
compute:
  tier: enterprise
  region: us-west
  scaling:
    min_instances: 2
    max_instances: 10
    target_cpu: 70
    target_memory: 80

# Agent deployment configuration
agents:
  - name: autonate-prime
    character: ./characters/autonate-prime.json
    priority: high
    resources:
      cpu: 2
      memory: 4Gi
    replicas: 2
    
  - name: wellness-guardian
    character: ./characters/wellness-guardian.json
    priority: medium
    resources:
      cpu: 1
      memory: 2Gi
    replicas: 1
    
  - name: route-oracle
    character: ./characters/route-oracle.json
    priority: high
    resources:
      cpu: 2
      memory: 4Gi
    replicas: 2
    
  - name: customer-empath
    character: ./characters/customer-empath.json
    priority: high
    resources:
      cpu: 1.5
      memory: 3Gi
    replicas: 3
    
  - name: carrier-vettor
    character: ./characters/carrier-vettor.json
    priority: medium
    resources:
      cpu: 1
      memory: 2Gi
    replicas: 1
    
  - name: narrative-artist
    character: ./characters/narrative-artist.json
    priority: low
    resources:
      cpu: 0.5
      memory: 1Gi
    replicas: 1

# Integration endpoints
endpoints:
  - path: /api/v1/shipment
    methods: [POST, GET, PUT]
    auth: api_key
    rate_limit: 1000/hour
    
  - path: /webhooks/dialpad
    methods: [POST]
    auth: webhook_secret
    
  - path: /webhooks/slack
    methods: [POST]
    auth: slack_signing
    
  - path: /webhooks/crm
    methods: [POST]
    auth: webhook_secret

# Monitoring and alerts
monitoring:
  enabled: true
  metrics:
    - response_time
    - error_rate
    - agent_health
    - integration_status
  alerts:
    - metric: error_rate
      threshold: 0.05
      action: notify_slack
    - metric: response_time
      threshold: 2000
      action: scale_up

# Security
security:
  encryption: end_to_end
  compliance: SOC2_TYPE_II
  audit_logging: true
  ip_whitelist:
    - 0.0.0.0/0  # Update with your specific IPs
```

## Step 4: Deploy to Compute3

### 4.1 Build and Package
```bash
# Build the project
bun run build

# Create deployment package
compute3 package create \
  --config compute3.yaml \
  --env .env.compute3 \
  --output autonate-deployment.zip
```

### 4.2 Deploy to Compute3
```bash
# Deploy the package
compute3 deploy \
  --package autonate-deployment.zip \
  --project autonate-liberation \
  --wait

# Get deployment status
compute3 deployment status --project autonate-liberation
```

### 4.3 Verify Deployment
```bash
# Get the deployment URL
DEPLOYMENT_URL=$(compute3 project get autonate-liberation --output json | jq -r '.url')

echo "Your Autonate system is deployed at: $DEPLOYMENT_URL"

# Test the deployment
curl -X GET $DEPLOYMENT_URL/api/v1/health
```

## Step 5: Configure Webhooks and Integrations

### 5.1 Update External Service Webhooks
Update your external services to point to your Compute3 deployment:

```javascript
// Dialpad Webhook
{
  "webhook_url": "https://autonate-liberation.compute3.ai/webhooks/dialpad",
  "events": ["call.received", "sms.received", "call.completed"]
}

// Slack Event Subscriptions
{
  "request_url": "https://autonate-liberation.compute3.ai/webhooks/slack",
  "events": ["message.channels", "app_mention", "reaction_added"]
}

// BatsCRM Webhooks
{
  "endpoint": "https://autonate-liberation.compute3.ai/webhooks/crm",
  "events": ["lead.created", "shipment.updated", "customer.modified"]
}
```

### 5.2 Configure DNS (Optional)
If you have a custom domain:

```bash
# Add custom domain to Compute3
compute3 domain add autonate.yourdomain.com \
  --project autonate-liberation \
  --ssl auto

# Update DNS records as instructed
```

## Step 6: Monitoring and Management

### 6.1 Access Compute3 Dashboard
```bash
# Get dashboard URL
compute3 dashboard open --project autonate-liberation

# Or access directly
# https://dashboard.compute3.ai/projects/autonate-liberation
```

### 6.2 View Real-time Metrics
```bash
# View agent status
compute3 agents list --project autonate-liberation

# View logs
compute3 logs --project autonate-liberation --tail 100

# View specific agent logs
compute3 logs --project autonate-liberation \
  --agent autonate-prime \
  --tail 50
```

### 6.3 Scale Resources
```bash
# Manual scaling
compute3 scale --project autonate-liberation \
  --agent customer-empath \
  --replicas 5

# Update auto-scaling rules
compute3 autoscale update --project autonate-liberation \
  --min 3 \
  --max 15 \
  --target-cpu 60
```

## Step 7: Advanced Compute3 Features

### 7.1 Enable GPU Acceleration (for Route Oracle)
```bash
# Enable GPU for advanced route calculations
compute3 gpu enable --project autonate-liberation \
  --agent route-oracle \
  --type nvidia-t4
```

### 7.2 Set Up Multi-Region Deployment
```bash
# Deploy to additional regions for lower latency
compute3 region add --project autonate-liberation \
  --region us-east \
  --replicate-from us-west
```

### 7.3 Configure Backup and Disaster Recovery
```bash
# Enable automatic backups
compute3 backup enable --project autonate-liberation \
  --frequency hourly \
  --retention 168h

# Create disaster recovery plan
compute3 dr create --project autonate-liberation \
  --failover-region us-east \
  --rto 5m
```

## Step 8: Integration with ElizaOS Dashboard

If you still want to use your ElizaOS dashboard for monitoring:

### 8.1 Connect Compute3 to ElizaOS
```bash
# In your ElizaOS instance settings
elizaos remote add compute3 \
  --url https://autonate-liberation.compute3.ai \
  --api-key $COMPUTE3_API_KEY
```

### 8.2 View Agents in ElizaOS Dashboard
Your Compute3-deployed agents will now appear in your ElizaOS dashboard at https://eliza.shipping4.degenai.us with a "Compute3" badge.

## Troubleshooting

### Common Issues

1. **Deployment Fails**
   ```bash
   # Check deployment logs
   compute3 logs --project autonate-liberation --deployment
   
   # Validate configuration
   compute3 validate --config compute3.yaml
   ```

2. **Agent Communication Issues**
   ```bash
   # Check network connectivity
   compute3 network test --project autonate-liberation
   
   # Verify agent endpoints
   compute3 endpoints list --project autonate-liberation
   ```

3. **Performance Issues**
   ```bash
   # View resource usage
   compute3 metrics --project autonate-liberation --period 1h
   
   # Optimize resource allocation
   compute3 optimize --project autonate-liberation --auto
   ```

## Cost Optimization

### Monitor Usage
```bash
# View current usage and costs
compute3 billing usage --project autonate-liberation

# Set up cost alerts
compute3 billing alert create \
  --project autonate-liberation \
  --threshold 1000 \
  --currency USD
```

### Optimize Resources
```bash
# Run cost optimization analysis
compute3 optimize analyze --project autonate-liberation

# Apply recommended optimizations
compute3 optimize apply --project autonate-liberation
```

## Support

- **Compute3 Support**: support@compute3.ai
- **Compute3 Documentation**: https://docs.compute3.ai
- **Autonate GitHub**: https://github.com/DeganAI/autonate-liberation
- **ElizaOS Community**: Discord community for ElizaOS/Eliza framework

---

*Your Autonate Liberation system is now running on enterprise-grade Compute3 infrastructure with 99.9% uptime, automatic scaling, and comprehensive monitoring.*

*Remember: The system augments human coordinators with AI superpowers while maintaining human oversight and control.*
