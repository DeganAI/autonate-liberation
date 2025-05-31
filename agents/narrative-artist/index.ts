import { Agent, AgentConfig } from "@elizaos/core";
import { narrativeArtistCharacter } from "../../characters/narrative-artist";
import { trackingPlugin } from "../../plugins/tracking-plugin";

const config: AgentConfig = {
    name: "Narrative Artist",
    character: narrativeArtistCharacter,
    plugins: [
        trackingPlugin
    ],
    modelProvider: "anthropic",
    model: "claude-3-opus-20240229",
    settings: {
        temperature: 0.9,
        maxTokens: 1024,
        systemPrompt: narrativeArtistCharacter.system
    }
};

export const narrativeArtist = new Agent(config);

narrativeArtist.on('ready', () => {
    console.log('🎨 Narrative Artist online - turning logistics into literature');
});
