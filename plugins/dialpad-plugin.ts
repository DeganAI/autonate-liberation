import {
    Plugin,
    Action,
    Memory,
    State,
    HandlerCallback,
    IAgentRuntime,
    elizaLogger,
    ActionExample,
    Content,
    ModelClass,
    generateObject,
    composeContext
} from "@elizaos/core";
import { z } from "zod";

// Dialpad API configuration
interface DialpadConfig {
    apiKey: string;
    apiUrl: string;
    phoneNumber: string; // Autonate's main number
    smsEnabled: boolean;
    voiceEnabled: boolean;
    webhookUrl?: string;
}

// Call and message types
interface Call {
    id: string;
    direction: "inbound" | "outbound";
    status: "ringing" | "answered" | "ended" | "missed";
    from: string;
    to: string;
    duration?: number;
    recordingUrl?: string;
    transcription?: string;
    sentiment?: "positive" | "neutral" | "negative" | "urgent";
    customerId?: string;
    coordinatorId?: string;
    startTime: Date;
    endTime?: Date;
}

interface SMS {
    id: string;
    direction: "inbound" | "outbound";
    from: string;
    to: string;
    message: string;
    timestamp: Date;
    status: "sent" | "delivered" | "failed";
    customerId?: string;
}

interface CoordinatorStatus {
    id: string;
    name: string;
    available: boolean;
    onCall: boolean;
    callsToday: number;
    lastBreak: Date;
    stressLevel: number;
    currentCall?: string;
}

// Dialpad API client
class DialpadClient {
    private config: DialpadConfig;
    private coordinatorStatuses: Map<string, CoordinatorStatus> = new Map();
    private activeCalls: Map<string, Call> = new Map();

    constructor(config: DialpadConfig) {
        this.config = config;
    }

    async makeCall(to: string, coordinatorId?: string): Promise<Call> {
        const call: Call = {
            id: `call_${Date.now()}`,
            direction: "outbound",
            status: "ringing",
            from: this.config.phoneNumber,
            to,
            startTime: new Date(),
            coordinatorId
        };

        // In production, this would make actual Dialpad API call
        const response = await fetch(`${this.config.apiUrl}/calls`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${this.config.apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                to,
                from: this.config.phoneNumber,
                coordinatorId
            })
        });

        this.activeCalls.set(call.id, call);
        return call;
    }

    async sendSMS(to: string, message: string): Promise<SMS> {
        const sms: SMS = {
            id: `sms_${Date.now()}`,
            direction: "outbound",
            from: this.config.phoneNumber,
            to,
            message,
            timestamp: new Date(),
            status: "sent"
        };

        // In production, this would make actual Dialpad API call
        const response = await fetch(`${this.config.apiUrl}/sms`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${this.config.apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                to,
                from: this.config.phoneNumber,
                text: message
            })
        });

        return sms;
    }

    async transferCall(callId: string, toCoordinatorId: string): Promise<boolean> {
        const call = this.activeCalls.get(callId);
        if (!call) return false;

        // Update call with new coordinator
        call.coordinatorId = toCoordinatorId;
        
        // In production, this would make actual Dialpad API call
        elizaLogger.info(`Transferring call ${callId} to coordinator ${toCoordinatorId}`);
        
        return true;
    }

    async getCoordinatorStatus(coordinatorId: string): Promise<CoordinatorStatus | null> {
        return this.coordinatorStatuses.get(coordinatorId) || null;
    }

    async updateCoordinatorStatus(coordinatorId: string, updates: Partial<CoordinatorStatus>): Promise<void> {
        const current = this.coordinatorStatuses.get(coordinatorId) || {
            id: coordinatorId,
            name: coordinatorId,
            available: true,
            onCall: false,
            callsToday: 0,
            lastBreak: new Date(),
            stressLevel: 0
        };

        this.coordinatorStatuses.set(coordinatorId, {
            ...current,
            ...updates
        });
    }

    async routeInboundCall(call: Call): Promise<string> {
        // Smart routing based on coordinator availability and stress levels
        const availableCoordinators = Array.from(this.coordinatorStatuses.values())
            .filter(c => c.available && !c.onCall)
            .sort((a, b) => {
                // Prioritize by: stress level (lower is better), then calls today
                if (a.stressLevel !== b.stressLevel) {
                    return a.stressLevel - b.stressLevel;
                }
                return a.callsToday - b.callsToday;
            });

        if (availableCoordinators.length === 0) {
            // No coordinators available - AI takes over
            return "AI";
        }

        // Check if coordinator needs a break
        const coordinator = availableCoordinators[0];
        const timeSinceBreak = Date.now() - coordinator.lastBreak.getTime();
        const twoHoursMs = 2 * 60 * 60 * 1000;

        if (timeSinceBreak > twoHoursMs) {
            elizaLogger.info(`Coordinator ${coordinator.id} needs a break - routing to AI`);
            return "AI";
        }

        return coordinator.id;
    }
}

