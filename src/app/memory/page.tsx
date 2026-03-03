'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Save,
  Brain,
  Calendar,
  FileText,
  Plus,
  Trash2,
  Clock,
  Tag
} from 'lucide-react';

interface Memory {
  id: string;
  content: string;
  tags: string[];
  timestamp: Date;
  type: 'long-term' | 'daily';
}

export default function MemoryPage() {
  const router = useRouter();
  const [longTermMemory, setLongTermMemory] = useState('');
  const [dailyMemories, setDailyMemories] = useState<Memory[]>([]);
  const [newMemory, setNewMemory] = useState('');
  const [newTags, setNewTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load memories from localStorage
    const savedLongTerm = localStorage.getItem('openclaw_memory_long_term');
    if (savedLongTerm) {
      setLongTermMemory(savedLongTerm);
    }

    const savedDaily = localStorage.getItem('openclaw_memory_daily');
    if (savedDaily) {
      setDailyMemories(JSON.parse(savedDaily));
    }
  }, []);

  const handleSaveLongTerm = async () => {
    setIsSaving(true);
    localStorage.setItem('openclaw_memory_long_term', longTermMemory);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);
  };

  const handleAddDailyMemory = () => {
    if (!newMemory.trim()) return;

    const memory: Memory = {
      id: Date.now().toString(),
      content: newMemory,
      tags: newTags.split(',').map(t => t.trim()).filter(Boolean),
      timestamp: new Date(),
      type: 'daily'
    };

    const updated = [memory, ...dailyMemories];
    setDailyMemories(updated);
    localStorage.setItem('openclaw_memory_daily', JSON.stringify(updated));
    setNewMemory('');
    setNewTags('');
  };

  const handleDeleteMemory = (id: string) => {
    const updated = dailyMemories.filter(m => m.id !== id);
    setDailyMemories(updated);
    localStorage.setItem('openclaw_memory_daily', JSON.stringify(updated));
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
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
              <Brain className="w-6 h-6 text-purple-500" />
              记忆管理
            </h1>
            <p className="text-slate-400">管理AI的长期记忆和日记</p>
          </div>
          <Badge variant="secondary" className="bg-slate-700">
            {dailyMemories.length} 条记忆
          </Badge>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="daily" className="space-y-6">
          <TabsList className="bg-slate-800 border border-slate-700">
            <TabsTrigger value="daily" className="data-[state=active]:bg-slate-700">
              <Calendar className="w-4 h-4 mr-2" />
              日记记忆
            </TabsTrigger>
            <TabsTrigger value="long-term" className="data-[state=active]:bg-slate-700">
              <FileText className="w-4 h-4 mr-2" />
              长期记忆
            </TabsTrigger>
          </TabsList>

          {/* Daily Memory */}
          <TabsContent value="daily" className="space-y-6">
            {/* Add New Memory */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">添加新记忆</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="记录今天发生的事情..."
                  value={newMemory}
                  onChange={(e) => setNewMemory(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white min-h-[100px]"
                />
                <div className="flex gap-4">
                  <input
                    type="text"
                    placeholder="标签（逗号分隔）"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder:text-slate-500"
                  />
                  <Button 
                    onClick={handleAddDailyMemory}
                    className="bg-purple-500 hover:bg-purple-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    添加
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Memory List */}
            <div className="space-y-4">
              {dailyMemories.length === 0 ? (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="py-12 text-center">
                    <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">还没有记忆，开始记录你的第一条吧！</p>
                  </CardContent>
                </Card>
              ) : (
                dailyMemories.map((memory) => (
                  <Card key={memory.id} className="bg-slate-800/50 border-slate-700">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-white mb-3">{memory.content}</p>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 text-slate-500 text-sm">
                              <Clock className="w-3 h-3" />
                              {formatDate(memory.timestamp)}
                            </div>
                            {memory.tags.length > 0 && (
                              <div className="flex gap-1">
                                {memory.tags.map((tag, index) => (
                                  <Badge 
                                    key={index} 
                                    variant="outline" 
                                    className="text-xs border-slate-600 text-slate-400"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteMemory(memory.id)}
                          className="text-slate-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Long-term Memory */}
          <TabsContent value="long-term" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-500" />
                  长期记忆 (MEMORY.md)
                </CardTitle>
                <CardDescription>
                  这是AI的核心记忆库，包含重要的上下文信息和偏好设置
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="# 长期记忆

这里是AI的核心记忆文件，存储重要的信息：

## 用户偏好
- 

## 重要事件
- 

## 需要记住的事项
- "
                  value={longTermMemory}
                  onChange={(e) => setLongTermMemory(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white min-h-[400px] font-mono text-sm"
                />
                <div className="flex justify-end">
                  <Button 
                    onClick={handleSaveLongTerm}
                    disabled={isSaving}
                    className="bg-purple-500 hover:bg-purple-600"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? '保存中...' : '保存记忆'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
