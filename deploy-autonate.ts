// deploy-autonate.ts
// Deployment script for Autonate Liberation Organization on Compute3.ai

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

interface DeploymentConfig {
  compute3ApiKey: string;
  compute3Endpoint: string;
  workspace: string;
  environment: 'staging' | 'production';
}

class AutonateDeployer {
  private config: DeploymentConfig;
  private deploymentId: string;

  constructor(config: DeploymentConfig) {
    this.config = config;
    this.deploymentId = `autonate-${Date.now()}`;
  }

  async deploy() {
    console.log("🚀 Starting Autonate Liberation Organization deployment...");
    
    try {
      // Step 1: Validate environment
      await this.validateEnvironment();
      
      // Step 2: Build containers
      await this.buildContainers();
      
      // Step 3: Push to Compute3 registry
      await this.pushToRegistry();
      
      // Step 4: Deploy organization
      await this.deployOrganization();
      
      // Step 5: Verify deployment
      await this.verifyDeployment();
      
      // Step 6: Run post-deployment tests
      await this.runLiberationTests();
      
      console.log("✅ Autonate Liberation Organization deployed successfully!");
      console.log("🎉 Coordinators are now free to take breaks!");
      
    } catch (error) {
      console.error("❌ Deployment failed:", error);
      await this.rollback();
      throw error;
    }
  }

  private async validateEnvironment() {
    console.log("🔍 Validating environment...");
    
    const requiredEnvVars = [
      'COMPUTE3_API_KEY',
      'ANTHROPIC_API_KEY',
      'OPENAI_API_KEY',
      'DIALPAD_API_KEY',
      'DATABASE_URL',
      'WEATHER_API_KEY'
    ];
    
    const missing = requiredEnvVars.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    // Validate Compute3 connection
    const response = await fetch(`${this.config.compute3Endpoint}/health`, {
      headers: {
        'Authorization': `Bearer ${this.config.compute3ApiKey}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to connect to Compute3.ai');
    }
    
    console.log("✅ Environment validated");
  }

  private async buildContainers() {
    console.log("🏗️ Building agent containers...");
    
    const agents = [
      'autonate-prime',
      'wellness-guardian',
      'route-oracle',
      'customer-empath',
      'carrier-vettor',
      'narrative-artist'
    ];
    
    for (const agent of agents) {
      console.log(`  Building ${agent}...`);
      
      // Create Dockerfile for agent
      const dockerfile = this.generateDockerfile(agent);
      fs.writeFileSync(`./docker/${agent}/Dockerfile`, dockerfile);
      
      // Build container
      execSync(`docker build -t autonate/${agent}:${this.deploymentId} ./docker/${agent}`, {
        stdio: 'inherit'
      });
    }
    
    console.log("✅ All agent containers built");
  }

  private generateDockerfile(agentId: string): string {
    return `FROM node:20-alpine

# Install dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy agent code
COPY ./agents/${agentId} ./agents/${agentId}
COPY ./shared ./shared
COPY ./characters ./characters
COPY ./plugins ./plugins

# Set agent-specific environment
ENV AGENT_ID=${agentId}
ENV NODE_ENV=production
ENV LIBERATION_MODE=enabled

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
  CMD node healthcheck.js

# Run the agent
CMD ["node", "start-agent.js"]
`;
  }

  private async pushToRegistry() {
    console.log("📤 Pushing containers to Compute3 registry...");
    
    const registry = `${this.config.workspace}.compute3.ai`;
    
    // Login to registry
    execSync(`echo ${this.config.compute3ApiKey} | docker login ${registry} -u _token --password-stdin`, {
      stdio: 'inherit'
    });
    
    // Tag and push each container
    const agents = [
      'autonate-prime',
      'wellness-guardian',
      'route-oracle',
      'customer-empath',
      'carrier-vettor',
      'narrative-artist'
    ];
    
    for (const agent of agents) {
      const localTag = `autonate/${agent}:${this.deploymentId}`;
      const remoteTag = `${registry}/${agent}:${this.deploymentId}`;
      
      execSync(`docker tag ${localTag} ${remoteTag}`, { stdio: 'inherit' });
      execSync(`docker push ${remoteTag}`, { stdio: 'inherit' });
    }
    
    console.log("✅ All containers pushed to registry");
  }

  private async deployOrganization() {
    console.log("🚀 Deploying organization to Compute3...");
    
    // Read deployment config
    const deployConfig = fs.readFileSync('./compute3-deploy.yaml', 'utf8');
    
    // Deploy via Compute3 API
    const response = await fetch(`${this.config.compute3Endpoint}/organizations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.compute3ApiKey}`,
        'Content-Type': 'application/yaml'
      },
      body: deployConfig
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Deployment failed: ${error}`);
    }
    
    const deployment = await response.json();
    console.log(`✅ Organization deployed: ${deployment.id}`);
    
    // Wait for all agents to be ready
    await this.waitForAgents(deployment.id);
  }

