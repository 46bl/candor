// client.ts — unified AI client supporting multiple providers
//
// Supported via AI_PROVIDER env var OR per-request override (CustomAIOptions):
//   openai    → OpenAI API (OPENAI_API_KEY required)
//   anthropic → Anthropic Messages API (ANTHROPIC_API_KEY required)
//   ollama    → Local Ollama (http://localhost:11434, no key needed)
//   lmstudio  → LM Studio (http://localhost:1234/v1, no key needed)
//   custom    → Any OpenAI-compatible endpoint (OPENAI_BASE_URL + key)
//
// Per-request overrides: user-provided settings from Advanced Settings UI.
// The user's API key is used in-memory for that request only and discarded.
// It is never logged or stored server-side.
//
// All providers return a plain string. No state. No caching. No logging.

export interface AIClient {
  complete(prompt: string): Promise<string>
}

// Per-request override from Advanced Settings — sent by user, used in-memory only
export interface CustomAIOptions {
  provider: string   // 'openai' | 'anthropic' | 'ollama' | 'lmstudio' | 'custom'
  apiKey?: string
  model?: string
  baseUrl?: string
}

// ── OpenAI / OpenAI-compatible (Ollama, LM Studio, Groq, Together, etc.) ────

function makeOpenAICompatClient(opts: {
  baseURL: string
  apiKey: string
  model: string
  timeoutMs?: number
}): AIClient {
  return {
    async complete(prompt: string): Promise<string> {
      const res = await fetch(`${opts.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${opts.apiKey}`,
        },
        body: JSON.stringify({
          model: opts.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 2000,
        }),
        signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
      })

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[]
        error?: { message?: string }
      }

      if (!res.ok) {
        throw new Error(data.error?.message ?? `AI API error ${res.status}`)
      }

      const content = data.choices?.[0]?.message?.content
      if (!content) throw new Error('AI returned empty response')
      return content
    },
  }
}

// ── Anthropic Messages API ────────────────────────────────────────────────────

function makeAnthropicClient(overrideKey?: string, overrideModel?: string): AIClient {
  const apiKey = overrideKey ?? process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
  const model = overrideModel ?? process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001'

  return {
    async complete(prompt: string): Promise<string> {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: AbortSignal.timeout(30_000),
      })

      const data = (await res.json()) as {
        content?: { type: string; text: string }[]
        error?: { message?: string }
      }

      if (!res.ok) {
        throw new Error(data.error?.message ?? `Anthropic API error ${res.status}`)
      }

      const text = data.content?.find((b) => b.type === 'text')?.text
      if (!text) throw new Error('Anthropic returned empty response')
      return text
    },
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function getAIClient(override?: CustomAIOptions): AIClient {
  // If user supplied custom settings via Advanced Settings, use those instead
  if (override?.provider) {
    return resolveClient(override.provider, override)
  }
  const provider = (process.env.AI_PROVIDER ?? 'openai').toLowerCase().trim()
  return resolveClient(provider, undefined)
}

function resolveClient(provider: string, override?: CustomAIOptions): AIClient {
  const p = provider.toLowerCase().trim()

  switch (p) {
    case 'anthropic':
      return makeAnthropicClient(override?.apiKey, override?.model)

    case 'ollama':
      return makeOpenAICompatClient({
        baseURL: (override?.baseUrl ?? process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(/\/$/, '') + '/v1',
        apiKey: override?.apiKey ?? 'ollama',
        model: override?.model ?? process.env.OLLAMA_MODEL ?? 'llama3.2',
        timeoutMs: 120_000,
      })

    case 'lmstudio':
      return makeOpenAICompatClient({
        baseURL: (override?.baseUrl ?? process.env.LMSTUDIO_BASE_URL ?? 'http://localhost:1234/v1').replace(/\/$/, ''),
        apiKey: override?.apiKey ?? 'lmstudio',
        model: override?.model ?? process.env.LMSTUDIO_MODEL ?? 'local-model',
        timeoutMs: 120_000,
      })

    case 'custom':
      return makeOpenAICompatClient({
        baseURL: (override?.baseUrl ?? process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, ''),
        apiKey: override?.apiKey ?? process.env.OPENAI_API_KEY ?? '',
        model: override?.model ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      })

    case 'openai':
    default:
      return makeOpenAICompatClient({
        baseURL: (override?.baseUrl ?? process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, ''),
        apiKey: override?.apiKey ?? process.env.OPENAI_API_KEY ?? '',
        model: override?.model ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      })
  }
}
