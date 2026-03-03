// OpenClaw Skills System - 技能系统实现
import type { Skill, SkillMetadata, SkillTrigger, Tool } from './types';

// 技能注册表
export class SkillRegistry {
  private skills: Map<string, Skill> = new Map();

  // 注册技能
  register(skill: Skill): void {
    this.skills.set(skill.id, skill);
  }

  // 获取技能
  get(id: string): Skill | undefined {
    return this.skills.get(id);
  }

  // 获取所有技能
  getAll(): Skill[] {
    return Array.from(this.skills.values());
  }

  // 获取启用的技能
  getEnabled(): Skill[] {
    return this.getAll().filter(s => s.enabled);
  }

  // 按类别获取技能
  getByCategory(category: string): Skill[] {
    return this.getAll().filter(s => s.category === category);
  }

  // 启用/禁用技能
  toggle(id: string, enabled: boolean): void {
    const skill = this.skills.get(id);
    if (skill) {
      skill.enabled = enabled;
      this.skills.set(id, skill);
    }
  }

  // 移除技能
  remove(id: string): void {
    this.skills.delete(id);
  }

  // 清空所有技能
  clear(): void {
    this.skills.clear();
  }
}

// SKILL.md 解析器
export function parseSkillMd(content: string): { metadata: SkillMetadata; content: string } {
  const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  
  if (!frontMatterMatch) {
    return {
      metadata: {
        name: 'Unknown Skill',
        version: '1.0.0',
        description: 'No description provided',
        author: 'Unknown',
        category: 'general'
      },
      content
    };
  }

  const [, frontMatter, body] = frontMatterMatch;
  const metadata: any = {};

  frontMatter.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      const value = valueParts.join(':').trim();
      // 处理数组格式
      if (value.startsWith('[') && value.endsWith(']')) {
        metadata[key.trim()] = value
          .slice(1, -1)
          .split(',')
          .map(s => s.trim().replace(/['"]/g, ''));
      } else {
        metadata[key.trim()] = value.replace(/['"]/g, '');
      }
    }
  });

  return {
    metadata: {
      name: metadata.name || 'Unknown Skill',
      version: metadata.version || '1.0.0',
      description: metadata.description || '',
      author: metadata.author || 'Unknown',
      category: metadata.category || 'general',
      tags: metadata.tags || [],
      dependencies: metadata.dependencies || []
    },
    content: body.trim()
  };
}

// 生成SKILL.md文件
export function generateSkillMd(skill: Partial<Skill>): string {
  const metadata = [
    `name: "${skill.name || 'New Skill'}"`,
    `version: "${skill.version || '1.0.0'}"`,
    `description: "${skill.description || 'A custom skill'}"`,
    `author: "${skill.author || 'User'}"`,
    `category: "${skill.category || 'general'}"`
  ];

  return `---
${metadata.join('\n')}
---

# ${skill.name || 'New Skill'}

${skill.description || 'Description of what this skill does.'}

## Usage

Describe how to use this skill and what it can do.

## Examples

\`\`\`
User: [Example user input]
Assistant: [Expected assistant behavior]
\`\`\`

## Configuration

List any configuration options or environment variables needed.

## Notes

Any additional notes or limitations.
`;
}

// 内置技能定义
export const BUILTIN_SKILLS: Skill[] = [
  {
    id: 'browser-control',
    name: 'Browser Control',
    version: '1.0.0',
    description: 'Control the browser to perform web automation tasks',
    author: 'OpenClaw Team',
    category: 'Automation',
    enabled: true,
    skillMd: `---
name: "Browser Control"
version: "1.0.0"
description: "Control browser for web automation"
author: "OpenClaw Team"
category: "Automation"
---

# Browser Control

This skill allows the AI to control a web browser to perform automated tasks.

## Capabilities

- Navigate to URLs
- Click elements
- Fill forms
- Take screenshots
- Extract content

## Usage Examples

User: "Open example.com and take a screenshot"
User: "Go to Gmail and check for new emails"
User: "Fill out the contact form on this website"
`
  },
  {
    id: 'file-manager',
    name: 'File Manager',
    version: '1.0.0',
    description: 'Manage files and folders on the local system',
    author: 'OpenClaw Team',
    category: 'System',
    enabled: true,
    skillMd: `---
name: "File Manager"
version: "1.0.0"
description: "Manage files and folders"
author: "OpenClaw Team"
category: "System"
---

# File Manager

This skill provides file system operations.

## Capabilities

- List files and directories
- Create, read, update, delete files
- Move and copy files
- Search for files

## Usage Examples

User: "List all files in my Documents folder"
User: "Create a new file called notes.txt"
User: "Find all PDF files modified in the last week"
`
  },
  {
    id: 'calendar',
    name: 'Calendar Manager',
    version: '1.0.0',
    description: 'Manage calendar events and reminders',
    author: 'OpenClaw Team',
    category: 'Productivity',
    enabled: true,
    skillMd: `---
name: "Calendar Manager"
version: "1.0.0"
description: "Manage calendar events"
author: "OpenClaw Team"
category: "Productivity"
---

# Calendar Manager

This skill manages calendar events and reminders.

## Capabilities

- Create events
- List upcoming events
- Update events
- Set reminders
- Check availability

## Usage Examples

User: "Schedule a meeting tomorrow at 3pm"
User: "What's on my calendar for this week?"
User: "Remind me to call mom in 2 hours"
`
  },
  {
    id: 'email',
    name: 'Email Manager',
    version: '1.0.0',
    description: 'Manage emails and inbox',
    author: 'OpenClaw Team',
    category: 'Communication',
    enabled: true,
    skillMd: `---
name: "Email Manager"
version: "1.0.0"
description: "Manage emails and inbox"
author: "OpenClaw Team"
category: "Communication"
---

# Email Manager

This skill manages email operations.

## Capabilities

- Send emails
- Read inbox
- Search emails
- Organize emails
- Set up filters

## Usage Examples

User: "Check my inbox for unread emails"
User: "Send an email to john@example.com"
User: "Find emails from last week about the project"
`
  },
  {
    id: 'web-search',
    name: 'Web Search',
    version: '1.0.0',
    description: 'Search the web for information',
    author: 'OpenClaw Team',
    category: 'Search',
    enabled: true,
    skillMd: `---
name: "Web Search"
version: "1.0.0"
description: "Search the web for information"
author: "OpenClaw Team"
category: "Search"
---

# Web Search

This skill allows the AI to search the web.

## Capabilities

- Search for current information
- Find specific topics
- Get real-time data
- Research topics

## Usage Examples

User: "What's the latest news about AI?"
User: "Search for Python tutorials"
User: "Find restaurants near me"
`
  },
  {
    id: 'code-executor',
    name: 'Code Executor',
    version: '1.0.0',
    description: 'Execute code and scripts',
    author: 'OpenClaw Team',
    category: 'Development',
    enabled: true,
    skillMd: `---
name: "Code Executor"
version: "1.0.0"
description: "Execute code and scripts"
author: "OpenClaw Team"
category: "Development"
---

# Code Executor

This skill executes code and scripts.

## Capabilities

- Run Python scripts
- Execute shell commands
- Run JavaScript
- Process data

## Usage Examples

User: "Run this Python script"
User: "Execute a shell command to list processes"
User: "Help me debug this code"
`
  }
];

// 技能存储管理
export class SkillStorage {
  private readonly STORAGE_KEY = 'openclaw_skills';
  private readonly ENABLED_KEY = 'openclaw_enabled_skills';

  // 保存技能
  async saveSkills(skills: Skill[]): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(skills));
  }

  // 加载技能
  async loadSkills(): Promise<Skill[]> {
    if (typeof window === 'undefined') return BUILTIN_SKILLS;
    
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (!data) return BUILTIN_SKILLS;
    
    try {
      return JSON.parse(data);
    } catch {
      return BUILTIN_SKILLS;
    }
  }

  // 获取启用的技能ID列表
  async getEnabledSkillIds(): Promise<string[]> {
    if (typeof window === 'undefined') return [];
    
    const data = localStorage.getItem(this.ENABLED_KEY);
    if (!data) return BUILTIN_SKILLS.filter(s => s.enabled).map(s => s.id);
    
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  // 保存启用的技能ID列表
  async saveEnabledSkillIds(ids: string[]): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.ENABLED_KEY, JSON.stringify(ids));
  }
}