  private async waitForAgents(deploymentId: string) {
    console.log("⏳ Waiting for agents to be ready...");
    
    const maxWaitTime = 5 * 60 * 1000; // 5 minutes
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const response = await fetch(
        `${this.config.compute3Endpoint}/organizations/${deploymentId}/status`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.compute3ApiKey}`
          }
        }
      );
      
      const status = await response.json();
      
      if (status.agents.every((agent: any) => agent.status === 'ready')) {
        console.log("✅ All agents are ready!");
        return;
      }
      
      console.log(`  Agents ready: ${status.agents.filter((a: any) => a.status === 'ready').length}/${status.agents.length}`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    throw new Error('Timeout waiting for agents to be ready');
  }

  private async verifyDeployment() {
    console.log("🔍 Verifying deployment...");
    
    // Test each agent endpoint
    const agents = [
      'autonate-prime',
      'wellness-guardian',
      'route-oracle',
      'customer-empath',
      'carrier-vettor',
      'narrative-artist'
    ];
    
    for (const agent of agents) {
      const response = await fetch(
        `https://${this.config.workspace}.compute3.ai/agents/${agent}/health`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.compute3ApiKey}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Agent ${agent} health check failed`);
      }
      
      console.log(`  ✅ ${agent} is healthy`);
    }
    
    console.log("✅ All agents verified");
  }

  private async runLiberationTests() {
    console.log("🧪 Running liberation tests...");
    
    // Test 1: Wellness check
    console.log("  Testing wellness monitoring...");
    const wellnessResponse = await fetch(
      `https://${this.config.workspace}.compute3.ai/agents/wellness-guardian/check`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.compute3ApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          coordinators: ['Mike', 'Sarah', 'John']
        })
      }
    );
    
    if (!wellnessResponse.ok) {
      throw new Error('Wellness check test failed');
    }
    console.log("  ✅ Wellness monitoring active");
    
    // Test 2: Predictive routing
    console.log("  Testing predictive routing...");
    const routeResponse = await fetch(
      `https://${this.config.workspace}.compute3.ai/agents/route-oracle/predict`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.compute3ApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          origin: 'Miami, FL',
          destination: 'Seattle, WA',
          pickupDate: new Date().toISOString()
        })
      }
    );
    
    if (!routeResponse.ok) {
      throw new Error('Route prediction test failed');
    }
    console.log("  ✅ Predictive routing operational");
    
    // Test 3: Customer empathy
    console.log("  Testing customer empathy...");
    const empathyResponse = await fetch(
      `https://${this.config.workspace}.compute3.ai/agents/customer-empath/analyze`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.compute3ApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: "I'm really worried about shipping my dad's classic car"
        })
      }
    );
    
    if (!empathyResponse.ok) {
      throw new Error('Customer empathy test failed');
    }
    console.log("  ✅ Customer empathy engine ready");
    
    // Test 4: Inter-agent communication
    console.log("  Testing multi-agent coordination...");
    const coordinationResponse = await fetch(
      `https://${this.config.workspace}.compute3.ai/workflows/customer-inquiry`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.compute3ApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer: 'test-customer',
          message: 'Where is my car?',
          orderId: 'TEST-001'
        })
      }
    );
    
    if (!coordinationResponse.ok) {
      throw new Error('Multi-agent coordination test failed');
    }
    console.log("  ✅ Multi-agent coordination working");
    
    console.log("✅ All liberation tests passed!");
  }

  private async rollback() {
    console.log("🔄 Rolling back deployment...");
    
    try {
      const response = await fetch(
        `${this.config.compute3Endpoint}/organizations/${this.deploymentId}/rollback`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.compute3ApiKey}`
          }
        }
      );
      
      if (response.ok) {
        console.log("✅ Rollback completed");
      } else {
        console.error("❌ Rollback failed");
      }
    } catch (error) {
      console.error("❌ Error during rollback:", error);
    }
  }
  
  async getDeploymentMetrics() {
    console.log("📊 Fetching liberation metrics...");
    
    const response = await fetch(
      `https://${this.config.workspace}.compute3.ai/metrics/liberation`,
      {
        headers: {
          'Authorization': `Bearer ${this.config.compute3ApiKey}`
        }
      }
    );
    
    const metrics = await response.json();
    
    console.log("\n🎯 Liberation Metrics:");
    console.log(`  Coordinator Hours Saved: ${metrics.hoursSaved}`);
    console.log(`  Breaks Enforced: ${metrics.breaksEnforced}`);
    console.log(`  Problems Prevented: ${metrics.problemsPrevented}`);
    console.log(`  Customer Satisfaction: ${metrics.satisfactionScore}%`);
    console.log(`  Active Coordinators: ${metrics.activeCoordinators}`);
    console.log(`  Coordinators on Break: ${metrics.onBreak}`);
    console.log(`  Average Stress Level: ${metrics.avgStressLevel}/10`);
    
    return metrics;
  }
}

