import { AiError, AiCompletionRequest, AiCompletionResponse, AiProviderAdapter } from '../ai-provider.interface';
import { AiProviderConfig, AiProviderType } from '../../../models/app-settings.model';

export class AnthropicAdapter implements AiProviderAdapter {
  readonly type: AiProviderType = 'anthropic';

  async complete(config: AiProviderConfig, req: AiCompletionRequest): Promise<AiCompletionResponse> {
    const base = config.baseUrl.replace(/\/+$/, '');
    const url = `${base}/v1/messages`;

    const system = req.messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
    const messages = req.messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }));

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: req.maxTokens ?? 4096,
        temperature: req.temperature ?? 0.7,
        system: system || undefined,
        messages,
      }),
    });

    const text = await res.text();
    if (!res.ok) throw new AiError(`${config.name} ${res.status}: ${text}`, res.status, text);

    let data: any;
    try { data = JSON.parse(text); }
    catch { throw new AiError(`Malformed JSON from ${config.name}`, res.status, text); }

    const blocks = Array.isArray(data?.content) ? data.content as Array<{ text?: string }> : [];
    const content = blocks.map(c => c.text ?? '').join('');
    if (!content) {
      const stopReason = typeof data?.stop_reason === 'string' ? data.stop_reason : undefined;
      throw new AiError(
        `${config.name} returned no content${stopReason ? ` (stop reason: ${stopReason})` : ''}`,
        res.status,
        data
      );
    }

    return {
      text: content,
      usage: {
        promptTokens: data?.usage?.input_tokens,
        completionTokens: data?.usage?.output_tokens,
      },
      finishReason: typeof data?.stop_reason === 'string' ? data.stop_reason.toLowerCase() : undefined,
      raw: data,
    };
  }

  async test(config: AiProviderConfig): Promise<boolean> {
    await this.complete(config, {
      messages: [{ role: 'user', content: 'Reply with exactly: ok' }],
      maxTokens: 16,
      temperature: 0,
    });
    return true;
  }
}