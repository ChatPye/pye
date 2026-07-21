'use client'

import { useMemo, useState, useCallback, useRef, useEffect, ChangeEvent } from 'react'
import { createClip, createSnip, requestChapters, getChapters } from '@/lib/video-actions'
import { uploadVideoFile } from '@/lib/upload-video'
import { StudyPanel } from '@/components/workspace/StudyPanel'
import { SkillProofTaskPanel } from '@/components/workspace/SkillProofTaskPanel'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useUser, useClerk } from '@clerk/nextjs'
import {
  ArrowUpRight,
  Bookmark,
  BookOpen,
  Brain,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  ExternalLink,
  Info,
  LayoutDashboard,
  LogOut,
  LucideIcon,
  MessageSquare,
  Paperclip,
  Plus,
  FolderPlus,
  Scissors,
  Settings,
  Share2,
  Copy,
  SlidersHorizontal,
  Sparkles,
  Users,
  Video,
  Check,
  CheckCircle,
  HelpCircle,
  Zap,
  Bot,
  User,
  Send,
  MoreVertical,
  Trash2,
  Archive,
  X,
} from 'lucide-react'
import Background from '@/components/Background'
import WorkspaceHeader from '@/components/workspace/WorkspaceHeader'
import VideoPlayer from '@/components/workspace/VideoPlayer'
import LearningSetupExperience from '@/components/workspace/LearningSetupExperience'
import { getProcessingStatusLabel as formatProcessingLabel } from '@/lib/processing-labels'
const VideoDetails = dynamic(() => import('@/components/workspace/VideoDetails'), { ssr: false, loading: () => null })
const CommunityThreads = dynamic(() => import('@/components/workspace/CommunityThreads'), { ssr: false, loading: () => null })
const ResourcesList = dynamic(() => import('@/components/workspace/ResourcesList'), { ssr: false, loading: () => null })
const ClipModal = dynamic(() => import('@/components/workspace/ClipModal'), { ssr: false, loading: () => null })
const SnipOverlay = dynamic(() => import('@/components/workspace/SnipOverlay'), { ssr: false, loading: () => null })
const CodeHighlight = dynamic(() => import('@/components/workspace/CodeHighlight'), { ssr: false, loading: () => null })
import { useUnifiedRouting, type LoginSource } from '@/lib/routing'
import type { ProcessingStatus } from '@/data/models/VideoProcess'

type ChapterItem = {
  id: string
  title: string
  startTime: number
  duration: number
  description?: string
  isWatched?: boolean
}

type ResourceItem = {
  id: string
  title: string
  type: 'document' | 'link' | 'video' | 'image' | 'other'
  url: string
  description?: string
  size?: string
  isDownloaded?: boolean
  isBookmarked?: boolean
}

type ThreadItem = {
  id: string
  title: string
  author: {
    name: string
    avatar?: string
    isVerified?: boolean
  }
  content: string
  timestamp: string
  likes: number
  replies: number
  views: number
  tags: string[]
  isPinned?: boolean
  isLocked?: boolean
}

interface WorkspaceShellProps {
  videoId?: string
  videoTitle?: string
  source?: 'youtube' | 'upload'
  uploadedName?: string
  processingStatus?: 'queued' | 'pending' | 'extracting' | 'transcribing' | 'embedding' | 'complete' | 'failed'
  processingProgress?: number
  processingError?: string | null
  onRetryProcessing?: () => void
  videoData?: {
    title: string
    channel: string
    description: string
    duration: number
    views?: number
    likes?: number
    publishedAt: string
    thumbnail: string
    tags?: string[]
  }
  chapters?: ChapterItem[]
  resources?: ResourceItem[]
  threads?: ThreadItem[]
  transcript?: Array<{ text: string; start: number; duration: number }>
  embeddings?: Array<{ text: string; start: number; duration: number; embedding: number[] }>
  summary?: string
  keyPoints?: string[]
}

interface RecentItem {
  id: string
  title: string
  updated: string
  source?: 'youtube' | 'upload'
}

interface SidebarPod {
  id: string
  title: string
  badge?: 'PRO' | 'TEAM'
  memberCount?: number
  updated?: string
}

interface TabDescriptor {
  id: 'chat' | 'guide' | 'notes'
  label: string
  icon: LucideIcon
  description: string
  comingSoon?: boolean
}

interface PromptTemplate {
  id: string
  label: string
  description: string
}

interface ChatMessage {
  id: string
  role: 'assistant' | 'user' | 'status'
  content: string
  timestamp: string
  searchResults?: Array<{
    text: string
    start: number
    duration: number
    score: number
  }>
}

type PodSummary = {
  id: string
  title: string
  role: 'member' | 'owner'
  updated?: string
  memberCount?: number
}

type SidebarMenuItem = {
  id: string
  label: string
  icon: LucideIcon
  href?: string
  badge?: string
  comingSoon?: boolean
  onClick?: () => void
}

interface SidebarState {
  joinedPods: PodSummary[]
  ownedPods: PodSummary[]
  recentVideos: RecentItem[]
  menu: SidebarMenuItem[]
}

const tabs: TabDescriptor[] = [
  { id: 'chat', label: 'Chat', icon: MessageSquare, description: 'Ask questions, get insight, explore context.' },
  { id: 'notes', label: 'Notes', icon: Video, description: 'Capture highlights and export your drafts.' },
]

const promptTemplates: PromptTemplate[] = [
  { id: 'briefing', label: 'Executive briefing', description: 'Summarise the key decisions and risks in this segment.' },
  { id: 'primer', label: 'Explain for beginners', description: "Explain this concept as if I'm new to the topic." },
  { id: 'next-steps', label: 'Next steps', description: 'Outline what I should practice or research after this video.' }
]

const placeholderMessages: ChatMessage[] = [
  {
    id: 'assistant-1',
    role: 'assistant',
    content: 'Hi! I am your AI tutor. I will help you understand this video content, answer questions, and provide study materials. What would you like to know?',
    timestamp: 'Just now',
  },
]

function getProcessingStatusLabel(status: ProcessingStatus, progress?: number): string {
  return formatProcessingLabel(status, progress)
}

const cx = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ')

// Dummy fetchPlanStatus for now (returns sample tier info)
function usePlanStatus() {
  // TODO: Wire to backend real API/Clerk integration
  const [data, setData] = useState({
    plan: 'freemium',
    invitesLimit: 2,
    invitesUsed: 1,
    seats: null,
    seatsUsed: null,
    showUpgrade: true,
  })
  useEffect(() => {
    // Fetch plan data for the user
    // setData(...)
  }, [])
  return data
}

