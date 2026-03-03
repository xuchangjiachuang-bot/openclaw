'use client';

import { useState, useEffect } from 'react';
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
  Clock,
  User,
  Sparkles,
  ArrowRight,
  Activity
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

  useEffect(() => {
    // Check if identity exists
    const savedIdentity = localStorage.getItem('openclaw_identity');
    if (savedIdentity) {
      setIdentity(JSON.parse(savedIdentity));
      setIsInitialized(true);
    }
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
      title: '多平台接入',
      description: '支持Web、WhatsApp、Telegram等平台',
      color: 'text-green-500'
    }
  ];

  const stats = [
    { label: '记忆条目', value: '0', icon: Brain },
    { label: '心跳任务', value: '0', icon: Heart },
    { label: '技能插件', value: '0', icon: Sparkles },
    { label: '今日对话', value: '0', icon: MessageSquare }
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
                你的个人AI助手，本地优先，真正能干活的数字员工
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
            <span className="text-sm text-slate-400">在线</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                  </div>
                  <stat.icon className="w-8 h-8 text-slate-600" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-3 gap-6">
          <Card 
            className="bg-slate-800/50 border-slate-700 hover:border-orange-500/50 cursor-pointer transition-all hover:shadow-lg hover:shadow-orange-500/10"
            onClick={handleGoToChat}
          >
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-blue-500" />
              </div>
              <CardTitle className="text-white">开始对话</CardTitle>
              <CardDescription>
                与你的AI助手进行对话，让它帮你处理任务
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
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-white mb-4">快速操作</h2>
          <div className="grid grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col gap-2"
              onClick={() => router.push('/identity')}
            >
              <User className="w-5 h-5" />
              <span>身份设置</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col gap-2"
              onClick={() => router.push('/workspace')}
            >
              <FileText className="w-5 h-5" />
              <span>工作空间</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col gap-2"
              onClick={() => router.push('/skills')}
            >
              <Sparkles className="w-5 h-5" />
              <span>技能插件</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col gap-2"
              onClick={() => router.push('/settings')}
            >
              <Settings className="w-5 h-5" />
              <span>系统设置</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
