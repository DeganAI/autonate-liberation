import {
    Plugin,
    Action,
    Memory,
    State,
    HandlerCallback,
    IAgentRuntime,
    elizaLogger,
    ModelClass,
    generateObject,
    composeContext
} from "@elizaos/core";
import { z } from "zod";
import { Coordinator, CoordinatorStatus, WellnessIntervention } from "../shared/types";
import { calculateStressLevel, needsBreak } from "../shared/utils";
import { liberationTracker } from "../shared/liberation-metrics";

export const checkWellnessAction: Action = {
    name: "check_wellness",
    description: "Check coordinator wellness and enforce breaks if needed",
    similes: ["wellness", "stress", "break", "health"],
    examples: [[
        {
            user: "user",
            content: { text: "Check on the team's wellness" }
        },
        {
            user: "assistant",
            content: { text: "I'll check everyone's wellness levels and intervene if needed." }
        }
    ]],
    
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return true; // Always valid - wellness is always important
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback?: HandlerCallback
    ): Promise<boolean> => {
        const coordinators = await getCoordinators(runtime);
        const interventions: WellnessIntervention[] = [];
        
        for (const coordinator of coordinators) {
            const stressLevel = calculateStressLevel(coordinator.stats);
            const needsBreakNow = needsBreak(coordinator);
            
            if (needsBreakNow) {
                // Force break
                await forceBreak(runtime, coordinator);
                
                const intervention: WellnessIntervention = {
                    coordinatorId: coordinator.id,
                    type: 'break',
                    reason: `Working for ${getHoursSinceBreak(coordinator)} hours without break`,
                    action: 'Marked unavailable, calls routing to others',
                    timestamp: new Date(),
                    automated: true
                };
                
                interventions.push(intervention);
                await liberationTracker.recordIntervention(intervention);
            }
            
            // Update coordinator stress level
            coordinator.stats.stressLevel = stressLevel;
        }
        
        // Generate wellness report
        const report = await generateWellnessReport(coordinators, interventions);
        
        if (callback) {
            callback({
                text: report,
                success: true,
                data: { coordinators, interventions }
            });
        }
        
        // Update liberation metrics
        await liberationTracker.recordMetric({
            coordinatorsWorking: coordinators.filter(c => c.status.available).length,
            averageStressLevel: coordinators.reduce((sum, c) => sum + c.stats.stressLevel, 0) / coordinators.length,
            breaksTaken: interventions.filter(i => i.type === 'break').length
        });
        
        return true;
    }
};

export const enforceBreakAction: Action = {
    name: "enforce_break",
    description: "Force a specific coordinator to take a break",
    similes: ["break", "rest", "pause", "timeout"],
    examples: [[
        {
            user: "user",
            content: { text: "Make Sarah take a break" }
        },
        {
            user: "assistant",
            content: { text: "I'm enforcing Sarah's break now. She needs it." }
        }
    ]],
    
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return message.content.text.toLowerCase().includes('break');
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback?: HandlerCallback
    ): Promise<boolean> => {
        const coordinatorName = extractCoordinatorName(message.content.text);
        const coordinator = await getCoordinatorByName(runtime, coordinatorName);
        
        if (!coordinator) {
            if (callback) {
                callback({
                    text: `I couldn't find coordinator ${coordinatorName}`,
                    success: false
                });
            }
            return false;
        }
        
        await forceBreak(runtime, coordinator);
        
        // Send break notification
        await sendBreakNotification(runtime, coordinator);
        
        // Record intervention
        const intervention: WellnessIntervention = {
            coordinatorId: coordinator.id,
            type: 'break',
            reason: 'Manual break enforcement',
            action: 'Break enforced, calls redistributed',
            timestamp: new Date(),
            automated: false
        };
        
        await liberationTracker.recordIntervention(intervention);
        
        if (callback) {
            callback({
                text: `${coordinator.name}'s break enforced. They've been marked unavailable for 15 minutes. Their ${coordinator.status.onCall ? 'current call will be completed, then' : ''} calls will route to others. Sometimes we need to save people from themselves.`,
                success: true,
                data: { coordinator, intervention }
            });
        }
        
        return true;
    }
};

export const wellnessReportAction: Action = {
    name: "wellness_report",
    description: "Generate a comprehensive wellness report",
    similes: ["report", "wellness", "health", "status"],
    examples: [[
        {
            user: "user",
            content: { text: "Generate wellness report" }
        },
        {
            user: "assistant",
            content: { text: "I'll generate a comprehensive wellness report for the team." }
        }
    ]],
    
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return message.content.text.toLowerCase().includes('report') ||
               message.content.text.toLowerCase().includes('wellness');
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback?: HandlerCallback
    ): Promise<boolean> => {
        const report = await liberationTracker.generateLiberationReport();
        
        if (callback) {
            callback({
                text: report,
                success: true
            });
        }
        
        return true;
    }
};

