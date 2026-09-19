import { AiError, AiCompletionRequest, AiCompletionResponse, AiProviderAdapter } from '../ai-provider.interface';
import { AiProviderConfig, AiProviderType } from '../../../models/app-settings.model';

export class OpenAiCompatibleAdapter implements AiProviderAdapter {
  readonly type: AiProviderType = 'openai';

  async complete(config: AiProviderConfig, req: AiCompletionRequest): Promise<AiCompletionResponse> {
    const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    const body: Record<string, unknown> = {
      model: config.model,
      messages: req.messages,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens,
    };
    if (req.responseFormat === 'json' && config.type !== 'custom') {
      body.response_format = { type: 'json_object' };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120_000);

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      throw new AiError(
        err instanceof DOMException && err.name === 'AbortError'
          ? 'Request timed out after 120s. Try again or reduce the token limit.'
          : `Network error: ${(err as Error).message}`
      );
    } finally {
      clearTimeout(timer);
    }

    const text = await res.text();
    if (!res.ok) {
      let detail = text;
      try { detail = JSON.parse(text)?.error?.message ?? text; } catch { /* keep raw */ }
      throw new AiError(`${config.name} ${res.status}: ${detail}`, res.status, text);
    }

    let data: any;
    try { data = JSON.parse(text); }
    catch { throw new AiError(`Malformed JSON from ${config.name}`, res.status, text); }

    const message = data?.choices?.[0]?.message;
    const finishReason = typeof data?.choices?.[0]?.finish_reason === 'string'
      ? data.choices[0].finish_reason.toLowerCase()
      : undefined;
    const content = extractText(message?.content)
      || extractText(data?.output_text)
      || extractText(message?.reasoning_content)
      || extractText(data?.choices?.[0]?.text);
    if (!content) {
      throw new AiError(
        `${config.name} returned an empty response${finishReason ? ` (finish reason: ${finishReason})` : ''}`,
        res.status,
        data
      );
    }

    return {
      text: content,
      usage: {
        promptTokens: data?.usage?.prompt_tokens,
        completionTokens: data?.usage?.completion_tokens,
      },
      finishReason,
      raw: data,
    };
  }

  async test(config: AiProviderConfig): Promise<boolean> {
    await this.complete(config, {
      messages: [{ role: 'user', content: 'Reply with exactly: ok' }],
      maxTokens: 8,
      temperature: 0,
    });
    return true;
  }
}

function extractText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    return value
      .map(part => extractText(typeof part === 'object' && part !== null ? part.text ?? part.content : part))
      .filter(Boolean)
      .join('')
      .trim();
  }
  if (typeof value === 'object' && value !== null) {
    const part = value as any;
    return extractText(part.text ?? part.content ?? part.value);
  }
  return '';
}