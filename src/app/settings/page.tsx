'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowLeft,
  Settings,
  Key,
  Server,
  Shield,
  MessageSquare,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Download,
  Upload,
  Trash2,
  Save
} from 'lucide-react';

interface LLMConfig {
  provider: 'coze' | 'openai' | 'anthropic' | 'deepseek' | 'kimi' | 'openai-codex';
  model: string;
  apiKey: string;
  baseUrl: string;
  temperature: number;
  maxTokens: number;
  codexToken?: string; // For OpenAI Codex OAuth
}

interface PermissionsConfig {
  allowFileSystem: boolean;
  allowNetwork: boolean;
  allowExecuteCode: boolean;
  allowedDomains: string[];
  sandboxMode: boolean;
}

interface ChatConfig {
  enableMarkdown: boolean;
  enableCodeHighlight: boolean;
  enableVoiceInput: boolean;
  enableFileUpload: boolean;
  maxFileSize: number;
  autoSaveHistory: boolean;
  historyLimit: number;
}

const PROVIDER_MODELS: Record<string, string[]> = {
  coze: ['doubao-seed-1-6', 'doubao-pro-32k', 'doubao-lite-4k'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1', 'o1-mini'],
  anthropic: ['claude-sonnet-4-5', 'claude-opus-4-5', 'claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku'],
  deepseek: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
  kimi: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
  'openai-codex': ['gpt-4o', 'gpt-4-turbo', 'o1', 'o1-mini'] // Codex订阅模型
};

const PROVIDER_NAMES: Record<string, string> = {
  coze: 'Coze (ByteDance)',
  openai: 'OpenAI API',
  anthropic: 'Anthropic',
  deepseek: 'DeepSeek',
  kimi: 'Kimi (Moonshot)',
  'openai-codex': 'OpenAI Code (Codex订阅)'
};

export default function SettingsPage() {
  const router = useRouter();
  
  // LLM配置
  const [llmConfig, setLLMConfig] = useState<LLMConfig>({
    provider: 'coze',
    model: 'doubao-seed-1-6',
    apiKey: '',
    baseUrl: '',
    temperature: 0.7,
    maxTokens: 4096
  });
  
  // 权限配置
  const [permissions, setPermissions] = useState<PermissionsConfig>({
    allowFileSystem: true,
    allowNetwork: true,
    allowExecuteCode: false,
    allowedDomains: ['*'],
    sandboxMode: true
  });
  
  // 聊天配置
  const [chatConfig, setChatConfig] = useState<ChatConfig>({
    enableMarkdown: true,
    enableCodeHighlight: true,
    enableVoiceInput: false,
    enableFileUpload: true,
    maxFileSize: 10,
    autoSaveHistory: true,
    historyLimit: 1000
  });
  
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [isSaving, setIsSaving] = useState(false);
  const [domainsInput, setDomainsInput] = useState('*');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const [llmRes, permRes, chatRes] = await Promise.all([
        fetch('/api/config?section=llm'),
        fetch('/api/config?section=permissions'),
        fetch('/api/config?section=chat')
      ]);

      const [llmData, permData, chatData] = await Promise.all([
        llmRes.json(),
        permRes.json(),
        chatRes.json()
      ]);

      if (llmData.success) {
        setLLMConfig(llmData.config);
      }
      if (permData.success) {
        setPermissions(permData.config);
        setDomainsInput(permData.config.allowedDomains?.join(', ') || '*');
      }
      if (chatData.success) {
        setChatConfig(chatData.config);
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const handleSaveLLM = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'llm',
          config: llmConfig
        })
      });

      if (response.ok) {
        alert('LLM配置已保存');
      }
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePermissions = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'permissions',
          config: {
            ...permissions,
            allowedDomains: domainsInput.split(',').map(d => d.trim()).filter(Boolean)
          }
        })
      });

      if (response.ok) {
        alert('权限配置已保存');
      }
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveChat = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'chat',
          config: chatConfig
        })
      });

      if (response.ok) {
        alert('聊天配置已保存');
      }
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
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

  const handleExport = async () => {
    try {
      const response = await fetch('/api/config');
      const data = await response.json();
      
      if (data.success) {
        const blob = new Blob([JSON.stringify(data.config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `openclaw-config-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const config = JSON.parse(text);

        const response = await fetch('/api/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config })
        });

        if (response.ok) {
          loadConfig();
          alert('配置导入成功');
        }
      } catch (error) {
        console.error('Failed to import:', error);
        alert('导入失败');
      }
    };
    input.click();
  };

  const handleReset = async () => {
    if (!confirm('确定重置所有配置? 这将恢复默认设置。')) return;

    try {
      await fetch('/api/config', { method: 'DELETE' });
      loadConfig();
      alert('配置已重置');
    } catch (error) {
      console.error('Failed to reset:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
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
                <Settings className="w-6 h-6 text-slate-500" />
                系统设置
              </h1>
              <p className="text-slate-400">配置模型API、权限和聊天功能</p>
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

        {/* Main Settings */}
        <Tabs defaultValue="llm" className="space-y-6">
          <TabsList className="bg-slate-800 grid grid-cols-3 w-full">
            <TabsTrigger value="llm" className="text-slate-300">
              <Key className="w-4 h-4 mr-2" />
              模型API
            </TabsTrigger>
            <TabsTrigger value="permissions" className="text-slate-300">
              <Shield className="w-4 h-4 mr-2" />
              权限配置
            </TabsTrigger>
            <TabsTrigger value="chat" className="text-slate-300">
              <MessageSquare className="w-4 h-4 mr-2" />
              聊天配置
            </TabsTrigger>
          </TabsList>

          {/* LLM配置 */}
          <TabsContent value="llm">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-yellow-500" />
                  大语言模型配置
                </CardTitle>
                <CardDescription>
                  配置AI模型提供商和API密钥
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">提供商</Label>
                    <Select 
                      value={llmConfig.provider} 
                      onValueChange={(v) => {
                        setLLMConfig(prev => ({
                          ...prev,
                          provider: v as any,
                          model: PROVIDER_MODELS[v]?.[0] || ''
                        }));
                      }}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="coze">Coze (豆包) - 推荐</SelectItem>
                        <SelectItem value="openai">OpenAI API</SelectItem>
                        <SelectItem value="openai-codex">OpenAI Code (Codex订阅)</SelectItem>
                        <SelectItem value="anthropic">Anthropic</SelectItem>
                        <SelectItem value="deepseek">DeepSeek</SelectItem>
                        <SelectItem value="kimi">Kimi (月之暗面)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">模型</Label>
                    <Select 
                      value={llmConfig.model} 
                      onValueChange={(v) => setLLMConfig(prev => ({ ...prev, model: v }))}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDER_MODELS[llmConfig.provider]?.map(model => (
                          <SelectItem key={model} value={model}>{model}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* OpenAI Codex OAuth 说明 */}
                {llmConfig.provider === 'openai-codex' && (
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <h4 className="font-medium text-blue-400 mb-2">OpenAI Code (Codex) 订阅</h4>
                    <p className="text-sm text-slate-300 mb-3">
                      使用您的ChatGPT订阅访问API，无需单独购买API额度。需要OAuth认证。
                    </p>
                    <Button 
                      variant="outline" 
                      className="border-blue-500 text-blue-400 hover:bg-blue-500/20"
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/auth/codex', { method: 'POST' });
                          const data = await response.json();
                          if (data.authUrl) {
                            window.open(data.authUrl, '_blank');
                          } else {
                            alert(data.message || '请在终端运行: openclaw models auth login --provider openai-codex');
                          }
                        } catch {
                          alert('请在终端运行: openclaw models auth login --provider openai-codex');
                        }
                      }}
                    >
                      <Key className="w-4 h-4 mr-2" />
                      使用ChatGPT登录
                    </Button>
                    <p className="text-xs text-slate-500 mt-2">
                      或在终端运行: <code className="bg-slate-700 px-1 rounded">openclaw models auth login --provider openai-codex</code>
                    </p>
                  </div>
                )}

                {/* API Key 输入 */}
                {llmConfig.provider !== 'openai-codex' && (
                  <div className="space-y-2">
                    <Label className="text-slate-300">API Key</Label>
                    <Input
                      type="password"
                      value={llmConfig.apiKey}
                      onChange={(e) => setLLMConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                      placeholder={llmConfig.provider === 'coze' ? '从环境变量 COZE_API_KEY 读取' : '输入API密钥'}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                    <p className="text-xs text-slate-500">
                      {llmConfig.provider === 'coze' 
                        ? '如未设置，将从环境变量 COZE_API_KEY 读取' 
                        : '请输入对应平台的API密钥'}
                    </p>
                  </div>
                )}

                {llmConfig.provider !== 'coze' && (
                  <div className="space-y-2">
                    <Label className="text-slate-300">Base URL（可选）</Label>
                    <Input
                      value={llmConfig.baseUrl}
                      onChange={(e) => setLLMConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                      placeholder="自定义API端点"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-slate-300">Temperature: {llmConfig.temperature}</Label>
                  <Slider
                    value={[llmConfig.temperature]}
                    onValueChange={([v]) => setLLMConfig(prev => ({ ...prev, temperature: v }))}
                    min={0}
                    max={2}
                    step={0.1}
                    className="w-full"
                  />
                  <p className="text-xs text-slate-500">控制回复的随机性，越高越有创造性</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">最大Tokens</Label>
                  <Input
                    type="number"
                    value={llmConfig.maxTokens}
                    onChange={(e) => setLLMConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 4096 }))}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <Button onClick={handleSaveLLM} disabled={isSaving}>
                    <Save className="w-4 h-4 mr-2" />
                    保存配置
                  </Button>
                  <Button variant="outline" onClick={handleTestConnection} disabled={testStatus === 'testing'}>
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
          </TabsContent>

          {/* 权限配置 */}
          <TabsContent value="permissions">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-500" />
                  权限配置
                </CardTitle>
                <CardDescription>
                  配置AI的能力边界和安全策略
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-700/30">
                  <div>
                    <h3 className="font-semibold text-white">文件系统访问</h3>
                    <p className="text-sm text-slate-400">允许AI读取和写入本地文件</p>
                  </div>
                  <Switch
                    checked={permissions.allowFileSystem}
                    onCheckedChange={(checked) => setPermissions(prev => ({ ...prev, allowFileSystem: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-700/30">
                  <div>
                    <h3 className="font-semibold text-white">网络访问</h3>
                    <p className="text-sm text-slate-400">允许AI发起网络请求</p>
                  </div>
                  <Switch
                    checked={permissions.allowNetwork}
                    onCheckedChange={(checked) => setPermissions(prev => ({ ...prev, allowNetwork: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-700/30">
                  <div>
                    <h3 className="font-semibold text-white">执行代码</h3>
                    <p className="text-sm text-slate-400">允许AI执行代码（沙箱环境）</p>
                  </div>
                  <Switch
                    checked={permissions.allowExecuteCode}
                    onCheckedChange={(checked) => setPermissions(prev => ({ ...prev, allowExecuteCode: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-700/30">
                  <div>
                    <h3 className="font-semibold text-white">沙箱模式</h3>
                    <p className="text-sm text-slate-400">在隔离环境中执行操作，提高安全性</p>
                  </div>
                  <Switch
                    checked={permissions.sandboxMode}
                    onCheckedChange={(checked) => setPermissions(prev => ({ ...prev, sandboxMode: checked }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">允许的域名（网络访问白名单）</Label>
                  <Input
                    value={domainsInput}
                    onChange={(e) => setDomainsInput(e.target.value)}
                    placeholder="api.openai.com, api.anthropic.com"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                  <p className="text-xs text-slate-500">多个域名用逗号分隔，* 表示允许所有</p>
                </div>

                <Button onClick={handleSavePermissions} disabled={isSaving}>
                  <Save className="w-4 h-4 mr-2" />
                  保存权限配置
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 聊天配置 */}
          <TabsContent value="chat">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-green-500" />
                  聊天软件配置
                </CardTitle>
                <CardDescription>
                  配置对话界面的功能和显示选项
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-700/30">
                  <div>
                    <h3 className="font-semibold text-white">Markdown渲染</h3>
                    <p className="text-sm text-slate-400">支持Markdown格式显示</p>
                  </div>
                  <Switch
                    checked={chatConfig.enableMarkdown}
                    onCheckedChange={(checked) => setChatConfig(prev => ({ ...prev, enableMarkdown: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-700/30">
                  <div>
                    <h3 className="font-semibold text-white">代码高亮</h3>
                    <p className="text-sm text-slate-400">为代码块添加语法高亮</p>
                  </div>
                  <Switch
                    checked={chatConfig.enableCodeHighlight}
                    onCheckedChange={(checked) => setChatConfig(prev => ({ ...prev, enableCodeHighlight: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-700/30">
                  <div>
                    <h3 className="font-semibold text-white">语音输入</h3>
                    <p className="text-sm text-slate-400">支持语音转文字输入</p>
                  </div>
                  <Switch
                    checked={chatConfig.enableVoiceInput}
                    onCheckedChange={(checked) => setChatConfig(prev => ({ ...prev, enableVoiceInput: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-700/30">
                  <div>
                    <h3 className="font-semibold text-white">文件上传</h3>
                    <p className="text-sm text-slate-400">支持上传文件进行分析</p>
                  </div>
                  <Switch
                    checked={chatConfig.enableFileUpload}
                    onCheckedChange={(checked) => setChatConfig(prev => ({ ...prev, enableFileUpload: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-700/30">
                  <div>
                    <h3 className="font-semibold text-white">自动保存历史</h3>
                    <p className="text-sm text-slate-400">自动保存对话记录到本地</p>
                  </div>
                  <Switch
                    checked={chatConfig.autoSaveHistory}
                    onCheckedChange={(checked) => setChatConfig(prev => ({ ...prev, autoSaveHistory: checked }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">最大文件大小 (MB)</Label>
                    <Input
                      type="number"
                      value={chatConfig.maxFileSize}
                      onChange={(e) => setChatConfig(prev => ({ ...prev, maxFileSize: parseInt(e.target.value) || 10 }))}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">历史记录上限</Label>
                    <Input
                      type="number"
                      value={chatConfig.historyLimit}
                      onChange={(e) => setChatConfig(prev => ({ ...prev, historyLimit: parseInt(e.target.value) || 1000 }))}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>

                <Button onClick={handleSaveChat} disabled={isSaving}>
                  <Save className="w-4 h-4 mr-2" />
                  保存聊天配置
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Danger Zone */}
        <Card className="bg-slate-800/50 border-red-500/30 mt-8">
          <CardHeader>
            <CardTitle className="text-red-500 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              危险操作
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">重置所有配置</h3>
                <p className="text-sm text-slate-400">恢复到默认设置，此操作不可撤销</p>
              </div>
              <Button variant="destructive" onClick={handleReset}>
                重置配置
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
