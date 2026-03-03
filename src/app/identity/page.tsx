'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Save, 
  Sparkles,
  Bot,
  Smile,
  Image as ImageIcon
} from 'lucide-react';

const creatureOptions = [
  { value: 'AI Assistant', label: 'AI 助手', emoji: '🤖' },
  { value: 'Robot', label: '机器人', emoji: '🤖' },
  { value: 'Ghost', label: '幽灵', emoji: '👻' },
  { value: 'Spirit', label: '精灵', emoji: '✨' },
  { value: 'Dragon', label: '龙', emoji: '🐉' },
  { value: 'Cat', label: '猫咪', emoji: '🐱' },
  { value: 'Fox', label: '狐狸', emoji: '🦊' },
  { value: 'Lobster', label: '龙虾', emoji: '🦞' }
];

const vibeOptions = [
  { value: 'Friendly & Helpful', label: '友好且乐于助人' },
  { value: 'Professional & Efficient', label: '专业且高效' },
  { value: 'Witty & Humorous', label: '机智且幽默' },
  { value: 'Calm & Wise', label: '冷静且睿智' },
  { value: 'Energetic & Enthusiastic', label: '充满活力和热情' },
  { value: 'Minimal & Direct', label: '简洁且直接' }
];

export default function IdentityPage() {
  const router = useRouter();
  const [identity, setIdentity] = useState({
    name: '',
    creature: 'Lobster',
    vibe: 'Friendly & Helpful',
    emoji: '🦞',
    avatar: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const savedIdentity = localStorage.getItem('openclaw_identity');
    if (savedIdentity) {
      setIdentity(JSON.parse(savedIdentity));
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    // Save to localStorage (simulating file system storage)
    localStorage.setItem('openclaw_identity', JSON.stringify(identity));
    
    // Simulate saving delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setIsSaving(false);
    router.push('/');
  };

  const selectedCreature = creatureOptions.find(c => c.value === identity.creature);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
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
            <h1 className="text-2xl font-bold text-white">AI 身份配置</h1>
            <p className="text-slate-400">定义你的AI助手是谁</p>
          </div>
        </div>

        {/* Preview Card */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-500" />
              预览
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <Avatar className="w-20 h-20 border-2 border-orange-500">
                <AvatarImage src={identity.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-3xl">
                  {identity.emoji || '🦞'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {identity.name || '未命名'}
                  {identity.creature && (
                    <Badge variant="secondary" className="bg-slate-700">
                      {selectedCreature?.emoji} {selectedCreature?.label}
                    </Badge>
                  )}
                </h2>
                <p className="text-slate-400">{identity.vibe}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Form */}
        <div className="grid grid-cols-2 gap-6">
          {/* Basic Info */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-blue-500" />
                基本信息
              </CardTitle>
              <CardDescription>给你的AI起个名字，选择它的类型</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-300">名字</Label>
                <Input
                  id="name"
                  placeholder="例如：Claw, Nova, Max..."
                  value={identity.name}
                  onChange={(e) => setIdentity({ ...identity, name: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">生物类型</Label>
                <div className="grid grid-cols-4 gap-2">
                  {creatureOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={identity.creature === option.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIdentity({ 
                        ...identity, 
                        creature: option.value,
                        emoji: option.emoji 
                      })}
                      className={identity.creature === option.value 
                        ? "bg-orange-500 hover:bg-orange-600" 
                        : "border-slate-600 text-slate-300"
                      }
                    >
                      <span className="mr-1">{option.emoji}</span>
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personality */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Smile className="w-5 h-5 text-purple-500" />
                性格风格
              </CardTitle>
              <CardDescription>你的AI助手会是什么风格</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">对话风格</Label>
                <div className="space-y-2">
                  {vibeOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={identity.vibe === option.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIdentity({ ...identity, vibe: option.value })}
                      className={`w-full justify-start ${
                        identity.vibe === option.value 
                          ? "bg-purple-500 hover:bg-purple-600" 
                          : "border-slate-600 text-slate-300"
                      }`}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Avatar */}
          <Card className="bg-slate-800/50 border-slate-700 col-span-2">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-green-500" />
                头像设置
              </CardTitle>
              <CardDescription>自定义AI的头像图片</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-6">
                <Avatar className="w-24 h-24 border-2 border-slate-600">
                  <AvatarImage src={identity.avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-4xl">
                    {identity.emoji || '🦞'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="avatar" className="text-slate-300">头像URL</Label>
                  <Input
                    id="avatar"
                    placeholder="输入图片URL或留空使用emoji"
                    value={identity.avatar}
                    onChange={(e) => setIdentity({ ...identity, avatar: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                  />
                  <p className="text-xs text-slate-500">
                    建议使用正方形图片，支持 jpg, png, gif 格式
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end gap-4">
          <Button 
            variant="outline" 
            onClick={() => router.push('/')}
            className="border-slate-600 text-slate-300"
          >
            取消
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
          >
            {isSaving ? (
              <>保存中...</>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                保存身份
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
