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
import { Shipment, TrackingUpdate, Location } from "../shared/types";
import { generatePoetryFromLocation } from "../shared/utils";

export const trackShipmentAction: Action = {
    name: "track_shipment",
    description: "Get current location and status of a shipment",
    similes: ["track", "where", "location", "status"],
    examples: [[
        {
            user: "user",
            content: { text: "Where is order ORD-12345?" }
        },
        {
            user: "assistant",
            content: { text: "I'll check the current location of that shipment." }
        }
    ]],
    
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return message.content.text.match(/ORD-\w+/) !== null ||
               message.content.text.toLowerCase().includes('where') ||
               message.content.text.toLowerCase().includes('track');
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback?: HandlerCallback
    ): Promise<boolean> => {
        // Extract order ID
        const orderMatch = message.content.text.match(/ORD-\w+/);
        const orderId = orderMatch ? orderMatch[0] : state.currentOrderId;
        
        if (!orderId) {
            if (callback) {
                callback({
                    text: "I need an order ID to track. What's your order number?",
                    success: false
                });
            }
            return false;
        }
        
        // Get shipment details
        const shipment = await getShipment(runtime, orderId);
        if (!shipment) {
            if (callback) {
                callback({
                    text: `I couldn't find order ${orderId}. Please check the order number.`,
                    success: false
                });
            }
            return false;
        }
        
        // Get current location
        const currentLocation = await getCurrentLocation(shipment);
        
        // Generate poetic update if narrative artist is involved
        const narrative = state.agentId === 'narrative-artist' ? 
            await generateNarrativeUpdate(shipment, currentLocation) :
            null;
        
        const update = {
            orderId: shipment.id,
            status: shipment.status,
            currentLocation: currentLocation.city + ', ' + currentLocation.state,
            vehicle: `${shipment.vehicle.year} ${shipment.vehicle.make} ${shipment.vehicle.model}`,
            carrier: shipment.carrier?.name || 'Not yet assigned',
            estimatedDelivery: shipment.timeline.estimatedDelivery,
            lastUpdate: shipment.tracking[shipment.tracking.length - 1],
            narrative
        };
        
        if (callback) {
            const response = narrative || 
                `Your ${update.vehicle} is currently in ${update.currentLocation}. ` +
                `Status: ${update.status}. ` +
                (update.carrier !== 'Not yet assigned' ? `Carrier: ${update.carrier}. ` : '') +
                `Estimated delivery: ${update.estimatedDelivery.start.toLocaleDateString()} - ${update.estimatedDelivery.end.toLocaleDateString()}.`;
            
            callback({
                text: response,
                success: true,
                data: update
            });
        }
        
        return true;
    }
};

export const updateLocationAction: Action = {
    name: "update_location",
    description: "Update the current location of a shipment",
    similes: ["update", "location", "position"],
    examples: [[
        {
            user: "user",
            content: { text: "Update location for ORD-12345 to Denver, CO" }
        },
        {
            user: "assistant",
            content: { text: "I'll update the shipment location." }
        }
    ]],
    
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return message.content.text.toLowerCase().includes('update') &&
               message.content.text.toLowerCase().includes('location');
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback?: HandlerCallback
    ): Promise<boolean> => {
        // Extract order ID and location
        const orderMatch = message.content.text.match(/ORD-\w+/);
        const orderId = orderMatch ? orderMatch[0] : state.currentOrderId;
        
        // Extract location (simple pattern matching - in production use NLP)
        const locationMatch = message.content.text.match(/to ([^,]+),\s*([A-Z]{2})/);
        if (!locationMatch) {
            if (callback) {
                callback({
                    text: "I need a location in format: City, ST",
                    success: false
                });
            }
            return false;
        }
        
        const city = locationMatch[1];
        const state = locationMatch[2];
        
        // Update shipment location
        const shipment = await getShipment(runtime, orderId);
        if (!shipment) {
            if (callback) {
                callback({
                    text: `Order ${orderId} not found.`,
                    success: false
                });
            }
            return false;
        }
        
        // Create tracking update
        const trackingUpdate: TrackingUpdate = {
            timestamp: new Date(),
            location: `${city}, ${state}`,
            status: `Arrived in ${city}`,
            weather: await getWeather(city, state)
        };
        
        // Generate narrative if appropriate
        if (state.generateNarrative) {
            trackingUpdate.narrative = await generateNarrativeForLocation(
                shipment,
                { city, state } as Location,
                trackingUpdate.timestamp
            );
        }
        
        shipment.tracking.push(trackingUpdate);
        await saveShipment(runtime, shipment);
        
        if (callback) {
            callback({
                text: trackingUpdate.narrative || 
                      `Location updated: ${shipment.vehicle.year} ${shipment.vehicle.make} ${shipment.vehicle.model} is now in ${city}, ${state}.`,
                success: true,
                data: trackingUpdate
            });
        }
        
        return true;
    }
};