// Actions for the Dialpad plugin

const makeCallAction: Action = {
    name: "make_call",
    description: "Make an outbound call to a customer",
    similes: ["call", "phone", "dial", "ring"],
    examples: [[
        {
            user: "user",
            content: { text: "Call the customer about their BMW shipment" }
        },
        {
            user: "assistant", 
            content: { text: "I'll call them right now about their BMW shipment status." }
        }
    ]],
    
    validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        const hasPhoneNumber = message.content.text.match(/\d{10}|\(\d{3}\)\s*\d{3}-\d{4}/);
        return hasPhoneNumber || state?.customerPhone;
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback?: HandlerCallback
    ): Promise<boolean> => {
        const client = new DialpadClient(runtime.getSetting("dialpad") as DialpadConfig);
        
        // Extract phone number from message or state
        const phoneMatch = message.content.text.match(/\d{10}|\(\d{3}\)\s*\d{3}-\d{4}/);
        const phoneNumber = phoneMatch?.[0] || state.customerPhone;

        if (!phoneNumber) {
            if (callback) {
                callback({
                    text: "I need a phone number to make the call. What's the customer's number?",
                    error: "No phone number provided"
                });
            }
            return false;
        }

        try {
            // Check coordinator availability
            const coordinatorId = state.coordinatorId || await client.routeInboundCall({} as Call);
            
            if (coordinatorId === "AI") {
                // AI handles the call
                const call = await client.makeCall(phoneNumber);
                
                if (callback) {
                    callback({
                        text: `Calling ${phoneNumber} now. I'll handle this personally since all coordinators are busy. 
                               I'll provide updates about their ${state.vehicle || 'vehicle'} shipment.`,
                        success: true,
                        data: { callId: call.id, handledBy: "AI" }
                    });
                }
            } else {
                // Route to human coordinator
                const call = await client.makeCall(phoneNumber, coordinatorId);
                const coordinator = await client.getCoordinatorStatus(coordinatorId);
                
                if (callback) {
                    callback({
                        text: `Connecting ${phoneNumber} to ${coordinator?.name || coordinatorId}. 
                               They'll help with the ${state.vehicle || 'shipment'} inquiry.`,
                        success: true,
                        data: { callId: call.id, handledBy: coordinatorId }
                    });
                }

                // Update coordinator status
                await client.updateCoordinatorStatus(coordinatorId, {
                    onCall: true,
                    callsToday: (coordinator?.callsToday || 0) + 1,
                    currentCall: call.id
                });
            }

            return true;
        } catch (error) {
            elizaLogger.error("Failed to make call:", error);
            if (callback) {
                callback({
                    text: "I couldn't connect the call right now. Let me try another method to reach them.",
                    error: error.message
                });
            }
            return false;
        }
    }
};