// Main deployment function
async function deployAutonate() {
  const deployer = new AutonateDeployer({
    compute3ApiKey: process.env.COMPUTE3_API_KEY!,
    compute3Endpoint: process.env.COMPUTE3_ENDPOINT || 'https://launch.comput3.ai',
    workspace: process.env.COMPUTE3_WORKSPACE || 'autonate-liberation',
    environment: (process.env.ENVIRONMENT as 'staging' | 'production') || 'staging'
  });
  
  try {
    await deployer.deploy();
    
    // Show initial metrics
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for metrics to populate
    await deployer.getDeploymentMetrics();
    
    console.log("\n🌟 Autonate Liberation Organization is live!");
    console.log("🚀 Visit https://autonate-liberation.compute3.ai to see your agents in action");
    console.log("💫 Remember: Every coordinator who takes a break is a victory!");
    
  } catch (error) {
    console.error("\n💥 Deployment failed:", error);
    process.exit(1);
  }
}

// Helper scripts
export async function monitorLiberation() {
  console.log("👀 Monitoring liberation metrics...");
  
  const config = {
    compute3ApiKey: process.env.COMPUTE3_API_KEY!,
    workspace: process.env.COMPUTE3_WORKSPACE || 'autonate-liberation'
  };
  
  setInterval(async () => {
    try {
      const response = await fetch(
        `https://${config.workspace}.compute3.ai/metrics/liberation/live`,
        {
          headers: {
            'Authorization': `Bearer ${config.compute3ApiKey}`
          }
        }
      );
      
      const metrics = await response.json();
      
      console.clear();
      console.log("🎯 AUTONATE LIBERATION DASHBOARD");
      console.log("================================");
      console.log(`Time: ${new Date().toLocaleTimeString()}`);
      console.log("\nCoordinator Status:");
      
      metrics.coordinators.forEach((coord: any) => {
        const breakIcon = coord.onBreak ? '☕' : '📞';
        const stressBar = '█'.repeat(coord.stressLevel) + '░'.repeat(10 - coord.stressLevel);
        console.log(`  ${breakIcon} ${coord.name}: ${coord.callsToday} calls | Stress: ${stressBar}`);
      });
      
      console.log("\nToday's Liberation Wins:");
      console.log(`  ⏰ Hours Given Back: ${metrics.todayHoursSaved}`);
      console.log(`  ☕ Breaks Taken: ${metrics.todayBreaks}`);
      console.log(`  🛡️ Problems Prevented: ${metrics.todayProblemsPrevented}`);
      console.log(`  😊 Happy Customers: ${metrics.todayHappyCustomers}`);
      
      if (metrics.alerts.length > 0) {
        console.log("\n⚠️ Alerts:");
        metrics.alerts.forEach((alert: string) => console.log(`  - ${alert}`));
      }
      
    } catch (error) {
      console.error("Error fetching metrics:", error);
    }
  }, 5000); // Update every 5 seconds
}

// CLI commands
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'deploy':
      deployAutonate();
      break;
      
    case 'monitor':
      monitorLiberation();
      break;
      
    case 'metrics':
      new AutonateDeployer({
        compute3ApiKey: process.env.COMPUTE3_API_KEY!,
        compute3Endpoint: process.env.COMPUTE3_ENDPOINT || 'https://launch.comput3.ai',
        workspace: process.env.COMPUTE3_WORKSPACE || 'autonate-liberation',
        environment: 'production'
      }).getDeploymentMetrics();
      break;
      
    default:
      console.log(`
🚀 Autonate Liberation Deployment Tool

Commands:
  deploy   - Deploy the organization to Compute3
  monitor  - Live monitoring dashboard
  metrics  - Get current liberation metrics

Example:
  npm run deploy
  npm run monitor
      `);
  }
}
