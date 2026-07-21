'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'

interface CodeHighlightProps {
  content: string
  onCopy?: (text: string) => void
  onShare?: (text: string) => void
  messageId?: string
}

/**
 * A deliberately dependency-free renderer for tutor responses. Prism's browser
 * plugin loader caused the workspace to crash for some production bundles.
 * Markdown code fences remain readable, copyable and safe without executing
 * any source supplied by an AI response.
 */
export default function CodeHighlight({ content, onCopy, onShare, messageId }: CodeHighlightProps) {
  const [copiedBlockId, setCopiedBlockId] = useState<string | null>(null)
  const blocks = content.split(/```([\w+-]*)\n?([\s\S]*?)```/g)

  const copy = async (code: string, blockId: string) => {
    try {
      await navigator.clipboard?.writeText(code)
      setCopiedBlockId(blockId)
      window.setTimeout(() => setCopiedBlockId(null), 2000)
      onCopy?.(code)
    } catch {
      // Clipboard access may be denied in embedded browsers; the code remains visible.
    }
  }

  if (blocks.length === 1) {
    return <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">{content}</p>
  }

  const items: ReactNode[] = []
  for (let index = 0; index < blocks.length; index += 3) {
    const prose = blocks[index]
    if (prose?.trim()) items.push(<p key={`prose-${index}`} className="text-xs leading-relaxed whitespace-pre-wrap break-words">{prose}</p>)
    const language = blocks[index + 1]
    const code = blocks[index + 2]
    if (code === undefined) continue
    const blockId = `${messageId || 'message'}-${index}`
    items.push(
      <div key={blockId} className="my-2 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950/80">
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-3 py-2">
          <span className="text-[10px] uppercase tracking-wider text-zinc-400">{language || 'code'}</span>
          <div className="flex gap-1">
            <button type="button" onClick={() => void copy(code, blockId)} className="rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white" title="Copy code">
              {copiedBlockId === blockId ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            </button>
            {onShare && <button type="button" onClick={() => onShare(code)} className="rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white" title="Share code"><Share2 className="h-3 w-3" /></button>}
          </div>
        </div>
        <pre className="overflow-x-auto p-3 text-xs leading-5 text-zinc-200"><code>{code.trim()}</code></pre>
      </div>
    )
  }
  return <div className="space-y-1">{items}</div>
}
