'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Trash2,
  Download,
  CheckCircle2,
  AlertCircle,
  Search,
  Loader2
} from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  author: string;
  enabled: boolean;
  skillMd?: string;
  metadata?: {
    openclaw?: {
      emoji?: string;
      os?: string[];
      requires?: {
        bins?: string[];
        env?: string[];
        config?: string[];
      };
    };
  };
}

interface HubSkill {
  slug: string;
  name: string;
  description: string;
  category: string;
  installs: number;
  verified: boolean;
  featured?: boolean;
}

const CATEGORY_ICONS: Record<string, any> = {
  'search': Globe,
  'file': FileText,
  'database': Database,
  'ai': Cpu,
  'image': Image,
  'code': Code,
  'system': Terminal,
  'Automation': Terminal,
  'System': Database,
  'Productivity': Zap,
  'Communication': Globe,
  'Development': Code,
  'Analysis': Cpu,
  'Memory': Database,
  'Integration': Globe,
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
  'Automation': 'text-blue-500',
  'System': 'text-purple-500',
  'Productivity': 'text-green-500',
  'Communication': 'text-orange-500',
  'Development': 'text-cyan-500',
  'Analysis': 'text-yellow-500',
  'Memory': 'text-indigo-500',
  'Integration': 'text-pink-500',
  'other': 'text-slate-500'
};

export default function SkillsPage() {
  const router = useRouter();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [hubSkills, setHubSkills] = useState<HubSkill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHubLoading, setIsHubLoading] = useState(false);
  const [downloadingSlug, setDownloadingSlug] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('installed');

  useEffect(() => {
    loadSkills();
    loadHubSkills();
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

  const loadHubSkills = async () => {
    setIsHubLoading(true);
    try {
      const response = await fetch('/api/skills?action=hub');
      const data = await response.json();
      if (data.success) {
        setHubSkills(data.skills);
      }
    } catch (error) {
      console.error('Failed to load hub skills:', error);
    } finally {
      setIsHubLoading(false);
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

  const handleDownloadSkill = async (slug: string) => {
    setDownloadingSlug(slug);
    try {
      const response = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'download',
          slug
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // 重新加载技能列表
        await loadSkills();
        // 切换到已安装标签
        setActiveTab('installed');
      } else {
        alert(data.message || '下载失败');
      }
    } catch (error) {
      console.error('Failed to download skill:', error);
      alert('下载失败，请重试');
    } finally {
      setDownloadingSlug(null);
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
            id: name.toLowerCase().replace(/\s+/g, '-'),
            name,
            description,
            category: 'other',
            version: '1.0.0',
            author: 'user',
            enabled: true
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

  const handleImportSkillMd = async () => {
    const skillMd = prompt('粘贴SKILL.md内容:');
    if (!skillMd) return;

    try {
      const response = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import',
          skillMd
        })
      });

      if (response.ok) {
        loadSkills();
      }
    } catch (error) {
      console.error('Failed to import skill:', error);
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

  const checkDependencies = async (skillId: string) => {
    try {
      const response = await fetch(`/api/skills?action=dependencies&id=${skillId}`);
      const data = await response.json();
      
      if (!data.satisfied) {
        const missing = data.missing.map((m: any) => `${m.type}: ${m.name}`).join('\n');
        alert(`缺少依赖:\n${missing}`);
      } else {
        alert('所有依赖已满足 ✓');
      }
    } catch (error) {
      console.error('Failed to check dependencies:', error);
    }
  };

  const groupedSkills = skills.reduce((acc, skill) => {
    const category = skill.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(skill);
    return acc;
  }, {} as Record<string, Skill[]>);

  const filteredHubSkills = hubSkills.filter(skill => 
    skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    skill.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    skill.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isInstalled = (slug: string) => skills.some(s => s.id === slug || s.name.toLowerCase() === slug.toLowerCase());

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
              <p className="text-slate-400">管理和配置AI的技能插件，支持从ClawHub无缝下载</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleImportSkillMd}>
              <FileText className="w-4 h-4 mr-2" />
              导入SKILL.md
            </Button>
            <Button onClick={handleAddCustomSkill}>
              <Plus className="w-4 h-4 mr-2" />
              添加技能
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
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
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">ClawHub可用</p>
                  <p className="text-2xl font-bold text-white">{hubSkills.length}</p>
                </div>
                <Download className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-800 border-slate-700 mb-6">
            <TabsTrigger value="installed" className="data-[state=active]:bg-slate-700">
              已安装 ({skills.length})
            </TabsTrigger>
            <TabsTrigger value="hub" className="data-[state=active]:bg-slate-700">
              ClawHub市场
            </TabsTrigger>
          </TabsList>

          {/* Installed Skills */}
          <TabsContent value="installed">
            {isLoading ? (
              <div className="text-center py-12 text-slate-400">
                加载中...
              </div>
            ) : skills.length === 0 ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-12 text-center">
                  <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 mb-4">还没有安装任何技能</p>
                  <Button onClick={() => setActiveTab('hub')}>
                    <Download className="w-4 h-4 mr-2" />
                    浏览ClawHub市场
                  </Button>
                </CardContent>
              </Card>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {categorySkills.map(skill => (
                            <div
                              key={skill.id}
                              className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50 hover:border-slate-500 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{skill.metadata?.openclaw?.emoji || '⚡'}</span>
                                  <h3 className="font-medium text-white">{skill.name}</h3>
                                </div>
                                <Switch
                                  checked={skill.enabled}
                                  onCheckedChange={(checked) => handleToggleSkill(skill.id, checked)}
                                />
                              </div>
                              <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                                {skill.description}
                              </p>
                              <div className="flex items-center justify-between text-xs text-slate-500">
                                <span>v{skill.version}</span>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-slate-400 hover:text-white"
                                    onClick={() => checkDependencies(skill.id)}
                                  >
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    检查依赖
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-red-400 hover:text-red-300"
                                    onClick={() => handleDeleteSkill(skill.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
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
          </TabsContent>

          {/* ClawHub Market */}
          <TabsContent value="hub">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="搜索技能..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-600"
                />
              </div>
            </div>

            {isHubLoading ? (
              <div className="text-center py-12 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                加载ClawHub技能列表...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredHubSkills.map(skill => {
                  const installed = isInstalled(skill.slug);
                  const isDownloading = downloadingSlug === skill.slug;
                  
                  return (
                    <Card key={skill.slug} className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-white text-lg flex items-center gap-2">
                              {skill.name}
                              {skill.verified && (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              )}
                              {skill.featured && (
                                <Badge className="bg-yellow-500/20 text-yellow-500 text-xs">
                                  推荐
                                </Badge>
                              )}
                            </CardTitle>
                            <CardDescription className="text-slate-400 mt-1">
                              {skill.category} • {skill.installs.toLocaleString()} 次安装
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-slate-300 mb-4 line-clamp-2">
                          {skill.description}
                        </p>
                        <Button
                          className="w-full"
                          variant={installed ? "outline" : "default"}
                          disabled={installed || isDownloading}
                          onClick={() => handleDownloadSkill(skill.slug)}
                        >
                          {isDownloading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              安装中...
                            </>
                          ) : installed ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              已安装
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 mr-2" />
                              安装
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