const sendSMSAction: Action = {
    name: "send_sms",
    description: "Send an SMS message to a customer",
    similes: ["text", "sms", "message"],
    examples: [[
        {
            user: "user",
            content: { text: "Text the customer that their car is in transit" }
        },
        {
            user: "assistant",
            content: { text: "I'll send them a text update about their vehicle being in transit." }
        }
    ]],

    validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        return message.content.text.toLowerCase().includes("text") || 
               message.content.text.toLowerCase().includes("sms");
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback?: HandlerCallback
    ): Promise<boolean> => {
        const client = new DialpadClient(runtime.getSetting("dialpad") as DialpadConfig);
        
        // Generate appropriate SMS based on context
        const smsSchema = z.object({
            phoneNumber: z.string(),
            message: z.string().max(160), // SMS character limit
            type: z.enum(["update", "confirmation", "alert", "pickup", "delivery"])
        });

        const smsContext = composeContext({
            state,
            template: `Generate an SMS message for auto transport customer.
                      Context: ${JSON.stringify(state)}
                      Keep under 160 characters. Be warm but concise.
                      Include specific details about their vehicle when available.`
        });

        const smsContent = await generateObject({
            runtime,
            context: smsContext,
            schema: smsSchema,
            modelClass: ModelClass.SMALL
        });

        try {
            const sms = await client.sendSMS(
                smsContent.phoneNumber || state.customerPhone,
                smsContent.message
            );

            if (callback) {
                callback({
                    text: `SMS sent: "${smsContent.message}"`,
                    success: true,
                    data: { smsId: sms.id, message: smsContent.message }
                });
            }

            // Log the SMS for tracking
            await runtime.messageManager.createMemory({
                userId: state.agentId,
                agentId: state.agentId,
                roomId: state.roomId,
                content: {
                    text: `SMS sent to ${sms.to}: ${sms.message}`,
                    type: "sms_log",
                    metadata: { smsId: sms.id }
                }
            });

            return true;
        } catch (error) {
            elizaLogger.error("Failed to send SMS:", error);
            if (callback) {
                callback({
                    text: "I couldn't send the text message. I'll try calling instead.",
                    error: error.message
                });
            }
            return false;
        }
    }
};

const checkCoordinatorWellnessAction: Action = {
    name: "check_coordinator_wellness",
    description: "Check on coordinator wellbeing and enforce breaks",
    similes: ["wellness", "break", "stress", "workload"],
    examples: [[
        {
            user: "user",
            content: { text: "How are the coordinators doing today?" }
        },
        {
            user: "assistant",
            content: { text: "Let me check on our team's wellness levels." }
        }
    ]],

    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return true; // Always valid - wellness checks are important
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback?: HandlerCallback
    ): Promise<boolean> => {
        const client = new DialpadClient(runtime.getSetting("dialpad") as DialpadConfig);
        
        // Check all coordinator statuses
        const coordinators = ["Mike", "Sarah", "John", "Lisa"]; // Example coordinators
        const wellnessReport: string[] = [];
        const interventionsNeeded: string[] = [];

        for (const coordinatorId of coordinators) {
            const status = await client.getCoordinatorStatus(coordinatorId);
            if (!status) continue;

            const timeSinceBreak = Date.now() - status.lastBreak.getTime();
            const hoursWithoutBreak = timeSinceBreak / (1000 * 60 * 60);

            if (hoursWithoutBreak > 2) {
                interventionsNeeded.push(
                    `${status.name} hasn't taken a break in ${hoursWithoutBreak.toFixed(1)} hours`
                );
                
                // Automatically mark as unavailable for new calls
                await client.updateCoordinatorStatus(coordinatorId, {
                    available: false
                });

                // Send them a break notification
                await client.sendSMS(
                    status.id, // Assuming coordinator ID is their phone
                    "Time for a break! I'm handling your calls for the next 15 minutes. Go stretch! - Autonate"
                );
            }

            if (status.callsToday > 40) {
                interventionsNeeded.push(
                    `${status.name} has taken ${status.callsToday} calls today - approaching limit`
                );
            }

            if (status.stressLevel > 0.7) {
                interventionsNeeded.push(
                    `${status.name}'s stress level is high - routing easier calls to others`
                );
            }

            wellnessReport.push(
                `${status.name}: ${status.callsToday} calls, ` +
                `${status.available ? 'available' : 'on break'}, ` +
                `stress level ${(status.stressLevel * 100).toFixed(0)}%`
            );
        }

        const summary = `Team Wellness Report:\n${wellnessReport.join('\n')}` +
            (interventionsNeeded.length > 0 
                ? `\n\nInterventions taken:\n${interventionsNeeded.join('\n')}`
                : '\n\nAll coordinators are doing well!');

        if (callback) {
            callback({
                text: summary,
                success: true,
                data: { 
                    wellnessReport, 
                    interventionsNeeded,
                    healthyTeam: interventionsNeeded.length === 0 
                }
            });
        }

        return true;
    }
};

