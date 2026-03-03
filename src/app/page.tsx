'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Bot, 
  MessageSquare, 
  Brain, 
  Heart, 
  Settings, 
  Zap,
  FileText,
  User,
  Sparkles,
  ArrowRight,
  Activity,
  Terminal,
  Clock
} from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [identity, setIdentity] = useState({
    name: 'Claw',
    creature: 'AI Assistant',
    vibe: 'Friendly & Helpful',
    emoji: '🦞',
    avatar: ''
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [stats, setStats] = useState({
    memories: 0,
    tasks: 0,
    skills: 6,
    messages: 0
  });

  useEffect(() => {
    // Load identity from API
    fetch('/api/identity')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setIdentity(data.identity);
          setIsInitialized(data.isInitialized);
        }
      });

    // Load stats
    Promise.all([
      fetch('/api/memory?action=all').then(r => r.json()),
      fetch('/api/heartbeat').then(r => r.json()),
      fetch('/api/skills?action=enabled').then(r => r.json())
    ]).then(([memories, tasks, skills]) => {
      setStats({
        memories: memories.memories?.length || 0,
        tasks: tasks.tasks?.filter((t: any) => t.enabled).length || 0,
        skills: skills.skills?.length || 6,
        messages: parseInt(localStorage.getItem('openclaw_message_count') || '0')
      });
    });
  }, []);

  const handleStartSetup = () => {
    router.push('/identity');
  };

  const handleGoToChat = () => {
    router.push('/chat');
  };

  const features = [
    {
      icon: Bot,
      title: 'AI 身份定制',
      description: '定义你的AI助手的名字、性格和外观',
      color: 'text-blue-500'
    },
    {
      icon: Brain,
      title: '持久记忆',
      description: 'AI拥有长期记忆，记住所有重要信息',
      color: 'text-purple-500'
    },
    {
      icon: Zap,
      title: '主动助手',
      description: '通过心跳机制主动检查任务和提醒',
      color: 'text-yellow-500'
    },
    {
      icon: MessageSquare,
      title: '流式对话',
      description: '实时流式响应，打字机效果展示',
      color: 'text-green-500'
    }
  ];

  const quickActions = [
    { label: '身份设置', icon: User, path: '/identity', color: 'blue' },
    { label: '工作空间', icon: FileText, path: '/workspace', color: 'purple' },
    { label: '技能插件', icon: Sparkles, path: '/skills', color: 'green' },
    { label: '心跳任务', icon: Activity, path: '/heartbeat', color: 'yellow' },
    { label: '记忆管理', icon: Brain, path: '/memory', color: 'pink' },
    { label: '系统设置', icon: Settings, path: '/settings', color: 'gray' }
  ];

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader className="text-center pb-8">
              <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-4xl shadow-lg shadow-orange-500/20">
                🦞
              </div>
              <CardTitle className="text-3xl font-bold text-white mb-2">
                欢迎来到 OpenClaw
              </CardTitle>
              <CardDescription className="text-slate-400 text-lg">
                本地优先的AI助手，真正能干活的数字员工
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {features.map((feature, index) => (
                  <div 
                    key={index}
                    className="p-4 rounded-lg bg-slate-700/30 border border-slate-600 hover:border-slate-500 transition-colors"
                  >
                    <feature.icon className={`w-6 h-6 ${feature.color} mb-2`} />
                    <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                    <p className="text-sm text-slate-400">{feature.description}</p>
                  </div>
                ))}
              </div>
              
              <div className="pt-4">
                <Button 
                  onClick={handleStartSetup}
                  className="w-full h-12 text-lg bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                >
                  开始配置你的AI助手
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Avatar className="w-14 h-14 border-2 border-orange-500">
              <AvatarImage src={identity.avatar} />
              <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-2xl">
                {identity.emoji}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                {identity.name}
                <Badge variant="secondary" className="bg-slate-700">
                  {identity.creature}
                </Badge>
              </h1>
              <p className="text-slate-400">{identity.vibe}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-slate-400">Gateway: 18789</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: '记忆条目', value: stats.memories, icon: Brain, color: 'purple' },
            { label: '活跃任务', value: stats.tasks, icon: Activity, color: 'yellow' },
            { label: '启用技能', value: stats.skills, icon: Sparkles, color: 'green' },
            { label: '今日对话', value: stats.messages, icon: MessageSquare, color: 'blue' }
          ].map((stat, index) => (
            <Card key={index} className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                  </div>
                  <stat.icon className={`w-8 h-8 text-${stat.color}-500`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <Card 
            className="bg-slate-800/50 border-slate-700 hover:border-blue-500/50 cursor-pointer transition-all hover:shadow-lg hover:shadow-blue-500/10"
            onClick={handleGoToChat}
          >
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-blue-500" />
              </div>
              <CardTitle className="text-white">开始对话</CardTitle>
              <CardDescription>
                与你的AI助手进行流式对话交互
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                打开聊天
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="bg-slate-800/50 border-slate-700 hover:border-purple-500/50 cursor-pointer transition-all hover:shadow-lg hover:shadow-purple-500/10"
            onClick={() => router.push('/memory')}
          >
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-purple-500" />
              </div>
              <CardTitle className="text-white">记忆管理</CardTitle>
              <CardDescription>
                查看和管理AI的长期记忆和日记
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                查看记忆
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="bg-slate-800/50 border-slate-700 hover:border-yellow-500/50 cursor-pointer transition-all hover:shadow-lg hover:shadow-yellow-500/10"
            onClick={() => router.push('/heartbeat')}
          >
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center mb-4">
                <Activity className="w-6 h-6 text-yellow-500" />
              </div>
              <CardTitle className="text-white">心跳任务</CardTitle>
              <CardDescription>
                配置AI的主动检查任务和提醒
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                管理任务
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-slate-400" />
            快速操作
          </h2>
          <div className="grid grid-cols-6 gap-4">
            {quickActions.map((action, index) => (
              <Button 
                key={index}
                variant="outline" 
                className="h-auto py-4 flex flex-col gap-2 border-slate-600 hover:border-slate-500"
                onClick={() => router.push(action.path)}
              >
                <action.icon className={`w-5 h-5 text-${action.color}-500`} />
                <span>{action.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* System Status */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-500" />
              系统状态
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-slate-400">Gateway: 运行中</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-slate-400">Agent: 就绪</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-slate-400">Memory: 正常</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-slate-400">LLM: 已连接</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
