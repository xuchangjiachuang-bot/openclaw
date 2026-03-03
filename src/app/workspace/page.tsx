'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  FileText,
  Save,
  Download,
  Upload,
  RefreshCw,
  Code
} from 'lucide-react';

interface WorkspaceState {
  identity: any;
  user: any;
  workspace: {
    soulMd: string;
    agentsMd: string;
    toolsMd: string;
    heartbeatMd: string;
  };
  state: any;
}

export default function WorkspacePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [data, setData] = useState<WorkspaceState>({
    identity: null,
    user: null,
    workspace: {
      soulMd: '',
      agentsMd: '',
      toolsMd: '',
      heartbeatMd: ''
    },
    state: null
  });

  useEffect(() => {
    loadWorkspace();
  }, []);

  const loadWorkspace = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/workspace?file=all');
      const result = await response.json();
      if (result.success) {
        setData(result.content);
      }
    } catch (error) {
      console.error('Failed to load workspace:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveFile = async (file: string, content: string) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file, content })
      });

      if (response.ok) {
        alert('保存成功');
      }
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const exportData = {
        identity: data.identity,
        user: data.user,
        workspace: data.workspace,
        state: data.state,
        exportedAt: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `openclaw-workspace-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const importData = JSON.parse(text);

        const response = await fetch('/api/workspace', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: importData })
        });

        if (response.ok) {
          loadWorkspace();
          alert('导入成功');
        }
      } catch (error) {
        console.error('Failed to import:', error);
        alert('导入失败');
      }
    };
    input.click();
  };

  const handleClear = async () => {
    if (!confirm('确定清除所有工作空间数据? 此操作不可恢复!')) return;

    try {
      const response = await fetch('/api/workspace', { method: 'DELETE' });
      if (response.ok) {
        loadWorkspace();
        alert('清除成功');
      }
    } catch (error) {
      console.error('Failed to clear:', error);
    }
  };

  const updateWorkspace = (key: keyof typeof data.workspace, value: string) => {
    setData(prev => ({
      ...prev,
      workspace: {
        ...prev.workspace,
        [key]: value
      }
    }));
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
                <FileText className="w-6 h-6 text-purple-500" />
                工作空间
              </h1>
              <p className="text-slate-400">管理OpenClaw的核心配置文件</p>
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
            <Button variant="destructive" size="sm" onClick={handleClear}>
              清除
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">身份配置</p>
                  <p className="text-lg font-bold text-white">
                    {data.identity?.name || '未设置'}
                  </p>
                </div>
                <Badge variant="outline">
                  IDENTITY.md
                </Badge>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">用户档案</p>
                  <p className="text-lg font-bold text-white">
                    {data.user?.name || '未设置'}
                  </p>
                </div>
                <Badge variant="outline">
                  USER.md
                </Badge>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">SOUL.md</p>
                  <p className="text-lg font-bold text-white">
                    {data.workspace.soulMd.length} 字符
                  </p>
                </div>
                <Badge variant="outline">
                  灵魂配置
                </Badge>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">状态数据</p>
                  <p className="text-lg font-bold text-white">
                    {data.state ? '已初始化' : '未设置'}
                  </p>
                </div>
                <Badge variant="outline">
                  STATE.json
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">配置文件编辑</CardTitle>
            <CardDescription>
              编辑Markdown配置文件来定制AI的行为
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-slate-400">加载中...</div>
            ) : (
              <Tabs defaultValue="soul">
                <TabsList className="bg-slate-700 mb-4">
                  <TabsTrigger value="soul" className="text-slate-300">
                    <Code className="w-4 h-4 mr-2" />
                    SOUL.md
                  </TabsTrigger>
                  <TabsTrigger value="agents" className="text-slate-300">
                    <Code className="w-4 h-4 mr-2" />
                    AGENTS.md
                  </TabsTrigger>
                  <TabsTrigger value="tools" className="text-slate-300">
                    <Code className="w-4 h-4 mr-2" />
                    TOOLS.md
                  </TabsTrigger>
                  <TabsTrigger value="heartbeat" className="text-slate-300">
                    <Code className="w-4 h-4 mr-2" />
                    HEARTBEAT.md
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="soul">
                  <div className="space-y-4">
                    <p className="text-sm text-slate-400">
                      定义AI的核心性格、价值观和行为准则
                    </p>
                    <Textarea
                      value={data.workspace.soulMd}
                      onChange={(e) => updateWorkspace('soulMd', e.target.value)}
                      className="min-h-[400px] bg-slate-900 border-slate-600 text-white font-mono text-sm"
                    />
                    <Button 
                      onClick={() => handleSaveFile('soul', data.workspace.soulMd)}
                      disabled={isSaving}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      保存 SOUL.md
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="agents">
                  <div className="space-y-4">
                    <p className="text-sm text-slate-400">
                      配置可用的Agent实例及其能力
                    </p>
                    <Textarea
                      value={data.workspace.agentsMd}
                      onChange={(e) => updateWorkspace('agentsMd', e.target.value)}
                      className="min-h-[400px] bg-slate-900 border-slate-600 text-white font-mono text-sm"
                    />
                    <Button 
                      onClick={() => handleSaveFile('agents', data.workspace.agentsMd)}
                      disabled={isSaving}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      保存 AGENTS.md
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="tools">
                  <div className="space-y-4">
                    <p className="text-sm text-slate-400">
                      定义可用的工具和能力
                    </p>
                    <Textarea
                      value={data.workspace.toolsMd}
                      onChange={(e) => updateWorkspace('toolsMd', e.target.value)}
                      className="min-h-[400px] bg-slate-900 border-slate-600 text-white font-mono text-sm"
                    />
                    <Button 
                      onClick={() => handleSaveFile('tools', data.workspace.toolsMd)}
                      disabled={isSaving}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      保存 TOOLS.md
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="heartbeat">
                  <div className="space-y-4">
                    <p className="text-sm text-slate-400">
                      配置心跳任务和主动行为
                    </p>
                    <Textarea
                      value={data.workspace.heartbeatMd}
                      onChange={(e) => updateWorkspace('heartbeatMd', e.target.value)}
                      className="min-h-[400px] bg-slate-900 border-slate-600 text-white font-mono text-sm"
                    />
                    <Button 
                      onClick={() => handleSaveFile('heartbeat', data.workspace.heartbeatMd)}
                      disabled={isSaving}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      保存 HEARTBEAT.md
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
