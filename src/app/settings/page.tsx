'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Save,
  Settings,
  Key,
  Database,
  Bell,
  Shield,
  Trash2,
  Download,
  Upload,
  RefreshCw
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState({
    apiKey: '',
    modelProvider: 'openai',
    enableNotifications: true,
    enableHeartbeat: true,
    heartbeatInterval: 30,
    dataRetention: 90,
    autoSave: true
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const savedSettings = localStorage.getItem('openclaw_settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    localStorage.setItem('openclaw_settings', JSON.stringify(settings));
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);
  };

  const handleExportData = () => {
    const data = {
      identity: JSON.parse(localStorage.getItem('openclaw_identity') || '{}'),
      memory: {
        longTerm: localStorage.getItem('openclaw_memory_long_term') || '',
        daily: JSON.parse(localStorage.getItem('openclaw_memory_daily') || '[]')
      },
      tasks: JSON.parse(localStorage.getItem('openclaw_heartbeat_tasks') || '[]'),
      workspace: {
        soul: localStorage.getItem('openclaw_workspace_soul') || '',
        agents: localStorage.getItem('openclaw_workspace_agents') || '',
        tools: localStorage.getItem('openclaw_workspace_tools') || '',
        user: localStorage.getItem('openclaw_workspace_user') || ''
      },
      chatHistory: JSON.parse(localStorage.getItem('openclaw_chat_history') || '[]'),
      settings: settings
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openclaw-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        if (data.identity) localStorage.setItem('openclaw_identity', JSON.stringify(data.identity));
        if (data.memory) {
          if (data.memory.longTerm) localStorage.setItem('openclaw_memory_long_term', data.memory.longTerm);
          if (data.memory.daily) localStorage.setItem('openclaw_memory_daily', JSON.stringify(data.memory.daily));
        }
        if (data.tasks) localStorage.setItem('openclaw_heartbeat_tasks', JSON.stringify(data.tasks));
        if (data.workspace) {
          Object.entries(data.workspace).forEach(([key, value]) => {
            localStorage.setItem(`openclaw_workspace_${key}`, value as string);
          });
        }
        if (data.chatHistory) localStorage.setItem('openclaw_chat_history', JSON.stringify(data.chatHistory));
        if (data.settings) {
          setSettings(data.settings);
          localStorage.setItem('openclaw_settings', JSON.stringify(data.settings));
        }

        alert('数据导入成功！页面将刷新。');
        window.location.reload();
      } catch (error) {
        alert('导入失败：无效的备份文件');
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = () => {
    if (confirm('确定要清除所有数据吗？此操作不可恢复！')) {
      localStorage.clear();
      alert('数据已清除，页面将刷新。');
      window.location.reload();
    }
  };

  const handleReset = () => {
    if (confirm('确定要重置所有设置吗？')) {
      localStorage.removeItem('openclaw_settings');
      setSettings({
        apiKey: '',
        modelProvider: 'openai',
        enableNotifications: true,
        enableHeartbeat: true,
        heartbeatInterval: 30,
        dataRetention: 90,
        autoSave: true
      });
    }
  };

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
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Settings className="w-6 h-6 text-slate-400" />
              系统设置
            </h1>
            <p className="text-slate-400">配置OpenClaw的核心参数</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* API Configuration */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-orange-500" />
                API 配置
              </CardTitle>
              <CardDescription>配置AI模型的API密钥和提供商</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">API Key</Label>
                  <Input
                    type="password"
                    placeholder="sk-..."
                    value={settings.apiKey}
                    onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">模型提供商</Label>
                  <select
                    value={settings.modelProvider}
                    onChange={(e) => setSettings({ ...settings, modelProvider: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="google">Google AI</option>
                    <option value="local">本地模型</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-500" />
                通知设置
              </CardTitle>
              <CardDescription>管理系统的通知和提醒</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white">启用通知</p>
                  <p className="text-sm text-slate-400">接收系统和任务通知</p>
                </div>
                <Switch
                  checked={settings.enableNotifications}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableNotifications: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white">启用心跳检查</p>
                  <p className="text-sm text-slate-400">定期执行主动任务</p>
                </div>
                <Switch
                  checked={settings.enableHeartbeat}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableHeartbeat: checked })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">心跳间隔（分钟）</Label>
                  <Input
                    type="number"
                    min={5}
                    value={settings.heartbeatInterval}
                    onChange={(e) => setSettings({ ...settings, heartbeatInterval: parseInt(e.target.value) || 30 })}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">数据保留天数</Label>
                  <Input
                    type="number"
                    min={7}
                    value={settings.dataRetention}
                    onChange={(e) => setSettings({ ...settings, dataRetention: parseInt(e.target.value) || 90 })}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-500" />
                数据管理
              </CardTitle>
              <CardDescription>导出、导入或清除数据</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="border-slate-600 text-slate-300"
                  onClick={handleExportData}
                >
                  <Download className="w-4 h-4 mr-2" />
                  导出数据
                </Button>
                <div className="relative">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportData}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Button
                    variant="outline"
                    className="w-full border-slate-600 text-slate-300"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    导入数据
                  </Button>
                </div>
                <Button
                  variant="outline"
                  className="border-red-600 text-red-400 hover:bg-red-600/10"
                  onClick={handleClearData}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  清除数据
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Security */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-500" />
                隐私与安全
              </CardTitle>
              <CardDescription>数据隐私和安全设置</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white">自动保存</p>
                  <p className="text-sm text-slate-400">自动保存对话和记忆</p>
                </div>
                <Switch
                  checked={settings.autoSave}
                  onCheckedChange={(checked) => setSettings({ ...settings, autoSave: checked })}
                />
              </div>
              <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                <p className="text-sm text-slate-400">
                  <Shield className="w-4 h-4 inline mr-2 text-green-500" />
                  OpenClaw 采用本地优先设计。所有数据都存储在你的设备上，不会上传到云端服务器。
                  这确保了你的隐私和数据安全。
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleReset}
              className="border-slate-600 text-slate-300"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              重置设置
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? '保存中...' : '保存设置'}
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-slate-500 text-sm">
          <p>OpenClaw v1.0.0 • 本地优先的AI助手</p>
          <p className="mt-1">开源项目 • MIT License</p>
        </div>
      </div>
    </div>
  );
}
