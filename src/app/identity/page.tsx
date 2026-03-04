'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowLeft,
  Save,
  User,
  Sparkles,
  Bot
} from 'lucide-react';

const CREATURE_OPTIONS = [
  { value: 'AI Assistant', label: '🤖 AI助手', emoji: '🤖' },
  { value: 'Cat', label: '🐱 猫咪', emoji: '🐱' },
  { value: 'Dragon', label: '🐉 龙', emoji: '🐉' },
  { value: 'Fox', label: '🦊 狐狸', emoji: '🦊' },
  { value: 'Lobster', label: '🦞 龙虾', emoji: '🦞' },
  { value: 'Owl', label: '🦉 猫头鹰', emoji: '🦉' },
  { value: 'Robot', label: '🤖 机器人', emoji: '🤖' },
  { value: 'Wizard', label: '🧙‍♂️ 法师', emoji: '🧙‍♂️' },
  { value: 'Custom', label: '🎨 自定义', emoji: '✨' }
];

const VIBE_OPTIONS = [
  'Friendly & Helpful',
  'Professional & Efficient',
  'Creative & Playful',
  'Calm & Wise',
  'Energetic & Enthusiastic',
  'Mysterious & Deep',
  'Humorous & Witty'
];

export default function IdentityPage() {
  const router = useRouter();
  const [identity, setIdentity] = useState({
    name: '',
    creature: 'AI Assistant',
    vibe: 'Friendly & Helpful',
    emoji: '🤖',
    avatar: '',
    bio: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Load current identity
    fetch('/api/identity')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.identity) {
          setIdentity(data.identity);
          setIsInitialized(data.isInitialized);
        }
      });
  }, []);

  const handleSave = async () => {
    if (!identity.name.trim()) {
      alert('请输入名字');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(identity)
      });

      const data = await response.json();
      if (data.success) {
        setIsInitialized(true);
        // 保存成功后自动跳转到聊天页面
        setTimeout(() => {
          router.push('/chat');
        }, 500);
      }
    } catch (error) {
      console.error('Failed to save identity:', error);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreatureChange = (value: string) => {
    const option = CREATURE_OPTIONS.find(o => o.value === value);
    setIdentity(prev => ({
      ...prev,
      creature: value,
      emoji: option?.emoji || '✨'
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => router.push('/')}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">AI 身份设置</h1>
            <p className="text-slate-400">定制你的AI助手的个性和外观</p>
          </div>
        </div>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User className="w-5 h-5" />
              基本信息
            </CardTitle>
            <CardDescription>
              定义AI的核心身份特征
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Preview */}
            <div className="flex justify-center">
              <Avatar className="w-24 h-24 border-4 border-orange-500 shadow-lg shadow-orange-500/20">
                <AvatarImage src={identity.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-4xl">
                  {identity.emoji}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-300">名字</Label>
              <Input
                id="name"
                placeholder="给AI起个名字..."
                value={identity.name}
                onChange={(e) => setIdentity(prev => ({ ...prev, name: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            {/* Creature */}
            <div className="space-y-2">
              <Label className="text-slate-300">生物类型</Label>
              <Select value={identity.creature} onValueChange={handleCreatureChange}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="选择生物类型" />
                </SelectTrigger>
                <SelectContent>
                  {CREATURE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Vibe */}
            <div className="space-y-2">
              <Label className="text-slate-300">性格氛围</Label>
              <Select value={identity.vibe} onValueChange={(v) => setIdentity(prev => ({ ...prev, vibe: v }))}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="选择性格氛围" />
                </SelectTrigger>
                <SelectContent>
                  {VIBE_OPTIONS.map(vibe => (
                    <SelectItem key={vibe} value={vibe}>
                      {vibe}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio" className="text-slate-300">简介</Label>
              <Textarea
                id="bio"
                placeholder="AI的简短介绍..."
                value={identity.bio}
                onChange={(e) => setIdentity(prev => ({ ...prev, bio: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white min-h-[80px]"
              />
            </div>

            {/* Avatar URL */}
            <div className="space-y-2">
              <Label htmlFor="avatar" className="text-slate-300">头像URL（可选）</Label>
              <Input
                id="avatar"
                placeholder="https://..."
                value={identity.avatar}
                onChange={(e) => setIdentity(prev => ({ ...prev, avatar: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            {/* Save Button */}
            <Button 
              onClick={handleSave}
              disabled={isSaving || !identity.name.trim()}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
            >
              {isSaving ? (
                '保存中...'
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  保存身份
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="mt-6 p-4 rounded-lg bg-slate-800/30 border border-slate-700">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div>
              <h3 className="font-semibold text-white mb-1">身份说明</h3>
              <p className="text-sm text-slate-400">
                AI的身份信息将用于构建系统提示词，影响AI的回复风格和行为。
                名字和生物类型会在对话中体现。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
