import type { VideoRecord } from '@/lib/db/video-types'
import { extractGeminiText, extractJsonArray } from '@/lib/video/transcript'
import { logger } from '@/lib/logger'

export type SkillProofWorkspace = 'vscode' | 'excel' | 'general'

export type SkillProofTask = {
  title: string
  instruction: string
  evidence: string
  reflectionPrompt: string
  timestamp?: number
}

export type SkillProofTaskPlan = {
  workspace: SkillProofWorkspace
  goal: string
  steps: SkillProofTask[]
  quiz: { question: string; answer: string }[]
  generatedBy: 'gemini' | 'transcript-fallback'
}

function detectWorkspace(text: string): SkillProofWorkspace {
  const normalized = text.toLowerCase()
  if (/excel|spreadsheet|worksheet|balance sheet|pivot table|formula|cell [a-z]/.test(normalized)) return 'excel'
  if (/vs ?code|visual studio|typescript|javascript|python|repository|git|terminal|function|component|api/.test(normalized)) return 'vscode'
  return 'general'
}

function cleanTask(value: unknown, index: number): SkillProofTask | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Record<string, unknown>
  const title = String(item.title ?? '').trim()
  const instruction = String(item.instruction ?? '').trim()
  if (!title || !instruction) return null
  const timestamp = Number(item.timestamp)
  return {
    title: title.slice(0, 120),
    instruction: instruction.slice(0, 500),
    evidence: String(item.evidence ?? 'Add a link or short explanation showing this step is complete.').trim().slice(0, 300),
    reflectionPrompt: String(item.reflectionPrompt ?? 'Explain the decision you made, why it was appropriate, and one thing you would check next.').trim().slice(0, 400),
    ...(Number.isFinite(timestamp) && timestamp >= 0 ? { timestamp } : {}),
  }
}

function fallbackPlan(video: VideoRecord): SkillProofTaskPlan {
  const transcript = video.transcript ?? []
  const chapters = video.chapters ?? []
  const sourceText = transcript.map((segment) => segment.text).join(' ')
  const workspace = detectWorkspace(`${video.title} ${video.description} ${sourceText}`)
  const sourceSteps = chapters.length
    ? chapters.slice(0, 6).map((chapter) => ({
        title: chapter.title || 'Complete this section',
        instruction: chapter.summary || `Follow the tutorial section and reproduce the outcome in your ${workspace === 'excel' ? 'workbook' : workspace === 'vscode' ? 'project' : 'own workspace'}.`,
        evidence: 'Add a link, screenshot, or brief explanation of the result.',
        reflectionPrompt: 'What did you create in this section, and how does it support the final outcome?',
        timestamp: chapter.start,
      }))
    : transcript.filter((_, index) => index % Math.max(1, Math.ceil(transcript.length / 5)) === 0).slice(0, 5).map((segment, index) => ({
        title: `Build step ${index + 1}`,
        instruction: segment.text,
        evidence: 'Add a link, screenshot, or brief explanation of the result.',
        reflectionPrompt: 'What did you learn from this step, and how did you apply it?',
        timestamp: segment.start,
      }))

  return {
    workspace,
    goal: video.description || `Complete the practical outcome taught in ${video.title || 'this tutorial'}.`,
    steps: sourceSteps.length ? sourceSteps : [{ title: 'Explain the intended outcome', instruction: 'Use the tutor to identify the practical outcome of this video, then create it in your own workspace.', evidence: 'Write a short explanation and attach your work.', reflectionPrompt: 'What outcome are you trying to create, and what evidence would show that it works?' }],
    quiz: [{ question: 'What is the first outcome you need to create?', answer: 'Answer using the opening section of the tutorial.' }],
    generatedBy: 'transcript-fallback',
  }
}

export async function generateSkillProofTaskPlan(video: VideoRecord): Promise<SkillProofTaskPlan> {
  const fallback = fallbackPlan(video)
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || !(video.transcript?.length)) return fallback

  const transcript = video.transcript.slice(0, 180)
    .map((segment) => `[${Math.floor(segment.start)}s] ${segment.text}`)
    .join('\n')
  const prompt = `You are SkillProof Studio's practical learning designer. Convert this tutorial into a concise, evidence-based build plan. Infer whether the learner should use vscode, excel, or general. Do not assume a fixed template. Use only the tutorial content.\n\nReturn only JSON:\n{"workspace":"vscode|excel|general","goal":"...","steps":[{"title":"...","instruction":"specific action","evidence":"what proves it","timestamp":number}],"quiz":[{"question":"...","answer":"..."}]}\n\nRules: create 3-7 sequential tasks, include timestamps when supported, make each task independently checkable, and include 1-3 short comprehension checks.\n\nVideo title: ${video.title}\nTranscript:\n${transcript}`

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        model: process.env.GEMINI_VIDEO_MODEL || 'gemini-3.6-flash',
        input: [{ type: 'text', text: prompt }],
      }),
    })
    if (!response.ok) throw new Error(`Gemini returned ${response.status}`)
    const body = await response.json() as Record<string, unknown>
    const text = extractGeminiText(body)
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start < 0 || end < start) throw new Error('Gemini returned no task-plan JSON')
    const parsed = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>
    const workspace = parsed.workspace === 'excel' || parsed.workspace === 'vscode' ? parsed.workspace : 'general'
    const steps = Array.isArray(parsed.steps) ? parsed.steps.map(cleanTask).filter((step): step is SkillProofTask => Boolean(step)).slice(0, 7) : []
    if (!steps.length) throw new Error('Gemini task plan contained no valid steps')
    const quiz = Array.isArray(parsed.quiz) ? parsed.quiz.map((item) => {
      const record = item as Record<string, unknown>
      return { question: String(record.question ?? '').slice(0, 300), answer: String(record.answer ?? '').slice(0, 500) }
    }).filter((item) => item.question && item.answer).slice(0, 3) : []
    return { workspace, goal: String(parsed.goal ?? fallback.goal).slice(0, 500), steps, quiz, generatedBy: 'gemini' }
  } catch (error) {
    logger.warn('Gemini task-plan generation failed; using transcript fallback', {
      videoId: video.videoId,
      error: error instanceof Error ? error.message : String(error),
    })
    return fallback
  }
}
