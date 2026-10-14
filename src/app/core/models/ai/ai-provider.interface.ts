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
  /** Raw provider payload (never leaves the main process for a real call). */
  raw?: unknown;
}

export interface AiErrorOptions {
  /** HTTP status of the failed provider call, when there was one. */
  status?: number;
  /** Raw provider payload, when there was one. */
  raw?: unknown;
  /** The underlying failure, kept so debugging keeps the original stack. */
  cause?: unknown;
}

export class AiError extends Error {
  readonly status?: number;
  readonly raw?: unknown;

  constructor(message: string, options: AiErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'AiError';
    this.status = options.status;
    this.raw = options.raw;
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