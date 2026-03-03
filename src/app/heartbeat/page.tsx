'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  Plus,
  Trash2,
  Clock,
  Activity,
  CheckCircle,
  AlertCircle,
  Bell,
  Mail,
  Calendar,
  Cloud
} from 'lucide-react';

interface HeartbeatTask {
  id: string;
  name: string;
  description: string;
  interval: number; // minutes
  enabled: boolean;
  lastCheck?: Date;
  nextCheck?: Date;
  status: 'pending' | 'running' | 'success' | 'error';
}

const presetTasks = [
  { name: '邮件检查', description: '检查收件箱中的未读邮件', interval: 30, icon: Mail },
  { name: '日程提醒', description: '检查接下来24小时的日程安排', interval: 60, icon: Calendar },
  { name: '天气更新', description: '获取最新的天气信息', interval: 120, icon: Cloud },
];

export default function HeartbeatPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<HeartbeatTask[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({
    name: '',
    description: '',
    interval: 30
  });

  useEffect(() => {
    const savedTasks = localStorage.getItem('openclaw_heartbeat_tasks');
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('openclaw_heartbeat_tasks', JSON.stringify(tasks));
  }, [tasks]);

  const handleAddTask = () => {
    if (!newTask.name.trim()) return;

    const task: HeartbeatTask = {
      id: Date.now().toString(),
      name: newTask.name,
      description: newTask.description,
      interval: newTask.interval,
      enabled: true,
      status: 'pending',
      nextCheck: new Date(Date.now() + newTask.interval * 60 * 1000)
    };

    setTasks([...tasks, task]);
    setNewTask({ name: '', description: '', interval: 30 });
    setShowAddTask(false);
  };

  const handleAddPresetTask = (preset: typeof presetTasks[0]) => {
    const task: HeartbeatTask = {
      id: Date.now().toString(),
      name: preset.name,
      description: preset.description,
      interval: preset.interval,
      enabled: true,
      status: 'pending',
      nextCheck: new Date(Date.now() + preset.interval * 60 * 1000)
    };

    setTasks([...tasks, task]);
  };

  const handleToggleTask = (id: string) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, enabled: !task.enabled } : task
    ));
  };

  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const formatTime = (date: Date | undefined) => {
    if (!date) return '--';
    return new Date(date).toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Activity className="w-4 h-4 text-yellow-500 animate-pulse" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
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
              <Activity className="w-6 h-6 text-yellow-500" />
              心跳任务
            </h1>
            <p className="text-slate-400">配置AI的主动检查任务</p>
          </div>
          <Badge variant="secondary" className="bg-slate-700">
            {tasks.filter(t => t.enabled).length} 个活跃任务
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: '总任务', value: tasks.length, color: 'text-white' },
            { label: '活跃', value: tasks.filter(t => t.enabled).length, color: 'text-green-500' },
            { label: '成功', value: tasks.filter(t => t.status === 'success').length, color: 'text-blue-500' },
            { label: '失败', value: tasks.filter(t => t.status === 'error').length, color: 'text-red-500' }
          ].map((stat, index) => (
            <Card key={index} className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-6">
                <p className="text-sm text-slate-400 mb-1">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Preset Tasks */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">快速添加</h2>
          <div className="grid grid-cols-3 gap-4">
            {presetTasks.map((preset, index) => (
              <Card 
                key={index}
                className="bg-slate-800/50 border-slate-700 hover:border-yellow-500/50 cursor-pointer transition-all"
                onClick={() => handleAddPresetTask(preset)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-2">
                    <preset.icon className="w-5 h-5 text-yellow-500" />
                    <span className="font-semibold text-white">{preset.name}</span>
                  </div>
                  <p className="text-sm text-slate-400">{preset.description}</p>
                  <p className="text-xs text-slate-500 mt-2">
                    每 {preset.interval} 分钟检查一次
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Add Custom Task */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-lg">自定义任务</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddTask(!showAddTask)}
                className="text-slate-400 hover:text-white"
              >
                {showAddTask ? '取消' : '添加任务'}
              </Button>
            </div>
          </CardHeader>
          {showAddTask && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">任务名称</Label>
                  <Input
                    placeholder="例如：检查GitHub通知"
                    value={newTask.name}
                    onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">检查间隔（分钟）</Label>
                  <Input
                    type="number"
                    min={5}
                    value={newTask.interval}
                    onChange={(e) => setNewTask({ ...newTask, interval: parseInt(e.target.value) || 30 })}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">任务描述</Label>
                <Textarea
                  placeholder="描述这个任务应该做什么..."
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="flex justify-end">
                <Button 
                  onClick={handleAddTask}
                  className="bg-yellow-500 hover:bg-yellow-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  添加任务
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Task List */}
        <div className="space-y-4">
          {tasks.length === 0 ? (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="py-12 text-center">
                <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">还没有心跳任务，添加一个让AI主动帮你检查事项吧！</p>
              </CardContent>
            </Card>
          ) : (
            tasks.map((task) => (
              <Card key={task.id} className={`bg-slate-800/50 border-slate-700 ${!task.enabled ? 'opacity-50' : ''}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(task.status)}
                        <span className="font-semibold text-white">{task.name}</span>
                      </div>
                      <Badge variant="outline" className="border-slate-600 text-slate-400">
                        每 {task.interval} 分钟
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-sm">
                        <p className="text-slate-500">
                          下次检查: {formatTime(task.nextCheck)}
                        </p>
                      </div>
                      <Switch
                        checked={task.enabled}
                        onCheckedChange={() => handleToggleTask(task.id)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {task.description && (
                    <p className="text-sm text-slate-400 mt-3">{task.description}</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
