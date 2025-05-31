import {
    Plugin,
    Action,
    Memory,
    State,
    HandlerCallback,
    IAgentRuntime,
    elizaLogger
} from "@elizaos/core";
import { PredictedIssue, Carrier, Shipment } from "../shared/types";
import { liberationTracker } from "../shared/liberation-metrics";

export const predictIssuesAction: Action = {
    name: "predict_issues",
    description: "Predict potential issues for a shipment",
    similes: ["predict", "forecast", "anticipate", "foresee"],
    examples: [[
        {
            user: "user",
            content: { text: "Predict issues for Miami to Seattle route next week" }
        },
        {
            user: "assistant",
            content: { text: "I'll analyze potential issues for that route and timeframe." }
        }
    ]],
    
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return message.content.text.toLowerCase().includes('predict') ||
               message.content.text.toLowerCase().includes('forecast');
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback?: HandlerCallback
    ): Promise<boolean> => {
        // Extract route details from message
        const routeDetails = extractRouteDetails(message.content.text);
        
        // Run prediction algorithms
        const predictions: PredictedIssue[] = [];
        
        // Weather prediction
        const weatherIssue = await predictWeatherIssues(routeDetails);
        if (weatherIssue) predictions.push(weatherIssue);
        
        // Carrier reliability prediction
        const carrierIssue = await predictCarrierIssues(routeDetails);
        if (carrierIssue) predictions.push(carrierIssue);
        
        // Route congestion prediction
        const routeIssue = await predictRouteIssues(routeDetails);
        if (routeIssue) predictions.push(routeIssue);
        
        // Generate mitigation plan
        const mitigationPlan = generateMitigationPlan(predictions);
        
        if (callback) {
            const report = generatePredictionReport(predictions, mitigationPlan);
            callback({
                text: report,
                success: true,
                data: { predictions, mitigationPlan }
            });
        }
        
        // Track problems prevented
        if (predictions.length > 0) {
            await liberationTracker.recordMetric({
                problemsPrevented: predictions.filter(p => p.probability > 0.7).length
            });
        }
        
        return true;
    }
};

export const evaluateCarrierAction: Action = {
    name: "evaluate_carrier",
    description: "Evaluate carrier reliability and predict performance",
    similes: ["evaluate", "assess", "vet", "check"],
    examples: [[
        {
            user: "user",
            content: { text: "Evaluate carrier CAR-123 for upcoming shipment" }
        },
        {
            user: "assistant",
            content: { text: "I'll evaluate that carrier's reliability and performance history." }
        }
    ]],
    
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return message.content.text.toLowerCase().includes('carrier') &&
               (message.content.text.toLowerCase().includes('evaluate') ||
                message.content.text.toLowerCase().includes('check'));
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback?: HandlerCallback
    ): Promise<boolean> => {
        // Extract carrier ID
        const carrierMatch = message.content.text.match(/CAR-\d+/);
        const carrierId = carrierMatch ? carrierMatch[0] : null;
        
        if (!carrierId) {
            if (callback) {
                callback({
                    text: "I need a carrier ID to evaluate. Format: CAR-123",
                    success: false
                });
            }
            return false;
        }
        
        // Get carrier data
        const carrier = await getCarrier(runtime, carrierId);
        if (!carrier) {
            if (callback) {
                callback({
                    text: `Carrier ${carrierId} not found in our system.`,
                    success: false
                });
            }
            return false;
        }
        
        // Evaluate carrier
        const evaluation = await evaluateCarrier(carrier);
        
        if (callback) {
            callback({
                text: evaluation.report,
                success: true,
                data: evaluation
            });
        }
        
        return true;
    }
};

// Helper functions
function extractRouteDetails(text: string): any {
    // Simple extraction - in production use NLP
    const cities = text.match(/([A-Z][a-z]+)/g) || [];
    return {
        origin: cities[0] || 'Unknown',
        destination: cities[1] || 'Unknown',
        timeframe: text.includes('next week') ? 'next_week' : 'this_week'
    };
}

async function predictWeatherIssues(route: any): Promise<PredictedIssue | null> {
    // In production, call weather API and analyze patterns
    const winterMonths = [11, 12, 1, 2, 3];
    const currentMonth = new Date().getMonth() + 1;
    
    if (winterMonths.includes(currentMonth) && 
        ['Seattle', 'Denver', 'Chicago'].includes(route.destination)) {
        return {
            type: 'weather',
            probability: 0.75,
            impact: 'high',
            mitigation: 'Route through southern states to avoid snow. Add 1-2 days buffer.',
            preventionAction: async () => {
                elizaLogger.info('Rerouting through southern states');
            }
        };
    }
    
    return null;
}

async function predictCarrierIssues(route: any): Promise<PredictedIssue | null> {
    // Analyze carrier patterns
    // In production, this would use ML models
    if (Math.random() > 0.8) { // 20% chance of carrier issue
        return {
            type: 'carrier',
            probability: 0.65,
            impact: 'medium',
            mitigation: 'Have backup carrier on standby. Pre-verify availability.',
            preventionAction: async () => {
                elizaLogger.info('Securing backup carrier');
            }
        };
    }
    
    return null;
}

