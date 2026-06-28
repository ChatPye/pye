/**
 * Code Extraction Service
 * Extracts code blocks and technical content from transcripts and video frames
 */

interface CodeBlock {
  code: string
  language?: string
  timestamp: number
  timestampFormatted: string
  context?: string
  lineStart?: number
  lineEnd?: number
}

interface ExtractedCode {
  blocks: CodeBlock[]
  summary: string
  languages: string[]
}

/**
 * Extract code blocks from transcript text
 */
export function extractCodeFromTranscript(
  transcript: Array<{ text: string; start: number; duration: number }>
): ExtractedCode {
  const codeBlocks: CodeBlock[] = []
  const languages = new Set<string>()

  // Common code patterns
  const codePatterns = [
    // Code blocks with language hints
    /```(\w+)?\n?([\s\S]*?)```/g,
    // Function definitions
    /(?:function|const|let|var|class|interface|type)\s+[\w$]+\s*[=:{]?[^}]*{[^}]*}/g,
    // Import/export statements
    /(?:import|export)\s+(?:.*from\s+)?['"](.*?)['"]/g,
    // API endpoints
    /(?:GET|POST|PUT|DELETE|PATCH)\s+\/[\w\/-]+/gi,
    // Configuration syntax
    /(?:config|settings|options)\s*[:=]\s*{[\s\S]*?}/g,
    // SQL queries
    /(?:SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s+[\s\S]*?;/gi,
  ]

  transcript.forEach((segment) => {
    const text = segment.text
    let match

    // Look for fenced code blocks
    const fencedCodeRegex = /```(\w+)?\n?([\s\S]*?)```/g
    while ((match = fencedCodeRegex.exec(text)) !== null) {
      const language = match[1] || 'text'
      const code = match[2].trim()
      
      if (code.length > 10) { // Only include substantial code blocks
        codeBlocks.push({
          code,
          language,
          timestamp: segment.start,
          timestampFormatted: formatTimestamp(segment.start),
          context: extractContext(text, match.index || 0)
        })
        languages.add(language)
      }
    }

    // Look for inline code patterns
    const inlineCodeRegex = /`([^`]+)`/g
    while ((match = inlineCodeRegex.exec(text)) !== null) {
      const code = match[1]
      // Only include if it looks like actual code (has operators, keywords, etc.)
      if (isCodeLike(code)) {
        const language = detectLanguage(code)
        codeBlocks.push({
          code,
          language,
          timestamp: segment.start,
          timestampFormatted: formatTimestamp(segment.start),
          context: extractContext(text, match.index || 0)
        })
        if (language !== 'text') {
          languages.add(language)
        }
      }
    }

    // Look for function/class definitions
    const functionRegex = /(?:function|const|let|var|class|interface)\s+(\w+)/g
    while ((match = functionRegex.exec(text)) !== null) {
      const funcName = match[1]
      // Extract surrounding context as code snippet
      const startIdx = Math.max(0, (match.index || 0) - 50)
      const endIdx = Math.min(text.length, (match.index || 0) + 200)
      const snippet = text.slice(startIdx, endIdx)
      
      if (snippet.includes('{') || snippet.includes('(')) {
        codeBlocks.push({
          code: snippet.trim(),
          language: detectLanguage(snippet),
          timestamp: segment.start,
          timestampFormatted: formatTimestamp(segment.start),
          context: `Function: ${funcName}`
        })
      }
    }
  })

  // Remove duplicates (same code at same timestamp)
  const uniqueBlocks = codeBlocks.filter((block, index, self) => 
    index === self.findIndex(b => 
      b.code === block.code && 
      Math.abs(b.timestamp - block.timestamp) < 1
    )
  )

  return {
    blocks: uniqueBlocks.sort((a, b) => a.timestamp - b.timestamp),
    summary: generateCodeSummary(uniqueBlocks),
    languages: Array.from(languages)
  }
}

/**
 * Extract code from OCR text (from video frames)
 */
export function extractCodeFromOCR(ocrText: string, timestamp: number): CodeBlock[] {
  const blocks: CodeBlock[] = []
  
  // Look for code-like patterns in OCR text
  const codePatterns = [
    /```[\s\S]*?```/g,
    /function\s+\w+\s*\([^)]*\)\s*{/g,
    /const\s+\w+\s*=\s*[^;]+;/g,
    /class\s+\w+\s*{/g,
  ]

  codePatterns.forEach(pattern => {
    const matches = ocrText.match(pattern)
    if (matches) {
      matches.forEach(match => {
        blocks.push({
          code: match.trim(),
          language: detectLanguage(match),
          timestamp,
          timestampFormatted: formatTimestamp(timestamp),
          context: 'Extracted from video frame'
        })
      })
    }
  })

  return blocks
}

/**
 * Check if text looks like code
 */
function isCodeLike(text: string): boolean {
  const codeIndicators = [
    /[{}()\[\]]/, // Brackets
    /(?:function|const|let|var|class|interface|import|export|return|if|else|for|while)/, // Keywords
    /[=<>!&|]/, // Operators
    /\d+\s*[+\-*/]\s*\d+/, // Arithmetic
    /\/\//, // Comments
  ]

  return codeIndicators.some(pattern => pattern.test(text)) && text.length > 5
}

/**
 * Detect programming language from code snippet
 */
function detectLanguage(code: string): string {
  const languagePatterns: Record<string, RegExp[]> = {
    javascript: [
      /(?:const|let|var|function|=>|async|await|import|export)/,
      /console\.(log|error|warn)/,
      /\.then\(|\.catch\(/
    ],
    typescript: [
      /(?:interface|type|:\s*\w+)/,
      /(?:const|let|var)\s+\w+:\s*\w+/
    ],
    python: [
      /(?:def|class|import|from|if\s+__name__)/,
      /print\(/,
      /(?:\.py|pip install)/
    ],
    java: [
      /(?:public|private|class|interface)\s+\w+/,
      /@Override|@Deprecated/
    ],
    html: [
      /<[a-z]+[^>]*>/i,
      /<\/[a-z]+>/i
    ],
    css: [
      /@media|@keyframes/,
      /[.#][\w-]+\s*{/
    ],
    sql: [
      /(?:SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s+/i
    ],
    json: [
      /"(?:[^"\\]|\\.)*"\s*:\s*["{[]/
    ],
  }

  for (const [lang, patterns] of Object.entries(languagePatterns)) {
    if (patterns.some(pattern => pattern.test(code))) {
      return lang
    }
  }

  return 'text'
}

/**
 * Extract context around code match
 */
function extractContext(text: string, matchIndex: number): string {
  const contextStart = Math.max(0, matchIndex - 50)
  const contextEnd = Math.min(text.length, matchIndex + 100)
  return text.slice(contextStart, contextEnd).trim()
}

/**
 * Generate summary of extracted code
 */
function generateCodeSummary(blocks: CodeBlock[]): string {
  if (blocks.length === 0) {
    return 'No code found in transcript'
  }

  const languages = [...new Set(blocks.map(b => b.language).filter(Boolean))]
  const languageList = languages.length > 0 
    ? languages.join(', ')
    : 'unknown'

  return `Found ${blocks.length} code ${blocks.length === 1 ? 'block' : 'blocks'} in ${languageList}`
}

/**
 * Format timestamp as mm:ss
 */
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

/**
 * Combine code from transcript and OCR sources
 */
export function combineCodeSources(
  transcriptCode: ExtractedCode,
  ocrCode: CodeBlock[]
): ExtractedCode {
  const allBlocks = [...transcriptCode.blocks, ...ocrCode]
  
  // Remove duplicates (same code, nearby timestamps)
  const uniqueBlocks = allBlocks.filter((block, index, self) => 
    index === self.findIndex(b => 
      b.code.trim() === block.code.trim() && 
      Math.abs(b.timestamp - block.timestamp) < 5
    )
  )

  const allLanguages = new Set([
    ...transcriptCode.languages,
    ...uniqueBlocks.map(b => b.language).filter(Boolean) as string[]
  ])

  return {
    blocks: uniqueBlocks.sort((a, b) => a.timestamp - b.timestamp),
    summary: `Found ${uniqueBlocks.length} code blocks from transcript and video frames`,
    languages: Array.from(allLanguages)
  }
}

