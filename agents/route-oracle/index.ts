import { Agent, AgentConfig } from "@elizaos/core";
import { routeOracleCharacter } from "../../characters/route-oracle";
import { predictionPlugin } from "../../plugins/prediction-plugin";
import { trackingPlugin } from "../../plugins/tracking-plugin";

const config: AgentConfig = {
    name: "Route Oracle",
    character: routeOracleCharacter,
    plugins: [
        predictionPlugin,
        trackingPlugin
    ],
    modelProvider: "openai",
    model: "gpt-4-turbo",
    settings: {
        temperature: 0.3,
        maxTokens: 1024,
        systemPrompt: routeOracleCharacter.system
    }
};

export const routeOracle = new Agent(config);

routeOracle.on('ready', () => {
    console.log('🔮 Route Oracle online - predicting the future of every shipment');
});
