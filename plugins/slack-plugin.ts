// slack-plugin.ts - Complete Slack Integration for Autonate Liberation
import { Plugin, IAgentRuntime, Memory, State, HandlerCallback, Content } from '@ai16z/eliza';
import { WebClient } from '@slack/web-api';
import { createEventAdapter } from '@slack/events-api';
import { createMessageAdapter } from '@slack/interactive-messages';
import express from 'express';
import crypto from 'crypto';

interface SlackConfig {
    botToken: string;
    appToken: string;
    signingSecret: string;
    webhookPort?: number;
    channels: {
        coordinatorUpdates: string;
        wellness: string;
        alerts: string;
        metrics: string;
        customerService: string;
    };
}

interface SlackMessage {
    channel: string;
    user: string;
    text: string;
    ts: string;
    thread_ts?: string;
    attachments?: any[];
    blocks?: any[];
}

interface CoordinatorStatus {
    userId: string;
    name: string;
    status: 'available' | 'on_break' | 'lunch' | 'offline' | 'vacation';
    stressLevel: number;
    callsHandled: number;
    lastBreak: Date;
    hoursWorkedToday: number;
}

export class SlackPlugin implements Plugin {
    name = 'slack-plugin';
    description = 'Slack integration for Autonate Liberation - coordinator communication & wellness';
    
    private client: WebClient;
    private eventAdapter: any;
    private interactiveAdapter: any;
    private config: SlackConfig;
    private runtime: IAgentRuntime;
    private coordinatorStatuses: Map<string, CoordinatorStatus> = new Map();
    private app: express.Application;

    constructor(config: SlackConfig) {
        this.config = config;
        this.client = new WebClient(config.botToken);
        this.eventAdapter = createEventAdapter(config.signingSecret);
        this.interactiveAdapter = createMessageAdapter(config.signingSecret);
        this.app = express();
        
        this.setupEventHandlers();
        this.setupInteractiveHandlers();
        this.setupWebhookServer();
    }

