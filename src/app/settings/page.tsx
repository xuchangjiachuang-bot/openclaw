'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  Settings,
  Key,
  Server,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [config, setConfig] = useState({
    gatewayPort: '18789',
    llmProvider: 'coze',
    llmModel: 'doubao-seed-1-6',
    llmApiKey: '',
    memoryType: 'localStorage',
    workspacePath: './workspace'
  });
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  useEffect(() => {
    // Load config from localStorage
    const savedConfig = localStorage.getItem('openclaw_config');
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.error('Failed to load config:', e);
      }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('openclaw_config', JSON.stringify(config));
    alert('配置已保存');
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }],
          stream: false
        })
      });

      if (response.ok) {
        setTestStatus('success');
      } else {
        setTestStatus('error');
      }
    } catch (error) {
      setTestStatus('error');
    }
  };

  const handleReset = () => {
    if (!confirm('确定重置所有设置?')) return;
    localStorage.removeItem('openclaw_config');
    localStorage.removeItem('openclaw_chat_history');
    localStorage.removeItem('openclaw_identity');
    localStorage.removeItem('openclaw_user');
    localStorage.removeItem('openclaw_message_count');
    router.push('/');
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
              <Settings className="w-6 h-6 text-slate-500" />
              系统设置
            </h1>
            <p className="text-slate-400">配置OpenClaw网关和运行参数</p>
          </div>
        </div>

        {/* Gateway Config */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-500" />
              网关配置
            </CardTitle>
            <CardDescription>
              配置Gateway监听端口和服务参数
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Gateway 端口</Label>
                <Input
                  value={config.gatewayPort}
                  onChange={(e) => setConfig(prev => ({ ...prev, gatewayPort: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">内存类型</Label>
                <Input
                  value={config.memoryType}
                  disabled
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">工作空间路径</Label>
              <Input
                value={config.workspacePath}
                disabled
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* LLM Config */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-yellow-500" />
              LLM 配置
            </CardTitle>
            <CardDescription>
              配置大语言模型提供商和API密钥
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">提供商</Label>
                <Input
                  value={config.llmProvider}
                  disabled
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">模型</Label>
                <Input
                  value={config.llmModel}
                  disabled
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">API Key</Label>
              <Input
                type="password"
                value={config.llmApiKey}
                onChange={(e) => setConfig(prev => ({ ...prev, llmApiKey: e.target.value }))}
                placeholder="从环境变量自动读取"
                className="bg-slate-700 border-slate-600 text-white"
              />
              <p className="text-xs text-slate-500">
                如未设置，将从环境变量 COZE_API_KEY 读取
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={handleTestConnection} disabled={testStatus === 'testing'}>
                {testStatus === 'testing' ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    测试中...
                  </>
                ) : (
                  '测试连接'
                )}
              </Button>
              {testStatus === 'success' && (
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">连接成功</span>
                </div>
              )}
              {testStatus === 'error' && (
                <div className="flex items-center gap-2 text-red-500">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">连接失败</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white">系统状态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-slate-700/30">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm text-slate-400">Gateway</span>
                </div>
                <p className="font-semibold text-white">运行中</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-700/30">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm text-slate-400">Agent</span>
                </div>
                <p className="font-semibold text-white">就绪</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-700/30">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm text-slate-400">Memory</span>
                </div>
                <p className="font-semibold text-white">正常</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-700/30">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span className="text-sm text-slate-400">LLM</span>
                </div>
                <p className="font-semibold text-white">已配置</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button onClick={handleSave} className="flex-1">
            保存设置
          </Button>
          <Button variant="destructive" onClick={handleReset}>
            重置所有数据
          </Button>
        </div>
      </div>
    </div>
  );
}
