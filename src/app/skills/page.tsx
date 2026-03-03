'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  Search,
  Sparkles,
  Download,
  Check,
  ExternalLink,
  Star,
  Users
} from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  downloads: number;
  rating: number;
  installed: boolean;
  author: string;
}

const availableSkills: Skill[] = [
  {
    id: '1',
    name: 'Tavily Search',
    description: '实时联网搜索能力，获取最新资讯和实时数据',
    category: '搜索',
    downloads: 15420,
    rating: 4.8,
    installed: false,
    author: 'OpenClaw Team'
  },
  {
    id: '2',
    name: 'Browser Control',
    description: '控制浏览器进行网页操作、截图、填表等',
    category: '自动化',
    downloads: 12300,
    rating: 4.9,
    installed: true,
    author: 'Community'
  },
  {
    id: '3',
    name: 'Email Manager',
    description: '管理邮箱、发送邮件、自动回复',
    category: '通信',
    downloads: 8900,
    rating: 4.7,
    installed: false,
    author: 'OpenClaw Team'
  },
  {
    id: '4',
    name: 'Calendar Sync',
    description: '同步日历、管理日程、设置提醒',
    category: '生产力',
    downloads: 10500,
    rating: 4.6,
    installed: true,
    author: 'Community'
  },
  {
    id: '5',
    name: 'Code Runner',
    description: '执行代码、运行脚本、处理文件',
    category: '开发',
    downloads: 18700,
    rating: 4.9,
    installed: false,
    author: 'OpenClaw Team'
  },
  {
    id: '6',
    name: 'Image Generator',
    description: 'AI图像生成、图片编辑、风格转换',
    category: '创作',
    downloads: 22100,
    rating: 4.8,
    installed: false,
    author: 'Community'
  }
];

const categories = ['全部', '搜索', '自动化', '通信', '生产力', '开发', '创作'];

export default function SkillsPage() {
  const router = useRouter();
  const [skills, setSkills] = useState<Skill[]>(availableSkills);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [installing, setInstalling] = useState<string | null>(null);

  useEffect(() => {
    // Load installed skills from localStorage
    const installed = localStorage.getItem('openclaw_installed_skills');
    if (installed) {
      const installedIds = JSON.parse(installed);
      setSkills(skills.map(s => ({
        ...s,
        installed: installedIds.includes(s.id)
      })));
    }
  }, []);

  const handleInstall = async (skillId: string) => {
    setInstalling(skillId);
    
    // Simulate installation
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const updatedSkills = skills.map(s => 
      s.id === skillId ? { ...s, installed: true, downloads: s.downloads + 1 } : s
    );
    setSkills(updatedSkills);
    
    // Save to localStorage
    const installedIds = updatedSkills.filter(s => s.installed).map(s => s.id);
    localStorage.setItem('openclaw_installed_skills', JSON.stringify(installedIds));
    
    setInstalling(null);
  };

  const handleUninstall = (skillId: string) => {
    const updatedSkills = skills.map(s => 
      s.id === skillId ? { ...s, installed: false } : s
    );
    setSkills(updatedSkills);
    
    const installedIds = updatedSkills.filter(s => s.installed).map(s => s.id);
    localStorage.setItem('openclaw_installed_skills', JSON.stringify(installedIds));
  };

  const filteredSkills = skills.filter(skill => {
    const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         skill.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === '全部' || skill.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
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
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-green-500" />
              技能插件
            </h1>
            <p className="text-slate-400">扩展AI的能力，让它做更多事情</p>
          </div>
          <Badge variant="secondary" className="bg-slate-700">
            {skills.filter(s => s.installed).length} 个已安装
          </Badge>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="搜索技能..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-700 border-slate-600 text-white"
            />
          </div>
          <div className="flex gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={selectedCategory === category 
                  ? "bg-green-500 hover:bg-green-600" 
                  : "border-slate-600 text-slate-300"
                }
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Skills Grid */}
        <div className="grid grid-cols-3 gap-6">
          {filteredSkills.map((skill) => (
            <Card key={skill.id} className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-white text-lg">{skill.name}</CardTitle>
                    <Badge variant="outline" className="mt-2 border-slate-600 text-slate-400">
                      {skill.category}
                    </Badge>
                  </div>
                  {skill.installed && (
                    <Badge className="bg-green-500/10 text-green-500 border-green-500">
                      <Check className="w-3 h-3 mr-1" />
                      已安装
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-slate-400 mb-4">
                  {skill.description}
                </CardDescription>
                <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      {skill.downloads.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500" />
                      {skill.rating}
                    </span>
                  </div>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {skill.author}
                  </span>
                </div>
                <div className="flex gap-2">
                  {skill.installed ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-slate-600 text-slate-300"
                        onClick={() => handleUninstall(skill.id)}
                      >
                        卸载
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-600 text-slate-300"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      className="flex-1 bg-green-500 hover:bg-green-600"
                      onClick={() => handleInstall(skill.id)}
                      disabled={installing === skill.id}
                    >
                      {installing === skill.id ? (
                        '安装中...'
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          安装
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredSkills.length === 0 && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="py-12 text-center">
              <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">没有找到匹配的技能</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