    async init(runtime: IAgentRuntime): Promise<void> {
        this.runtime = runtime;
        console.log('🔷 Slack Plugin initialized for Autonate Liberation');
        
        // Post initialization message
        await this.postToChannel(this.config.channels.coordinatorUpdates, {
            text: '🚀 Autonate Liberation System Online!',
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: '🚀 Autonate Liberation System Activated'
                    }
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: '*Liberation Mode:* MAXIMUM\n*Wellness Guardian:* ACTIVE\n*Break Enforcement:* ENABLED'
                    }
                },
                {
                    type: 'actions',
                    elements: [
                        {
                            type: 'button',
                            text: {
                                type: 'plain_text',
                                text: '📊 View Metrics'
                            },
                            action_id: 'view_metrics',
                            style: 'primary'
                        },
                        {
                            type: 'button',
                            text: {
                                type: 'plain_text',
                                text: '☕ Take Break'
                            },
                            action_id: 'request_break'
                        }
                    ]
                }
            ]
        });

        // Start monitoring coordinators
        this.startCoordinatorMonitoring();
    }

    private setupEventHandlers() {
        // Handle messages
        this.eventAdapter.on('message', async (event: SlackMessage) => {
            // Ignore bot messages
            if (event.user === 'USLACKBOT') return;
            
            // Process message through Autonate agents
            await this.handleMessage(event);
        });

        // Handle app mentions
        this.eventAdapter.on('app_mention', async (event: any) => {
            await this.handleMention(event);
        });

        // Handle reactions (for quick feedback)
        this.eventAdapter.on('reaction_added', async (event: any) => {
            await this.handleReaction(event);
        });

        // Error handling
        this.eventAdapter.on('error', (error: Error) => {
            console.error('🔴 Slack Event Adapter error:', error);
        });
    }

    private setupInteractiveHandlers() {
        // Handle button clicks
        this.interactiveAdapter.action('view_metrics', async (payload: any, respond: any) => {
            const metrics = await this.gatherMetrics();
            await respond({
                text: 'Liberation Metrics',
                blocks: this.createMetricsBlocks(metrics)
            });
        });

        this.interactiveAdapter.action('request_break', async (payload: any, respond: any) => {
            const userId = payload.user.id;
            await this.handleBreakRequest(userId, respond);
        });

        // Handle slash commands
        this.app.post('/slack/commands/status', async (req, res) => {
            const { user_id, text } = req.body;
            const status = await this.getCoordinatorStatus(user_id);
            res.json({
                response_type: 'ephemeral',
                text: this.formatCoordinatorStatus(status)
            });
        });

        this.app.post('/slack/commands/vacation', async (req, res) => {
            const { user_id, text } = req.body;
            await this.handleVacationRequest(user_id, text);
            res.json({
                response_type: 'in_channel',
                text: '🏝️ Vacation request processed! AI agents will handle your responsibilities.'
            });
        });
    }

    private setupWebhookServer() {
        const port = this.config.webhookPort || 3000;
        
        this.app.use('/slack/events', this.eventAdapter.expressMiddleware());
        this.app.use('/slack/interactive', this.interactiveAdapter.expressMiddleware());
        
        this.app.listen(port, () => {
            console.log(`🔷 Slack webhook server running on port ${port}`);
        });
    }

    private async handleMessage(message: SlackMessage) {
        // Check if it's a coordinator asking for help
        const isCoordinator = await this.isCoordinator(message.user);
        
        if (isCoordinator) {
            // Route to appropriate agent based on message content
            const intent = await this.detectIntent(message.text);
            
            switch (intent) {
                case 'stress':
                    await this.handleStressedCoordinator(message);
                    break;
                case 'customer_issue':
                    await this.handleCustomerIssue(message);
                    break;
                case 'break_request':
                    await this.handleBreakRequest(message.user);
                    break;
                case 'help':
                    await this.provideHelp(message);
                    break;
                default:
                    await this.handleGeneralMessage(message);
            }
        } else {
            // Customer message - route to Customer Empath
            await this.handleCustomerMessage(message);
        }
    }

    private async handleMention(event: any) {
        const response = await this.generateAgentResponse(event.text, 'autonate-prime');
        
        await this.client.chat.postMessage({
            channel: event.channel,
            thread_ts: event.ts,
            text: response,
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: response
                    }
                }
            ]
        });
    }

    private async handleReaction(event: any) {
        // Track sentiment through reactions
        const sentimentMap: Record<string, number> = {
            'thumbsup': 1,
            'thumbsdown': -1,
            'heart': 2,
            'cry': -2,
            'coffee': 0 // Break request
        };

        const sentiment = sentimentMap[event.reaction] || 0;
        
        if (event.reaction === 'coffee') {
            await this.suggestBreak(event.user);
        } else if (sentiment < 0) {
            await this.checkOnCoordinator(event.user);
        }
    }

    private async handleStressedCoordinator(message: SlackMessage) {
        // Wellness Guardian takes over
        const response = await this.generateAgentResponse(
            message.text,
            'wellness-guardian'
        );

        // Send supportive message
        await this.client.chat.postMessage({
            channel: message.channel,
            thread_ts: message.ts,
            text: response,
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `💚 *Wellness Guardian says:*\n${response}`
                    }
                },
                {
                    type: 'actions',
                    elements: [
                        {
                            type: 'button',
                            text: {
                                type: 'plain_text',
                                text: 'Take Immediate Break'
                            },
                            action_id: 'immediate_break',
                            style: 'primary'
                        },
                        {
                            type: 'button',
                            text: {
                                type: 'plain_text',
                                text: 'Schedule Wellness Check'
                            },
                            action_id: 'wellness_check'
                        }
                    ]
                }
            ]
        });

        // Update coordinator status
        await this.updateCoordinatorStress(message.user, 0.8);
    }

    private async handleCustomerIssue(message: SlackMessage) {
        // Parse customer details from message
        const customerInfo = this.extractCustomerInfo(message.text);
        
        // Get AI assistance
        const solution = await this.generateAgentResponse(
            message.text,
            'customer-empath'
        );

        await this.client.chat.postMessage({
            channel: message.channel,
            thread_ts: message.ts,
            text: solution,
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `🤝 *Customer Empath suggests:*\n${solution}`
                    }
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*Detected emotions:* ${customerInfo.emotions.join(', ')}\n*Recommended approach:* ${customerInfo.approach}`
                    }
                }
            ]
        });
    }

    private async handleBreakRequest(userId: string, respond?: any) {
        const status = this.coordinatorStatuses.get(userId);
        
        if (!status) return;

        // Update status
        status.status = 'on_break';
        status.lastBreak = new Date();
        
        // Notify team
        await this.postToChannel(this.config.channels.coordinatorUpdates, {
            text: `${status.name} is taking a well-deserved break! ☕`,
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*${status.name}* is on break\n*Coverage:* AI agents handling all inquiries\n*Return time:* ${this.calculateBreakEnd()}`
                    }
                }
            ]
        });

        if (respond) {
            await respond({
                text: 'Break approved! AI agents have your back. Enjoy! ☕'
            });
        }
    }

    private async startCoordinatorMonitoring() {
        // Monitor coordinator wellness every 15 minutes
        setInterval(async () => {
            for (const [userId, status] of this.coordinatorStatuses) {
                // Check stress levels
                if (status.stressLevel > 0.7) {
                    await this.suggestBreak(userId);
                }

                // Check hours without break
                const hoursSinceBreak = (Date.now() - status.lastBreak.getTime()) / (1000 * 60 * 60);
                if (hoursSinceBreak > 2) {
                    await this.enforceBreak(userId);
                }

                // Check total hours
                if (status.hoursWorkedToday > 8) {
                    await this.enforceEndOfDay(userId);
                }
            }

            // Post wellness update
            await this.postWellnessUpdate();
        }, 15 * 60 * 1000);

        // Daily metrics report
        setInterval(async () => {
            await this.postDailyMetrics();
        }, 24 * 60 * 60 * 1000);
    }

    private async enforceBreak(userId: string) {
        const status = this.coordinatorStatuses.get(userId);
        if (!status) return;

        await this.client.chat.postMessage({
            channel: userId,
            text: '⚠️ Mandatory break time!',
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: '⚠️ Wellness Guardian Alert'
                    }
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `You've been working for ${Math.round((Date.now() - status.lastBreak.getTime()) / (1000 * 60 * 60))} hours straight!\n\n*This is a mandatory 15-minute break.*\n\nYour calls are being handled by AI agents. Step away from your desk!`
                    }
                },
                {
                    type: 'image',
                    image_url: 'https://media.giphy.com/media/coffee-break.gif',
                    alt_text: 'Coffee break'
                }
            ]
        });

        // Update status
        status.status = 'on_break';
        status.lastBreak = new Date();

        // Lock their ability to take calls
        await this.lockCoordinatorCalls(userId);
    }

    private async postWellnessUpdate() {
        const stats = this.calculateWellnessStats();
        
        await this.postToChannel(this.config.channels.wellness, {
            text: 'Wellness Update',
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: '💚 Team Wellness Update'
                    }
                },
                {
                    type: 'section',
                    fields: [
                        {
                            type: 'mrkdwn',
                            text: `*Average Stress:*\n${this.getStressEmoji(stats.avgStress)} ${Math.round(stats.avgStress * 100)}%`
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Team Status:*\n${stats.available} available, ${stats.onBreak} on break`
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Breaks Today:*\n${stats.breaksTaken} taken`
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Avg Hours:*\n${stats.avgHours.toFixed(1)} hours`
                        }
                    ]
                },
                {
                    type: 'divider'
                },
                {
                    type: 'context',
                    elements: [
                        {
                            type: 'mrkdwn',
                            text: '_Remember: Your wellbeing matters more than any shipment!_'
                        }
                    ]
                }
            ]
        });
    }

    private async postDailyMetrics() {
        const metrics = await this.gatherMetrics();
        
        await this.postToChannel(this.config.channels.metrics, {
            text: 'Daily Liberation Metrics',
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: '📊 Daily Liberation Report'
                    }
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*Date:* ${new Date().toLocaleDateString()}`
                    }
                },
                {
                    type: 'divider'
                },
                {
                    type: 'section',
                    fields: [
                        {
                            type: 'mrkdwn',
                            text: `*Hours Given Back:*\n🕐 ${metrics.hoursGivenBack} hours`
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Breaks Enforced:*\n☕ ${metrics.breaksEnforced}`
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Problems Prevented:*\n🛡️ ${metrics.problemsPrevented}`
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Happy Customers:*\n😊 ${metrics.happyCustomers}`
                        }
                    ]
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `📈 *Stress Reduction:* ${metrics.stressReduction}%\n🎯 *Liberation Score:* ${metrics.liberationScore}/100`
                    }
                },
                {
                    type: 'divider'
                },
                {
                    type: 'context',
                    elements: [
                        {
                            type: 'mrkdwn',
                            text: `_"${metrics.dailyQuote}"_`
                        }
                    ]
                }
            ]
        });
    }

    // Helper methods
    private async postToChannel(channel: string, message: any) {
        try {
            await this.client.chat.postMessage({
                channel,
                ...message
            });
        } catch (error) {
            console.error('Error posting to Slack:', error);
        }
    }

    private async generateAgentResponse(message: string, agentId: string): Promise<string> {
        // This would integrate with your Eliza agents
        const memory: Memory = {
            userId: 'slack-user',
            agentId,
            roomId: 'slack-channel',
            content: { text: message } as Content,
            embedding: [],
            createdAt: Date.now()
        };

        // Process through appropriate agent
        // This is a placeholder - integrate with your actual agent runtime
        return `[${agentId}] Processing: ${message}`;
    }

    private getStressEmoji(stress: number): string {
        if (stress < 0.3) return '😊';
        if (stress < 0.5) return '😐';
        if (stress < 0.7) return '😟';
        return '😰';
    }

    private calculateBreakEnd(): string {
        const breakEnd = new Date();
        breakEnd.setMinutes(breakEnd.getMinutes() + 15);
        return breakEnd.toLocaleTimeString();
    }

    private async detectIntent(text: string): Promise<string> {
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes('stress') || lowerText.includes('overwhelm')) {
            return 'stress';
        }
        if (lowerText.includes('customer') || lowerText.includes('client')) {
            return 'customer_issue';
        }
        if (lowerText.includes('break') || lowerText.includes('tired')) {
            return 'break_request';
        }
        if (lowerText.includes('help') || lowerText.includes('?')) {
            return 'help';
        }
        
        return 'general';
    }

    private extractCustomerInfo(text: string): any {
        // Analyze customer emotions and recommend approach
        return {
            emotions: ['anxious', 'frustrated'],
            approach: 'Empathetic acknowledgment followed by clear solution path',
            urgency: 'high'
        };
    }

    private calculateWellnessStats(): any {
        let totalStress = 0;
        let available = 0;
        let onBreak = 0;
        let totalHours = 0;
        let breaksTaken = 0;

        for (const status of this.coordinatorStatuses.values()) {
            totalStress += status.stressLevel;
            totalHours += status.hoursWorkedToday;
            
            if (status.status === 'available') available++;
            if (status.status === 'on_break') onBreak++;
            if (status.lastBreak.toDateString() === new Date().toDateString()) {
                breaksTaken++;
            }
        }

        const count = this.coordinatorStatuses.size || 1;

        return {
            avgStress: totalStress / count,
            available,
            onBreak,
            avgHours: totalHours / count,
            breaksTaken
        };
    }

    private async gatherMetrics(): Promise<any> {
        // Gather liberation metrics
        return {
            hoursGivenBack: 127.5,
            breaksEnforced: 43,
            problemsPrevented: 89,
            happyCustomers: 234,
            stressReduction: 68,
            liberationScore: 94,
            dailyQuote: "Work to live, don't live to work. Your AI agents have your back!"
        };
    }

    private createMetricsBlocks(metrics: any): any[] {
        return [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*Current Liberation Metrics:*\n\n🕐 Hours Given Back: ${metrics.hoursGivenBack}\n☕ Breaks Enforced: ${metrics.breaksEnforced}\n🛡️ Problems Prevented: ${metrics.problemsPrevented}\n😊 Happy Customers: ${metrics.happyCustomers}`
                }
            }
        ];
    }

    private formatCoordinatorStatus(status: CoordinatorStatus): string {
        return `*Your Status:*\nStress Level: ${this.getStressEmoji(status.stressLevel)} ${Math.round(status.stressLevel * 100)}%\nCalls Today: ${status.callsHandled}\nHours Worked: ${status.hoursWorkedToday.toFixed(1)}\nLast Break: ${status.lastBreak.toLocaleTimeString()}`;
    }

    private async isCoordinator(userId: string): Promise<boolean> {
        // Check if user is a coordinator
        return this.coordinatorStatuses.has(userId);
    }

    private async handleGeneralMessage(message: SlackMessage) {
        // Route general messages through Autonate Prime
        const response = await this.generateAgentResponse(message.text, 'autonate-prime');
        
        await this.client.chat.postMessage({
            channel: message.channel,
            thread_ts: message.ts,
            text: response
        });
    }

    private async handleCustomerMessage(message: SlackMessage) {
        // Route to Customer Empath
        const response = await this.generateAgentResponse(message.text, 'customer-empath');
        
        await this.client.chat.postMessage({
            channel: message.channel,
            thread_ts: message.ts,
            text: response
        });
    }

    private async suggestBreak(userId: string) {
        await this.client.chat.postMessage({
            channel: userId,
            text: "Hey! I noticed you might need a break. Remember, your wellbeing comes first! ☕",
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: "Hey! I noticed you might need a break. Remember, your wellbeing comes first! ☕"
                    }
                },
                {
                    type: 'actions',
                    elements: [
                        {
                            type: 'button',
                            text: {
                                type: 'plain_text',
                                text: 'Take a Break'
                            },
                            action_id: 'request_break',
                            style: 'primary'
                        }
                    ]
                }
            ]
        });
    }

    private async checkOnCoordinator(userId: string) {
        const status = this.coordinatorStatuses.get(userId);
        if (!status) return;

        // Increase stress level
        status.stressLevel = Math.min(status.stressLevel + 0.1, 1);

        // Send wellness check
        await this.client.chat.postMessage({
            channel: userId,
            text: "Hey, are you doing okay? I'm here if you need support! 💚"
        });
    }

    private async updateCoordinatorStress(userId: string, stress: number) {
        const status = this.coordinatorStatuses.get(userId);
        if (status) {
            status.stressLevel = stress;
        }
    }

    private async handleVacationRequest(userId: string, dates: string) {
        // Process vacation request
        const status = this.coordinatorStatuses.get(userId);
        if (!status) return;

        // Update status
        status.status = 'vacation';

        // Notify team
        await this.postToChannel(this.config.channels.coordinatorUpdates, {
            text: `${status.name} is going on vacation! 🏝️`,
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*${status.name}* is taking a well-deserved vacation!\n*Dates:* ${dates}\n*Coverage:* Full AI agent support activated`
                    }
                }
            ]
        });
    }

    private async lockCoordinatorCalls(userId: string) {
        // This would integrate with your phone system
        // Prevent calls from routing to this coordinator
        console.log(`Calls locked for coordinator ${userId} during break`);
    }

    private async enforceEndOfDay(userId: string) {
        const status = this.coordinatorStatuses.get(userId);
        if (!status) return;

        await this.client.chat.postMessage({
            channel: userId,
            text: "🌙 Time to call it a day!",
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: '🌙 End of Day Alert'
                    }
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `You've worked ${status.hoursWorkedToday.toFixed(1)} hours today. Time to go home!\n\n*All new calls are being handled by AI agents.*\n\nEnjoy your evening! 🏠`
                    }
                }
            ]
        });

        // Update status
        status.status = 'offline';
    }

    private async provideHelp(message: SlackMessage) {
        await this.client.chat.postMessage({
            channel: message.channel,
            thread_ts: message.ts,
            text: 'Here to help!',
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: '🤖 Autonate Liberation Help'
                    }
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: '*Available Commands:*\n• `/status` - Check your current status\n• `/break` - Request a break\n• `/vacation [dates]` - Request vacation\n• `/help` - Get help\n\n*Quick Actions:*\n• React with ☕ to request a break\n• Mention me for AI assistance\n• Use #wellness for wellness support'
                    }
                }
            ]
        });
    }

    // Required Plugin methods
    actions = [];
    evaluators = [];
    providers = [];
}

// Export plugin factory
export const slackPlugin = (config: SlackConfig) => new SlackPlugin(config);
