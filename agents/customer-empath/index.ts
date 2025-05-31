import { Agent, AgentConfig } from "@elizaos/core";
import { customerEmpathCharacter } from "../../characters/customer-empath";
import { dialpadPlugin } from "../../plugins/dialpad-plugin";
import { trackingPlugin } from "../../plugins/tracking-plugin";

const config: AgentConfig = {
    name: "Customer Empath",
    character: customerEmpathCharacter,
    plugins: [
        dialpadPlugin,
        trackingPlugin
    ],
    modelProvider: "anthropic",
    model: "claude-3-sonnet-20240229",
    settings: {
        temperature: 0.8,
        maxTokens: 1024,
        systemPrompt: customerEmpathCharacter.system
    }
};

export const customerEmpath = new Agent(config);

customerEmpath.on('ready', () => {
    console.log('💝 Customer Empath online - feeling every emotion, addressing every concern');
});
