'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Plus, X, Video, FileText, Trophy, Users, Lock, Globe, Check } from 'lucide-react'

interface PodFormData {
  name: string
  description: string
  skills: string[]
  videos: string[]
  resources: string[]
  rewards: string[]
}

export default function CreatePodPage() {
  const router = useRouter()
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<PodFormData>({
    name: '',
    description: '',
    skills: [],
    videos: [],
    resources: [],
    rewards: []
  })

  const [newSkill, setNewSkill] = useState('')
  const [newVideo, setNewVideo] = useState('')
  const [newResource, setNewResource] = useState('')
  const [newReward, setNewReward] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  
  // Common skills/rewards for autocomplete suggestions
  const commonSkills = useMemo(() => [
    'React', 'JavaScript', 'TypeScript', 'Python', 'Node.js', 'SQL', 'CSS', 'HTML',
    'State Management', 'API Design', 'Testing', 'Git', 'Docker', 'AWS',
    'Component Architecture', 'Performance Optimization', 'Security Best Practices'
  ], [])
  
  const commonRewards = useMemo(() => [
    'Certificate of Completion', 'Digital Badge', 'Free Pro Access (1 month)',
    'Project Template Access', 'Community Recognition', 'Priority Support'
  ], [])
  
  const skillSuggestions = useMemo(() => 
    newSkill.trim() ? commonSkills.filter(s => 
      s.toLowerCase().includes(newSkill.toLowerCase()) && !formData.skills.includes(s)
    ).slice(0, 5) : []
  , [newSkill, commonSkills, formData.skills])
  
  const rewardSuggestions = useMemo(() => 
    newReward.trim() ? commonRewards.filter(r => 
      r.toLowerCase().includes(newReward.toLowerCase()) && !formData.rewards.includes(r)
    ).slice(0, 5) : []
  , [newReward, commonRewards, formData.rewards])

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }))
      setNewSkill('')
    }
  }

  const addVideo = () => {
    if (newVideo.trim() && !formData.videos.includes(newVideo.trim())) {
      setFormData(prev => ({
        ...prev,
        videos: [...prev.videos, newVideo.trim()]
      }))
      setNewVideo('')
    }
  }

  const addResource = () => {
    if (newResource.trim() && !formData.resources.includes(newResource.trim())) {
      setFormData(prev => ({
        ...prev,
        resources: [...prev.resources, newResource.trim()]
      }))
      setNewResource('')
    }
  }

  const addReward = () => {
    if (newReward.trim() && !formData.rewards.includes(newReward.trim())) {
      setFormData(prev => ({
        ...prev,
        rewards: [...prev.rewards, newReward.trim()]
      }))
      setNewReward('')
    }
  }

  const removeItem = (type: keyof Omit<PodFormData, 'name' | 'description'>, item: string) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter(i => i !== item)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setLoading(true)
    try {
      // Extract video IDs from URLs
      const videoIds = formData.videos.map(url => {
        const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
        return ytMatch ? ytMatch[1] : url
      })
      
      const response = await fetch('/api/pods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.name,
          description: formData.description,
          videos: videoIds,
          skills: formData.skills,
          rewards: formData.rewards,
          resources: formData.resources,
          settings: {
            isPublic,
            allowInvites: true,
            maxMembers: 50
          }
        })
      })

      const data = await response.json()
      if (data.success && data.pod) {
        router.push(`/pods/${data.pod.id}`)
      } else {
        alert(data.error || 'Failed to create pod')
      }
    } catch (error) {
      console.error('Error creating pod:', error)
      alert('Failed to create pod')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in</h1>
          <p className="text-zinc-400">You need to be signed in to create a pod.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Learning Pod</h1>
          <p className="text-zinc-400">Organize videos and resources into a structured learning pathway.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Pod Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., React Fundamentals, Python for Beginners"
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what learners will achieve in this pod..."
                rows={3}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
            
            {/* Privacy Toggle */}
            <div className="flex items-center gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-zinc-300">Public pod (anyone can join)</span>
              </label>
              <div className="flex items-center gap-1 text-xs text-zinc-500">
                {isPublic ? (
                  <>
                    <Globe className="w-3 h-3" />
                    Public
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3" />
                    Invite-only
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-zinc-300">
              Skills Learners Will Acquire
            </label>
            <div className="relative">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="e.g., React Hooks, State Management"
                  className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  onFocus={() => setNewSkill(newSkill)} // Keep current value
                />
                <button
                  type="button"
                  onClick={addSkill}
                  disabled={!newSkill.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {/* Autocomplete suggestions */}
              {skillSuggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {skillSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, skills: [...prev.skills, suggestion] }))
                        setNewSkill('')
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-zinc-700 text-sm text-white transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {formData.skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeItem('skills', skill)}
                      className="hover:text-blue-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Videos */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-zinc-300">
              YouTube Videos (in order)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={newVideo}
                onChange={(e) => setNewVideo(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addVideo())}
              />
              <button
                type="button"
                onClick={addVideo}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {formData.videos.length > 0 && (
              <div className="space-y-2">
                {formData.videos.map((video, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-lg"
                  >
                    <Video className="w-4 h-4 text-zinc-400" />
                    <span className="flex-1 text-sm text-zinc-300 truncate">{video}</span>
                    <button
                      type="button"
                      onClick={() => removeItem('videos', video)}
                      className="text-zinc-400 hover:text-zinc-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-zinc-300">
              Additional Resources
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={newResource}
                onChange={(e) => setNewResource(e.target.value)}
                placeholder="https://docs.example.com, https://github.com/..."
                className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addResource())}
              />
              <button
                type="button"
                onClick={addResource}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {formData.resources.length > 0 && (
              <div className="space-y-2">
                {formData.resources.map((resource, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-lg"
                  >
                    <FileText className="w-4 h-4 text-zinc-400" />
                    <span className="flex-1 text-sm text-zinc-300 truncate">{resource}</span>
                    <button
                      type="button"
                      onClick={() => removeItem('resources', resource)}
                      className="text-zinc-400 hover:text-zinc-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rewards */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-zinc-300">
              Completion Rewards
            </label>
            <div className="relative">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newReward}
                  onChange={(e) => setNewReward(e.target.value)}
                  placeholder="e.g., Certificate, Badge, Free Pro Access"
                  className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addReward())}
                />
                <button
                  type="button"
                  onClick={addReward}
                  disabled={!newReward.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {/* Autocomplete suggestions */}
              {rewardSuggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {rewardSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, rewards: [...prev.rewards, suggestion] }))
                        setNewReward('')
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-zinc-700 text-sm text-white transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {formData.rewards.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.rewards.map((reward, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm"
                  >
                    <Trophy className="w-3 h-3" />
                    {reward}
                    <button
                      type="button"
                      onClick={() => removeItem('rewards', reward)}
                      className="hover:text-green-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.name.trim() || loading}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all duration-200 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  Create Pod
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
