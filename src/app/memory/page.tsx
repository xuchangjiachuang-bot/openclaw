'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft,
  Brain,
  Search,
  Plus,
  Trash2,
  Download,
  Upload,
  Book,
  Calendar,
  Tag
} from 'lucide-react';

interface Memory {
  id: string;
  type: 'long_term' | 'diary';
  content: string;
  metadata: {
    tags?: string[];
    importance?: number;
    date?: string;
  };
  created_at: Date;
}

export default function MemoryPage() {
  const router = useRouter();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/memory?action=all');
      const data = await response.json();
      if (data.success) {
        setMemories(data.memories.map((m: any) => ({
          ...m,
          created_at: new Date(m.created_at)
        })));
      }
    } catch (error) {
      console.error('Failed to load memories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMemory = async (type: 'long_term' | 'diary') => {
    const content = prompt('输入记忆内容:');
    if (!content) return;

    try {
      const response = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          type,
          content,
          metadata: {
            importance: type === 'long_term' ? 5 : 3,
            tags: []
          }
        })
      });

      if (response.ok) {
        loadMemories();
      }
    } catch (error) {
      console.error('Failed to add memory:', error);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    if (!confirm('确定删除这条记忆?')) return;

    try {
      const response = await fetch(`/api/memory?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        loadMemories();
      }
    } catch (error) {
      console.error('Failed to delete memory:', error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/memory?action=export');
      const data = await response.json();
      
      if (data.success) {
        const blob = new Blob([data.content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'MEMORY.md';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const text = await file.text();
      
      try {
        const response = await fetch('/api/memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'import',
            memoryMd: text
          })
        });

        if (response.ok) {
          loadMemories();
        }
      } catch (error) {
        console.error('Failed to import:', error);
      }
    };
    input.click();
  };

  const filteredMemories = memories.filter(m => {
    const matchesSearch = m.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || m.type === activeTab;
    return matchesSearch && matchesTab;
  });

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
                <Brain className="w-6 h-6 text-purple-500" />
                记忆管理
              </h1>
              <p className="text-slate-400">管理AI的长期记忆和日记</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleImport}>
              <Upload className="w-4 h-4 mr-2" />
              导入
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              导出
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">总记忆</p>
                  <p className="text-2xl font-bold text-white">{memories.length}</p>
                </div>
                <Book className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">长期记忆</p>
                  <p className="text-2xl font-bold text-white">
                    {memories.filter(m => m.type === 'long_term').length}
                  </p>
                </div>
                <Brain className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">日记</p>
                  <p className="text-2xl font-bold text-white">
                    {memories.filter(m => m.type === 'diary').length}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">记忆列表</CardTitle>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => handleAddMemory('long_term')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  长期记忆
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => handleAddMemory('diary')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  日记
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="搜索记忆..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-slate-700">
                  <TabsTrigger value="all" className="text-slate-300">全部</TabsTrigger>
                  <TabsTrigger value="long_term" className="text-slate-300">长期</TabsTrigger>
                  <TabsTrigger value="diary" className="text-slate-300">日记</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-slate-400">
                加载中...
              </div>
            ) : filteredMemories.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>暂无记忆</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMemories.map((memory) => (
                  <div
                    key={memory.id}
                    className="p-4 rounded-lg bg-slate-700/50 border border-slate-600 hover:border-slate-500 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={memory.type === 'long_term' ? 'default' : 'secondary'}>
                            {memory.type === 'long_term' ? '长期记忆' : '日记'}
                          </Badge>
                          {memory.metadata.tags?.map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              <Tag className="w-3 h-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-white">{memory.content}</p>
                        <p className="text-xs text-slate-500 mt-2">
                          {formatDate(memory.created_at)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteMemory(memory.id)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
