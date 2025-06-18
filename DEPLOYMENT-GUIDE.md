# Deploying Autonate Liberation on ElizaOS

## Overview
This guide will help you deploy the Autonate Liberation Organization's AI workforce on your ElizaOS v1.0.6 instance. Autonate consists of 6 specialized AI agents built on the Eliza framework that work together to revolutionize auto transport coordination.

## Prerequisites

- ElizaOS v1.0.6 or higher (as shown in your interface)
- Node.js 20+ and Bun installed
- API keys for: Anthropic, OpenAI, Dialpad, Slack, BatsCRM
- Admin access to your systems

## Step 1: Clone and Setup Autonate

### 1.1 Clone the Repository
```bash
# Clone the Autonate Liberation repository
git clone https://github.com/DeganAI/autonate-liberation
cd autonate-liberation

# Install dependencies using bun (required for ElizaOS)
bun install

# Build the project
bun run build
```

### 1.2 Install ElizaOS CLI (if not already installed)
```bash
# Install the ElizaOS CLI globally
bun install -g @elizaos/cli

# Verify installation
elizaos --version
```

## Step 2: Configure Environment Variables

Create a `.env` file in the autonate-liberation directory with all necessary API keys and configuration:

```env
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

# === DEPLOYMENT ===
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
```

## Step 3: Agent Character Configuration

The Autonate agents are pre-configured in the repository. Navigate to the `characters/` directory to review and customize each agent:

### Agent Overview

1. **autonate-prime.json** - Senior Coordinator AI (Orchestrator)
2. **wellness-guardian.json** - HR Manager AI (Human Protection)
3. **route-oracle.json** - Logistics Analyst AI (Route Optimization)
4. **customer-empath.json** - Customer Success AI (Emotional Intelligence)
5. **carrier-vettor.json** - Carrier Relations AI (Quality Control)
6. **narrative-artist.json** - Marketing Writer AI (Creative Communications)

Each character file follows the Eliza framework structure with personality, knowledge, actions, and plugin configurations tailored for auto transport coordination.

## Step 4: Deploy Using ElizaOS CLI

### 4.1 Start the Autonate System
```bash
# From the autonate-liberation directory
elizaos start

# Or with specific configuration
elizaos start --character ./characters/autonate-prime.json

# For development with debug logging
LOG_LEVEL=debug elizaos start
```

### 4.2 Verify Deployment
Once started, you can:
1. Visit http://localhost:3000 to interact with your agents through the web interface
2. Check the ElizaOS dashboard at https://eliza.shipping4.degenai.us
3. Verify all 6 Autonate agents show as "active" in the Agents section

## Step 5: Multi-Agent Orchestration

Autonate uses a hierarchical coordination system where Autonate Prime orchestrates the other agents. This is configured through the agent communication protocol:

```javascript
// The orchestration is handled internally by the Eliza framework
// Autonate Prime manages the workflow and delegates tasks to specialist agents
```

Key workflows include:
- **New Shipment**: Customer inquiry → Route planning → Carrier selection → Customer communication
- **Delay Detection**: Route monitoring → Alert generation → Customer notification → Resolution
- **Coordinator Stress**: Wellness monitoring → Workload redistribution → Coverage activation

## Step 6: Integration Testing

### 6.1 Test Individual Integrations
```bash
# Test Dialpad phone/SMS capabilities
curl -X POST http://localhost:3000/api/test/dialpad \
  -H "Content-Type: application/json" \
  -d '{"action": "send_sms", "to": "+1234567890", "message": "Test message"}'

# Test Slack integration
curl -X POST http://localhost:3000/api/test/slack \
  -H "Content-Type: application/json" \
  -d '{"channel": "#test", "message": "Autonate system online"}'

# Test BatsCRM sync
curl -X GET http://localhost:3000/api/test/crm/sync
```

### 6.2 Test Multi-Agent Workflows
```bash
# Simulate a new shipment request
curl -X POST http://localhost:3000/api/workflow/new_shipment \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "TEST001",
    "origin": "Los Angeles, CA",
    "destination": "New York, NY",
    "vehicle": "2022 Toyota Camry",
    "preferred_pickup": "2025-06-20"
  }'
```

## Step 7: Production Deployment on ElizaOS

### 7.1 Deploy to Your ElizaOS Instance
Since you have ElizaOS running at https://eliza.shipping4.degenai.us, you can deploy Autonate directly:

```bash
# Package the Autonate system
bun run build:production

# Deploy to your ElizaOS instance
elizaos deploy --url https://eliza.shipping4.degenai.us \
  --project autonate-liberation \
  --agents all
```

### 7.2 Configure Webhooks
Set up webhooks for external services to communicate with your agents:

```javascript
// Example webhook configuration
{
  "dialpad": "https://eliza.shipping4.degenai.us/webhooks/dialpad",
  "slack": "https://eliza.shipping4.degenai.us/webhooks/slack",
  "batscrm": "https://eliza.shipping4.degenai.us/webhooks/crm"
}
```

## Step 8: Monitoring & Optimization

### 8.1 Access Monitoring Dashboard
- Navigate to https://eliza.shipping4.degenai.us
- Click on "Logs" to view agent activity
- Monitor performance metrics for each agent

### 8.2 Performance Tuning
After deployment, monitor and adjust:
- Response times for customer inquiries
- Route optimization accuracy
- Carrier selection efficiency
- Human coordinator workload reduction

## Troubleshooting

### Common Issues and Solutions

1. **Agent Not Appearing in Dashboard**
   ```bash
   # Check agent status
   elizaos agent list
   
   # Restart specific agent
   elizaos agent restart --name "Autonate Prime"
   ```

2. **Integration Connection Failures**
   - Verify API keys in .env file
   - Check network connectivity
   - Review logs: `elizaos logs --tail 100`

3. **Memory/Performance Issues**
   ```bash
   # Adjust memory allocation
   NODE_OPTIONS="--max-old-space-size=4096" elizaos start
   ```

## Next Steps

1. **Week 1**: Monitor initial performance and gather feedback
2. **Week 2**: Fine-tune agent responses and workflows
3. **Week 3**: Expand to full customer base
4. **Week 4**: Activate advanced features (predictive routing, emotional intelligence)

## Support Resources

- **ElizaOS Documentation**: https://elizaos.github.io/eliza/docs/
- **Autonate GitHub**: https://github.com/DeganAI/autonate-liberation
- **Community Discord**: Join the ElizaOS Discord for support
- **Emergency Support**: Contact your implementation specialist

---

*Remember: Autonate is designed to augment human coordinators, not replace them. The system provides superpowers while maintaining human oversight and control.*

*Deployment guide for Autonate Liberation on ElizaOS v1.0*