export default function WorkspaceShell({
  videoId,
  videoTitle,
  source = 'youtube',
  uploadedName,
  processingStatus,
  processingProgress = 0,
  processingError,
  onRetryProcessing,
  videoData,
  chapters = [],
  resources = [],
  threads = [],
  transcript = [],
  embeddings = [],
  summary,
  keyPoints = [],
}: WorkspaceShellProps) {
  const { isSignedIn, isLoaded, user } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const { redirectToWorkspace, redirectToSignIn } = useUnifiedRouting()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabDescriptor['id']>('chat')
  const [currentTime, setCurrentTime] = useState(0)
  const [composerValue, setComposerValue] = useState('')
  const [isInviteModalOpen, setInviteModalOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [messageToasts, setMessageToasts] = useState<Record<string, string>>({})
  const [videoPlayerRef, setVideoPlayerRef] = useState<HTMLVideoElement | null>(null)
  const [actionStates, setActionStates] = useState({
    joinPod: { loading: false, success: false },
    bookmark: { loading: false, success: false },
    snip: { loading: false, success: false },
    clip: { loading: false, success: false },
    share: { loading: false, success: false }
  })
  const [chaptersState, setChaptersState] = useState(chapters || [])
  const [actionToast, setActionToast] = useState<string>('')
  const [snipMode, setSnipMode] = useState(false)
  const [clipModalOpen, setClipModalOpen] = useState(false)
  const [videoDuration, setVideoDuration] = useState(0)
  const [apiRecentVideos, setApiRecentVideos] = useState<RecentItem[]>([])
  const [apiPods, setApiPods] = useState<PodSummary[]>([])
  const [chatSessionId, setChatSessionId] = useState('pending')
  const chatSavedRef = useRef(false)

  useEffect(() => {
    if (!videoId || typeof window === 'undefined') return
    const key = `chatpye_session_${videoId}`
    const stored = localStorage.getItem(key)
    if (stored) {
      setChatSessionId(stored)
    } else {
      const id = `session_${Date.now()}`
      localStorage.setItem(key, id)
      setChatSessionId(id)
    }
  }, [videoId])
  
  const showActionToast = (t: string) => {
    setActionToast(t)
    setTimeout(() => setActionToast(''), 2500)
  }
  const showMessageToast = (messageId: string, text: string) => {
    setMessageToasts(prev => ({ ...prev, [messageId]: text }))
    setTimeout(() => {
      setMessageToasts(prev => {
        const next = { ...prev }
        delete next[messageId]
        return next
      })
    }, 2000)
  }

  // Load recent videos from Aurora for sidebar persistence
  useEffect(() => {
    if (!isSignedIn) return
    let ignore = false
    ;(async () => {
      try {
        const res = await fetch('/api/user/videos?limit=15', { credentials: 'include' })
        if (!res.ok || ignore) return
        const data = await res.json()
        if (data.success && Array.isArray(data.videos)) {
          setApiRecentVideos(
            data.videos.map((v: { id: string; title: string; updated: string; source?: string }) => ({
              id: v.id,
              title: v.title,
              updated: v.updated,
              source: v.source === 'upload' ? 'upload' : 'youtube',
            }))
          )
        }
      } catch {
        /* ignore */
      }
    })()
    return () => {
      ignore = true
    }
  }, [isSignedIn, videoId, processingStatus])

  // Load pods from Aurora
  useEffect(() => {
    if (!isSignedIn || !user?.id) return
    let ignore = false
    ;(async () => {
      try {
        const res = await fetch('/api/pods', { credentials: 'include' })
        if (!res.ok || ignore) return
        const data = await res.json()
        if (data.success && Array.isArray(data.pods)) {
          setApiPods(
            data.pods.map((p: { id: string; title: string; ownerId: string; memberIds?: string[] }) => ({
              id: p.id,
              title: p.title,
              role: p.ownerId === user.id ? ('owner' as const) : ('member' as const),
              memberCount: p.memberIds?.length,
            }))
          )
        }
      } catch {
        /* ignore */
      }
    })()
    return () => {
      ignore = true
    }
  }, [isSignedIn, user?.id, videoId])

  // Load chat history on mount
  useEffect(() => {
    if (!videoId || !isSignedIn || chatSessionId === 'pending') return
    let ignore = false
    
    const loadChatHistory = async () => {
      try {
        const res = await fetch(`/api/chat-history?videoId=${encodeURIComponent(videoId)}&sessionId=${encodeURIComponent(chatSessionId)}`, { credentials: 'include' })
        if (!res.ok || ignore) return
        const data = await res.json()
        if (data.success && data.chatHistory && !data.chatHistory.isNew && data.chatHistory.messages) {
          const resolvedSession = data.chatHistory.sessionId as string | undefined
          if (resolvedSession && resolvedSession !== chatSessionId) {
            localStorage.setItem(`chatpye_session_${videoId}`, resolvedSession)
            setChatSessionId(resolvedSession)
          }
          setMessages(data.chatHistory.messages.map((m: { id?: string; type?: string; content: string; timestamp?: string; createdAt?: string }) => ({
            id: m.id || `msg_${Date.now()}_${Math.random()}`,
            role: m.type === 'ai' ? 'assistant' : 'user',
            content: m.content,
            timestamp: m.timestamp || new Date(m.createdAt || Date.now()).toLocaleTimeString(),
          })))
          chatSavedRef.current = true
        }
      } catch (error) {
        console.error('Failed to load chat history:', error)
      }
    }
    
    loadChatHistory()
    return () => { ignore = true }
  }, [videoId, isSignedIn, chatSessionId])

  // Save chat history when messages change (debounced)
  useEffect(() => {
    if (!videoId || !isSignedIn || chatSessionId === 'pending' || messages.length === 0) return
    
    const timeoutId = setTimeout(async () => {
      try {
        const formattedMessages = messages.map(m => ({
          id: m.id,
          type: m.role === 'assistant' ? 'ai' : 'user',
          content: m.content,
          timestamp: new Date(),
          metadata: {
            videoTimestamp: currentTime,
          },
        }))
        
        await fetch('/api/chat-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId,
            sessionId: chatSessionId,
            messages: formattedMessages,
            videoMetadata: videoData ? {
              title: videoData.title,
              channelName: videoData.channel,
              thumbnail: videoData.thumbnail,
              duration: videoData.duration,
            } : {},
          }),
        })
        chatSavedRef.current = true
      } catch (error) {
        console.error('Failed to save chat history:', error)
      }
    }, 2000) // Debounce: save 2 seconds after last message
    
    return () => clearTimeout(timeoutId)
  }, [messages, videoId, isSignedIn, chatSessionId, currentTime, videoData])
  const addAssistantMessage = useCallback(
    (content: string, extra?: Partial<ChatMessage>) => {
      const now = new Date()
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
          role: 'assistant',
          content,
          timestamp: now.toLocaleTimeString(),
          ...extra,
        },
      ])
    },
    [setMessages]
  )
  const prevProcessingStatusRef = useRef<ProcessingStatus | undefined>(processingStatus)

  const derivedTitle = videoTitle || uploadedName || videoData?.title
  const [oembedMeta, setOembedMeta] = useState<{ title?: string; author?: string; thumbnail?: string } | null>(null)
  const [aiMeta, setAiMeta] = useState<{ title?: string; description?: string } | null>(null)
  const showVideoPage = Boolean(videoId)
  const displayResources = useMemo(() => {
    if (!resources || resources.length === 0) return [] as typeof resources
    return resources
  }, [resources])
  const displayThreads = useMemo(() => {
    if (!threads || threads.length === 0) return [] as typeof threads
    return threads
  }, [threads])
  const threadsMemo = useMemo(() => {
    if (displayThreads.length === 0) return [] as typeof displayThreads
    // Keep most recent 50 by assuming input order is chronological; otherwise slice last 50
    return displayThreads.slice(Math.max(0, displayThreads.length - 50))
  }, [displayThreads])
  const isProcessed = processingStatus === 'complete'
  const hasAIMetadata = Boolean(summary && summary.length > 0) || (keyPoints && keyPoints.length > 0)

  const planStatus = usePlanStatus()

  // Dev-friendly chapters loader
  useEffect(() => {
    const loadChapters = async () => {
      if (!videoId) return
      try {
        if (!chapters || chapters.length === 0) {
          await requestChapters(videoId)
        }
        const data = await getChapters(videoId)
        if (Array.isArray(data?.chapters)) {
          // Map API shape to local ChapterItem if needed
          const mapped = data.chapters.map((c: any, idx: number) => ({
            id: `ch_${idx}_${c.start}`,
            title: c.title ?? `Chapter ${idx + 1}`,
            startTime: Number(c.start) || 0,
            duration: 0,
            description: c.summary,
          }))
          setChaptersState(mapped)
        }
      } catch (_e) {
        // ignore in dev
      }
    }
    loadChapters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])

  useEffect(() => {
    if (!videoId || source !== 'youtube') return
    if (videoData?.title) return
    let ignore = false
    ;(async () => {
      try {
        const res = await fetch(`/api/oembed?videoId=${encodeURIComponent(videoId)}`)
        if (!res.ok) return
        const data = await res.json()
        if (!ignore) setOembedMeta({ title: data.title, author: data.author, thumbnail: data.thumbnail })
      } catch {}
    })()
    return () => {
      ignore = true
    }
  }, [videoId, source, videoData?.title])

  useEffect(() => {
    if (!videoId) return
    // Don't reset messages here - let chat history loading handle it
    prevProcessingStatusRef.current = processingStatus
  }, [videoId])

  useEffect(() => {
    const previousStatus = prevProcessingStatusRef.current

    if (!processingStatus) {
      prevProcessingStatusRef.current = undefined
      return
    }

    if (processingStatus === 'complete' && previousStatus !== 'complete') {
      addAssistantMessage('Great news! The video is processed and ready for questions. Ask me anything about it!')
      fetch('/api/competencies/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      }).catch(() => null)
    }

    if (processingStatus === 'failed' && previousStatus !== 'failed') {
      addAssistantMessage("I couldn't finish processing this video. Please try again or choose another one.")
    }

    prevProcessingStatusRef.current = processingStatus
  }, [processingStatus, addAssistantMessage, videoId])

  // Generate AI metadata for uploads once processing is complete
  useEffect(() => {
    if (!videoId) return
    if (source !== 'upload') return
    if (aiMeta?.title && aiMeta?.description) return
    if (processingStatus !== 'complete') return
    let ignore = false
    ;(async () => {
      try {
        const res = await fetch(`/api/video/${encodeURIComponent(videoId)}/metadata`)
        if (!res.ok) return
        const data = await res.json()
        if (!ignore) setAiMeta({ title: data.title, description: data.description })
      } catch {}
    })()
    return () => {
      ignore = true
    }
  }, [videoId, source, processingStatus, aiMeta?.title, aiMeta?.description])

  const extractRecentVideosFromMetadata = (value: unknown): RecentItem[] => {
    if (!Array.isArray(value)) return []
    return value
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null
        const obj = entry as Record<string, unknown>
        const id = typeof obj.id === 'string' ? obj.id : undefined
        const title = typeof obj.title === 'string' ? obj.title : undefined
        const updated = typeof obj.updated === 'string' ? obj.updated : 'Recently visited'
        if (!id || !title) return null
        return { id, title, updated }
      })
      .filter(Boolean) as RecentItem[]
  }

  const extractPodsFromMetadata = (value: unknown): PodSummary[] => {
    if (!Array.isArray(value)) return []
    return value
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null
        const obj = entry as Record<string, unknown>
        const id = typeof obj.id === 'string' ? obj.id : undefined
        const title = typeof obj.title === 'string' ? obj.title : undefined
        const role = obj.role === 'owner' ? 'owner' : obj.role === 'member' ? 'member' : 'member'
        if (!id || !title) return null
        return {
          id,
          title,
          role,
          updated: typeof obj.updated === 'string' ? obj.updated : undefined,
          memberCount: typeof obj.memberCount === 'number' ? obj.memberCount : undefined,
        } satisfies PodSummary
      })
      .filter(Boolean) as PodSummary[]
  }

  const sidebarData = useMemo<SidebarState>(() => {
    const joined: PodSummary[] = []
    const owned: PodSummary[] = []

    const metadataPods = apiPods.length
      ? apiPods
      : extractPodsFromMetadata(user?.publicMetadata?.pods)
    metadataPods.forEach((pod) => {
      if (pod.role === 'owner') {
        owned.push(pod)
      } else {
        joined.push(pod)
      }
    })

    const recentVideos = apiRecentVideos.length
      ? apiRecentVideos
      : extractRecentVideosFromMetadata(user?.publicMetadata?.recentVideos)

    const menu: SidebarMenuItem[] = [
      {
        id: 'new',
        label: 'New',
        icon: Plus,
        onClick: () => router.push('/workspace'),
      },
      {
        id: 'extension',
        label: 'YT Extension',
        icon: ExternalLink,
        href: '/extension',
      },
      {
        id: 'competencies',
        label: 'Competencies',
        icon: LayoutDashboard,
        href: '/workspace/competencies',
      },
      {
        id: 'courses',
        label: 'My courses',
        icon: BookOpen,
        href: '/workspace/courses',
      },
      {
        id: 'agents',
        label: 'Agents',
        icon: Sparkles,
        href: '/workspace/agents',
        comingSoon: true,
      },
    ]

    return { joinedPods: joined, ownedPods: owned, recentVideos, menu }
  }, [user?.publicMetadata, user?.id, router, apiRecentVideos, apiPods])

  const userDisplayName = user?.firstName ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}` : user?.username || 'Workspace member'
  const subscriptionTier = (user?.publicMetadata?.subscription as string | undefined) ?? 'freemium'

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev)
  }, [])

  const handleCollapseSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev)
  }, [])

  const handleResourceClick = useCallback((resource: ResourceItem) => {
    if (typeof window !== 'undefined') {
      window.open(resource.url, '_blank', 'noopener')
    }
  }, [])

  const handleInvite = useCallback(() => {
    setInviteModalOpen(true)
  }, [])

  const handleCreatePod = useCallback(() => {
    router.push('/workspace/pods?create=1')
  }, [router])

  const handleSignOut = useCallback(async () => {
    await signOut()
    redirectToSignIn({ source: 'direct' })
  }, [signOut, redirectToSignIn])

  const upgradeAvailable = subscriptionTier === 'freemium'

  const handleUpgrade = useCallback(() => {
    if (upgradeAvailable) {
      router.push('/workspace/upgrade')
    }
  }, [upgradeAvailable, router])

  const handleJoinPod = useCallback(async (podId?: string, isPublic?: boolean) => {
    if (!podId) {
      // Show pod selection or redirect
      router.push('/pods')
      return
    }
    setActionStates(prev => ({ ...prev, joinPod: { loading: true, success: false } }))
    try {
      if (isPublic) {
        // Auto-join public pods
        const response = await fetch(`/api/pods/${podId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        const data = await response.json()
        if (data.success) {
          showActionToast('Joined pod successfully')
          setActionStates(prev => ({ ...prev, joinPod: { loading: false, success: true } }))
          setTimeout(() => {
            setActionStates(prev => ({ ...prev, joinPod: { loading: false, success: false } }))
          }, 2000)
        } else {
          throw new Error(data.error || 'Join failed')
        }
      } else {
        showActionToast('This pod is invite-only — ask the owner for an invite link')
        setActionStates(prev => ({ ...prev, joinPod: { loading: false, success: false } }))
      }
    } catch (error) {
      console.error('Error joining pod:', error)
      showActionToast('Join request failed')
      setActionStates(prev => ({ ...prev, joinPod: { loading: false, success: false } }))
    }
  }, [router])

  const handleBookmark = useCallback(async () => {
    if (!videoId) return
    setActionStates(prev => ({ ...prev, bookmark: { loading: true, success: false } }))
    try {
      const response = await fetch('/api/actions/bookmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, action: 'bookmark' })
      })
      const data = await response.json()
      if (data.success || response.ok) {
        showActionToast('Video bookmarked')
        setActionStates(prev => ({ ...prev, bookmark: { loading: false, success: true } }))
        setTimeout(() => {
          setActionStates(prev => ({ ...prev, bookmark: { loading: false, success: false } }))
        }, 2000)
      } else {
        showActionToast(data.error || 'Bookmark failed')
        setActionStates(prev => ({ ...prev, bookmark: { loading: false, success: false } }))
      }
    } catch (error) {
      console.error('Error bookmarking video:', error)
      showActionToast('Bookmark failed')
      setActionStates(prev => ({ ...prev, bookmark: { loading: false, success: false } }))
    }
  }, [videoId])

  const handleSnip = useCallback(async () => {
    if (!videoId) return
    // Activate snip overlay mode
    setSnipMode(true)
    showActionToast('Select area to copy text or code on screen')
  }, [videoId])

  const handleSnipComplete = useCallback(async (text: string) => {
    if (!videoId) return
    setActionStates(prev => ({ ...prev, snip: { loading: true, success: false } }))
    try {
      // Detect code language if possible
      const codeLang = text.includes('function') || text.includes('const') || text.includes('class') 
        ? 'javascript' 
        : undefined

      const result = await createSnip({ text, codeLang, source: `video:${videoId}` })
      if (result?.snip?.id) {
        showActionToast('Snip saved and copied to clipboard')
        setActionStates(prev => ({ ...prev, snip: { loading: false, success: true } }))
        setTimeout(() => {
          setActionStates(prev => ({ ...prev, snip: { loading: false, success: false } }))
          setSnipMode(false)
        }, 2000)
      } else {
        throw new Error('Snip creation failed')
      }
    } catch (error) {
      console.error('Error creating snip:', error)
      showActionToast('Snip failed')
      setActionStates(prev => ({ ...prev, snip: { loading: false, success: false } }))
    }
  }, [videoId])

  const handleClip = useCallback(() => {
    if (!videoId) return
    // Open clip modal for time selection
    setClipModalOpen(true)
  }, [videoId])

  const handleCreateClip = useCallback(async (start: number, duration: number, notes?: string) => {
    if (!videoId) return
    setActionStates(prev => ({ ...prev, clip: { loading: true, success: false } }))
    try {
      const result = await createClip(videoId, { start, duration, notes })
      if (result?.clip?.id) {
        showActionToast('Timestamp clip saved to your learning evidence')
        setActionStates(prev => ({ ...prev, clip: { loading: false, success: true } }))
        setTimeout(() => {
          setActionStates(prev => ({ ...prev, clip: { loading: false, success: false } }))
        }, 2000)
      } else {
        throw new Error('Clip creation failed')
      }
    } catch (error) {
      console.error('Error creating clip:', error)
      showActionToast('Clip failed')
      setActionStates(prev => ({ ...prev, clip: { loading: false, success: false } }))
      throw error
    }
  }, [videoId])

  const handleShare = useCallback(async () => {
    if (!videoId) return
    setActionStates(prev => ({ ...prev, share: { loading: true, success: false } }))
    try {
      const response = await fetch('/api/video/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, access: 'public' })
      })
      const data = await response.json()
      if (data.success && data.shareUrl) {
        // Copy to clipboard
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(data.shareUrl)
          showActionToast('Share link copied to clipboard')
        } else {
          showActionToast(`Share link: ${data.shareUrl}`)
        }
        setActionStates(prev => ({ ...prev, share: { loading: false, success: true } }))
        setTimeout(() => {
          setActionStates(prev => ({ ...prev, share: { loading: false, success: false } }))
        }, 2000)
      } else if (response.status === 402) {
        showActionToast('Share limit reached — upgrade required')
        setActionStates(prev => ({ ...prev, share: { loading: false, success: false } }))
      } else {
        throw new Error(data.error || 'Share failed')
      }
    } catch (error) {
      console.error('Error sharing video:', error)
      showActionToast('Share failed')
      setActionStates(prev => ({ ...prev, share: { loading: false, success: false } }))
    }
  }, [videoId])

  // Admin helpers
  const handleAddToPod = useCallback(async () => {
    if (!videoId) return
    try {
      // For now, route to a simple pod setup/create flow
      router.push(`/dashboard?setup=pod&videoId=${encodeURIComponent(videoId)}`)
    } catch (e) {
      console.error('Add to pod error', e)
    }
  }, [router, videoId])

  const handleViewAnalytics = useCallback(() => {
    if (!videoId) return
    // Navigate to public video analytics page
    router.push(`/video/${encodeURIComponent(videoId)}/analytics`)
  }, [router, videoId])

  const handleNextVideo = useCallback(async () => {
    if (!videoId) return
    
    try {
      // Find pod containing this video
      const podsRes = await fetch('/api/pods')
      if (!podsRes.ok) {
        showActionToast('Unable to find next video')
        return
      }
      const podsData = await podsRes.json()
      const pods = podsData.pods || []
      
      // Find the pod containing this video and get next video
      for (const pod of pods) {
        const videos = pod.videos || []
        const currentIndex = videos.indexOf(videoId)
        if (currentIndex >= 0 && currentIndex < videos.length - 1) {
          const nextVideoId = videos[currentIndex + 1]
          router.push(`/workspace/${encodeURIComponent(nextVideoId)}?source=${source}`)
          return
        }
      }
      
      showActionToast('No next video in current pod')
    } catch (error) {
      console.error('Next video error:', error)
      showActionToast('Failed to find next video')
    }
  }, [router, videoId, source, showActionToast])

  const classifyQuery = useCallback((query: string): { intent: string; tool?: string; confidence: number; isOnTopic: boolean } => {
    const lowerQuery = query.toLowerCase()
    
    // Video-specific keywords that indicate on-topic queries
    const videoKeywords = ['video', 'content', 'discuss', 'minute', 'second', 'time', 'at', 'find', 'search', 'where', 'when', 'clip', 'extract', 'cut', 'segment', 'transcript', 'summary', 'summarize', 'overview', 'main points', 'explain', 'how', 'what', 'why']
    const hasVideoKeywords = videoKeywords.some(keyword => lowerQuery.includes(keyword))
    
    // Video segment/time-based queries
    if (lowerQuery.includes('at') && (lowerQuery.includes('minute') || lowerQuery.includes('second') || lowerQuery.includes('time'))) {
      return { intent: 'video_segment', tool: 'searchTranscript', confidence: 0.9, isOnTopic: true }
    }
    
    // Specific content search
    if (lowerQuery.includes('find') || lowerQuery.includes('search') || lowerQuery.includes('where') || lowerQuery.includes('when')) {
      return { intent: 'content_search', tool: 'searchTranscript', confidence: 0.8, isOnTopic: true }
    }
    
    // Summary requests
    if (lowerQuery.includes('summary') || lowerQuery.includes('summarize') || lowerQuery.includes('overview') || lowerQuery.includes('main points')) {
      return { intent: 'summary', tool: 'summarize', confidence: 0.9, isOnTopic: true }
    }
    
    // Explanation requests
    if (lowerQuery.includes('explain') || lowerQuery.includes('how') || lowerQuery.includes('what') || lowerQuery.includes('why')) {
      return { intent: 'explanation', tool: 'searchTranscript', confidence: 0.7, isOnTopic: hasVideoKeywords }
    }
    
    // Clip extraction
    if (lowerQuery.includes('clip') || lowerQuery.includes('extract') || lowerQuery.includes('cut') || lowerQuery.includes('segment')) {
      return { intent: 'clip_extraction', tool: 'extractClip', confidence: 0.8, isOnTopic: true }
    }
    
    // General video content
    if (lowerQuery.includes('video') || lowerQuery.includes('content') || lowerQuery.includes('discuss')) {
      return { intent: 'general_content', tool: 'searchTranscript', confidence: 0.6, isOnTopic: true }
    }
    
    // Check if query is about general topics that might be in resources
    const generalTopics = ['react', 'javascript', 'python', 'ai', 'machine learning', 'programming', 'tutorial', 'learning', 'education', 'technology', 'coding', 'development', 'web', 'app', 'software']
    const hasGeneralTopics = generalTopics.some(topic => lowerQuery.includes(topic))
    
    return { 
      intent: hasGeneralTopics ? 'general_topic' : 'general_chat', 
      confidence: 0.3, 
      isOnTopic: hasVideoKeywords || hasGeneralTopics 
    }
  }, [])

  const handleIntelligentQuery = useCallback(async (query: string) => {
    if (!videoId || isSearching) return

    if (processingStatus !== 'complete') {
      if (processingStatus === 'failed') {
        addAssistantMessage("I'm unable to answer questions because video processing failed. Please try processing the video again or use another link.")
      } else {
        addAssistantMessage(
          `You can watch the video now. Chat is still preparing (${processingProgress || 0}%) — try again shortly.`
        )
      }
      return
    }

    const classification = classifyQuery(query)
    console.log('Query classified:', classification)

    setIsSearching(true)
    try {
      let response
      let data

      if (classification.tool === 'searchTranscript') {
        response = await fetch('/api/mcp/tools', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId, tool: 'searchTranscript', query })
        })
        data = await response.json()

        if (data.success && data.results?.length > 0) {
          const results = data.results.slice(0, 3).map((r: any) => ({
            text: r.text,
            start: r.start,
            duration: r.duration,
            score: r.score
          }))

          addAssistantMessage('Found relevant content:', {
            searchResults: results.map((r: any) => ({
              text: r.text,
              start: r.start,
              duration: r.duration,
              score: r.score
            }))
          })
        } else {
          addAssistantMessage('No relevant content found for that query. Try rephrasing or being more specific.')
        }
      } else if (classification.tool === 'summarize') {
        // Route summary-like requests to RAG for better conceptual answers
        response = await fetch('/api/rag/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId, query: 'summarize' })
        })
        data = await response.json()

        if (data.success) {
          if (data.results?.length) {
            // Build a summary-like message using top results
            const bullets = data.results.map((r: any) => `- [${Math.floor(r.start/60)}:${String(Math.floor(r.start%60)).padStart(2,'0')}] ${r.text}`).join('\n')
            addAssistantMessage(`Here are key moments that summarize the video:\n${bullets}`)
          } else if (data.summary || data.keyPoints) {
            let content = `**Summary:**\n${data.summary || ''}\n\n**Key Points:**\n`
            ;(data.keyPoints || []).forEach((point: string, i: number) => {
              content += `${i + 1}. ${point}\n`
            })
            addAssistantMessage(content)
          } else {
            addAssistantMessage('Summary is not available yet. Try asking about a specific topic or timestamp.')
          }
        } else {
          addAssistantMessage('Unable to summarize at the moment. Please try again shortly.')
        }
      } else if (classification.tool === 'extractClip') {
        const timeMatch = query.match(/(\d+):(\d+)/)
        const start = timeMatch ? parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]) : currentTime

        response = await fetch('/api/mcp/tools', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId, tool: 'extractClip', start, duration: 30 })
        })
        data = await response.json()

        if (data.success) {
          addAssistantMessage(`Clip extraction requested for ${Math.floor(start / 60)}:${String(start % 60).padStart(2, '0')}. This feature will be available soon!`)
        }
      } else {
        if (!classification.isOnTopic) {
          addAssistantMessage(`I understand you're asking about "${query}". This question seems to be about general topics rather than the specific video content. I can help you with video-specific questions like "What does the video say about [topic]?" or "Summarize the main points." For general questions, you might find relevant resources in the Resources section below.`)
        } else {
          const relevantResources = displayResources.filter(resource =>
            resource.title.toLowerCase().includes(query.toLowerCase()) ||
            resource.description?.toLowerCase().includes(query.toLowerCase())
          )

          if (relevantResources.length > 0) {
            let content = `I found some relevant resources for "${query}":\n\n`
            relevantResources.forEach((resource, i) => {
              content += `${i + 1}. **${resource.title}**\n   ${resource.description || 'No description available'}\n   [View Resource](${resource.url})\n\n`
            })

            addAssistantMessage(content)
          } else {
            addAssistantMessage(`I understand you're asking about "${query}". I can help you search through the video content, provide summaries, or extract specific segments. Try asking something like "What does the video say about [topic]?" or "Summarize the main points."`)
          }
        }
      }
    } catch (error) {
      console.error('Error processing query:', error)
      addAssistantMessage('Sorry, I encountered an error processing your request. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }, [
    videoId,
    isSearching,
    processingStatus,
    addAssistantMessage,
    classifyQuery,
    currentTime,
    displayResources,
  ])

  const trimmedTranscriptForChat = useMemo(() => {
    if (!transcript || transcript.length === 0) return [] as typeof transcript
    // Limit transcript segments to reduce payload size
    return transcript.slice(0, 300)
  }, [transcript])

  const handleStreamChat = useCallback(async (question: string) => {
    if (!videoId) {
      showActionToast('Select or load a video before asking a question')
      return
    }

    const msgId = `assistant-stream-${Date.now()}`

    try {
      setIsStreaming(true)
      setStreamingMessageId(msgId)
      setMessages((prev) => [
        ...prev,
        { id: msgId, role: 'assistant', content: '', timestamp: new Date().toLocaleTimeString() },
      ])

      const payload: Record<string, unknown> = { question, videoId }
      if (trimmedTranscriptForChat.length > 0) {
        payload.transcript = trimmedTranscriptForChat
      }
      if (summary) {
        payload.summary = summary
      }
      if (keyPoints && keyPoints.length > 0) {
        payload.keyPoints = keyPoints
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok || !res.body) {
        const errorBody = await res.json().catch(() => null)
        const errorMessage = errorBody?.error || 'Chat is temporarily unavailable'
        throw new Error(errorMessage)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // Parse SSE lines
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''
        for (const chunk of lines) {
          if (!chunk.startsWith('data: ')) continue
          const dataPayload = chunk.slice(6)
          try {
            const { text, done: isDone } = JSON.parse(dataPayload)
            if (text) {
              setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, content: (m.content || '') + text } : m)))
            }
            if (isDone) {
              setStreamingMessageId(null)
              setIsStreaming(false)
            }
          } catch {
            // ignore malformed chunk
          }
        }
      }

      setIsStreaming(false)
      setStreamingMessageId(null)
    } catch (error) {
      console.error('Streaming chat error', error)
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, content: 'Sorry, I could not generate a response. Please try again.' } : m)))
      showMessageToast(msgId, error instanceof Error ? error.message : 'Chat failed')
      setIsStreaming(false)
      setStreamingMessageId(null)
    }
  }, [videoId, trimmedTranscriptForChat, summary, keyPoints, showActionToast, showMessageToast])

  const handleSearchTranscript = useCallback(async (query: string) => {
    // Insert into input instead of auto-sending
    setComposerValue(query)
  }, [])

  const seekToTime = useCallback((timeInSeconds: number) => {
    // Update state immediately for UI feedback
    setCurrentTime(timeInSeconds)
    
    if (source === 'youtube') {
      // For YouTube iframes, use postMessage API
      const iframe = document.querySelector(`iframe#youtube-${videoId}`) as HTMLIFrameElement
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: 'seekTo',
            args: [Math.floor(timeInSeconds), true]
          }),
          'https://www.youtube.com'
        )
      }
    } else if (videoPlayerRef) {
      // For custom videos, direct currentTime assignment
      videoPlayerRef.currentTime = timeInSeconds
    }
  }, [videoPlayerRef, source, videoId])

  useEffect(() => {
    if (chapters && chapters.length > 0) {
      setChaptersState(chapters)
    }
  }, [chapters])

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <Background />

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="h-full w-72 max-w-full bg-black/90">
            <WorkspaceSidebar
              collapsed={false}
              onCollapse={handleCollapseSidebar}
              onClose={() => setSidebarOpen(false)}
              isMobile
              state={sidebarData}
              isSignedIn={isSignedIn}
            />
          </div>
          <button
            type="button"
            className="flex-1 bg-black/40"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      )}

      <div className="relative z-10 flex min-h-screen flex-col">
        <WorkspaceHeader
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
          onInvite={handleInvite}
          onCreatePod={handleCreatePod}
          onSignOut={handleSignOut}
          userName={userDisplayName}
          subscriptionTier={subscriptionTier}
          upgradeAvailable={upgradeAvailable}
        />

        {showVideoPage && !isProcessed && (
          processingStatus === 'failed' || processingError ? (
            <div className="border-b border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-200">
              <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3">
                <p className="truncate">{processingError || 'Processing failed'}</p>
                {onRetryProcessing && (
                  <button
                    type="button"
                    onClick={onRetryProcessing}
                    className="shrink-0 rounded-md border border-white/20 px-2.5 py-1 text-[11px] hover:bg-white/10"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          ) : (
            <LearningSetupExperience
              mode="processing"
              progress={processingProgress ?? 0}
              processingStatus={processingStatus}
              videoId={videoId}
              videoPlayable={source === 'upload'}
              compact
            />
          )
        )}

        <div className="flex flex-1 overflow-hidden">
          <WorkspaceSidebar
            collapsed={sidebarCollapsed}
            onCollapse={handleCollapseSidebar}
            onClose={() => setSidebarOpen(false)}
            state={sidebarData}
            isSignedIn={isSignedIn}
          />

          <main className="flex-1 overflow-y-auto bg-zinc-950">
            <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
              {showVideoPage ? (
                <div className="space-y-6">
                  {/* Mobile Layout: Video → Action Bar → Chat Sidebar */}
                  <div className="lg:hidden space-y-4">
                    {/* Video Player */}
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
                      <VideoPlayer
                        videoId={videoId ?? ''}
                        title={(derivedTitle || aiMeta?.title || oembedMeta?.title) ?? 'Video session'}
                        source={source}
                        posterUrl={videoData?.thumbnail}
                        onVideoRef={setVideoPlayerRef}
                        onTimeUpdate={(time, dur) => {
                          setCurrentTime(time)
                          const d = Number.isFinite(dur) && dur > 0 ? dur : videoData?.duration ?? 0
                          if (d > 0) setVideoDuration(d)
                        }}
                        onSeek={seekToTime}
                      />
                    </div>

                    {/* Action Bar */}
                    {actionToast && (
                      <div className="mb-2 text-xs text-rose-300">{actionToast}</div>
                    )}
                    <ActionBar
                      onJoinPod={handleJoinPod}
                      onBookmark={handleBookmark}
                      onSnip={handleSnip}
                      onClip={handleClip}
                      onShare={handleShare}
                      onAddToPod={handleAddToPod}
                      onViewAnalytics={handleViewAnalytics}
                      onNextVideo={handleNextVideo}
                      actionStates={actionStates}
                    />

                    {/* Chat Sidebar */}
                    <ChatSidebar
                      activeTab={activeTab}
                      onTabChange={setActiveTab}
                      messages={messages}
                      promptTemplates={promptTemplates}
                      composerValue={composerValue}
                      onComposerChange={setComposerValue}
                      onSend={(text) => {
                        const now = new Date()
                        const newMessage: ChatMessage = {
                          id: `user-${now.getTime()}`,
                          role: 'user',
                          content: text,
                          timestamp: now.toLocaleTimeString(),
                        }
                        setMessages((prev) => [
                          ...prev,
                          newMessage,
                        ])
                        // Prefer streaming in dev; fallback to intelligent router
                        if (process.env.NEXT_PUBLIC_USE_STREAM === 'true' || process.env.NODE_ENV !== 'production') {
                          handleStreamChat(text)
                        } else {
                          handleIntelligentQuery(text)
                        }
                      }}
                      onSearchTranscript={handleSearchTranscript}
                      onIntelligentQuery={handleIntelligentQuery}
                      onSeekToTime={seekToTime}
                      processingStatus={processingStatus}
                      processingProgress={processingProgress}
                      processingError={processingError}
                      resources={displayResources}
                      onResourceClick={handleResourceClick}
                      showLanding={false}
                      onSubmitLanding={(value) => {
                        setComposerValue('')
                        redirectToWorkspace({ source: 'hero', videoId: value, query: { source: 'youtube' } })
                      }}
                      videoId={videoId}
                      isStreaming={isStreaming}
                      messageToasts={messageToasts}
                      showMessageToast={showMessageToast}
                    />

                    {/* Other Content */}
                    <ChapterCarousel
                      chapters={isProcessed ? chapters : []}
                      currentTime={currentTime}
                      onSelectChapter={seekToTime}
                    />

                    {isProcessed && (videoData || aiMeta || oembedMeta) && (
                      <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
                        {videoData ? (
                          <VideoDetails
                            videoId={videoId ?? ''}
                            title={videoData.title}
                            channel={videoData.channel}
                            description={videoData.description}
                            duration={videoData.duration}
                            views={videoData.views}
                            likes={videoData.likes}
                            publishedAt={videoData.publishedAt}
                            thumbnail={videoData.thumbnail}
                            tags={videoData.tags}
                          />
                        ) : aiMeta ? (
                          <div>
                            <p className="text-lg font-semibold text-white/90">{aiMeta.title}</p>
                            {aiMeta.description && <p className="text-sm text-white/60 mt-1">{aiMeta.description}</p>}
                          </div>
                        ) : (
                          <div className="flex items-start gap-4">
                            {oembedMeta?.thumbnail && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={oembedMeta.thumbnail} alt="thumbnail" className="w-24 h-14 object-cover rounded-md border border-white/10" />
                            )}
                            <div>
                              <p className="text-lg font-semibold text-white/90">{oembedMeta?.title}</p>
                              {oembedMeta?.author && <p className="text-sm text-white/50">by {oembedMeta.author}</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {isProcessed && hasAIMetadata && (
                      <AIMetadataPanel summary={summary} keyPoints={keyPoints} />
                    )}

                    <CommunitySection threads={isProcessed ? threadsMemo : []} videoId={videoId} />
                  </div>

                  {/* Desktop Layout: Side-by-side */}
                  <div className="hidden lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] lg:gap-6">
                    <section className="space-y-4">
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
                        <VideoPlayer
                          videoId={videoId ?? ''}
                        title={(derivedTitle || aiMeta?.title || oembedMeta?.title) ?? 'Video session'}
                          source={source}
                          posterUrl={videoData?.thumbnail}
                          onVideoRef={setVideoPlayerRef}
                          onTimeUpdate={(time, dur) => {
                            setCurrentTime(time)
                            const d = Number.isFinite(dur) && dur > 0 ? dur : videoData?.duration ?? 0
                            if (d > 0) setVideoDuration(d)
                          }}
                          onSeek={seekToTime}
                        />
                      </div>

                      {actionToast && (
                        <div className="mb-2 text-xs text-rose-300">{actionToast}</div>
                      )}
                      <ActionBar
                        onJoinPod={handleJoinPod}
                        onBookmark={handleBookmark}
                        onSnip={handleSnip}
                        onClip={handleClip}
                        onShare={handleShare}
                        onAddToPod={handleAddToPod}
                        onViewAnalytics={handleViewAnalytics}
                        onNextVideo={handleNextVideo}
                        actionStates={actionStates}
                      />

                      <ChapterCarousel
                        chapters={isProcessed ? (chaptersState ?? []) : []}
                        currentTime={currentTime}
                        onSelectChapter={seekToTime}
                      />

                      {isProcessed && (videoData || aiMeta || oembedMeta) && (
                        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
                          {videoData ? (
                            <VideoDetails
                              videoId={videoId ?? ''}
                              title={videoData.title}
                              channel={videoData.channel}
                              description={videoData.description}
                              duration={videoData.duration}
                              views={videoData.views}
                              likes={videoData.likes}
                              publishedAt={videoData.publishedAt}
                              thumbnail={videoData.thumbnail}
                              tags={videoData.tags}
                            />
                          ) : aiMeta ? (
                            <div>
                              <p className="text-lg font-semibold text-white/90">{aiMeta.title}</p>
                              {aiMeta.description && <p className="text-sm text-white/60 mt-1">{aiMeta.description}</p>}
                            </div>
                          ) : (
                            <div className="flex items-start gap-4">
                              {oembedMeta?.thumbnail && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={oembedMeta.thumbnail} alt="thumbnail" className="w-24 h-14 object-cover rounded-md border border-white/10" />
                              )}
                              <div>
                                <p className="text-lg font-semibold text-white/90">{oembedMeta?.title}</p>
                                {oembedMeta?.author && <p className="text-sm text-white/50">by {oembedMeta.author}</p>}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {isProcessed && hasAIMetadata && (
                        <AIMetadataPanel summary={summary} keyPoints={keyPoints} />
                      )}

                      <CommunitySection threads={isProcessed ? threadsMemo : []} videoId={videoId} />
                    </section>

                    <ChatSidebar
                      activeTab={activeTab}
                      onTabChange={setActiveTab}
                      messages={messages}
                      promptTemplates={promptTemplates}
                      composerValue={composerValue}
                      onComposerChange={setComposerValue}
                      onSend={(text) => {
                        const now = new Date()
                        const newMessage: ChatMessage = {
                          id: `user-${now.getTime()}`,
                          role: 'user',
                          content: text,
                          timestamp: now.toLocaleTimeString(),
                        }
                        setMessages((prev) => [
                          ...prev,
                          newMessage,
                        ])
                        // Route to intelligent query handler
                        handleIntelligentQuery(text)
                      }}
                      onSearchTranscript={handleSearchTranscript}
                      onIntelligentQuery={handleIntelligentQuery}
                      onSeekToTime={seekToTime}
                      processingStatus={processingStatus}
                      processingProgress={processingProgress}
                      processingError={processingError}
                      resources={isProcessed ? displayResources : []}
                      onResourceClick={handleResourceClick}
                      showLanding={false}
                      onSubmitLanding={(value) => {
                        setComposerValue('')
                        redirectToWorkspace({ source: 'hero', videoId: value, query: { source: 'youtube' } })
                      }}
                      videoId={videoId}
                      isStreaming={isStreaming}
                      messageToasts={messageToasts}
                      showMessageToast={showMessageToast}
                    />
                  </div>
                </div>
              ) : (
                <WorkspaceLanding
                  composerValue={composerValue}
                  onComposerChange={setComposerValue}
                  onSubmit={(source) => {
                    redirectToWorkspace(source)
                  }}
                />
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Clip Modal */}
      <ClipModal
        isOpen={clipModalOpen}
        onClose={() => setClipModalOpen(false)}
        currentTime={currentTime}
        videoDuration={videoDuration}
        onCreateClip={handleCreateClip}
      />

      {/* Snip Overlay */}
      <SnipOverlay
        isActive={snipMode}
        onClose={() => setSnipMode(false)}
        onSnipComplete={handleSnipComplete}
        videoElement={videoPlayerRef}
        source={source}
      />
    </div>
  )
}

function WorkspaceSidebar({
  collapsed,
  onCollapse,
  onClose,
  isMobile = false,
  state,
  isSignedIn = true,
}: {
  collapsed: boolean
  onCollapse: () => void
  onClose?: () => void
  isMobile?: boolean
  state: SidebarState
  isSignedIn?: boolean
}) {
  const joinedPodsMemo = useMemo(() => state.joinedPods.slice(0, 5), [state.joinedPods])
  const ownedPodsMemo = useMemo(() => state.ownedPods.slice(0, 5), [state.ownedPods])
  const recentVideosMemo = useMemo(() => state.recentVideos.slice(0, 15), [state.recentVideos])
  const widthClass = collapsed && !isMobile ? 'lg:w-20' : 'lg:w-80'
  const displayNameClass = collapsed && !isMobile ? 'hidden' : 'block'

  return (
    <aside
      className={cx(
        'hidden h-full flex-col border-r border-white/10 bg-black/80 px-4 py-6 backdrop-blur lg:flex',
        widthClass,
        isMobile && 'flex lg:hidden'
      )}
    >
      <div className={cx('flex items-center justify-between', collapsed && !isMobile && 'flex-col gap-4')}>
        {!collapsed || isMobile ? (
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/30">Workspace</p>
            <h2 className="text-lg font-semibold text-white">Navigation</h2>
          </div>
        ) : (
          <div className="text-sm font-semibold text-white">Hub</div>
        )}
        <div className="flex items-center gap-2">
          {isMobile && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 hover:border-white/20 hover:text-white"
            >
              Close
            </button>
          )}
          <button
            type="button"
            onClick={onCollapse}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 transition hover:border-white/25 hover:text-white"
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <nav className="mt-6 space-y-2">
        {state.menu.map((item) => {
          const IconComponent = item.icon
          const className = cx(
            'group flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 text-sm text-white/70 transition hover:border-white/25 hover:text-white',
            collapsed && 'justify-center px-0'
          )
          const content = (
            <>
              <IconComponent className="h-4 w-4" />
              {!collapsed && (
                <div className="flex items-center gap-2">
                  <span>{item.label}</span>
                  {item.comingSoon && <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Coming soon</span>}
                </div>
              )}
            </>
          )

          if (item.href) {
            return (
              <Link key={item.id} href={item.href} className={className}>
                {content}
              </Link>
            )
          }

          return (
            <button key={item.id} type="button" onClick={item.onClick} className={className} title={item.id === 'new' ? 'New Video Page' : undefined}>
              {content}
            </button>
          )
        })}
      </nav>

      <section className="mt-8 space-y-4 text-sm">
        {/* Quick create pod (admin-friendly) */}
        <SidebarSectionHeader collapsed={collapsed} title="Create pod" />
        <div className="px-2">
          <Link 
            href="/pods/new" 
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/80 hover:border-white/20 hover:text-white"
            title="Create New Pod"
          >
            <FolderPlus className="h-3.5 w-3.5" /> 
            {collapsed ? '' : 'New pod'}
          </Link>
        </div>

        <SidebarSectionHeader collapsed={collapsed} title="Pods you're in" />
        <SidebarPodList collapsed={collapsed} pods={joinedPodsMemo} emptyLabel="You haven't joined any pods yet." />
        {!collapsed && state.joinedPods.length > 5 && (
          <div className="px-2">
            <Link href="/pods" className="text-[11px] text-blue-400 hover:text-blue-300">See all</Link>
          </div>
        )}

        <SidebarSectionHeader collapsed={collapsed} title="Your pods" />
        <SidebarPodList collapsed={collapsed} pods={ownedPodsMemo} emptyLabel="Create a pod to organise your video pages." />
        {!collapsed && state.ownedPods.length > 5 && (
          <div className="px-2">
            <Link href="/pods" className="text-[11px] text-blue-400 hover:text-blue-300">See all</Link>
          </div>
        )}

        <SidebarSectionHeader collapsed={collapsed} title="Recent video pages" />
        <div className="space-y-2">
          {recentVideosMemo.length === 0 ? (
            !collapsed && (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-xs text-white/40">
                No recent video pages yet. Start a session to see it here.
              </div>
            )
          ) : (
            recentVideosMemo.map((item) => (
              <Link
                key={item.id}
                href={`/workspace/${encodeURIComponent(item.id)}?source=${item.source === 'upload' ? 'upload' : 'youtube'}`}
                className={cx(
                  'flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 text-left text-sm text-white/70 transition hover:border-white/25 hover:text-white',
                  collapsed && 'justify-center px-0'
                )}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/80">
                  <Video className="h-4 w-4" />
                </div>
                {!collapsed && (
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white/90">{item.title}</p>
                    <p className="text-xs text-white/40">{item.updated}</p>
                  </div>
                )}
              </Link>
            ))
          )}
          {!collapsed && state.recentVideos.length > 15 && (
            <div className="mt-2">
              <Link href="/workspace" className="text-[11px] text-blue-400 hover:text-blue-300 px-2">See all</Link>
            </div>
          )}
        </div>
      </section>

      {!isSignedIn && (
        <div className={cx('mt-auto space-y-2 border-t border-white/10 pt-4', collapsed && !isMobile && 'hidden')}>
          <Link
            href="/sign-in"
            className="flex w-full items-center justify-center rounded-xl border border-blue-400/40 bg-blue-400/10 px-3 py-2 text-sm font-medium text-blue-100 hover:border-blue-300"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="flex w-full items-center justify-center rounded-xl border border-white/15 px-3 py-2 text-sm text-white/80 hover:border-white/30 hover:text-white"
          >
            Sign up
          </Link>
        </div>
      )}

    </aside>
  )
}

function SidebarButton({ icon: Icon, label, collapsed, active }: { icon: LucideIcon; label: string; collapsed: boolean; active?: boolean }) {
  return (
    <button
      className={cx(
        'flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-sm transition',
        active ? 'border-white/25 bg-white/10 text-white' : 'border-transparent text-white/60 hover:border-white/15 hover:bg-white/5 hover:text-white',
        collapsed && 'justify-center px-0'
      )}
    >
      <Icon className="h-4 w-4" />
      {!collapsed && <span>{label}</span>}
    </button>
  )
}

function SidebarSectionHeader({ collapsed, title }: { collapsed: boolean; title: string }) {
  if (collapsed) return null
  return <p className="px-2 text-xs font-medium uppercase tracking-widest text-zinc-600">{title}</p>
}

function SidebarPodList({ collapsed, pods, emptyLabel }: { collapsed: boolean; pods: PodSummary[]; emptyLabel: string }) {
  if (!pods.length) {
    if (collapsed) return null
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-xs text-white/40">
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {pods.map((pod) => (
        <button
          key={pod.id}
          className={cx(
            'flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 text-left text-sm text-white/70 transition hover:border-white/25 hover:text-white',
            collapsed && 'justify-center px-0'
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/80">
            <Users className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="flex-1">
              <p className="text-sm font-medium text-white/90">{pod.title}</p>
              <p className="text-xs text-white/40">{pod.updated ?? 'Recently active'}</p>
            </div>
          )}
        </button>
      ))}
    </div>
  )
}


function WorkspaceLanding({
  composerValue,
  onComposerChange,
  onSubmit,
}: {
  composerValue: string
  onComposerChange: (value: string) => void
  onSubmit: (args: LoginSource) => void
}) {
  const router = useRouter()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isFileAttached, setIsFileAttached] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStage, setUploadStage] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const isValidUrl = composerValue.trim().length > 0

  const handleFileSelect = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setIsFileAttached(true)
      setUploadError('')
      onComposerChange(file.name)
    }
  }, [onComposerChange])

  const handleSubmit = useCallback(async () => {
    if (isUploading) return

    if (selectedFile) {
      setIsUploading(true)
      setUploadError('')
      setUploadProgress(0)
      try {
        const result = await uploadVideoFile(
          selectedFile,
          selectedFile.name.replace(/\.[^/.]+$/, ''),
          (pct, stage) => {
            setUploadProgress(pct)
            setUploadStage(stage)
          }
        )

        if (!result.success || !result.videoId) {
          setUploadError(result.error || 'Upload failed. Please try again.')
          return
        }

        router.push(`/workspace/${encodeURIComponent(result.videoId)}?source=upload`)
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed')
      } finally {
        setIsUploading(false)
      }
      return
    }

    if (!isValidUrl) return
    const trimmed = composerValue.trim()
    const isYoutube = /youtube\.com|youtu\.be/.test(trimmed)
    if (!isYoutube) {
      setUploadError('Attach a video file with the paperclip, or paste a YouTube URL.')
      return
    }

    const source = 'youtube'
    let videoId = trimmed
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    const match = trimmed.match(youtubeRegex)
    if (match?.[1]) {
      videoId = match[1]
    }

    onSubmit({ source: 'hero', videoId, query: { source } })
  }, [composerValue, isValidUrl, isUploading, onSubmit, router, selectedFile])

  return (
    <div className="px-6 py-16">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <div className="text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/60">
            <span>Workspace</span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.35em] text-white/70">beta</span>
          </div>
          <h1 className="text-4xl font-light tracking-tight text-white sm:text-5xl">What skill do you want to master today?</h1>
          <p className="mt-4 text-base text-white/60">
            Paste a YouTube URL or attach a video/PDF to start a new learning session. Chat, study guides, and notes unlock once processing finishes.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-4">
          <div className="relative">
            <textarea
              value={composerValue}
              onChange={(event) => onComposerChange(event.target.value)}
              placeholder="Paste YouTube URL or attach a custom video in MP4, MOV and AVI"
              rows={composerValue.length > 90 ? 4 : 3}
              className="w-full resize-none rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-4 pr-40 text-sm text-white placeholder-white/40 focus:border-white/25 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent" />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 flex-col gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/25 hover:text-white"
              >
                <Paperclip className="h-3.5 w-3.5" />
                {isFileAttached ? 'Attached' : 'Attach'}
              </button>
              <button
                type="button"
                disabled={(!isValidUrl && !selectedFile) || isUploading}
                onClick={handleSubmit}
                className={cx(
                  'pointer-events-auto inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition',
                  (isValidUrl || selectedFile) && !isUploading
                    ? 'bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 text-black hover:opacity-90'
                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                )}
              >
                {isUploading ? 'Uploading…' : 'Start learning'}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,video/avi,.mp4,.webm,.mov,.avi"
              onChange={handleFileSelect}
            />
          </div>
          {uploadError && (
            <p className="mt-3 text-sm text-rose-400">{uploadError}</p>
          )}
          {isUploading && (
            <LearningSetupExperience
              mode="upload"
              progress={uploadProgress}
              stage={uploadStage || 'uploading'}
              compact
              className="mt-3 rounded-lg border border-zinc-800"
            />
          )}
          <div className="mt-2 text-center text-[11px] text-white/60">
            or <Link href="/pods/new" className="underline underline-offset-2 text-white hover:text-white/80">create pod</Link>
            <br />
            Supports YouTube URLs, MP4/MOV/AVI, and PDF files.
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
          <Info className="mb-2 h-5 w-5 text-white/50" />
          <p>Your content will be processed with AI to generate personalised study materials.</p>
          <p className="mt-1 text-xs text-white/40">We&apos;ll notify you when processing is done — progress shown as a percentage.</p>
        </div>
      </div>
    </div>
  )
}

function ChapterCarousel({
  chapters,
  currentTime,
  onSelectChapter,
}: {
  chapters: WorkspaceShellProps['chapters']
  currentTime: number
  onSelectChapter: (startTime: number) => void
}) {
  if (!chapters || chapters.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">Learning map</p>
        <p className="mt-2 text-sm text-white/65">Chapters are being prepared from the tutorial so you can jump to the right step, not scrub through the whole video.</p>
      </div>
    )
  }

  const activeIndex = chapters.findIndex((chapter) => currentTime >= chapter.startTime && currentTime < chapter.startTime + chapter.duration)
  const safeActiveIndex = activeIndex >= 0 ? activeIndex : 0
  const activeChapter = chapters[safeActiveIndex]

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.055] to-white/[0.015] p-4">
      <div className="flex items-center justify-between pb-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-200/60">Learning map</p>
          <h3 className="text-base font-semibold text-white">Follow the tutorial by task</h3>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] text-white/60">{safeActiveIndex + 1} / {chapters.length}</span>
      </div>
      <button type="button" onClick={() => onSelectChapter(activeChapter.startTime)} className="mb-3 w-full rounded-2xl border border-emerald-300/25 bg-emerald-300/[0.06] p-3 text-left transition hover:bg-emerald-300/[0.1]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200/80">Now learning · {formatTimestamp(activeChapter.startTime)}</p>
        <p className="mt-1 text-sm font-semibold text-white">{activeChapter.title}</p>
        {activeChapter.description && <p className="mt-1 line-clamp-1 text-xs text-white/55">{activeChapter.description}</p>}
      </button>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {chapters.map((chapter, index) => {
          const isActive = currentTime >= chapter.startTime && currentTime < chapter.startTime + chapter.duration
          return (
            <button
              key={chapter.id}
              onClick={() => onSelectChapter(chapter.startTime)}
              aria-current={isActive ? 'step' : undefined}
              className={cx(
                'min-w-[196px] rounded-2xl border px-4 py-3 text-left transition',
                isActive
                  ? 'border-emerald-300/50 bg-emerald-300/[0.12] text-white shadow-lg shadow-emerald-950/20'
                  : 'border-white/10 bg-black/10 text-white/70 hover:border-white/25 hover:bg-white/[0.06] hover:text-white'
              )}
            >
              <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-[0.2em] text-white/50">
                <span className="flex items-center gap-2"><CircleDot className="h-3 w-3" /> Step {index + 1}</span>
                <span>{formatTimestamp(chapter.startTime)}</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-white/90">{chapter.title}</p>
              {chapter.description && <p className="mt-1 text-xs text-white/50 line-clamp-2">{chapter.description}</p>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function AIMetadataPanel({ summary, keyPoints }: { summary?: string; keyPoints?: string[] }) {
  const hasSummary = Boolean(summary && summary.trim().length > 0)
  const keyPointsList = (keyPoints || []).filter(Boolean)

  if (!hasSummary && keyPointsList.length === 0) {
    return null
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
      {hasSummary && (
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/40">AI Summary</p>
          <p className="mt-2 text-sm leading-relaxed text-white/80">{summary}</p>
        </div>
      )}
      {keyPointsList.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/40">Key Points</p>
          <ul className="mt-2 space-y-2 text-sm text-white/70">
            {keyPointsList.map((point, index) => (
              <li key={index} className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 text-emerald-400" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function ActionBar({
  onJoinPod,
  onBookmark,
  onSnip,
  onClip,
  onShare,
  onAddToPod,
  onViewAnalytics,
  onNextVideo,
  actionStates,
}: {
  onJoinPod: () => void
  onBookmark: () => void
  onSnip: () => void
  onClip: () => void
  onShare: () => void
  onAddToPod: () => void
  onViewAnalytics: () => void
  onNextVideo: () => void
  actionStates: {
    joinPod: { loading: boolean; success: boolean }
    bookmark: { loading: boolean; success: boolean }
    snip: { loading: boolean; success: boolean }
    clip: { loading: boolean; success: boolean }
    share: { loading: boolean; success: boolean }
  }
}) {
  const actions = [
    { 
      id: 'pod', 
      label: 'Join pod', 
      icon: Users, 
      onClick: onJoinPod,
      state: actionStates.joinPod,
      className: 'border-emerald-400/40 bg-emerald-400/15 text-emerald-100 hover:border-emerald-300 hover:text-white',
      loadingClassName: 'border-gray-400/40 bg-gray-400/15 text-gray-100 cursor-not-allowed',
      successClassName: 'border-green-400/40 bg-green-400/15 text-green-100'
    },
    { 
      id: 'bookmark', 
      label: 'Bookmark', 
      icon: Bookmark, 
      onClick: onBookmark,
      state: actionStates.bookmark,
      className: 'border-red-400/40 bg-red-400/15 text-red-100 hover:border-red-300 hover:text-white',
      loadingClassName: 'border-gray-400/40 bg-gray-400/15 text-gray-100 cursor-not-allowed',
      successClassName: 'border-green-400/40 bg-green-400/15 text-green-100'
    },
    { 
      id: 'snip', 
      label: 'Snip', 
      icon: Scissors, 
      onClick: onSnip,
      state: actionStates.snip,
      className: 'border-blue-400/40 bg-blue-400/15 text-blue-100 hover:border-blue-300 hover:text-white',
      loadingClassName: 'border-gray-400/40 bg-gray-400/15 text-gray-100 cursor-not-allowed',
      successClassName: 'border-green-400/40 bg-green-400/15 text-green-100'
    },
    { 
      id: 'clip', 
      label: 'Save clip',
      icon: Video, 
      onClick: onClip,
      state: actionStates.clip,
      className: 'border-cyan-400/40 bg-cyan-400/15 text-cyan-100 hover:border-cyan-300 hover:text-white',
      loadingClassName: 'border-gray-400/40 bg-gray-400/15 text-gray-100 cursor-not-allowed',
      successClassName: 'border-green-400/40 bg-green-400/15 text-green-100'
    },
    { 
      id: 'share', 
      label: 'Share', 
      icon: Share2, 
      onClick: onShare,
      state: actionStates.share,
      className: 'border-purple-400/40 bg-purple-400/15 text-purple-100 hover:border-purple-300 hover:text-white',
      loadingClassName: 'border-gray-400/40 bg-gray-400/15 text-gray-100 cursor-not-allowed',
      successClassName: 'border-green-400/40 bg-green-400/15 text-green-100'
    },
    { 
      id: 'addToPod', 
      label: 'Add to pod', 
      icon: Plus, 
      onClick: onAddToPod,
      state: { loading: false, success: false },
      className: 'border-amber-400/40 bg-amber-400/15 text-amber-100 hover:border-amber-300 hover:text-white',
      loadingClassName: 'border-gray-400/40 bg-gray-400/15 text-gray-100 cursor-not-allowed',
      successClassName: 'border-green-400/40 bg-green-400/15 text-green-100'
    },
    { 
      id: 'analytics', 
      label: 'Analytics', 
      icon: LayoutDashboard, 
      onClick: onViewAnalytics,
      state: { loading: false, success: false },
      className: 'border-fuchsia-400/40 bg-fuchsia-400/15 text-fuchsia-100 hover:border-fuchsia-300 hover:text-white',
      loadingClassName: 'border-gray-400/40 bg-gray-400/15 text-gray-100 cursor-not-allowed',
      successClassName: 'border-green-400/40 bg-green-400/15 text-green-100'
    },
    { 
      id: 'next', 
      label: 'Next video', 
      icon: ChevronRight, 
      onClick: onNextVideo,
      state: { loading: false, success: false },
      className: 'border-white/20 bg-white/5 text-white/80 hover:border-white/30 hover:text-white',
      loadingClassName: 'border-gray-400/40 bg-gray-400/15 text-gray-100 cursor-not-allowed',
      successClassName: 'border-green-400/40 bg-green-400/15 text-green-100'
    },
  ]
  // Admin gating for specific actions
  const { user } = useUser()
  const email = user?.emailAddresses?.[0]?.emailAddress || ''
  const ADMIN_EMAILS = ['job.oyebisi@gmail.com', 'job@chatpye.com']
  const isAdmin = ADMIN_EMAILS.includes(email)

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-2">
      <div className="flex flex-row flex-wrap items-center justify-evenly gap-2 w-full">
        {actions
          .filter(a => (a.id === 'addToPod') ? isAdmin : true)
          .map((action) => {
          const IconComponent = action.icon
          const isDisabled = action.state.loading
          const buttonClassName = action.state.loading 
            ? action.loadingClassName 
            : action.state.success 
            ? action.successClassName 
            : action.className
          
          return (
            <button
              key={action.id}
              onClick={action.onClick}
              disabled={isDisabled}
              title={action.label}
              className={`inline-flex items-center justify-center rounded-xl border p-2 text-xs font-medium transition basis-[calc(16.6%-6px)] sm:basis-auto ${buttonClassName}`}
            >
              {action.state.loading ? (
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : action.state.success ? (
                <Check className="h-4 w-4" />
              ) : (
                <IconComponent className="h-4 w-4" />
              )}
              <span className="sr-only">{action.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CommunitySection({ threads, videoId }: { threads: WorkspaceShellProps['threads']; videoId?: string }) {
  const [newThreadTitle, setNewThreadTitle] = useState('')
  const [newThreadContent, setNewThreadContent] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateThread = async () => {
    if (!videoId || !newThreadTitle.trim() || !newThreadContent.trim() || isCreating) return
    
    setIsCreating(true)
    try {
      const response = await fetch('/api/community/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          title: newThreadTitle.trim(),
          content: newThreadContent.trim()
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setNewThreadTitle('')
        setNewThreadContent('')
        // Refresh the page to show the new thread
        window.location.reload()
      }
    } catch (error) {
      console.error('Error creating thread:', error)
    } finally {
      setIsCreating(false)
    }
  }

  if (!threads || threads.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">No discussions yet</h3>
          <p className="text-sm text-white/60">Be the first to start a conversation about this video</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <input
              type="text"
              value={newThreadTitle}
              onChange={(e) => setNewThreadTitle(e.target.value)}
              placeholder="Thread title..."
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <textarea
              value={newThreadContent}
              onChange={(e) => setNewThreadContent(e.target.value)}
              placeholder="Share your thoughts about this video..."
              rows={3}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
          <button
            onClick={handleCreateThread}
            disabled={!newThreadTitle.trim() || !newThreadContent.trim() || isCreating}
            className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isCreating ? 'Creating...' : 'Start Discussion'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
      <div className="flex items-center justify-between pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/40">Community</p>
          <h3 className="text-lg font-semibold text-white">Learner threads</h3>
        </div>
        <button className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 transition hover:border-white/25 hover:text-white">
          Manage
        </button>
      </div>
      <CommunityThreads
        threads={threads}
        onThreadClick={(thread) => console.log('Open thread', thread.title)}
        onLike={(threadId) => console.log('Like thread', threadId)}
        onReply={(threadId, content) => console.log('Reply', threadId, content)}
      />
    </div>
  )
}

function ChatSidebar({
  activeTab,
  onTabChange,
  messages,
  promptTemplates,
  composerValue,
  onComposerChange,
  onSend,
  onSearchTranscript,
  onIntelligentQuery,
  onSeekToTime,
  processingStatus,
  processingProgress = 0,
  processingError,
  resources,
  onResourceClick,
  showLanding,
  onSubmitLanding,
  videoId,
  isStreaming,
  messageToasts,
  showMessageToast,
}: {
  activeTab: TabDescriptor['id']
  onTabChange: (tab: TabDescriptor['id']) => void
  messages: ChatMessage[]
  promptTemplates: PromptTemplate[]
  composerValue: string
  onComposerChange: (value: string) => void
  onSend: (text: string) => void
  onSearchTranscript: (query: string) => void
  onIntelligentQuery: (query: string) => void
  onSeekToTime: (timeInSeconds: number) => void
  processingStatus?: ProcessingStatus
  processingProgress?: number
  processingError?: string | null
  resources?: ResourceItem[]
  onResourceClick: (resource: ResourceItem) => void
  showLanding: boolean
  onSubmitLanding: (value: string) => void
  videoId?: string
  isStreaming: boolean
  messageToasts: Record<string, string>
  showMessageToast: (messageId: string, text: string) => void
}) {
  const safeResources = useMemo(() => {
    if (!resources || resources.length === 0) return [] as ResourceItem[]
    // Limit to 50 resources to avoid rendering huge lists at once
    return resources.slice(0, 50)
  }, [resources])
  const trimmedInput = composerValue.trim()
  const canSend = trimmedInput.length > 0
  const messageListRef = useRef<HTMLDivElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [toast, setToast] = useState<string>('')
  const [menuOpen, setMenuOpen] = useState(false)
  const messagesToRender: ChatMessage[] = useMemo(() => {
    if (showLanding) return []
    const start = Math.max(0, messages.length - 200)
    return messages.slice(start)
  }, [messages, showLanding])
  const showToast = (t: string) => {
    setToast(t)
    setTimeout(() => setToast(''), 1500)
  }

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleClearChat = async () => {
    if (!videoId) return
    try {
      const res = await fetch(`/api/chat-history?videoId=${encodeURIComponent(videoId)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        window.location.reload() // Reload to reset state
      } else {
        showToast('Failed to clear chat')
      }
    } catch {
      showToast('Failed to clear chat')
    }
    setMenuOpen(false)
  }

  const handleDeleteChat = async () => {
    if (!videoId) return
    if (!confirm('Permanently delete this chat? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/chat-history?videoId=${encodeURIComponent(videoId)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        window.location.reload()
      } else {
        showToast('Failed to delete chat')
      }
    } catch {
      showToast('Failed to delete chat')
    }
    setMenuOpen(false)
  }

  useEffect(() => {
    if (activeTab !== 'chat') return
    const node = messageListRef.current
    if (node) {
      node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, activeTab])

  return (
    <aside className="space-y-6">
      <div className="h-[600px] rounded-xl lg:rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl flex flex-col">
        {/* Chat Header */}
        <div className="p-2 lg:p-3 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <Bot className="w-3 h-3 lg:w-4 lg:h-4 text-green-400" />
            <h3 className="text-sm lg:text-base font-semibold text-white">ChatPye AI Tutor</h3>
            <div className="flex items-center gap-1 ml-auto">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-zinc-400">Online</span>
            </div>
            {/* Chat Menu Button */}
            {videoId && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-1.5 rounded hover:bg-zinc-800 transition"
                  title="Chat options"
                >
                  <MoreVertical className="w-4 h-4 text-zinc-400" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-50 min-w-[160px]">
                    <button
                      onClick={handleClearChat}
                      className="w-full px-3 py-2 text-left text-sm text-white hover:bg-zinc-700 flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Clear Chat
                    </button>
                    <button
                      onClick={handleDeleteChat}
                      className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-zinc-700 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Chat
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Video Processing Status */}
          {videoId && (
            <ProcessingStatusLine
              videoId={videoId}
              processingStatus={processingStatus}
              progress={processingProgress}
              error={processingError}
            />
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800">
          <button
            onClick={() => onTabChange('chat')}
            className={`flex-1 px-2 lg:px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === 'chat'
                ? 'text-white bg-zinc-800 border-b-2 border-blue-400'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <MessageSquare className="w-3 h-3 inline mr-1" />
            <span className="hidden sm:inline">Chat</span>
          </button>
          <button
            onClick={() => onTabChange('notes')}
            className={`flex-1 px-2 lg:px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === 'notes'
                ? 'text-white bg-zinc-800 border-b-2 border-blue-400'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <Video className="w-3 h-3 inline mr-1" />
            <span className="hidden sm:inline">Notes</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'chat' && (
            <>
              {/* Messages */}
              <div 
                ref={messageListRef}
                className="flex-1 overflow-y-auto p-3 space-y-3 flex flex-col"
                style={{ maxHeight: 'calc(100% - 140px)' }}
              >
                {messagesToRender.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-xl px-3 py-2 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                          : 'bg-zinc-800 text-zinc-100'
                      }`}
                    >
                      {message.role === 'assistant' ? (
                        <CodeHighlight
                          content={message.content}
                          messageId={message.id}
                          onShare={async (code) => {
                            if (!videoId) return
                            try {
                              const res = await fetch('/api/chat/share', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ content: code, videoId })
                              })
                              const data = await res.json()
                              if (data.success && data.shareUrl) {
                                if (navigator.clipboard) {
                                  await navigator.clipboard.writeText(data.shareUrl)
                                  showMessageToast(message.id, 'Share link copied')
                                }
                              } else if (res.status === 402) {
                                showMessageToast(message.id, 'Share limit reached')
                              }
                            } catch (error) {
                              console.error('Share error:', error)
                            }
                          }}
                        />
                      ) : (
                        <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                      )}
                      {message.searchResults && (
                        <div className="mt-2 space-y-2">
                          {message.searchResults.map((result, i) => {
                            const mins = Math.floor(result.start / 60)
                            const secs = Math.floor(result.start % 60)
                            const timestamp = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
                            return (
                              <div key={i} className="bg-zinc-700/50 rounded-lg p-2">
                                <button
                                  onClick={() => onSeekToTime(result.start)}
                                  className="text-blue-400 hover:text-blue-300 text-xs font-medium mb-1 transition-colors"
                                >
                                  [{timestamp}]
                                </button>
                                <p className="text-xs text-zinc-200">{result.text}</p>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {/* Assistant actions */}
                      {message.role === 'assistant' && (
                        <div className="mt-2 flex items-center gap-2 text-[10px] text-zinc-400">
                          <button
                            title="Copy"
                            onClick={async () => {
                              try {
                                await navigator.clipboard?.writeText(message.content)
                                showMessageToast(message.id, 'Copied')
                              } catch {
                                showMessageToast(message.id, 'Copy failed')
                              }
                            }}
                            className="hover:text-white transition"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            title="Share"
                            onClick={async () => {
                              try {
                                const res = await fetch('/api/chat/share', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ content: message.content, videoId })
                                })
                                const data = await res.json()
                                const shareUrl = data?.shareUrl || ''
                                if (shareUrl) {
                                  await navigator.clipboard?.writeText(shareUrl)
                                  showMessageToast(message.id, 'Share link copied')
                                } else if (res.status === 402) {
                                  showMessageToast(message.id, 'Share limit reached')
                                } else {
                                  showMessageToast(message.id, 'Share failed')
                                }
                              } catch {
                                showMessageToast(message.id, 'Share failed')
                              }
                            }}
                            className="hover:text-white transition"
                          >
                            <Share2 className="w-3 h-3" />
                          </button>
                          <button
                            title="Add to Notes"
                            onClick={async () => {
                              try {
                                const res = await fetch('/api/notes', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ content: message.content, videoId })
                                })
                                if (res.ok) {
                                  showMessageToast(message.id, 'Added to Notes')
                                } else {
                                  showMessageToast(message.id, 'Add to Notes failed')
                                }
                              } catch {
                                showMessageToast(message.id, 'Add to Notes failed')
                              }
                            }}
                            className="hover:text-white transition"
                          >
                            <Bookmark className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      {message.role === 'assistant' && messageToasts[message.id] && (
                        <div className="mt-1 text-[10px] text-emerald-300">{messageToasts[message.id]}</div>
                      )}
                      <p className="text-[10px] opacity-70 mt-1" suppressHydrationWarning>
                        {message.timestamp}
                      </p>
                    </div>
                    {message.role === 'user' && (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                        <User className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                ))}
                {/* Typing indicator */}
                {isStreaming && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-3 h-3 text-white" />
                    </div>
                    <div className="max-w-[80%] rounded-xl px-3 py-2 bg-zinc-800 text-zinc-100">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:100ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:200ms]" />
                      </div>
                    </div>
                  </div>
                )}
                {showLanding && (
                  <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-800/50 p-4 text-sm text-zinc-400">
                    Paste a YouTube link or attach a video. Chat and notes unlock once processing starts.
                  </div>
                )}
              </div>

              {/* Prompt Templates */}
              {!showLanding && (
                <div className="p-3 border-t border-zinc-800 bg-zinc-900/30">
                  <div className="text-xs text-zinc-400 mb-2">Try these prompts or ask anything about the video:</div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <button
                      onClick={async () => {
                        const text = "Summarize the key points of this video";
                        onComposerChange(text);
                        try { await fetch('/api/prompts/record', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId, promptId: 'summarize' }) }) } catch {}
                      }}
                      className="px-3 py-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 active:from-blue-600/40 active:to-purple-600/40 text-zinc-200 hover:text-white text-xs rounded-lg border border-blue-500/30 hover:border-blue-500/50 transition-all duration-200 cursor-pointer select-none font-medium shadow-sm hover:shadow-md"
                      type="button"
                    >
                      📝 Summarize
                    </button>
                    <button
                      onClick={async () => {
                        const text = "What are the main features discussed?";
                        onComposerChange(text);
                        try { await fetch('/api/prompts/record', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId, promptId: 'main-features' }) }) } catch {}
                      }}
                      className="px-3 py-2 bg-gradient-to-r from-emerald-600/20 to-green-600/20 hover:from-emerald-600/30 hover:to-green-600/30 active:from-emerald-600/40 active:to-green-600/40 text-zinc-200 hover:text-white text-xs rounded-lg border border-emerald-500/30 hover:border-emerald-500/50 transition-all duration-200 cursor-pointer select-none font-medium shadow-sm hover:shadow-md"
                      type="button"
                    >
                      ⭐ Main features
                    </button>
                    <button
                      onClick={async () => {
                        const text = "How does this technology work?";
                        onComposerChange(text);
                        try { await fetch('/api/prompts/record', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId, promptId: 'how-it-works' }) }) } catch {}
                      }}
                      className="px-3 py-2 bg-gradient-to-r from-amber-600/20 to-orange-600/20 hover:from-amber-600/30 hover:to-orange-600/30 active:from-amber-600/40 active:to-orange-600/40 text-zinc-200 hover:text-white text-xs rounded-lg border border-amber-500/30 hover:border-amber-500/50 transition-all duration-200 cursor-pointer select-none font-medium shadow-sm hover:shadow-md"
                      type="button"
                    >
                      🔧 How it works
                    </button>
                    
                  </div>
                  <div className="text-xs text-zinc-500 mt-2">
                    Examples: "What does the video say about [topic]?", "Find content at 5:30", "Extract a clip from 2:15", "Explain the main concept"
                  </div>
                </div>
              )}

              {/* Toast */}
              {toast && (
                <div className="px-3 py-2 text-[10px] text-emerald-300">{toast}</div>
              )}

              {/* Input Area */}
              <div className="p-3 border-t border-zinc-800 bg-zinc-900/50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={composerValue}
                    onChange={(e) => onComposerChange(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (canSend) {
                          if (showLanding) {
                            onSubmitLanding(trimmedInput);
                          } else {
                            onSend(trimmedInput);
                            onComposerChange('');
                          }
                        }
                      }
                    }}
                    placeholder={showLanding ? "Paste a link or describe your goal..." : "Ask about the video content..."}
                    className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    disabled={false}
                  />
                  <button
                    onClick={() => {
                      if (!canSend) return;
                      if (showLanding) {
                        onSubmitLanding(trimmedInput);
                      } else {
                        onSend(trimmedInput);
                        onComposerChange('');
                      }
                    }}
                    disabled={!canSend}
                    className="px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
                  >
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'notes' && (
            <NotesTab videoId={videoId} />
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-4">
        <div className="flex items-center justify-between pb-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/40">Resources</p>
            <h3 className="text-base font-semibold text-white">Downloads & references</h3>
          </div>
        </div>
        {safeResources.length > 0 ? (
          <ResourcesList
            resources={safeResources}
            onResourceClick={(resource) => onResourceClick(resource)}
            onDownload={(resource) => console.log('Download resource', resource.title)}
            onBookmark={(resource) => console.log('Bookmark resource', resource.title)}
          />
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/50">
            Resources will appear here once processing finishes.
          </div>
        )}
      </div>
      <SkillProofTaskPanel videoId={videoId} />
    </aside>
  )
}

function ProcessingStatusLine({
  processingStatus,
  progress: externalProgress = 0,
  error,
}: {
  videoId?: string
  processingStatus?: ProcessingStatus
  progress?: number
  error?: string | null
}) {
  const status = processingStatus || 'pending'
  const pct = Math.min(100, Math.max(externalProgress, status === 'complete' ? 100 : 0))
  const color =
    status === 'complete'
      ? 'bg-emerald-400 text-emerald-300'
      : status === 'failed'
        ? 'bg-red-400 text-red-300'
        : 'bg-yellow-400 text-yellow-300'
  const displayText =
    status === 'failed'
      ? error || getProcessingStatusLabel(status)
      : getProcessingStatusLabel(status, pct)

  if (status === 'complete') return null

  return (
    <div className="mt-2 flex flex-col gap-1 text-xs">
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 animate-pulse rounded-full ${color.split(' ')[0]}`} />
        <span className={color.split(' ').slice(1).join(' ')}>{displayText}</span>
        {pct > 0 && pct < 100 && status !== 'failed' && (
          <span className="ml-auto text-zinc-400">{pct}%</span>
        )}
      </div>
    </div>
  )
}

function formatTimestamp(seconds: number) {
  if (!Number.isFinite(seconds)) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

// Notes Tab Component with Rich Text Editor
function NotesTab({ videoId }: { videoId?: string }) {
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!videoId) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/notes?videoId=${encodeURIComponent(videoId)}`, {
          credentials: 'include',
        })
        const data = await res.json()
        if (!cancelled && data.success && data.note?.content) {
          setNotes(data.note.content)
        }
      } catch {
        /* ignore load errors */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [videoId])

  const persistNotes = useCallback(
    async (content: string) => {
      if (!videoId) return
      setIsSaving(true)
      try {
        const res = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ videoId, content }),
        })
        if (res.ok) {
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus('idle'), 2000)
        } else {
          setSaveStatus('error')
        }
      } catch {
        setSaveStatus('error')
      } finally {
        setIsSaving(false)
      }
    },
    [videoId]
  )

  const handleNotesChange = (value: string) => {
    setNotes(value)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      persistNotes(value)
    }, 800)
  }

  const handlePromptClick = async (promptType: 'study-guide' | 'transcript' | 'summary') => {
    if (!videoId) return

    setIsLoading(true)
    try {
      const res = await fetch(
        `/api/video/${encodeURIComponent(videoId)}/materials?type=${promptType}`,
        { credentials: 'include' }
      )
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Generation failed')
      }

      const heading =
        promptType === 'study-guide'
          ? '📚 Study Guide'
          : promptType === 'transcript'
            ? '📝 Transcript'
            : '📋 Summary'
      const block = `${heading}\n\n${data.content}`
      const next = notes ? `${notes}\n\n---\n\n${block}` : block
      setNotes(next)
      await persistNotes(next)
    } catch (error) {
      console.error(`Error generating ${promptType}:`, error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex-1 p-3 overflow-y-auto">
      <div className="max-w-full mx-auto space-y-4">
        {/* Prompt Chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => handlePromptClick('study-guide')}
            disabled={isLoading}
            className="px-3 py-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 active:from-blue-600/40 active:to-purple-600/40 text-zinc-200 hover:text-white text-xs rounded-lg border border-blue-500/30 hover:border-blue-500/50 transition-all duration-200 cursor-pointer select-none font-medium shadow-sm hover:shadow-md disabled:opacity-50"
          >
            📚 Study Guide
          </button>
          <button
            onClick={() => handlePromptClick('transcript')}
            disabled={isLoading}
            className="px-3 py-2 bg-gradient-to-r from-green-600/20 to-emerald-600/20 hover:from-green-600/30 hover:to-emerald-600/30 active:from-green-600/40 active:to-emerald-600/40 text-zinc-200 hover:text-white text-xs rounded-lg border border-green-500/30 hover:border-green-500/50 transition-all duration-200 cursor-pointer select-none font-medium shadow-sm hover:shadow-md disabled:opacity-50"
          >
            📝 Transcript
          </button>
          <button
            onClick={() => handlePromptClick('summary')}
            disabled={isLoading}
            className="px-3 py-2 bg-gradient-to-r from-orange-600/20 to-red-600/20 hover:from-orange-600/30 hover:to-red-600/30 active:from-orange-600/40 active:to-red-600/40 text-zinc-200 hover:text-white text-xs rounded-lg border border-orange-500/30 hover:border-orange-500/50 transition-all duration-200 cursor-pointer select-none font-medium shadow-sm hover:shadow-md disabled:opacity-50"
          >
            📋 Summary
          </button>
        </div>

        {/* Notes Editor (textarea fallback; rich editor removed for React 19 compatibility) */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40">
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">Your Notes</h4>
            <span className="text-xs text-zinc-500">
              {isSaving ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Save failed' : 'Auto-save on'}
            </span>
          </div>
          <div className="p-3">
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Start taking notes about this video... Use the buttons above to generate study guides, transcripts, or summaries."
              className="w-full h-80 bg-transparent text-white placeholder-zinc-400 resize-none focus:outline-none"
            />
          </div>
        </div>

        {/* AI-Generated Content Preview */}
        {videoId && isLoading && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <h4 className="text-sm font-semibold text-white mb-3">Generating…</h4>
            <p className="text-sm text-zinc-400">Pulling AI content into your notes.</p>
          </div>
        )}

        <StudyPanel videoId={videoId} />
      </div>
    </div>
  )
}
