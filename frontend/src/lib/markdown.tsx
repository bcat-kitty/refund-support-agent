import { ReactNode } from 'react'

/** Minimal markdown-lite renderer for assistant messages.
 *  Supports: paragraphs, `- ` bullet lists, **bold**, `inline code`,
 *  and policy section refs like "§2.1" rendered as colored pills.
 *  Deliberately no full markdown lib - keeps bundle slim & XSS-safe by design.
 */

const REF_RE = /§\d+(?:\.\d+)*/g

function renderInline(text: string, keyBase: string): ReactNode[] {
  // Tokenize bold first via **...** then handle inline code, then policy refs.
  const out: ReactNode[] = []
  let i = 0
  let k = 0
  const flushRefs = (chunk: string, prefix: string) => {
    let last = 0
    for (const m of chunk.matchAll(REF_RE)) {
      const start = m.index ?? 0
      if (start > last) out.push(<span key={`${prefix}-t-${k++}`}>{chunk.slice(last, start)}</span>)
      out.push(
        <span key={`${prefix}-r-${k++}`} className="policy-ref">
          {m[0]}
        </span>,
      )
      last = start + m[0].length
    }
    if (last < chunk.length) out.push(<span key={`${prefix}-t-${k++}`}>{chunk.slice(last)}</span>)
  }
  // Split on **bold** segments and inline `code` segments while preserving order.
  // Simple state-machine.
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > i) flushRefs(text.slice(i, m.index), `${keyBase}-${i}`)
    if (m[2] !== undefined) {
      out.push(
        <strong key={`${keyBase}-b-${m.index}`}>
          {renderInline(m[2], `${keyBase}-b${m.index}`)}
        </strong>,
      )
    } else if (m[3] !== undefined) {
      out.push(
        <code key={`${keyBase}-c-${m.index}`}>{m[3]}</code>,
      )
    }
    i = m.index + m[0].length
  }
  if (i < text.length) flushRefs(text.slice(i), `${keyBase}-tail`)
  return out
}

export function MarkdownLite({ text }: { text: string }) {
  // Split into logical blocks separated by blank lines, then within each block
  // detect bullet lists (- prefix) vs paragraphs.
  const blocks = text.split(/\n\s*\n/)
  return (
    <div className="prose-msg text-sm leading-relaxed">
      {blocks.map((block, bi) => {
        const lines = block.split('\n').map((l) => l.replace(/^\s+/, ''))
        const isList = lines.length > 0 && lines.every((l) => l.startsWith('- ') || l.startsWith('* '))
        if (isList) {
          return (
            <ul key={bi}>
              {lines.map((l, li) => (
                <li key={li}>{renderInline(l.slice(2), `b${bi}-l${li}`)}</li>
              ))}
            </ul>
          )
        }
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <span key={li}>
                {renderInline(l, `b${bi}-p${li}`)}
                {li < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}