// 技能管理器
export class SkillManager {
  private registry: SkillRegistry;
  private storage: SkillStorage;

  constructor() {
    this.registry = new SkillRegistry();
    this.storage = new SkillStorage();
  }

  // 初始化 - 加载技能
  async initialize(): Promise<void> {
    const skills = await this.storage.loadSkills();
    const enabledIds = await this.storage.getEnabledSkillIds();
    
    skills.forEach(skill => {
      skill.enabled = enabledIds.includes(skill.id);
      this.registry.register(skill);
    });
  }

  // 获取所有技能
  getAllSkills(): Skill[] {
    return this.registry.getAll();
  }

  // 获取启用的技能
  getEnabledSkills(): Skill[] {
    return this.registry.getEnabled();
  }

  // 启用技能
  async enableSkill(id: string): Promise<void> {
    this.registry.toggle(id, true);
    const enabledIds = this.registry.getEnabled().map(s => s.id);
    await this.storage.saveEnabledSkillIds(enabledIds);
  }

  // 禁用技能
  async disableSkill(id: string): Promise<void> {
    this.registry.toggle(id, false);
    const enabledIds = this.registry.getEnabled().map(s => s.id);
    await this.storage.saveEnabledSkillIds(enabledIds);
  }

  // 添加自定义技能
  async addCustomSkill(skill: Skill): Promise<void> {
    this.registry.register(skill);
    const allSkills = this.registry.getAll();
    await this.storage.saveSkills(allSkills);
  }

  // 移除技能
  async removeSkill(id: string): Promise<void> {
    this.registry.remove(id);
    const allSkills = this.registry.getAll();
    await this.storage.saveSkills(allSkills);
  }

  // 解析并添加SKILL.md
  async importFromSkillMd(skillMd: string, id?: string): Promise<Skill> {
    const { metadata, content } = parseSkillMd(skillMd);
    
    const skill: Skill = {
      id: id || `custom-${Date.now()}`,
      name: metadata.name,
      version: metadata.version,
      description: metadata.description,
      author: metadata.author,
      category: metadata.category,
      enabled: true,
      skillMd: content
    };

    await this.addCustomSkill(skill);
    return skill;
  }
}

// 导出单例
export const skillManager = new SkillManager();
