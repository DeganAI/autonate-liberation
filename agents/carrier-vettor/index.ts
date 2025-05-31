import { Agent, AgentConfig } from "@elizaos/core";
import { carrierVettorCharacter } from "../../characters/carrier-vettor";
import { predictionPlugin } from "../../plugins/prediction-plugin";

const config: AgentConfig = {
    name: "Carrier Vettor",
    character: carrierVettorCharacter,
    plugins: [
        predictionPlugin
    ],
    modelProvider: "openai",
    model: "gpt-4-turbo",
    settings: {
        temperature: 0.2,
        maxTokens: 1024,
        systemPrompt: carrierVettorCharacter.system
    }
};

export const carrierVettor = new Agent(config);

carrierVettor.on('ready', () => {
    console.log('🛡️ Carrier Vettor online - protecting customers from bad carriers');
});
