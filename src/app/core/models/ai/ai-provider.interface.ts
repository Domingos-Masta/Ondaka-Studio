import { AiProviderType, AiProviderConfig } from '../app-settings.model';

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiCompletionRequest {
  messages: AiMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json';
}

export interface AiCompletionResponse {
  text: string;
  usage?: { promptTokens?: number; completionTokens?: number };
  /** Provider-specific completion stop reason, e.g. "length", "max_tokens", "stop". */
  finishReason?: string;
  raw: unknown;
}

export interface AiProviderAdapter {
  readonly type: AiProviderType;
  complete(config: AiProviderConfig, req: AiCompletionRequest): Promise<AiCompletionResponse>;
  test(config: AiProviderConfig): Promise<boolean>;
}

export class AiError extends Error {
  constructor(message: string, public readonly status?: number, public readonly raw?: unknown) {
    super(message);
    this.name = 'AiError';
  }
}

/**
 * Thrown when an AI response cannot be turned into a usable script structure.
 * `recoverable` is `true` when the caller may safely retry (for example when the
 * model returned prose instead of JSON, or truncated its output).
 */
export class AiResponseParseError extends AiError {
  constructor(
    message: string,
    public readonly recoverable = true,
    public readonly rawText?: string,
  ) {
    super(message);
    this.name = 'AiResponseParseError';
  }
}