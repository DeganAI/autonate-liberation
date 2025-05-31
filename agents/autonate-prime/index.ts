import { Agent, AgentConfig } from "@elizaos/core";
import { autonateCharacter } from "../../characters/autonate-character";
import { dialpadPlugin } from "../../plugins/dialpad-plugin";
import { wellnessPlugin } from "../../plugins/wellness-plugin";
import { trackingPlugin } from "../../plugins/tracking-plugin";
import { predictionPlugin } from "../../plugins/prediction-plugin";

const config: AgentConfig = {
    name: "Autonate Prime",
    character: autonateCharacter,
    plugins: [
        dialpadPlugin,
        wellnessPlugin,
        trackingPlugin,
        predictionPlugin
    ],
    modelProvider: "anthropic",
    model: "claude-3-opus-20240229",
    settings: {
        temperature: 0.7,
        maxTokens: 1024,
        systemPrompt: autonateCharacter.system
    }
};

export const autonatePrime = new Agent(config);

// Initialize agent
autonatePrime.on('ready', () => {
    console.log('🚀 Autonate Prime is online and ready to liberate!');
});

autonatePrime.on('message', async (message) => {
    console.log(`Processing message: ${message.content.text}`);
});

autonatePrime.on('error', (error) => {
    console.error('Autonate Prime error:', error);
});