// Helper functions
async function getShipment(runtime: IAgentRuntime, orderId: string): Promise<Shipment | null> {
    // In production, fetch from database
    // Mock implementation
    return {
        id: orderId,
        customerId: "CUST-001",
        vehicle: {
            make: "BMW",
            model: "X5",
            year: 2023,
            type: "SUV",
            condition: "running"
        },
        origin: {
            address: "123 Main St",
            city: "Los Angeles",
            state: "CA",
            zipCode: "90001",
            contact: {
                name: "John Doe",
                phone: "(555) 123-4567"
            }
        },
        destination: {
            address: "456 Oak Ave",
            city: "New York",
            state: "NY",
            zipCode: "10001",
            contact: {
                name: "Jane Doe",
                phone: "(555) 987-6543"
            }
        },
        status: "in_transit",
        carrier: {
            id: "CAR-001",
            name: "Premium Transport",
            dotNumber: "12345678",
            mcNumber: "MC-123456",
            rating: {
                overall: 4.8,
                reliability: 4.9,
                communication: 4.7,
                care: 4.8,
                reviewCount: 156
            }
        },
        timeline: {
            quoteDate: new Date("2024-01-15"),
            bookingDate: new Date("2024-01-16"),
            estimatedPickup: {
                start: new Date("2024-01-18"),
                end: new Date("2024-01-19")
            },
            estimatedDelivery: {
                start: new Date("2024-01-25"),
                end: new Date("2024-01-27")
            }
        },
        tracking: [
            {
                timestamp: new Date("2024-01-18T10:00:00"),
                location: "Los Angeles, CA",
                status: "Picked up"
            }
        ]
    } as unknown as Shipment;
}

async function getCurrentLocation(shipment: Shipment): Promise<Location> {
    // Get latest tracking location
    const lastTracking = shipment.tracking[shipment.tracking.length - 1];
    const [city, state] = lastTracking.location.split(', ');
    
    return {
        address: "",
        city,
        state,
        zipCode: "",
        contact: shipment.origin.contact
    };
}

async function generateNarrativeUpdate(shipment: Shipment, location: Location): Promise<string> {
    const templates = [
        `Your ${shipment.vehicle.year} ${shipment.vehicle.make} ${shipment.vehicle.model} is currently enjoying the sights of ${location.city}, ${location.state}. The journey continues smoothly, with ${Math.floor(Math.random() * 200 + 300)} miles covered today.`,
        
        `Update from the road: Your ${shipment.vehicle.make} just passed through downtown ${location.city}. The driver reports excellent weather and smooth highways. Next major city: approximately 4 hours away.`,
        
        `Your vehicle has reached ${location.city}, ${location.state} - a perfect spot for the driver's mandatory rest break. Your ${shipment.vehicle.model} is secure and continues to be handled with the utmost care.`
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
}

async function generateNarrativeForLocation(
    shipment: Shipment,
    location: Location,
    time: Date
): Promise<string> {
    // Use the utility function
    return generatePoetryFromLocation(
        0, // Would get real coordinates in production
        0,
        time
    ).replace('{location}', `${location.city}, ${location.state}`)
     .replace('{vehicle}', `${shipment.vehicle.make} ${shipment.vehicle.model}`);
}

async function getWeather(city: string, state: string): Promise<any> {
    // In production, call weather API
    return {
        condition: "Clear",
        temperature: 72,
        visibility: "10 miles"
    };
}

async function saveShipment(runtime: IAgentRuntime, shipment: Shipment): Promise<void> {
    // In production, save to database
    elizaLogger.info(`Shipment ${shipment.id} updated`);
}

// Plugin definition
export const trackingPlugin: Plugin = {
    name: "tracking",
    description: "Shipment tracking and location updates",
    
    actions: [
        trackShipmentAction,
        updateLocationAction
    ],

    evaluators: [],
    providers: []
};
