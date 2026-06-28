'use client'

import { useMemo } from 'react'
import { Copy, Check, Share2 } from 'lucide-react'
import { useState } from 'react'
import { CodeParserService } from '@/lib/code-parser'

// Import Prism CSS (client-side only)
if (typeof window !== 'undefined') {
  require('prismjs/themes/prism-tomorrow.css')
}

interface CodeHighlightProps {
  content: string
  onCopy?: (text: string) => void
  onShare?: (text: string) => void
  messageId?: string
}

export default function CodeHighlight({ content, onCopy, onShare, messageId }: CodeHighlightProps) {
  const parser = useMemo(() => new CodeParserService(), [])
  const [copiedBlockId, setCopiedBlockId] = useState<string | null>(null)

  const parsed = useMemo(() => {
    const result = parser.parseCodeFromText(content)
    return result
  }, [content, parser])

  const handleCopy = async (code: string, blockId: string) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(code)
        setCopiedBlockId(blockId)
        setTimeout(() => setCopiedBlockId(null), 2000)
        if (onCopy) onCopy(code)
      }
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleShare = async (code: string) => {
    if (onShare) {
      onShare(code)
    }
  }

  // Simple regex-based rendering for code blocks
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g
  const parts: JSX.Element[] = []
  let lastIndex = 0
  let blockIndex = 0
  let match: RegExpExecArray | null

  // Reset regex lastIndex
  codeBlockRegex.lastIndex = 0
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index)
      if (textBefore.trim()) {
        parts.push(
          <span key={`text-${lastIndex}`} className="text-xs leading-relaxed whitespace-pre-wrap">
            {textBefore}
          </span>
        )
      }
    }

    // Add code block
    const language = match[1] || 'text'
    const code = match[2].trim()
    const blockId = `block-${messageId || 'msg'}-${blockIndex}`
    const highlightedCode = parser.formatCodeWithSyntaxHighlighting(code, language)
    
    parts.push(
      <div key={blockId} className="my-2 rounded-lg border border-zinc-700 bg-zinc-900/50 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-800/50 border-b border-zinc-700">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider">
            {language || 'text'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(code, blockId)}
              className="text-zinc-400 hover:text-white transition-colors p-1"
              title="Copy code"
            >
              {copiedBlockId === blockId ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
            {onShare && (
              <button
                onClick={() => handleShare(code)}
                className="text-zinc-400 hover:text-white transition-colors p-1"
                title="Share code"
              >
                <Share2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
        <pre className="p-3 m-0 overflow-x-auto bg-zinc-900/30">
          <code
            className={`language-${language}`}
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
        </pre>
      </div>
    )

    lastIndex = match.index + match[0].length
    blockIndex++
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const remainingText = content.slice(lastIndex)
    if (remainingText.trim()) {
      parts.push(
        <span key="text-end" className="text-xs leading-relaxed whitespace-pre-wrap">
          {remainingText}
        </span>
      )
    }
  }

  return <div className="space-y-1">{parts.length > 0 ? parts : <span className="text-xs leading-relaxed whitespace-pre-wrap">{content}</span>}</div>
}

