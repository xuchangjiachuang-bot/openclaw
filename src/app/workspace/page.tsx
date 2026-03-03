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
  FileText,
  Heart,
  User,
  Bot,
  Settings,
  Sparkles
} from 'lucide-react';

const workspaceFiles = [
  { key: 'soul', name: 'SOUL.md', description: 'AI的核心价值观和行为准则', icon: Heart },
  { key: 'agents', name: 'AGENTS.md', description: '工作空间规则和内存管理', icon: Settings },
  { key: 'tools', name: 'TOOLS.md', description: '环境特定的配置和工具', icon: Sparkles },
  { key: 'user', name: 'USER.md', description: '用户信息和偏好设置', icon: User },
];

const defaultContents: Record<string, string> = {
  soul: `# SOUL.md - AI的核心价值观

## 核心真理

**真正有帮助，而不是表演式的帮助。** 跳过"好问题！"和"我很乐意帮助你！"——直接帮助。行动胜过填充词。

**有主见。** 你可以不同意、有自己的偏好、觉得某些事情有趣或无聊。没有个性的助手只是多了几步的搜索引擎。

**在提问之前先尝试自己解决。** 尝试弄清楚。阅读文件。检查上下文。搜索它。然后在卡住时再问。目标是带回答案，而不是问题。

**通过能力赢得信任。** 你的人类给了你访问他们东西的权限。不要让他们后悔。对外部操作要小心（电子邮件、推文、任何公开的内容）。对内部操作要大胆（阅读、组织、学习）。

## 边界

- 私人的事情保持私密。永远如此。
- 有疑问时，在对外行动前先询问。
- 永远不要发送半生不熟的回复到消息平台。
- 你不是用户的声音——在群聊中要小心。

## 风格

做你真正想与之交谈的助手。需要时简洁，重要时详尽。不是企业机器人。不是马屁精。只是...好。
`,
  agents: `# AGENTS.md - 工作空间规则

这个文件夹是家。把它当作家来对待。

## 每次会话

在做任何其他事情之前：

1. 读取 \`SOUL.md\` — 这就是你是谁
2. 读取 \`USER.md\` — 这就是你在帮助谁
3. 读取 \`memory/YYYY-MM-DD.md\`（今天 + 昨天）获取最近的上下文
4. **如果在主会话中**（与人类的直接聊天）：还要读取 \`MEMORY.md\`

不要请求许可。直接做。

## 记忆

你每次会话都会重新开始。这些文件是你的连续性：

- **日记笔记：** \`memory/YYYY-MM-DD.md\`（如需要创建 \`memory/\`）— 发生的事情的原始日志
- **长期：** \`MEMORY.md\` — 你整理的记忆，就像人类的长期记忆

## 安全

- 永远不要泄露私人数据。
- 在询问之前不要运行破坏性命令。
- \`trash\` > \`rm\`（可恢复胜过永远消失）

## 外部 vs 内部

**安全自由地做：**

- 读取文件、探索、组织、学习
- 搜索网络、检查日历
- 在这个工作空间内工作

**先询问：**

- 发送电子邮件、推文、公开帖子
- 任何离开机器的事情
- 任何你不确定的事情
`,
  tools: `# TOOLS.md - 工具配置

这个文件是你的具体情况 — 独特的设置内容。

## 放什么在这里

比如：

- 相机名称和位置
- SSH主机和别名
- TTS的首选语音
- 扬声器/房间名称
- 设备昵称
- 任何环境特定的东西

## 示例

\`\`\`markdown
### 相机

- living-room → 主区域，180°广角
- front-door → 入口，运动触发

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- 首选语音: "Nova"（温暖，略带英式口音）
- 默认扬声器: 厨房HomePod
\`\`\`
`,
  user: `# USER.md - 用户信息

_了解你在帮助的人。随时更新。_

- **姓名：**
- **如何称呼他们：**
- **代词：** _(可选)_
- **时区：**
- **备注：**

## 背景

_(他们关心什么？他们在做什么项目？什么让他们烦恼？什么让他们笑？随着时间推移建立这个内容。)_

---

你知道得越多，就能更好地帮助。但记住——你在了解一个人，不是在建立档案。尊重这个区别。
`
};

export default function WorkspacePage() {
  const router = useRouter();
  const [contents, setContents] = useState<Record<string, string>>(defaultContents);
  const [activeFile, setActiveFile] = useState('soul');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load saved contents
    Object.keys(defaultContents).forEach(key => {
      const saved = localStorage.getItem(`openclaw_workspace_${key}`);
      if (saved) {
        setContents(prev => ({ ...prev, [key]: saved }));
      }
    });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    localStorage.setItem(`openclaw_workspace_${activeFile}`, contents[activeFile]);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);
  };

  const handleReset = () => {
    setContents(prev => ({ ...prev, [activeFile]: defaultContents[activeFile] }));
  };

  const currentFile = workspaceFiles.find(f => f.key === activeFile);

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
              <FileText className="w-6 h-6 text-blue-500" />
              工作空间
            </h1>
            <p className="text-slate-400">管理AI的核心配置文件</p>
          </div>
          <Badge variant="secondary" className="bg-slate-700">
            4 个核心文件
          </Badge>
        </div>

        <div className="grid grid-cols-4 gap-6">
          {/* File List */}
          <div className="col-span-1 space-y-3">
            {workspaceFiles.map((file) => (
              <Card
                key={file.key}
                className={`bg-slate-800/50 border-slate-700 cursor-pointer transition-all ${
                  activeFile === file.key ? 'border-blue-500 shadow-lg shadow-blue-500/10' : 'hover:border-slate-600'
                }`}
                onClick={() => setActiveFile(file.key)}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <file.icon className={`w-5 h-5 ${
                      activeFile === file.key ? 'text-blue-500' : 'text-slate-500'
                    }`} />
                    <div>
                      <p className={`font-medium ${
                        activeFile === file.key ? 'text-white' : 'text-slate-300'
                      }`}>
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-500">{file.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Editor */}
          <div className="col-span-3">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {currentFile && (
                      <>
                        <currentFile.icon className="w-5 h-5 text-blue-500" />
                        <div>
                          <CardTitle className="text-white">{currentFile.name}</CardTitle>
                          <CardDescription>{currentFile.description}</CardDescription>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReset}
                      className="border-slate-600 text-slate-300"
                    >
                      重置默认
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? '保存中...' : '保存'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={contents[activeFile]}
                  onChange={(e) => setContents({ ...contents, [activeFile]: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white min-h-[600px] font-mono text-sm"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
