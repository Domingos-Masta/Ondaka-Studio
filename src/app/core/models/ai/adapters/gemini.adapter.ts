import { AiError, AiCompletionRequest, AiCompletionResponse, AiProviderAdapter } from '../ai-provider.interface';
import { AiProviderConfig, AiProviderType } from '../../../models/app-settings.model';

export class GeminiAdapter implements AiProviderAdapter {
  readonly type: AiProviderType = 'gemini';

  async complete(config: AiProviderConfig, req: AiCompletionRequest): Promise<AiCompletionResponse> {
    const base = config.baseUrl.replace(/\/+$/, '').replace(/\/v1beta$/, '');
    const url = `${base}/v1beta/models/${encodeURIComponent(config.model)}:generateContent`;

    // Gemini has no native "system" role at this endpoint; fold system into first user turn.
    const systemText = req.messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
    const turns = req.messages.filter(m => m.role !== 'system');

    const contents = turns.map((m, i) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: i === 0 && systemText ? `${systemText}\n\n${m.content}` : m.content }],
    }));

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': config.apiKey,
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: req.temperature ?? 0.7,
          maxOutputTokens: req.maxTokens,
          ...(req.responseFormat === 'json' ? { responseMimeType: 'application/json' } : {}),
        },
      }),
    });

    const text = await res.text();
    if (!res.ok) throw new AiError(`${config.name} ${res.status}: ${text}`, res.status, text);

    let data: any;
    try { data = JSON.parse(text); }
    catch { throw new AiError(`Malformed JSON from ${config.name}`, res.status, text); }

      const parts: unknown[] = Array.isArray(data?.candidates?.[0]?.content?.parts)
        ? data.candidates[0].content.parts as unknown[]
        : [];
      const content = parts
        .map(part => {
          if (typeof part !== 'object' || part === null) return '';
          const text = (part as { text?: unknown }).text;
          return typeof text === 'string' ? text : '';
        })
        .join('');
    if (!content) {
      const finishReason = typeof data?.candidates?.[0]?.finishReason === 'string'
        ? data.candidates[0].finishReason
        : undefined;
      throw new AiError(
        `${config.name} returned no content${finishReason ? ` (finish reason: ${finishReason})` : ''}`,
        res.status,
        data
      );
    }

    return {
      text: content,
      usage: {
        promptTokens: data?.usageMetadata?.promptTokenCount,
        completionTokens: data?.usageMetadata?.candidatesTokenCount,
      },
      finishReason: typeof data?.candidates?.[0]?.finishReason === 'string'
        ? data.candidates[0].finishReason.toLowerCase()
        : undefined,
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