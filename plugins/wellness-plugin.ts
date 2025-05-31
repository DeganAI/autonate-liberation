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
            user: "user
