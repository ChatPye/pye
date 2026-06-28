'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Play, Loader2, MessageSquare, FileText, Scroll, Bot, User, Sparkles, Video, Clock, Eye, Calendar, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import apiConfig from '@/config/api';
import { DEMO_VIDEO_ID, DEMO_VIDEO_METADATA, DEMO_TRANSCRIPT, DEMO_VIDEO_SUMMARY, DEMO_CACHED_RESPONSES } from '@/data/demo-transcript';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  timestampText: string;
}

interface VideoMetadata {
  title: string;
  description: string;
  channel: string;
  views: number;
  duration: string;
  thumbnail: string;
  published: string;
  viewCount: string;
  likeCount: string;
  commentCount: string;
}

interface VideoSummary {
  summary: string;
  fullTranscript: Array<{
    id: number;
    text: string;
    timestamp: string;
  }>;
  processedAt: string;
}

export default function YouTubeChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hi! I'm your AI tutor. Ask me anything about this video or try one of the prompts below to get started.",
      timestamp: new Date(),
      timestampText: new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  
  // Debug input message changes
  useEffect(() => {
    console.log('📝 Input message updated:', inputMessage);
  }, [inputMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'notes'>('chat');
  const [videoData, setVideoData] = useState<{videoId: string, title: string, transcript: string, processedAt: Date} | null>(null);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [videoSummary, setVideoSummary] = useState<VideoSummary | null>(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  // simple retrieval helpers
  const tokenize = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const score = (text: string, terms: string[]) => {
    const t = tokenize(text);
    let c = 0; for (const w of terms) if (t.includes(w)) c++; return c;
  };
  const bestSentences = (q: string, transcript: string) => {
    const terms = tokenize(q);
    const sentences = transcript.split(/\.|\!|\?|\n/).map(s => s.trim()).filter(Boolean);
    const items = sentences.map(text => ({ text, s: score(text, terms) }));
    items.sort((a,b)=>b.s-a.s);
    return items.filter(x=>x.s>0).slice(0,3).map(x=>x.text);
  };

  // Use demo video data
  const videoId = DEMO_VIDEO_ID;

  const scrollToBottom = () => {
    // Only scroll within the chat container, not the entire page
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };


  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize demo data immediately
  const initializeDemoData = () => {
    // Set video data
    setVideoData({
      videoId: DEMO_VIDEO_ID,
      title: DEMO_VIDEO_METADATA.title,
      transcript: JSON.stringify(DEMO_TRANSCRIPT),
      processedAt: new Date()
    });
    
    // Set AI-generated summary for Notes tab
    setVideoSummary({
      summary: DEMO_VIDEO_SUMMARY.summary,
      fullTranscript: DEMO_TRANSCRIPT.map((segment, index) => ({
        id: index,
        text: segment.text,
        timestamp: formatTimestamp(segment.start)
      })),
      processedAt: DEMO_VIDEO_SUMMARY.processedAt
    });
    
    // Set key points as notes
    setNotes(DEMO_VIDEO_SUMMARY.keyPoints);
    
    // Set video metadata
    setVideoMetadata({
      title: DEMO_VIDEO_METADATA.title,
      description: DEMO_VIDEO_METADATA.description,
      channel: DEMO_VIDEO_METADATA.channel,
      views: DEMO_VIDEO_METADATA.views,
      duration: 'N/A',
      thumbnail: DEMO_VIDEO_METADATA.thumbnail,
      published: DEMO_VIDEO_METADATA.published,
      viewCount: DEMO_VIDEO_METADATA.views.toString(),
      likeCount: '',
      commentCount: ''
    });
  };

  // Helper function to format timestamps
  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize demo data when component loads
  useEffect(() => {
    initializeDemoData();
  }, []);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
      timestampText: new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      // Check for cached responses first (for demo purposes)
      const questionLower = currentMessage.toLowerCase();
      let cachedResponse = '';
      
      for (const [key, response] of Object.entries(DEMO_CACHED_RESPONSES)) {
        if (questionLower.includes(key)) {
          cachedResponse = response;
          break;
        }
      }
      
      if (cachedResponse) {
        // Use cached response with simulated streaming for better UX
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: '',
          timestamp: new Date(),
          timestampText: new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
        };
        
        setMessages(prev => [...prev, aiResponse]);
        
        // Simulate streaming by adding words progressively
        const words = cachedResponse.split(' ');
        let currentText = '';
        
        const streamInterval = setInterval(() => {
          if (words.length > 0) {
            const word = words.shift();
            currentText += (currentText ? ' ' : '') + word;
            
            setMessages(prev => 
              prev.map(msg => 
                msg.id === aiResponse.id 
                  ? { ...msg, content: currentText }
                  : msg
              )
            );
            
            scrollToBottom();
          } else {
            clearInterval(streamInterval);
            setIsLoading(false);
          }
        }, 30); // Faster streaming for better responsiveness
        
        return;
      }
      
      // Fallback to API if no cached response
      const apiUrl = apiConfig.getEndpoint('chat');
      const chatResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentMessage,
          videoId: videoId,
          transcript: DEMO_TRANSCRIPT
        })
      });

      if (chatResponse.ok && chatResponse.body) {
        const reader = chatResponse.body.getReader();
        const decoder = new TextDecoder();
        let aiResponseText = '';
        
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: '',
          timestamp: new Date(),
          timestampText: new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
        };
        
        setMessages(prev => [...prev, aiResponse]);
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.text) {
                    aiResponseText += data.text;
                    setMessages(prev => 
                      prev.map(msg => 
                        msg.id === aiResponse.id 
                          ? { ...msg, content: aiResponseText }
                          : msg
                      )
                    );
                    scrollToBottom();
                  }
                  if (data.done) break;
                } catch (e) {
                  // Ignore parsing errors
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      } else {
        // Fallback: retrieval over transcript
        const hits = bestSentences(currentMessage, DEMO_TRANSCRIPT.map(s => s.text).join(' '));
        const fallback = hits.length ? hits.join(' ') : 'I could not find that in the transcript. Try another question.';
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: fallback,
          timestamp: new Date(),
          timestampText: new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
        };
        setMessages(prev => [...prev, aiResponse]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      
      // Show user-friendly error message
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Sorry, I encountered an error. Let me try to find relevant information in the transcript...',
        timestamp: new Date(),
        timestampText: new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
      };
      setMessages(prev => [...prev, aiResponse]);
      
      // Final fallback to transcript search
      setTimeout(() => {
        const hits = bestSentences(currentMessage, DEMO_TRANSCRIPT.map(s => s.text).join(' '));
        const fallback = hits.length ? hits.join(' ') : 'I could not find that in the transcript. Try another question.';
        const fallbackResponse: Message = {
          id: (Date.now() + 2).toString(),
          type: 'ai',
          content: fallback,
          timestamp: new Date(),
          timestampText: new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
        };
        setMessages(prev => [...prev, fallbackResponse]);
      }, 1000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatViews = (views: number | string) => {
    const num = typeof views === 'string' ? parseInt(views) : views;
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M views`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K views`;
    }
    return `${num} views`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <section id="youtube-chat" className="pt-12 pb-32 bg-gradient-to-b from-zinc-900 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-300 backdrop-blur mb-4">
            <Sparkles className="w-4 h-4 text-blue-400" />
            Try ChatPye
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3">
            Experience AI-Powered
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent"> Video Learning</span>
          </h2>
          <p className="text-base md:text-lg text-zinc-400 max-w-3xl mx-auto">
            Chat with any video using our advanced AI. Ask questions, get explanations, and learn interactively.
          </p>
        </div>

        {/* Main Interface - Responsive height */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 h-auto lg:h-[600px]">
          {/* Video Section */}
          <div className="lg:col-span-7 flex flex-col gap-3 lg:gap-4">
            {/* Video Player */}
            <div className="rounded-xl lg:rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl h-[240px] lg:h-[400px]">
              {/* Video Header */}
              <div className="p-2 lg:p-3 border-b border-zinc-800 bg-zinc-900/50">
                <div className="flex items-center gap-2 lg:gap-3">
                  <Video className="w-3 h-3 lg:w-4 lg:h-4 text-blue-400" />
                  <h3 className="text-sm lg:text-base font-semibold text-white">Training Video</h3>
                  {videoData && (
                    <div className="flex items-center gap-1 lg:gap-2 ml-auto">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      <span className="text-xs text-zinc-400">Processed</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Video Container - Fixed aspect ratio */}
              <div className="relative h-[calc(100%-60px)] bg-zinc-900">
                <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                  <div className="text-center">
                    <Play className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                    <p className="text-sm text-zinc-400">Loading video...</p>
                  </div>
                </div>
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0&modestbranding=1`}
                  title="ChatPye Demo Video"
                  className="w-full h-full absolute inset-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  onLoad={() => setIsVideoLoaded(true)}
                  suppressHydrationWarning
                />
                {!isVideoLoaded && (
                  <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
                    <div className="text-center">
                      <Play className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                      <p className="text-sm text-zinc-400">Loading video...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Video Metadata Card - Mobile responsive */}
            <div className="rounded-xl lg:rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl h-[180px] lg:h-[180px]">
              {isLoadingMetadata ? (
                <div className="p-3 lg:p-4 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 lg:w-5 lg:h-5 animate-spin text-zinc-400" />
                  <span className="ml-2 text-xs lg:text-sm text-zinc-400">Loading video info...</span>
                </div>
              ) : videoMetadata ? (
                <div className="p-3 lg:p-4">
                  <h3 className="text-base lg:text-lg font-bold text-white mb-2 line-clamp-2">
                    {videoMetadata.title}
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-2 lg:gap-3 text-xs text-zinc-400 mb-2 lg:mb-3">
                    <div className="flex items-center gap-1">
                      <UserIcon className="w-3 h-3" />
                      <span className="truncate">{videoMetadata.channel}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>{formatViews(videoMetadata.views)}</span>
                    </div>
                    {videoMetadata.published && videoMetadata.published !== 'N/A' && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span className="hidden sm:inline">{formatDate(videoMetadata.published)}</span>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-zinc-300 text-xs line-clamp-2 leading-relaxed">
                    {videoMetadata.description || ''}
                  </p>
                </div>
              ) : (
                <div className="p-3 lg:p-4 text-center text-zinc-400">
                  <Video className="w-5 h-5 lg:w-6 lg:h-6 mx-auto mb-2 text-zinc-500" />
                  <p className="text-xs lg:text-sm">Loading video information...</p>
                </div>
              )}
            </div>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-5">
            <div className="h-[540px] lg:h-[600px] rounded-xl lg:rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl flex flex-col">
              {/* Chat Header */}
              <div className="p-2 lg:p-3 border-b border-zinc-800 bg-zinc-900/50">
                <div className="flex items-center gap-2">
                  <Bot className="w-3 h-3 lg:w-4 lg:h-4 text-green-400" />
                  <h3 className="text-sm lg:text-base font-semibold text-white">ChatPye</h3>
                  <div className="flex items-center gap-1 ml-auto">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-zinc-400">Online</span>
                  </div>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-zinc-800">
                <button
                  onClick={() => setActiveTab('chat')}
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
                  onClick={() => setActiveTab('notes')}
                  className={`flex-1 px-2 lg:px-3 py-2 text-xs font-medium transition-colors ${
                    activeTab === 'notes'
                      ? 'text-white bg-zinc-800 border-b-2 border-blue-400'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  <FileText className="w-3 h-3 inline mr-1" />
                  <span className="hidden sm:inline">Notes</span>
                </button>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {activeTab === 'chat' && (
                  <>
                    {/* Messages */}
                    <div 
                      ref={chatContainerRef}
                      className="flex-1 overflow-y-auto p-3 space-y-3"
                      style={{ maxHeight: 'calc(100% - 70px)' }}
                    >
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex gap-2 ${
                            message.type === 'user' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {message.type === 'ai' && (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                              <Bot className="w-3 h-3 text-white" />
                            </div>
                          )}
                          <div
                            className={`max-w-[80%] rounded-xl px-3 py-2 ${
                              message.type === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-zinc-800 text-zinc-100'
                            }`}
                          >
                            <p className="text-xs leading-relaxed">{message.content}</p>
                            <p className="text-[10px] opacity-70 mt-1" suppressHydrationWarning>
                              {message.timestampText}
                            </p>
                          </div>
                          {message.type === 'user' && (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                              <User className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex gap-2 justify-start">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-3 h-3 text-white" />
                          </div>
                          <div className="bg-zinc-800 rounded-xl px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                              <span className="text-xs text-zinc-400">AI is thinking...</span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Prompt Templates */}
                    <div className="p-3 border-t border-zinc-800 bg-zinc-900/30">
                      <div className="text-xs text-zinc-400 mb-2">Try these prompts:</div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('📝 Summarize button clicked');
                            setInputMessage("Summarize the key points of this video");
                            // Auto-send the message
                            setTimeout(() => {
                              handleSendMessage();
                            }, 100);
                          }}
                          className="px-3 py-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 active:from-blue-600/40 active:to-purple-600/40 text-zinc-200 hover:text-white text-xs rounded-lg border border-blue-500/30 hover:border-blue-500/50 transition-all duration-200 cursor-pointer select-none font-medium shadow-sm hover:shadow-md"
                          type="button"
                        >
                          📝 Summarize key points
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('⭐ Main features button clicked');
                            setInputMessage("What are the main features discussed?");
                            // Auto-send the message
                            setTimeout(() => {
                              handleSendMessage();
                            }, 100);
                          }}
                          className="px-3 py-2 bg-gradient-to-r from-emerald-600/20 to-green-600/20 hover:from-emerald-600/30 hover:to-green-600/30 active:from-emerald-600/40 active:to-green-600/40 text-zinc-200 hover:text-white text-xs rounded-lg border border-emerald-500/30 hover:border-emerald-500/50 transition-all duration-200 cursor-pointer select-none font-medium shadow-sm hover:shadow-md"
                          type="button"
                        >
                          ⭐ Main features
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('🔧 How it works button clicked');
                            setInputMessage("How does this technology work?");
                            // Auto-send the message
                            setTimeout(() => {
                              handleSendMessage();
                            }, 100);
                          }}
                          className="px-3 py-2 bg-gradient-to-r from-amber-600/20 to-orange-600/20 hover:from-amber-600/30 hover:to-orange-600/30 active:from-amber-600/40 active:to-orange-600/40 text-zinc-200 hover:text-white text-xs rounded-lg border border-amber-500/30 hover:border-amber-500/50 transition-all duration-200 cursor-pointer select-none font-medium shadow-sm hover:shadow-md"
                          type="button"
                        >
                          🔧 How it works
                        </button>
                      </div>
                    </div>

                    {/* Input Area */}
                    <div className="p-3 border-t border-zinc-800 bg-zinc-900/50">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Ask about the video content..."
                          className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          disabled={isLoading}
                        />
                        <button
                          onClick={handleSendMessage}
                          disabled={isLoading || !inputMessage.trim()}
                          className="px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
                        >
                          <Send className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'notes' && (
                  <div className="flex-1 p-3 overflow-y-auto">
                    <div className="max-w-full mx-auto">
                      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 mb-4">
                        <h4 className="text-sm font-semibold text-white mb-3">AI-Generated Summary</h4>
                        {videoSummary && videoSummary.summary ? (
                          <div className="text-sm text-zinc-300 text-left space-y-3">
                            <p className="leading-relaxed">{videoSummary.summary}</p>
                          </div>
                        ) : (
                          <div className="text-sm text-zinc-300 text-left space-y-2">
                            <p>Loading AI-generated summary...</p>
                          </div>
                        )}
                      </div>
                      
                      {notes.length > 0 && (
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 mb-4">
                          <h4 className="text-sm font-semibold text-white mb-3">Key Points</h4>
                          <ul className="text-sm text-zinc-300 space-y-2">
                            {notes.map((note, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-blue-400 mt-1">•</span>
                                <span className="leading-relaxed">{note}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <div className="text-center">
                        <Link href="/start" className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 font-semibold">
                          Sign in to add your notes
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}