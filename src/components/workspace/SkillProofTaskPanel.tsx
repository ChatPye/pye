'use client'

import { CheckCircle2, Code2, ExternalLink, FileSpreadsheet, Lightbulb } from 'lucide-react'
import { useMemo, useState } from 'react'

type WorkspaceKind = 'vscode' | 'excel'

const templates: Record<WorkspaceKind, { label: string; description: string; steps: string[] }> = {
  vscode: {
    label: 'VS Code build-along',
    description: 'Build a small feature alongside the tutorial, then submit your repository.',
    steps: ['Set up the project and dependencies', 'Implement the core feature', 'Run and interpret a test or error', 'Explain one design decision', 'Attach a GitHub repository or demo'],
  },
  excel: {
    label: 'Excel balance-sheet build-along',
    description: 'Build a simple balance sheet from the tutorial, validate that it balances, then submit the workbook and your reasoning.',
    steps: ['Set up Assets, Liabilities and Equity sections', 'Enter formulas that link the core line items', 'Validate that Assets = Liabilities + Equity', 'Explain one formula or modelling decision in your own words', 'Attach the workbook, spreadsheet or demo link'],
  },
}

export function SkillProofTaskPanel({ videoId }: { videoId?: string }) {
  const [kind, setKind] = useState<WorkspaceKind>('vscode')
  const [completed, setCompleted] = useState<number[]>([])
  const [showHint, setShowHint] = useState(false)
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [reflection, setReflection] = useState('')
  const [showEvidence, setShowEvidence] = useState(false)
  const [saved, setSaved] = useState('')
  const template = useMemo(() => templates[kind], [kind])

  const record = async (action: string, payload: Record<string, unknown> = {}) => {
    if (!videoId) return
    const response = await fetch('/api/skillproof/evidence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ videoId, workspace: kind, action, ...payload }) })
    if (response.ok) setSaved('Saved as competency evidence')
  }
  const toggle = (index: number) => setCompleted((current) => {
    const next = current.includes(index) ? current.filter((value) => value !== index) : [...current, index]
    if (!current.includes(index)) void record('skillproof.step_completed', { stepIndex: index })
    return next
  })

  return (
    <section className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">SkillProof task</p>
          <h3 className="mt-1 text-sm font-semibold text-white">Learn it. Build it. Show the evidence.</h3>
        </div>
        <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] text-zinc-300">{completed.length}/{template.steps.length}</span>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => { setKind('vscode'); setCompleted([]) }} className={`rounded-lg border px-3 py-2 text-xs ${kind === 'vscode' ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-100' : 'border-zinc-700 text-zinc-400'}`}><Code2 className="mr-1 inline h-3.5 w-3.5" />VS Code</button>
        <button type="button" onClick={() => { setKind('excel'); setCompleted([]) }} className={`rounded-lg border px-3 py-2 text-xs ${kind === 'excel' ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-100' : 'border-zinc-700 text-zinc-400'}`}><FileSpreadsheet className="mr-1 inline h-3.5 w-3.5" />Excel</button>
      </div>

      <p className="mb-3 text-xs leading-5 text-zinc-400">{template.description}</p>
      <ol className="space-y-2">
        {template.steps.map((step, index) => <li key={step}><button type="button" onClick={() => toggle(index)} className="flex w-full items-start gap-2 text-left text-xs text-zinc-300"><CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${completed.includes(index) ? 'text-emerald-400' : 'text-zinc-600'}`} /><span className={completed.includes(index) ? 'line-through text-zinc-500' : ''}>{step}</span></button></li>)}
      </ol>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => setShowHint((value) => !value)} className="rounded-lg border border-amber-300/30 px-3 py-2 text-xs text-amber-100"><Lightbulb className="mr-1 inline h-3.5 w-3.5" />{showHint ? 'Hide hint' : 'Ask for a hint'}</button>
        <button type="button" onClick={() => setShowEvidence((value) => !value)} disabled={!videoId} className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-medium text-black disabled:opacity-50"><ExternalLink className="mr-1 inline h-3.5 w-3.5" />Add evidence</button>
      </div>
      {showHint && <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/5 p-2 text-xs text-amber-100">First, describe the expected outcome in your own words. Then use the chat tutor for the next smallest step—not the whole solution.</p>}
      {showEvidence && <div className="mt-3 space-y-2"><input value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} placeholder="GitHub, workbook or demo link" className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white" /><textarea value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder="What did you build and why?" className="min-h-20 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white" /><button type="button" onClick={() => { void record('skillproof.evidence_submitted', { evidenceUrl }); if (reflection.trim()) void record('skillproof.reflection_submitted', { reflection }) }} className="rounded-lg border border-emerald-400/40 px-3 py-2 text-xs text-emerald-100">Save evidence</button></div>}
      {saved && <p className="mt-2 text-xs text-emerald-300">{saved}</p>}
    </section>
  )
}
