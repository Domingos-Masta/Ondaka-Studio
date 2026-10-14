export class AiError extends Error {
    status;
    raw;
    constructor(message, status, raw) {
        super(message);
        this.status = status;
        this.raw = raw;
        this.name = 'AiError';
    }
}
const REQUEST_TIMEOUT_MS = 120_000;
const MAX_MESSAGES = 64;
const MAX_MESSAGE_CHARS = 200_000;
const MAX_TOKENS_CAP = 64_000;
// ---------------------------------------------------------------------------
// Payload validation (everything here arrives from the renderer)
// ---------------------------------------------------------------------------
function asRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
        ? value
        : null;
}
function asArray(value) {
    return Array.isArray(value) ? value : [];
}
function asString(value) {
    return typeof value === 'string' ? value : undefined;
}
function asFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
/** Validates a completion request coming over IPC. */
export function parseRequest(value) {
    const payload = asRecord(value);
    if (!payload)
        throw new AiError('Invalid AI request');
    const rawMessages = asArray(payload.messages);
    if (rawMessages.length === 0)
        throw new AiError('AI request has no messages');
    if (rawMessages.length > MAX_MESSAGES)
        throw new AiError('AI request has too many messages');
    const messages = rawMessages.map(entry => {
        const message = asRecord(entry);
        const role = asString(message?.role);
        const content = asString(message?.content);
        if (!message || !content || (role !== 'system' && role !== 'user' && role !== 'assistant')) {
            throw new AiError('AI request contains an invalid message');
        }
        if (content.length > MAX_MESSAGE_CHARS)
            throw new AiError('AI request message is too large');
        return { role, content };
    });
    const maxTokens = asFiniteNumber(payload.maxTokens);
    return {
        messages,
        temperature: asFiniteNumber(payload.temperature),
        maxTokens: maxTokens === undefined ? undefined : Math.min(Math.max(1, Math.trunc(maxTokens)), MAX_TOKENS_CAP),
        responseFormat: payload.responseFormat === 'json' ? 'json' : undefined,
    };
}
/** Validates a provider config coming over IPC (the key stays undefined unless the user typed one). */
export function parseProvider(value) {
    const provider = asRecord(value);
    if (!provider)
        throw new AiError('Invalid AI provider');
    const id = asString(provider.id);
    const name = asString(provider.name);
    const baseUrl = asString(provider.baseUrl);
    const model = asString(provider.model);
    const type = asString(provider.type);
    if (!id || !name || !baseUrl || !model || !type)
        throw new AiError('Invalid AI provider');
    if (!/^https?:\/\//i.test(baseUrl))
        throw new AiError('Provider base URL must be http(s)');
    return {
        id,
        name,
        type: type,
        baseUrl,
        model,
        apiKey: asString(provider.apiKey),
        enabled: provider.enabled !== false,
        createdAt: asString(provider.createdAt) ?? new Date().toISOString(),
    };
}
function configError(config) {
    return new AiError(`No API key stored for "${config.name}". Add one in Settings.`);
}
// ---------------------------------------------------------------------------
// Provider calls
// ---------------------------------------------------------------------------
export async function completeWithProvider(config, req) {
    switch (config.type) {
        case 'gemini':
            return geminiComplete(config, req);
        case 'anthropic':
            return anthropicComplete(config, req);
        default:
            return openAiCompatibleComplete(config, req);
    }
}
export async function testProvider(config) {
    await completeWithProvider(config, {
        messages: [{ role: 'user', content: 'Reply with exactly: ok' }],
        maxTokens: 8,
        temperature: 0,
    });
    return true;
}
/** POSTs JSON and returns the parsed body, mapping transport failures to AiError. */
async function postJson(config, url, headers, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let res;
    try {
        res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
    }
    catch (err) {
        throw new AiError(err instanceof Error && err.name === 'AbortError'
            ? `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s. Try again or reduce the token limit.`
            : `Network error: ${err.message}`);
    }
    finally {
        clearTimeout(timer);
    }
    const text = await res.text();
    if (!res.ok) {
        let detail = text;
        try {
            detail = asString(asRecord(asRecord(JSON.parse(text))?.error)?.message) ?? text;
        }
        catch { /* keep the raw body */ }
        throw new AiError(`${config.name} ${res.status}: ${detail}`, res.status, text);
    }
    try {
        return JSON.parse(text);
    }
    catch {
        throw new AiError(`Malformed JSON from ${config.name}`, res.status, text);
    }
}
async function openAiCompatibleComplete(config, req) {
    if (!config.apiKey)
        throw configError(config);
    const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    const body = {
        model: config.model,
        messages: req.messages,
        temperature: req.temperature ?? 0.7,
        max_tokens: req.maxTokens,
    };
    if (req.responseFormat === 'json' && config.type !== 'custom') {
        body.response_format = { type: 'json_object' };
    }
    const data = asRecord(await postJson(config, url, { Authorization: `Bearer ${config.apiKey}` }, body));
    const choice = asRecord(asArray(data?.choices)[0]);
    const message = asRecord(choice?.message);
    const finishReason = asString(choice?.finish_reason)?.toLowerCase();
    const content = extractText(message?.content)
        || extractText(data?.output_text)
        || extractText(message?.reasoning_content)
        || extractText(choice?.text);
    if (!content) {
        throw new AiError(`${config.name} returned an empty response${finishReason ? ` (finish reason: ${finishReason})` : ''}`, undefined, data);
    }
    const usage = asRecord(data?.usage);
    return {
        text: content,
        usage: {
            promptTokens: asFiniteNumber(usage?.prompt_tokens),
            completionTokens: asFiniteNumber(usage?.completion_tokens),
        },
        finishReason,
        raw: data,
    };
}
async function anthropicComplete(config, req) {
    if (!config.apiKey)
        throw configError(config);
    const url = `${config.baseUrl.replace(/\/+$/, '')}/v1/messages`;
    const system = req.messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
    const messages = req.messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content }));
    const data = asRecord(await postJson(config, url, {
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
    }, {
        model: config.model,
        max_tokens: req.maxTokens ?? 4096,
        temperature: req.temperature ?? 0.7,
        system: system || undefined,
        messages,
    }));
    const content = asArray(data?.content)
        .map(block => asString(asRecord(block)?.text) ?? '')
        .join('');
    if (!content) {
        const stopReason = asString(data?.stop_reason);
        throw new AiError(`${config.name} returned no content${stopReason ? ` (stop reason: ${stopReason})` : ''}`, undefined, data);
    }
    const usage = asRecord(data?.usage);
    return {
        text: content,
        usage: {
            promptTokens: asFiniteNumber(usage?.input_tokens),
            completionTokens: asFiniteNumber(usage?.output_tokens),
        },
        finishReason: asString(data?.stop_reason)?.toLowerCase(),
        raw: data,
    };
}
async function geminiComplete(config, req) {
    if (!config.apiKey)
        throw configError(config);
    const base = config.baseUrl.replace(/\/+$/, '').replace(/\/v1beta$/, '');
    const url = `${base}/v1beta/models/${encodeURIComponent(config.model)}:generateContent`;
    // Gemini has no native "system" role at this endpoint; fold system into the first user turn.
    const systemText = req.messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
    const turns = req.messages.filter(m => m.role !== 'system');
    const contents = turns.map((m, i) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: i === 0 && systemText ? `${systemText}\n\n${m.content}` : m.content }],
    }));
    const data = asRecord(await postJson(config, url, { 'x-goog-api-key': config.apiKey }, {
        contents,
        generationConfig: {
            temperature: req.temperature ?? 0.7,
            maxOutputTokens: req.maxTokens,
            ...(req.responseFormat === 'json' ? { responseMimeType: 'application/json' } : {}),
        },
    }));
    const candidate = asRecord(asArray(data?.candidates)[0]);
    const content = asArray(asRecord(candidate?.content)?.parts)
        .map(part => asString(asRecord(part)?.text) ?? '')
        .join('');
    if (!content) {
        const finishReason = asString(candidate?.finishReason);
        throw new AiError(`${config.name} returned no content${finishReason ? ` (finish reason: ${finishReason})` : ''}`, undefined, data);
    }
    const usage = asRecord(data?.usageMetadata);
    return {
        text: content,
        usage: {
            promptTokens: asFiniteNumber(usage?.promptTokenCount),
            completionTokens: asFiniteNumber(usage?.candidatesTokenCount),
        },
        finishReason: asString(candidate?.finishReason)?.toLowerCase(),
        raw: data,
    };
}
/** Providers return message content either as a string or as an array of parts. */
function extractText(value) {
    if (typeof value === 'string')
        return value.trim();
    if (Array.isArray(value)) {
        return value
            .map(part => extractText(asRecord(part)?.text ?? asRecord(part)?.content ?? part))
            .filter(Boolean)
            .join('')
            .trim();
    }
    const record = asRecord(value);
    if (record)
        return extractText(record.text ?? record.content ?? record.value);
    return '';
}
//# sourceMappingURL=ai-proxy.js.map