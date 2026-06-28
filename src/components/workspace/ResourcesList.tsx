"use client"

import { useMemo, useState, memo } from 'react'
import { 
  FileText, 
  Link, 
  Download, 
  ExternalLink, 
  BookOpen, 
  Video, 
  Image,
  File,
  ChevronRight,
  CheckCircle2,
  Plus,
  X
} from 'lucide-react'

interface Resource {
  id: string
  title: string
  type: 'document' | 'link' | 'video' | 'image' | 'other'
  url: string
  description?: string
  size?: string
  isDownloaded?: boolean
  isBookmarked?: boolean
}

interface ResourcesListProps {
  resources: Resource[]
  onResourceClick: (resource: Resource) => void
  onDownload: (resource: Resource) => void
  onBookmark: (resource: Resource) => void
  onAddResource?: (resource: Omit<Resource, 'id'>) => void
  isAdmin?: boolean
  className?: string
}

function ResourcesList({ 
  resources, 
  onResourceClick, 
  onDownload, 
  onBookmark,
  onAddResource,
  isAdmin = false,
  className = '' 
}: ResourcesListProps) {
  const [filter, setFilter] = useState<'all' | 'documents' | 'links' | 'videos' | 'images'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [collapsedResources, setCollapsedResources] = useState<Set<string>>(new Set())
  const [newResource, setNewResource] = useState({
    title: '',
    type: 'link' as Resource['type'],
    url: '',
    description: '',
  })

  const getResourceIcon = (type: Resource['type']) => {
    switch (type) {
      case 'document':
        return FileText
      case 'link':
        return Link
      case 'video':
        return Video
      case 'image':
        return Image
      default:
        return File
    }
  }

  const getResourceTypeLabel = (type: Resource['type']) => {
    switch (type) {
      case 'document':
        return 'Document'
      case 'link':
        return 'Link'
      case 'video':
        return 'Video'
      case 'image':
        return 'Image'
      default:
        return 'File'
    }
  }

  const toggleCollapse = (resourceId: string) => {
    setCollapsedResources(prev => {
      const newSet = new Set(prev)
      if (newSet.has(resourceId)) {
        newSet.delete(resourceId)
      } else {
        newSet.add(resourceId)
      }
      return newSet
    })
  }

  const filteredResources = useMemo(() => {
    return resources.filter(resource => {
      if (filter === 'all') return true
      return resource.type === (filter as string).slice(0, -1) as any
    })
  }, [resources, filter])

  const resourceCounts = useMemo(() => ({
    all: resources.length,
    documents: resources.filter(r => r.type === 'document').length,
    links: resources.filter(r => r.type === 'link').length,
    videos: resources.filter(r => r.type === 'video').length,
    images: resources.filter(r => r.type === 'image').length,
  }), [resources])

  const handleAddResource = () => {
    if (onAddResource && newResource.title && newResource.url) {
      onAddResource(newResource)
      setNewResource({ title: '', type: 'link', url: '', description: '' })
      setShowAddModal(false)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Resources</h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{filteredResources.length} items</span>
          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          )}
        </div>
      </div>

      {/* Add Resource Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Add Resource</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                <input
                  type="text"
                  value={newResource.title}
                  onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Resource title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                <select
                  value={newResource.type}
                  onChange={(e) => setNewResource({ ...newResource, type: e.target.value as Resource['type'] })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="link">Link</option>
                  <option value="document">Document</option>
                  <option value="video">Video</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">URL</label>
                <input
                  type="url"
                  value={newResource.url}
                  onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description (optional)</label>
                <textarea
                  value={newResource.description}
                  onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Brief description..."
                  rows={3}
                />
              </div>
              
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddResource}
                  disabled={!newResource.title || !newResource.url}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  Add Resource
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-gray-800/50">
        {[
          { key: 'all', label: 'All', count: resourceCounts.all },
          { key: 'documents', label: 'Docs', count: resourceCounts.documents },
          { key: 'links', label: 'Links', count: resourceCounts.links },
          { key: 'videos', label: 'Videos', count: resourceCounts.videos },
          { key: 'images', label: 'Images', count: resourceCounts.images },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key as any)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {label}
            <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Resources List */}
      <div className="space-y-2">
        {filteredResources.map((resource) => {
          const Icon = getResourceIcon(resource.type)
          const isExternal = resource.type === 'link'

          return (
            <div
              key={resource.id}
              className="group rounded-xl border border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05] transition-all duration-200"
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-10 h-10 rounded-lg bg-gray-800/50 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-white truncate group-hover:text-blue-400 transition-colors">
                          {resource.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
                            {getResourceTypeLabel(resource.type)}
                          </span>
                          {resource.size && (
                            <span className="text-xs text-gray-500">
                              {resource.size}
                            </span>
                          )}
                          {resource.isDownloaded && (
                            <span className="text-xs text-green-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Downloaded
                            </span>
                          )}
                        </div>
                        {!collapsedResources.has(resource.id) && resource.description && (
                          <p className="text-sm text-gray-300 mt-2 line-clamp-2">
                            {resource.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleCollapse(resource.id)
                          }}
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                        >
                          {collapsedResources.has(resource.id) ? (
                            <ChevronRight className="w-4 h-4 text-gray-400 hover:text-white transition-colors" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400 hover:text-white transition-colors rotate-90" />
                          )}
                        </button>
                        {isExternal && (
                          <ExternalLink className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {!collapsedResources.has(resource.id) && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
                  <button
                    onClick={() => onResourceClick(resource)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <BookOpen className="w-4 h-4" />
                    Open
                  </button>

                  {resource.type !== 'link' && (
                    <button
                      onClick={() => onDownload(resource)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  )}

                  <button
                    onClick={() => onBookmark(resource)}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      resource.isBookmarked
                        ? 'text-blue-400 bg-blue-500/10'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    {resource.isBookmarked ? 'Bookmarked' : 'Bookmark'}
                  </button>
                </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {filteredResources.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800/50 flex items-center justify-center">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="text-lg font-medium text-white mb-2">No resources found</h4>
          <p className="text-gray-400 text-sm">
            {filter === 'all' 
              ? 'Resources will appear here once video processing completes.'
              : `No ${filter} found. Try a different filter.`
            }
          </p>
        </div>
      )}
    </div>
  )
}

export default memo(ResourcesList)
