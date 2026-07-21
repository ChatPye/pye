'use client'

import { CheckCircle2, ExternalLink, Lightbulb, Loader2, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

type WorkspaceKind = 'vscode' | 'excel' | 'general'
type ProcessingStatus = 'queued' | 'pending' | 'extracting' | 'transcribing' | 'embedding' | 'complete' | 'failed'
type Task = { title: string; instruction: string; evidence: string; reflectionPrompt?: string; timestamp?: number }
type Plan = { workspace: WorkspaceKind; goal: string; steps: Task[]; quiz: { question: string; answer: string }[]; generatedBy: 'gemini' | 'transcript-fallback' }

function workspaceLabel(kind: WorkspaceKind) {
  if (kind === 'vscode') return 'VS Code build workspace'
  if (kind === 'excel') return 'Excel build workspace'
  return 'Practical task workspace'
}

export function SkillProofTaskPanel({ videoId, processingStatus }: { videoId?: string; processingStatus?: ProcessingStatus }) {
  const [plan, setPlan] = useState<Plan | null>(null)
  const [completed, setCompleted] = useState<number[]>([])
  const [showHint, setShowHint] = useState(false)
  const [showQuiz, setShowQuiz] = useState(false)
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [reflection, setReflection] = useState('')
  const [showEvidence, setShowEvidence] = useState(false)
  const [evidenceStepIndex, setEvidenceStepIndex] = useState(0)
  const [saved, setSaved] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!videoId || processingStatus !== 'complete') return
    const controller = new AbortController()
    setError('')
    fetch(`/api/skillproof/task-plan?videoId=${encodeURIComponent(videoId)}`, { credentials: 'include', signal: controller.signal })
      .then(async (response) => {
        const data = await response.json().catch(() => null)
        if (!response.ok || !data?.plan) throw new Error(data?.error || 'Task plan unavailable')
        setPlan(data.plan as Plan)
        setCompleted([])
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') setError(requestError.message || 'Task plan unavailable')
      })
    return () => controller.abort()
  }, [videoId, processingStatus])

  const record = async (action: string, payload: Record<string, unknown> = {}) => {
    if (!videoId || !plan) return
    const response = await fetch('/api/skillproof/evidence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ videoId, workspace: plan.workspace, action, ...payload }) })
    if (response.ok) {
      setSaved('Saved as competency evidence')
      setError('')
    } else {
      const data = await response.json().catch(() => null)
      setError(data?.error || 'We could not save that evidence. Please try again.')
    }
  }

  const toggle = (index: number) => setCompleted((current) => {
    const next = current.includes(index) ? current.filter((value) => value !== index) : [...current, index]
    if (!current.includes(index)) void record('skillproof.step_completed', { stepIndex: index, stepTitle: plan?.steps[index]?.title })
    return next
  })

  if (processingStatus !== 'complete') {
    return <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />SkillProof is reading this tutorial to create a tailored task plan.</section>
  }

  if (!plan) {
    return <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.04] p-4 text-sm text-amber-100"><Sparkles className="mr-2 inline h-4 w-4" />{error || 'Preparing a task plan from the video…'}</section>
  }

  return (
    <section className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">SkillProof task</p>
          <h3 className="mt-1 text-sm font-semibold text-white">{workspaceLabel(plan.workspace)}</h3>
        </div>
        <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] text-zinc-300">{completed.length}/{plan.steps.length}</span>
      </div>
      <p className="mb-3 text-xs leading-5 text-zinc-300">{plan.goal}</p>
      <ol className="space-y-3">
        {plan.steps.map((step, index) => <li key={`${step.title}-${index}`}><button type="button" onClick={() => toggle(index)} className="flex w-full items-start gap-2 text-left text-xs text-zinc-300"><CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${completed.includes(index) ? 'text-emerald-400' : 'text-zinc-600'}`} /><span><span className={completed.includes(index) ? 'line-through text-zinc-500' : 'font-medium text-white'}>{step.title}</span><span className="mt-0.5 block text-zinc-400">{step.instruction}{typeof step.timestamp === 'number' ? ` · ${Math.floor(step.timestamp / 60)}:${String(Math.floor(step.timestamp % 60)).padStart(2, '0')}` : ''}</span></span></button></li>)}
      </ol>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => setShowHint((value) => !value)} className="rounded-lg border border-amber-300/30 px-3 py-2 text-xs text-amber-100"><Lightbulb className="mr-1 inline h-3.5 w-3.5" />{showHint ? 'Hide hint' : 'Ask for a hint'}</button>
        {plan.quiz.length > 0 && <button type="button" onClick={() => setShowQuiz((value) => !value)} className="rounded-lg border border-sky-300/30 px-3 py-2 text-xs text-sky-100">Check understanding</button>}
        <button type="button" onClick={() => { setEvidenceStepIndex(completed.at(-1) ?? 0); setShowEvidence((value) => !value) }} className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-medium text-black"><ExternalLink className="mr-1 inline h-3.5 w-3.5" />Add evidence</button>
      </div>
      {showHint && <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/5 p-2 text-xs text-amber-100">Describe the next expected outcome in your own words, then ask the tutor for the smallest next step—not the full solution.</p>}
      {showQuiz && <div className="mt-3 space-y-2 rounded-lg border border-sky-300/20 bg-sky-300/5 p-3">{plan.quiz.map((item, index) => <details key={item.question} className="text-xs text-sky-100"><summary className="cursor-pointer">{index + 1}. {item.question}</summary><p className="mt-2 text-zinc-300">{item.answer}</p></details>)}</div>}
      {showEvidence && <div className="mt-3 space-y-2 rounded-xl border border-emerald-400/20 bg-black/20 p-3">
        <label className="block text-xs font-medium text-white">Evidence for</label>
        <select value={evidenceStepIndex} onChange={(event) => setEvidenceStepIndex(Number(event.target.value))} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white">
          {plan.steps.map((step, index) => <option key={`${step.title}-${index}`} value={index}>{index + 1}. {step.title}</option>)}
        </select>
        <p className="text-xs text-zinc-400"><span className="font-medium text-zinc-200">What counts as proof:</span> {plan.steps[evidenceStepIndex]?.evidence}</p>
        <input value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} placeholder="GitHub, workbook, document or demo link" className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white" />
        <textarea value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder={plan.steps[evidenceStepIndex]?.reflectionPrompt || 'Explain what you built, why you made those choices, and how you checked it.'} className="min-h-24 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white" />
        <button type="button" onClick={() => { const step = plan.steps[evidenceStepIndex]; void record('skillproof.evidence_submitted', { evidenceUrl, reflection, stepIndex: evidenceStepIndex, stepTitle: step?.title, expectedEvidence: step?.evidence }); }} className="rounded-lg border border-emerald-400/40 px-3 py-2 text-xs text-emerald-100">Save evidence</button>
      </div>}
      {saved && <p className="mt-2 text-xs text-emerald-300">{saved}</p>}
    </section>
  )
}
