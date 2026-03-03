'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  ArrowLeft,
  Sparkles,
  Terminal,
  Globe,
  FileText,
  Database,
  Cpu,
  Image,
  Code,
  Zap,
  Plus,
  Trash2
} from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  author: string;
  enabled: boolean;
  priority: number;
  trigger_keywords?: string[];
  config?: Record<string, any>;
}

const CATEGORY_ICONS: Record<string, any> = {
  'search': Globe,
  'file': FileText,
  'database': Database,
  'ai': Cpu,
  'image': Image,
  'code': Code,
  'system': Terminal,
  'other': Sparkles
};

const CATEGORY_COLORS: Record<string, string> = {
  'search': 'text-blue-500',
  'file': 'text-green-500',
  'database': 'text-purple-500',
  'ai': 'text-yellow-500',
  'image': 'text-pink-500',
  'code': 'text-cyan-500',
  'system': 'text-red-500',
  'other': 'text-slate-500'
};

export default function SkillsPage() {
  const router = useRouter();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/skills?action=all');
      const data = await response.json();
      if (data.success) {
        setSkills(data.skills);
      }
    } catch (error) {
      console.error('Failed to load skills:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSkill = async (skillId: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: enabled ? 'enable' : 'disable',
          skillId
        })
      });

      if (response.ok) {
        setSkills(prev => prev.map(s => 
          s.id === skillId ? { ...s, enabled } : s
        ));
      }
    } catch (error) {
      console.error('Failed to toggle skill:', error);
    }
  };

  const handleAddCustomSkill = async () => {
    const name = prompt('技能名称:');
    if (!name) return;

    const description = prompt('技能描述:');
    if (!description) return;

    try {
      const response = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          skill: {
            name,
            description,
            category: 'other',
            version: '1.0.0',
            author: 'user',
            enabled: true,
            priority: 5,
            trigger_keywords: [],
            config: {}
          }
        })
      });

      if (response.ok) {
        loadSkills();
      }
    } catch (error) {
      console.error('Failed to add skill:', error);
    }
  };

  const handleDeleteSkill = async (skillId: string) => {
    if (!confirm('确定删除这个技能?')) return;

    try {
      const response = await fetch(`/api/skills?id=${skillId}`, { method: 'DELETE' });
      if (response.ok) {
        loadSkills();
      }
    } catch (error) {
      console.error('Failed to delete skill:', error);
    }
  };

  const groupedSkills = skills.reduce((acc, skill) => {
    const category = skill.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(skill);
    return acc;
  }, {} as Record<string, Skill[]>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => router.push('/')}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-green-500" />
                技能插件
              </h1>
              <p className="text-slate-400">管理和配置AI的技能插件</p>
            </div>
          </div>
          <Button onClick={handleAddCustomSkill}>
            <Plus className="w-4 h-4 mr-2" />
            添加技能
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">总技能</p>
                  <p className="text-2xl font-bold text-white">{skills.length}</p>
                </div>
                <Sparkles className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">已启用</p>
                  <p className="text-2xl font-bold text-white">
                    {skills.filter(s => s.enabled).length}
                  </p>
                </div>
                <Zap className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">分类数</p>
                  <p className="text-2xl font-bold text-white">
                    {Object.keys(groupedSkills).length}
                  </p>
                </div>
                <Terminal className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Skills by Category */}
        {isLoading ? (
          <div className="text-center py-12 text-slate-400">
            加载中...
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedSkills).map(([category, categorySkills]) => {
              const Icon = CATEGORY_ICONS[category] || Sparkles;
              const colorClass = CATEGORY_COLORS[category] || 'text-slate-500';
              
              return (
                <Card key={category} className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2 capitalize">
                      <Icon className={`w-5 h-5 ${colorClass}`} />
                      {category}
                      <Badge variant="secondary" className="ml-2">
                        {categorySkills.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {categorySkills.map((skill) => (
                        <div
                          key={skill.id}
                          className={`p-4 rounded-lg border transition-all ${
                            skill.enabled 
                              ? 'bg-slate-700/50 border-green-500/30' 
                              : 'bg-slate-700/30 border-slate-600'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-white">{skill.name}</h3>
                                <Badge variant="outline" className="text-xs">
                                  v{skill.version}
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-400 mb-2">
                                {skill.description}
                              </p>
                              {skill.trigger_keywords && skill.trigger_keywords.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {skill.trigger_keywords.map((keyword, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {keyword}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              <p className="text-xs text-slate-500">
                                作者: {skill.author} · 优先级: {skill.priority}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={skill.enabled}
                                onCheckedChange={(checked) => handleToggleSkill(skill.id, checked)}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteSkill(skill.id)}
                                className="text-slate-400 hover:text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
