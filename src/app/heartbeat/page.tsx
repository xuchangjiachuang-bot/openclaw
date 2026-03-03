'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  ArrowLeft,
  Activity,
  Clock,
  Plus,
  Play,
  Pause,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface HeartbeatTask {
  id: string;
  name: string;
  description: string;
  interval: number;
  enabled: boolean;
  status: 'pending' | 'running' | 'success' | 'failed';
  lastCheck?: Date;
  nextCheck?: Date;
  actions: Array<{ type: string; config: Record<string, any> }>;
}

interface HeartbeatResult {
  taskId: string;
  timestamp: Date;
  success: boolean;
  message: string;
  data?: Record<string, any>;
}

export default function HeartbeatPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<HeartbeatTask[]>([]);
  const [results, setResults] = useState<HeartbeatResult[]>([]);
  const [presets, setPresets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tasksRes, resultsRes, presetsRes] = await Promise.all([
        fetch('/api/heartbeat'),
        fetch('/api/heartbeat?action=results'),
        fetch('/api/heartbeat?action=presets')
      ]);

      const [tasksData, resultsData, presetsData] = await Promise.all([
        tasksRes.json(),
        resultsRes.json(),
        presetsRes.json()
      ]);

      if (tasksData.success) {
        setTasks(tasksData.tasks.map((t: any) => ({
          ...t,
          lastCheck: t.lastCheck ? new Date(t.lastCheck) : undefined,
          nextCheck: t.nextCheck ? new Date(t.nextCheck) : undefined
        })));
      }
      if (resultsData.success) {
        setResults(resultsData.results.map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp)
        })));
      }
      if (presetsData.success) {
        setPresets(presetsData.presets);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPreset = async (presetName: string) => {
    try {
      const response = await fetch('/api/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-preset',
          taskName: presetName
        })
      });

      if (response.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Failed to add preset:', error);
    }
  };

  const handleToggleTask = async (taskId: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle',
          taskId,
          enabled
        })
      });

      if (response.ok) {
        setTasks(prev => prev.map(t => 
          t.id === taskId ? { ...t, enabled } : t
        ));
      }
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  };

  const handleExecuteTask = async (taskId: string) => {
    try {
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: 'running' } : t
      ));

      const response = await fetch('/api/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute',
          taskId
        })
      });

      const data = await response.json();
      if (data.success) {
        loadData();
      }
    } catch (error) {
      console.error('Failed to execute task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('确定删除这个任务?')) return;

    try {
      const response = await fetch(`/api/heartbeat?id=${taskId}`, { method: 'DELETE' });
      if (response.ok) {
        setTasks(prev => prev.filter(t => t.id !== taskId));
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const formatTime = (date?: Date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Activity className="w-4 h-4 text-yellow-500 animate-pulse" />;
      default:
        return <AlertCircle className="w-4 h-4 text-slate-500" />;
    }
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
                <Activity className="w-6 h-6 text-yellow-500" />
                心跳任务
              </h1>
              <p className="text-slate-400">配置AI的主动检查任务</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">总任务</p>
                  <p className="text-2xl font-bold text-white">{tasks.length}</p>
                </div>
                <Activity className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">已启用</p>
                  <p className="text-2xl font-bold text-white">
                    {tasks.filter(t => t.enabled).length}
                  </p>
                </div>
                <Play className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">运行中</p>
                  <p className="text-2xl font-bold text-white">
                    {tasks.filter(t => t.status === 'running').length}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">执行记录</p>
                  <p className="text-2xl font-bold text-white">{results.length}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Presets */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white">快速添加</CardTitle>
            <CardDescription>从预设模板添加心跳任务</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {presets.map((preset, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="h-auto py-4 flex flex-col gap-2"
                  onClick={() => handleAddPreset(preset.name)}
                >
                  <span className="font-semibold">{preset.name}</span>
                  <span className="text-xs text-slate-400">{preset.description}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active Tasks */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white">活跃任务</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-slate-400">加载中...</div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>暂无任务，从上方预设添加</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-4 rounded-lg border transition-all ${
                      task.enabled 
                        ? 'bg-slate-700/50 border-yellow-500/30' 
                        : 'bg-slate-700/30 border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusIcon(task.status)}
                          <h3 className="font-semibold text-white">{task.name}</h3>
                          <Badge variant="secondary">
                            每 {task.interval} 分钟
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-400">{task.description}</p>
                        <div className="flex gap-4 mt-2 text-xs text-slate-500">
                          <span>上次: {formatTime(task.lastCheck)}</span>
                          <span>下次: {formatTime(task.nextCheck)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleExecuteTask(task.id)}
                          disabled={task.status === 'running'}
                          className="text-slate-400 hover:text-green-500"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                        <Switch
                          checked={task.enabled}
                          onCheckedChange={(checked) => handleToggleTask(task.id, checked)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Execution Results */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">执行记录</CardTitle>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                暂无执行记录
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {results.slice(0, 20).map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded flex items-start gap-3 ${
                      result.success ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}
                  >
                    {result.success ? (
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm text-white">{result.message}</p>
                      <p className="text-xs text-slate-500">
                        {formatTime(result.timestamp)}
                      </p>
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
