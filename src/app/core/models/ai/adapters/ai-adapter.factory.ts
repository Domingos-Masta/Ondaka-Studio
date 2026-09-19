import { AiProviderType } from "../../app-settings.model";
import { AiProviderAdapter } from "../ai-provider.interface";
import { AnthropicAdapter } from "./anthropic.adapter";
import { GeminiAdapter } from "./gemini.adapter";
import { OpenAiCompatibleAdapter } from "./openai-compatible.adapter";


export function createAdapter(type: AiProviderType): AiProviderAdapter {
  switch (type) {
    case 'openai':
    case 'deepseek':
    case 'custom':
      return new OpenAiCompatibleAdapter();
    case 'gemini':
      return new GeminiAdapter();
    case 'anthropic':
      return new AnthropicAdapter();
    default: {
      const _exhaustive: never = type;
      throw new Error(`Unsupported AI provider: ${_exhaustive}`);
    }
  }
}