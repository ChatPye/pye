import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { findVideoByExternalId } from '@/lib/db/video-repository'
import { generateSkillProofTaskPlan } from '@/lib/skillproof/task-plan'
import { extractGeminiText } from '@/lib/video/transcript'
import { recordLearningEvent } from '@/lib/db/learning-events'

function parseGitHubUrl(value: string): { owner: string; repo: string } | null {
  const match = value.trim().match(/^https?:\/\/(?:www\.)?github\.com\/([^/\s]+)\/([^/#?\s]+)/i)
  return match ? { owner: match[1], repo: match[2].replace(/\.git$/, '') } : null
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json() as { videoId?: string; repoUrl?: string }
    const videoId = body.videoId?.trim()
    const repoUrl = body.repoUrl?.trim()
    const target = repoUrl ? parseGitHubUrl(repoUrl) : null
    if (!videoId || !repoUrl || !target) return NextResponse.json({ success: false, error: 'Provide a public GitHub repository URL and video ID.' }, { status: 400 })
    const video = await findVideoByExternalId(videoId)
    if (!video || video.processingStatus !== 'complete') return NextResponse.json({ success: false, error: 'The tutorial must finish processing first.' }, { status: 409 })

    const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'SkillProof-Studio' }
    const treeResponse = await fetch(`https://api.github.com/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}/git/trees/HEAD?recursive=1`, { headers })
    if (!treeResponse.ok) return NextResponse.json({ success: false, error: 'We could not read that public repository.' }, { status: 422 })
    const tree = await treeResponse.json() as { tree?: Array<{ path?: string; type?: string }> }
    const files = (tree.tree ?? []).filter((item) => item.type === 'blob' && item.path).map((item) => item.path!).filter((path) => /(^README|\.(ts|tsx|js|jsx|py|ipynb|csv|xlsx|md)$)/i.test(path)).slice(0, 30)
    const readmePath = files.find((path) => /^readme/i.test(path))
    let readme = ''
    if (readmePath) {
      const contentResponse = await fetch(`https://api.github.com/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}/contents/${readmePath}`, { headers })
      if (contentResponse.ok) {
        const content = await contentResponse.json() as { content?: string; encoding?: string }
        if (content.encoding === 'base64' && content.content) readme = Buffer.from(content.content, 'base64').toString('utf8').slice(0, 6000)
      }
    }
    const plan = await generateSkillProofTaskPlan(video)
    const prompt = `You are SkillProof Studio's competency assessor. Assess a public repository only against the practical requirements in this tutorial plan. Do not claim certainty where there is no evidence. Return ONLY JSON: {"summary":"...","competencies":[{"name":"...","score":0,"confidence":"low|medium|high","evidence":"...","nextStep":"..."}]}.\n\nTutorial goal: ${plan.goal}\nRequired steps:\n${plan.steps.map((step, i) => `${i + 1}. ${step.title}: ${step.instruction}; evidence: ${step.evidence}`).join('\n')}\n\nRepository: ${repoUrl}\nFiles: ${files.join(', ')}\nREADME:\n${readme || 'No README available.'}`
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return NextResponse.json({ success: false, error: 'Gemini is not configured.' }, { status: 503 })
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify({ model: process.env.GEMINI_CHAT_MODEL || process.env.GEMINI_VIDEO_MODEL || 'gemini-3.6-flash', input: [{ type: 'text', text: prompt }] }) })
    if (!response.ok) throw new Error(`Gemini returned ${response.status}`)
    const output = extractGeminiText(await response.json() as Record<string, unknown>)
    const start = output.indexOf('{'); const end = output.lastIndexOf('}')
    if (start < 0 || end < start) throw new Error('Gemini returned no assessment JSON')
    const assessment = JSON.parse(output.slice(start, end + 1))
    await recordLearningEvent({ ownerClerkId: user.id, type: 'skillproof.repo_assessed', externalVideoId: videoId, payload: { repoUrl, assessment } })
    return NextResponse.json({ success: true, assessment, filesReviewed: files })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unable to assess repository.' }, { status: 500 })
  }
}
