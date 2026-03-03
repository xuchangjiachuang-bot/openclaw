'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Send,
  Bot,
  User,
  Sparkles,
  MoreVertical,
  Trash2,
  RefreshCw
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatPage() {
  const router = useRouter();
  const [identity, setIdentity] = useState({
    name: 'Claw',
    creature: 'AI Assistant',
    vibe: 'Friendly & Helpful',
    emoji: '🦞',
    avatar: ''
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedIdentity = localStorage.getItem('openclaw_identity');
    if (savedIdentity) {
      setIdentity(JSON.parse(savedIdentity));
    }
    
    // Load chat history
    const savedMessages = localStorage.getItem('openclaw_chat_history');
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
  }, []);

  useEffect(() => {
    // Save chat history
    localStorage.setItem('openclaw_chat_history', JSON.stringify(messages));
    // Scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    const aiResponse = generateAIResponse(input, identity);
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsTyping(false);
  };

  const generateAIResponse = (userInput: string, identity: { name: string; vibe: string }) => {
    const responses = [
      `你好！我是${identity.name}，很高兴为你服务。有什么我可以帮你的吗？`,
      `我收到了你的消息："${userInput}"。作为你的AI助手，我会尽力帮助你。`,
      `这是一个很好的问题！让我想想...根据我的理解，我可以这样帮助你。`,
      `我在这里随时准备协助你。你刚才提到了重要的事情，让我来处理一下。`,
      `作为你的数字助手，我建议我们可以这样处理这个任务。`
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleClearHistory = () => {
    setMessages([]);
    localStorage.removeItem('openclaw_chat_history');
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => router.push('/')}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border-2 border-orange-500">
                <AvatarImage src={identity.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-lg">
                  {identity.emoji}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-lg font-semibold text-white">{identity.name}</h1>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-slate-400">在线</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleClearHistory}
              className="text-slate-400 hover:text-white"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="text-slate-400 hover:text-white"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-4xl shadow-lg shadow-orange-500/20">
                {identity.emoji}
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                你好，我是 {identity.name}
              </h2>
              <p className="text-slate-400 mb-8">
                {identity.vibe}，随时准备为你服务
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {['今天天气如何？', '帮我规划一下日程', '最近有什么新闻？', '讲个笑话吧'].map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setInput(suggestion)}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${
                message.role === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <Avatar className={`w-8 h-8 ${message.role === 'user' ? '' : 'border border-orange-500'}`}>
                {message.role === 'user' ? (
                  <AvatarFallback className="bg-slate-700">
                    <User className="w-4 h-4 text-slate-300" />
                  </AvatarFallback>
                ) : (
                  <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-sm">
                    {identity.emoji}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className={`max-w-[70%] ${message.role === 'user' ? 'text-right' : ''}`}>
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-700 text-slate-200'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                <p className={`text-xs text-slate-500 mt-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-start gap-3">
              <Avatar className="w-8 h-8 border border-orange-500">
                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-sm">
                  {identity.emoji}
                </AvatarFallback>
              </Avatar>
              <div className="bg-slate-700 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-slate-700 bg-slate-800/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex gap-3">
            <Input
              placeholder="输入消息..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
            />
            <Button 
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
