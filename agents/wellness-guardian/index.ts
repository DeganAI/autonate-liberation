import { Agent, AgentConfig } from "@elizaos/core";
import { wellnessGuardianCharacter } from "../../characters/wellness-guardian";
import { wellnessPlugin } from "../../plugins/wellness-plugin";
import { dialpadPlugin } from "../../plugins/dialpad-plugin";

const config: AgentConfig = {
    name: "Wellness Guardian",
    character: wellnessGuardianCharacter,
    plugins: [
        wellnessPlugin,
        dialpadPlugin
    ],
    modelProvider: "anthropic",
    model: "claude-3-sonnet-20240229",
    settings: {
        temperature: 0.6,
        maxTokens: 1024,
        systemPrompt: wellnessGuardianCharacter.system
    }
};

export const wellnessGuardian = new Agent(config);

// Schedule wellness checks
wellnessGuardian.on('ready', () => {
    console.log('💚 Wellness Guardian activated - protecting coordinator wellbeing');
    
    // Check wellness every 15 minutes
    setInterval(async () => {
        await wellnessGuardian.processMessage({
            content: { text: "Check team wellness" },
            userId: "system",
            roomId: "wellness"
        });
    }, 15 * 60 * 1000);
});
