'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Share2, Copy, Check } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  onShare?: (messages: Message[]) => void;
  initialMessages?: Message[];
  disabled?: boolean;
}

export default function ChatInterface({ onShare, initialMessages = [], disabled = false }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || disabled) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Simulate AI response (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const aiMessage: Message = {
        role: 'assistant',
        content: `This is a simulated AI response to: "${userMessage.content}". In a real implementation, this would connect to your AI service.`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (messages.length === 0) return;
    
    if (onShare) {
      onShare(messages);
    } else {
      // Default sharing behavior
      try {
        const response = await fetch('/api/chat/share', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: `Chat from ${new Date().toLocaleDateString()}`,
            messages: messages.map(msg => ({
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp.toISOString()
            })),
            isPublic: true,
            metadata: {
              tags: ['demo'],
              description: 'Shared chat conversation'
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Copy share link to clipboard
            await navigator.clipboard.writeText(data.shareUrl);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
          }
        }
      } catch (error) {
        console.error('Error sharing chat:', error);
      }
    }
  };

  const copyChatText = async () => {
    const chatText = messages.map(msg => 
      `${msg.role === 'user' ? 'You' : 'AI'}: ${msg.content}`
    ).join('\n\n');
    
    try {
      await navigator.clipboard.writeText(chatText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 rounded-xl border border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <h3 className="text-lg font-semibold">Chat Interface</h3>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <>
              <button
                onClick={copyChatText}
                className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                {copySuccess ? (
                  <>
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 text-sm">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span className="text-sm">Copy</span>
                  </>
                )}
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span className="text-sm">Share</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-zinc-400 py-8">
            <p>Start a conversation to see messages here.</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl px-4 py-3 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-800 text-zinc-100'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                <div
                  className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-zinc-400'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 text-zinc-100 px-4 py-3 rounded-2xl">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-zinc-400"></div>
                <span>AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-800">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading || disabled}
            className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || disabled}
            className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
