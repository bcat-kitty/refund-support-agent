import type {
  AssistantMessage,
  Customer,
  Message,
  Policy,
  Session,
  SessionSummary,
  TraceEvent,
} from './types'

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text()
    let detail = text
    try {
      const parsed = JSON.parse(text)
      if (parsed && typeof parsed.detail === 'string') detail = parsed.detail
    } catch {
      /* keep raw text */
    }
    throw new Error(`${res.status}: ${detail}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  listCustomers: () => http<Customer[]>('/api/customers'),
  startSession: (email: string) =>
    http<Session>('/api/sessions', { method: 'POST', body: JSON.stringify({ email }) }),
  sendMessage: (sessionId: string, content: string) =>
    http<AssistantMessage>(`/api/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  listMessages: (sessionId: string) =>
    http<Message[]>(`/api/sessions/${sessionId}/messages`),
  listSessions: () => http<SessionSummary[]>('/api/sessions'),
  getTrace: (sessionId: string) => http<TraceEvent[]>(`/api/sessions/${sessionId}/trace`),
  getPolicy: () => http<Policy>('/api/policy'),
}
