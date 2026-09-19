import { Injectable, inject } from '@angular/core';
import { AiService } from './adapters/ai.service';
import { SettingsService } from '../../services/settings/settings.service';
import { renderTemplate, extractJson } from './adapters/prompt-builder';
import { GeneratedScript, SCRIPT_JSON_INSTRUCTIONS, coerceGeneratedScript } from './prompts/script-schema';
import {
  AiCompletionResponse,
  AiError,
  AiMessage,
  AiResponseParseError,
} from './ai-provider.interface';

export interface TitleToScriptInput {
  title: string;
  targetDuration: number;
  tone: string;
  keyPoints: string;
}

const MAX_ATTEMPTS = 3;
const MAX_TOKENS_CAP = 32_000;
const TRUNCATED_REASONS = new Set(['length', 'max_tokens', 'maxoutputtokens']);

@Injectable({ providedIn: 'root' })
export class AiScriptService {
  private ai = inject(AiService);
  private settings = inject(SettingsService);

  /** Generate a scene-by-scene script from a title and guidance. */
  generateFromTitle(input: TitleToScriptInput): Promise<GeneratedScript> {
    const s = this.settings.settings();
    const user = this.withSchema(s.prompts.titleToScript, {
      title: input.title,
      targetDuration: input.targetDuration,
      tone: input.tone || 'default',
      keyPoints: input.keyPoints || 'none specified',
    });

    return this.run(
      [{ role: 'system', content: s.prompts.systemBase }, { role: 'user', content: user }],
      s.timing.defaultWpm,
      { temperature: 0.8, maxTokens: 6000 },
    );
  }

  /** Adapt arbitrary imported content into a scene-structured script. */
  adaptImport(content: string): Promise<GeneratedScript> {
    const s = this.settings.settings();
    const user = this.withSchema(s.prompts.importAdapt, { content });

    return this.run(
      [{ role: 'system', content: s.prompts.systemBase }, { role: 'user', content: user }],
      s.timing.defaultWpm,
      { temperature: 0.5, maxTokens: 8000 },
    );
  }

  /**
   * Core generation loop. Calls the provider, parses the result, and — when the
   * model returns something unusable — feeds the problem back and retries a
   * bounded number of times before giving up with a helpful error.
   */
  private async run(
    baseMessages: AiMessage[],
    wpm: number,
    opts: { temperature: number; maxTokens: number },
  ): Promise<GeneratedScript> {
    const messages = [...baseMessages];
    let temperature = opts.temperature;
    let maxTokens = opts.maxTokens;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const res = await this.call(messages, temperature, maxTokens);
      const text = (res.text ?? '').trim();

      if (!text) {
        const problem = res.finishReason
          ? `The provider stopped with reason "${res.finishReason}" and no content.`
          : 'The provider returned an empty response.';
        if (attempt >= MAX_ATTEMPTS) {
          throw new AiResponseParseError(this.finalMessage(problem, isTruncated(res)), false);
        }
        messages.push({ role: 'user', content: this.retryPrompt(problem, isTruncated(res)) });
        temperature = Math.max(0, temperature - 0.2);
        if (isTruncated(res)) maxTokens = Math.min(MAX_TOKENS_CAP, Math.round(maxTokens * 1.5));
        continue;
      }

      const truncated = isTruncated(res);
      try {
        return coerceGeneratedScript(extractJson<unknown>(text), wpm);
      } catch (parseErr) {
        const problem = (parseErr as Error).message;
        if (attempt >= MAX_ATTEMPTS) {
          throw new AiResponseParseError(this.finalMessage(problem, truncated), false, text);
        }

        // Give the model its own (truncated) output plus a targeted correction.
        messages.push(
          { role: 'assistant', content: truncate(text, 800) },
          { role: 'user', content: this.retryPrompt(problem, truncated) },
        );
        temperature = Math.max(0, temperature - 0.2);
        if (truncated) maxTokens = Math.min(MAX_TOKENS_CAP, Math.round(maxTokens * 1.5));
      }
    }

    throw new AiResponseParseError(
      'AI script generation failed after multiple attempts. Adjust the prompt or provider and try again.',
      false,
    );
  }

  private async call(messages: AiMessage[], temperature: number, maxTokens: number): Promise<AiCompletionResponse> {
    try {
      return await this.ai.complete({
        messages,
        temperature,
        maxTokens,
        responseFormat: 'json',
      });
    } catch (err) {
      // Network/auth/provider errors are surfaced directly with their message.
      if (err instanceof AiError) throw err;
      throw new AiError(`AI request failed: ${(err as Error).message}`);
    }
  }

  private withSchema(prompt: string, vars: Record<string, string | number | undefined>): string {
    const wpm = this.settings.settings().timing.defaultWpm;
    return renderTemplate(prompt, vars) + '\n\n' + renderTemplate(SCRIPT_JSON_INSTRUCTIONS, { wpm });
  }

  private retryPrompt(problem: string, truncated: boolean): string {
    return [
      `Your previous response could not be used${truncated ? ' because it was cut off before completing' : ''}.`,
      `Problem: ${problem}`,
      'Respond again with ONLY valid JSON matching the required schema.',
      'Do not include prose, code fences, explanations, or commentary.',
      'The "scenes" array must contain at least 2 scenes and must never be empty.',
    ].join('\n');
  }

  private finalMessage(problem: string, truncated: boolean): string {
    const base = truncated
      ? 'The AI response was cut off before it could be completed.'
      : 'The AI did not return usable JSON.';
    return `${base} ${problem} Adjust the prompt, increase the token limit, or try again.`;
  }
}

function isTruncated(res: AiCompletionResponse): boolean {
  return TRUNCATED_REASONS.has(String(res.finishReason ?? '').toLowerCase());
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}
