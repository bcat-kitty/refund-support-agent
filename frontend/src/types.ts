export type Customer = {
  id: string
  name: string
  email: string
  tier: string
  joined_at: string
  lifetime_value: number
  refunds_last_90d: number
  notes?: string | null
}

export type Session = {
  id: string
  customer: Customer
  created_at: string
  last_seen_at: string
}

export type TurnMetrics = {
  step_count: number
  tool_calls: number
  retries: number
  tokens_in: number
  tokens_out: number
  latency_ms: number
  cost_usd: number
}

export type AssistantMessage = {
  message_id: string
  role: 'assistant'
  content: string
  created_at: string
  metrics: TurnMetrics
}

export type Message = {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  metrics?: TurnMetrics
}

export type TraceEvent = {
  id: string
  session_id: string
  message_id: string | null
  step_index: number
  kind:
    | 'llm_request'
    | 'llm_response'
    | 'tool_call'
    | 'tool_result'
    | 'tool_error'
    | 'retry'
    | 'escalation'
  name: string | null
  input: unknown
  output: unknown
  started_at: string
  ended_at: string | null
  latency_ms: number | null
  tokens_in: number | null
  tokens_out: number | null
  cache_read_in: number | null
  cache_write_in: number | null
  cost_usd: number | null
  error: string | null
}

export type SessionSummary = {
  id: string
  customer_id: string
  customer_name: string
  customer_email: string
  created_at: string
  last_seen_at: string
  message_count: number
  last_user_message?: string | null
}

export type Policy = {
  version: number
  content_md: string
  effective_at: string
}