async function predictRouteIssues(route: any): Promise<PredictedIssue | null> {
    // Check for known route issues
    const problematicRoutes = [
        { route: 'Los Angeles-Las Vegas', issue: 'construction', probability: 0.9 },
        { route: 'Chicago-Detroit', issue: 'congestion', probability: 0.7 }
    ];
    
    const routeKey = `${route.origin}-${route.destination}`;
    const knownIssue = problematicRoutes.find(r => r.route === routeKey);
    
    if (knownIssue) {
        return {
            type: 'route',
            probability: knownIssue.probability,
            impact: 'medium',
            mitigation: `Known ${knownIssue.issue} on this route. Plan alternate path.`,
            preventionAction: async () => {
                elizaLogger.info(`Planning alternate route to avoid ${knownIssue.issue}`);
            }
        };
    }
    
    return null;
}

function generateMitigationPlan(predictions: PredictedIssue[]): string[] {
    const plan: string[] = [];
    
    predictions.forEach(prediction => {
        if (prediction.probability > 0.7) {
            plan.push(`HIGH PRIORITY: ${prediction.mitigation}`);
        } else if (prediction.probability > 0.5) {
            plan.push(`MONITOR: ${prediction.mitigation}`);
        }
    });
    
    return plan;
}

function generatePredictionReport(predictions: PredictedIssue[], mitigationPlan: string[]): string {
    if (predictions.length === 0) {
        return "Route analysis complete: No significant issues predicted. Clear sailing ahead!";
    }
    
    let report = "ROUTE PREDICTION ANALYSIS\n";
    report += "========================\n\n";
    
    predictions.forEach(pred => {
        report += `${pred.type.toUpperCase()} RISK\n`;
        report += `Probability: ${(pred.probability * 100).toFixed(0)}%\n`;
        report += `Impact: ${pred.impact}\n`;
        report += `Mitigation: ${pred.mitigation}\n\n`;
    });
    
    report += "MITIGATION PLAN\n";
    report += "===============\n";
    mitigationPlan.forEach((step, i) => {
        report += `${i + 1}. ${step}\n`;
    });
    
    report += `\nConfidence Level: ${calculateConfidence(predictions)}%`;
    
    return report;
}

function calculateConfidence(predictions: PredictedIssue[]): number {
    if (predictions.length === 0) return 95;
    
    const avgProbability = predictions.reduce((sum, p) => sum + p.probability, 0) / predictions.length;
    return Math.round((1 - avgProbability * 0.2) * 100);
}

async function getCarrier(runtime: IAgentRuntime, carrierId: string): Promise<Carrier | null> {
    // In production, fetch from database
    return {
        id: carrierId,
        name: "Sample Carrier",
        dotNumber: "12345678",
        mcNumber: "MC-123456",
        insurance: {
            provider: "Progressive",
            policyNumber: "POL-123456",
            coverage: 1000000,
            expirationDate: new Date("2025-12-31")
        },
        rating: {
            overall: 4.2,
            reliability: 4.0,
            communication: 4.5,
            care: 4.3,
            reviewCount: 89
        },
        performance: {
            onTimeRate: 0.85,
            damageRate: 0.02,
            communicationScore: 0.88,
            totalShipments: 450,
            ghostingCount: 2
        },
        specialties: ["enclosed", "luxury"],
        blacklisted: false
    };
}

async function evaluateCarrier(carrier: Carrier): Promise<any> {
    const scores = {
        reliability: carrier.performance.onTimeRate * 100,
        safety: (1 - carrier.performance.damageRate) * 100,
        communication: carrier.performance.communicationScore * 100,
        overall: carrier.rating.overall * 20
    };
    
    const flags: string[] = [];
    
    if (carrier.performance.ghostingCount > 0) {
        flags.push(`⚠️ Has ghosted ${carrier.performance.ghostingCount} times`);
    }
    
    if (carrier.performance.onTimeRate < 0.8) {
        flags.push("⚠️ Below 80% on-time rate");
    }
    
    if (carrier.insurance.expirationDate < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
        flags.push("⚠️ Insurance expires within 30 days");
    }
    
    const recommendation = scores.overall >= 80 ? "APPROVED" : 
                          scores.overall >= 60 ? "CONDITIONAL" : "NOT RECOMMENDED";
    
    const report = `
CARRIER EVALUATION: ${carrier.name} (${carrier.id})
================================================

SCORES:
- Reliability: ${scores.reliability.toFixed(0)}%
- Safety: ${scores.safety.toFixed(0)}%
- Communication: ${scores.communication.toFixed(0)}%
- Overall: ${scores.overall.toFixed(0)}%

PERFORMANCE:
- Total Shipments: ${carrier.performance.totalShipments}
- On-Time Rate: ${(carrier.performance.onTimeRate * 100).toFixed(0)}%
- Damage Rate: ${(carrier.performance.damageRate * 100).toFixed(1)}%

${flags.length > 0 ? 'FLAGS:\n' + flags.join('\n') : 'No red flags identified.'}

RECOMMENDATION: ${recommendation}
${recommendation === 'CONDITIONAL' ? 'Monitor closely and have backup ready.' : ''}
${recommendation === 'NOT RECOMMENDED' ? 'Use only as last resort with additional safeguards.' : ''}
    `;
    
    return {
        scores,
        flags,
        recommendation,
        report
    };
}

// Plugin definition
export const predictionPlugin: Plugin = {
    name: "prediction",
    description: "Predictive analytics for route and carrier issues",
    
    actions: [
        predictIssuesAction,
        evaluateCarrierAction
    ],

    evaluators: [],
    providers: []
};