// Helper functions
async function getCoordinators(runtime: IAgentRuntime): Promise<Coordinator[]> {
    // In production, this would fetch from database
    // For now, return mock data
    return [
        {
            id: "coord-001",
            name: "Mike",
            email: "mike@autonate.com",
            phone: "(555) 001-0001",
            status: {
                available: true,
                onCall: false,
                onBreak: false,
                lastBreak: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
                workingHours: 5,
                currentCall: undefined
            },
            stats: {
                callsToday: 23,
                callsThisWeek: 89,
                hoursWorkedToday: 5,
                hoursWorkedThisWeek: 25,
                stressLevel: 0,
                averageCallDuration: 12,
                customerSatisfaction: 4.8
            },
            preferences: {
                maxCallsPerDay: 40,
                preferredBreakTimes: ["12:00", "15:00"],
                specialties: ["expedited", "classic cars"],
                vacationDates: []
            }
        },
        // Add more coordinators as needed
    ];
}

async function getCoordinatorByName(runtime: IAgentRuntime, name: string): Promise<Coordinator | null> {
    const coordinators = await getCoordinators(runtime);
    return coordinators.find(c => c.name.toLowerCase() === name.toLowerCase()) || null;
}

async function forceBreak(runtime: IAgentRuntime, coordinator: Coordinator): Promise<void> {
    coordinator.status.available = false;
    coordinator.status.onBreak = true;
    coordinator.status.lastBreak = new Date();
    
    // In production, update database and routing system
    elizaLogger.info(`Forced break for coordinator ${coordinator.name}`);
}

async function sendBreakNotification(runtime: IAgentRuntime, coordinator: Coordinator): Promise<void> {
    // In production, send actual SMS/notification
    const message = `Time for a break, ${coordinator.name}! I'm handling your calls for the next 15 minutes. Go stretch, grab a coffee, or just breathe. You've earned it. - Wellness Guardian`;
    
    elizaLogger.info(`Break notification sent to ${coordinator.name}: ${message}`);
}

function getHoursSinceBreak(coordinator: Coordinator): string {
    const hours = (Date.now() - coordinator.status.lastBreak.getTime()) / (1000 * 60 * 60);
    return hours.toFixed(1);
}

function extractCoordinatorName(text: string): string {
    // Simple extraction - in production, use NLP
    const words = text.split(' ');
    const nameIndex = words.findIndex(w => ['make', 'force', 'tell'].includes(w.toLowerCase())) + 1;
    return words[nameIndex] || '';
}

async function generateWellnessReport(coordinators: Coordinator[], interventions: WellnessIntervention[]): Promise<string> {
    const avgStress = coordinators.reduce((sum, c) => sum + c.stats.stressLevel, 0) / coordinators.length;
    const onBreak = coordinators.filter(c => c.status.onBreak).length;
    const overworked = coordinators.filter(c => c.stats.hoursWorkedToday > 8).length;
    
    return `
WELLNESS CHECK COMPLETE
======================

Team Status:
- Active Coordinators: ${coordinators.length}
- Currently on Break: ${onBreak}
- Average Stress Level: ${(avgStress * 100).toFixed(0)}%
- Overworked Today: ${overworked}

Individual Status:
${coordinators.map(c => `
${c.name}:
  - Calls Today: ${c.stats.callsToday}
  - Hours Worked: ${c.stats.hoursWorkedToday}
  - Stress Level: ${(c.stats.stressLevel * 100).toFixed(0)}%
  - Last Break: ${getHoursSinceBreak(c)} hours ago
  - Status: ${c.status.onBreak ? 'ON BREAK 🟢' : c.status.available ? 'Available' : 'Busy'}
`).join('')}

Interventions Today: ${interventions.length}
${interventions.map(i => `- ${i.coordinatorId}: ${i.reason}`).join('\n')}

Wellness Status: ${avgStress < 0.5 ? '✨ HEALTHY' : avgStress < 0.7 ? '⚡ MONITORING' : '🚨 INTERVENTION NEEDED'}
    `;
}

// Plugin definition
export const wellnessPlugin: Plugin = {
    name: "wellness",
    description: "Monitors and protects coordinator wellbeing",
    
    actions: [
        checkWellnessAction,
        enforceBreakAction,
        wellnessReportAction
    ],

    evaluators: [],
    providers: [],
    
    services: [
        {
            name: "wellness-monitor",
            description: "Continuous wellness monitoring",
            handler: async (runtime: IAgentRuntime) => {
                // Run wellness checks every 15 minutes
                setInterval(async () => {
                    await checkWellnessAction.handler(
                        runtime,
                        {} as Memory,
                        {} as State,
                        {},
                        (response) => {
                            if (response.data?.interventions?.length > 0) {
                                elizaLogger.info("Wellness interventions triggered:", response.data.interventions);
                            }
                        }
                    );
                }, 15 * 60 * 1000);
            }
        }
    ]
};