const routeCallAction: Action = {
    name: "route_call",
    description: "Intelligently route incoming calls based on coordinator wellness",
    similes: ["route", "transfer", "assign", "direct"],
    examples: [[
        {
            user: "user",
            content: { text: "New call coming in from Texas about a pickup" }
        },
        {
            user: "assistant",
            content: { text: "I'll route this to the best available coordinator based on current workload." }
        }
    ]],

    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return message.content.text.toLowerCase().includes("call") ||
               message.content.text.toLowerCase().includes("route");
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback?: HandlerCallback
    ): Promise<boolean> => {
        const client = new DialpadClient(runtime.getSetting("dialpad") as DialpadConfig);
        
        // Create incoming call object
        const incomingCall: Call = {
            id: `call_${Date.now()}`,
            direction: "inbound",
            status: "ringing",
            from: state.customerPhone || "unknown",
            to: runtime.getSetting("dialpad.phoneNumber") as string,
            startTime: new Date()
        };

        // Determine urgency from context
        const urgentKeywords = ["urgent", "emergency", "asap", "military", "deployment"];
        const isUrgent = urgentKeywords.some(keyword => 
            message.content.text.toLowerCase().includes(keyword)
        );

        // Smart routing
        const assignedTo = await client.routeInboundCall(incomingCall);

        if (assignedTo === "AI") {
            // AI takes the call
            if (callback) {
                callback({
                    text: `I'll handle this call personally. All human coordinators are either busy or need a break. 
                           ${isUrgent ? "I'm prioritizing this urgent request." : "I'll provide excellent service."}`,
                    success: true,
                    data: { callId: incomingCall.id, handledBy: "AI", urgent: isUrgent }
                });
            }

            // Log AI handling
            elizaLogger.info(`AI handling call ${incomingCall.id} - all coordinators busy/resting`);
        } else {
            // Route to human coordinator
            const coordinator = await client.getCoordinatorStatus(assignedTo);
            
            if (callback) {
                callback({
                    text: `Routing to ${coordinator?.name || assignedTo}. They have the lowest stress level 
                           and ${coordinator?.callsToday || 0} calls today. Perfect match for this inquiry.`,
                    success: true,
                    data: { 
                        callId: incomingCall.id, 
                        handledBy: assignedTo,
                        coordinatorStats: coordinator 
                    }
                });
            }

            // Update coordinator status
            await client.updateCoordinatorStatus(assignedTo, {
                onCall: true,
                currentCall: incomingCall.id
            });
        }

        return true;
    }
};

// Plugin definition
export const dialpadPlugin: Plugin = {
    name: "dialpad",
    description: "Dialpad integration for Autonate - handles calls, SMS, and coordinator wellness",
    
    actions: [
        makeCallAction,
        sendSMSAction,
        checkCoordinatorWellnessAction,
        routeCallAction
    ],

    evaluators: [],

    providers: [],

    services: [
        {
            name: "dialpad-webhook",
            description: "Webhook handler for Dialpad events",
            handler: async (request: any) => {
                const event = request.body;
                
                switch (event.type) {
                    case "call.started":
                        elizaLogger.info(`Call started: ${event.callId}`);
                        break;
                    case "call.ended":
                        // Update coordinator availability
                        if (event.coordinatorId) {
                            const client = new DialpadClient(request.runtime.getSetting("dialpad"));
                            await client.updateCoordinatorStatus(event.coordinatorId, {
                                onCall: false,
                                currentCall: undefined
                            });
                        }
                        break;
                    case "sms.received":
                        // Process incoming SMS
                        elizaLogger.info(`SMS received from ${event.from}: ${event.message}`);
                        break;
                }
                
                return { success: true };
            }
        }
    ],

    // Initialize Dialpad connection
    async init(runtime: IAgentRuntime): Promise<void> {
        const config = runtime.getSetting("dialpad") as DialpadConfig;
        if (!config?.apiKey) {
            elizaLogger.warn("Dialpad plugin: No API key configured");
            return;
        }

        elizaLogger.info("Dialpad plugin initialized - ready to liberate coordinators!");
        
        // Set up periodic wellness checks
        setInterval(async () => {
            const client = new DialpadClient(config);
            const action = checkCoordinatorWellnessAction;
            
            // Run wellness check
            await action.handler(
                runtime,
                {} as Memory,
                {} as State,
                {},
                (response) => {
                    if (response.data?.interventionsNeeded?.length > 0) {
                        elizaLogger.info("Wellness interventions triggered:", response.data.interventionsNeeded);
                    }
                }
            );
        }, 15 * 60 * 1000); // Every 15 minutes
    }
};

// Helper function to format phone numbers  
export function formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
}

// Export types for use in other plugins
export type { Call, SMS, CoordinatorStatus, DialpadConfig };
