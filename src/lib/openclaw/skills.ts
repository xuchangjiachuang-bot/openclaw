// OpenClaw Skills System - 完整实现
// 支持ClawHub无缝下载、三级渐进式披露、依赖检查

import type { Skill, SkillMetadata, SkillTrigger, SkillTool } from './types';
import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

// 技能存储优先级
export const SKILL_STORAGE_PRIORITIES = {
  WORKSPACE: 1,  // <project>/skills/ - 最高优先级
  LOCAL: 2,      // ~/.openclaw/skills/
  BUILTIN: 3     // 内置技能
};

// ClawHub技能列表
export interface ClawHubSkill {
  slug: string;
  name: string;
  description: string;
  category: string;
  installs: number;
  verified: boolean;
  featured?: boolean;
}

// 技能注册表
export class SkillRegistry {
  private skills: Map<string, Skill> = new Map();
  private skillsDir: string;
  private workspaceDir: string;
  private localDir: string;

  constructor(workspaceDir: string = '/tmp/openclaw/skills') {
    this.skillsDir = workspaceDir;
    this.workspaceDir = path.join(process.cwd(), 'skills');
    this.localDir = path.join(process.env.HOME || '/tmp', '.openclaw', 'skills');
  }

  // 获取技能目录（按优先级）
  private getSkillPath(skillId: string, filename: string = ''): string | null {
    const locations = [
      path.join(this.workspaceDir, skillId, filename),
      path.join(this.localDir, skillId, filename),
      path.join(this.skillsDir, skillId, filename),
    ];

    // 返回第一个存在的路径
    for (const loc of locations) {
      if (require('fs').existsSync(loc)) {
        return loc;
      }
    }
    return null;
  }

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

  // 加载技能（从文件系统）
  async loadSkill(skillId: string): Promise<Skill | null> {
    const skillPath = this.getSkillPath(skillId, 'SKILL.md');
    if (!skillPath) return null;

    try {
      const content = await fs.readFile(skillPath, 'utf-8');
      const { metadata, content: body } = parseSkillMd(content);
      
      return {
        id: skillId,
        name: metadata.name || skillId,
        version: metadata.version || '1.0.0',
        description: metadata.description || '',
        author: metadata.author || 'Unknown',
        category: metadata.category || 'general',
        enabled: true,
        skillMd: content,
        metadata: metadata
      };
    } catch (error) {
      console.error(`Failed to load skill ${skillId}:`, error);
      return null;
    }
  }

  // 扫描所有技能目录
  async scanSkills(): Promise<Skill[]> {
    const skills: Skill[] = [];
    const locations = [this.workspaceDir, this.localDir, this.skillsDir];

    for (const loc of locations) {
      try {
        const entries = await fs.readdir(loc, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && !skills.find(s => s.id === entry.name)) {
            const skill = await this.loadSkill(entry.name);
            if (skill) {
              skills.push(skill);
              this.register(skill);
            }
          }
        }
      } catch {
        // 目录不存在，忽略
      }
    }

    return skills;
  }
}

// 完整的SKILL.md解析器（支持OpenClaw官方格式）
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
  let currentKey = '';
  let currentObj: any = null;
  let inArray = false;
  let arrayItems: string[] = [];

  // 解析YAML frontmatter
  const lines = frontMatter.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 跳过空行
    if (!line.trim()) continue;
    
    // 处理嵌套对象（如metadata.openclaw）
    if (line.startsWith('  ') && currentObj) {
      const [key, ...valueParts] = line.trim().split(':');
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim();
        
        // 处理数组
        if (value.startsWith('[') && value.endsWith(']')) {
          currentObj[key.trim()] = value
            .slice(1, -1)
            .split(',')
            .map(s => s.trim().replace(/['"]/g, ''));
        } else {
          currentObj[key.trim()] = value.replace(/['"]/g, '');
        }
      }
      continue;
    }
    
    // 处理数组项（以 - 开头）
    if (line.trim().startsWith('- ')) {
      if (inArray && currentKey) {
        arrayItems.push(line.trim().slice(2).replace(/['"]/g, ''));
      }
      continue;
    }
    
    // 处理普通键值对
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      const value = valueParts.join(':').trim();
      
      // 检测数组开始
      if (value === '' && lines[i + 1]?.trim().startsWith('- ')) {
        currentKey = key.trim();
        inArray = true;
        arrayItems = [];
        continue;
      }
      
      // 处理行内数组
      if (value.startsWith('[') && value.endsWith(']')) {
        metadata[key.trim()] = value
          .slice(1, -1)
          .split(',')
          .map(s => s.trim().replace(/['"]/g, ''));
      } else if (value.trim() === '') {
        // 可能是嵌套对象
        currentKey = key.trim();
        currentObj = metadata[currentKey] = {};
      } else {
        metadata[key.trim()] = value.replace(/['"]/g, '');
      }
    }
  }
  
  // 处理未完成的数组
  if (inArray && arrayItems.length > 0) {
    metadata[currentKey] = arrayItems;
  }

  return {
    metadata: {
      name: metadata.name || 'Unknown Skill',
      version: metadata.version || '1.0.0',
      description: metadata.description || '',
      author: metadata.author || 'Unknown',
      category: metadata.category || 'general',
      tags: metadata.tags || [],
      dependencies: metadata.dependencies || [],
      openclaw: metadata.openclaw || metadata.metadata?.openclaw
    },
    content: body.trim()
  };
}

// 生成SKILL.md文件（OpenClaw官方格式）
export function generateSkillMd(skill: Partial<Skill>): string {
  const openclawMeta = skill.metadata?.openclaw || {};
  
  const metadata = [
    `name: "${skill.name || 'New Skill'}"`,
    `description: "${skill.description || 'A custom skill'}"`,
    `version: "${skill.version || '1.0.0'}"`,
    openclawMeta.emoji ? `emoji: "${openclawMeta.emoji}"` : '',
    openclawMeta.os ? `os: ${JSON.stringify(openclawMeta.os)}` : '',
    openclawMeta.primaryEnv ? `primaryEnv: "${openclawMeta.primaryEnv}"` : '',
  ].filter(Boolean);

  // 添加requires部分
  const requires = openclawMeta.requires || {};
  if (requires.bins || requires.env || requires.config) {
    metadata.push('requires:');
    if (requires.bins) metadata.push(`  bins: ${JSON.stringify(requires.bins)}`);
    if (requires.env) metadata.push(`  env: ${JSON.stringify(requires.env)}`);
    if (requires.config) metadata.push(`  config: ${JSON.stringify(requires.config)}`);
  }

  // 添加install部分
  if (openclawMeta.install && openclawMeta.install.length > 0) {
    metadata.push('install:');
    openclawMeta.install.forEach((inst: any) => {
      metadata.push(`  - id: "${inst.id}"`);
      metadata.push(`    kind: "${inst.kind}"`);
      if (inst.formula) metadata.push(`    formula: "${inst.formula}"`);
    });
  }

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

// ClawHub技能下载器
export class ClawHubClient {
  private static HUB_URL = 'https://raw.githubusercontent.com/openclaw/clawhub/main';
  private static HUB_INDEX_URL = 'https://raw.githubusercontent.com/openclaw/clawhub/main/index.json';

  // 获取技能列表
  static async listSkills(): Promise<ClawHubSkill[]> {
    try {
      const response = await fetch(this.HUB_INDEX_URL);
      if (!response.ok) throw new Error('Failed to fetch skill index');
      return await response.json();
    } catch (error) {
      console.error('Failed to list skills from ClawHub:', error);
      return [];
    }
  }

  // 下载技能
  static async downloadSkill(
    slug: string, 
    targetDir: string = '/tmp/openclaw/skills'
  ): Promise<{ success: boolean; message: string; skill?: Skill }> {
    try {
      // 创建目标目录
      const skillDir = path.join(targetDir, slug);
      await fs.mkdir(skillDir, { recursive: true });

      // 下载SKILL.md
      const skillMdUrl = `${this.HUB_URL}/skills/${slug}/SKILL.md`;
      const response = await fetch(skillMdUrl);
      
      if (!response.ok) {
        throw new Error(`Skill not found: ${slug}`);
      }

      const skillMdContent = await response.text();
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), skillMdContent);

      // 解析并返回技能信息
      const { metadata } = parseSkillMd(skillMdContent);
      
      const skill: Skill = {
        id: slug,
        name: metadata.name || slug,
        version: metadata.version || '1.0.0',
        description: metadata.description || '',
        author: metadata.author || 'Unknown',
        category: metadata.category || 'general',
        enabled: true,
        skillMd: skillMdContent,
        metadata
      };

      return {
        success: true,
        message: `Successfully installed ${metadata.name || slug}`,
        skill
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to download skill'
      };
    }
  }

  // 使用npx安装技能
  static async installViaNpx(
    slug: string,
    targetDir: string = '/tmp/openclaw/skills'
  ): Promise<{ success: boolean; message: string; skill?: Skill }> {
    return new Promise((resolve) => {
      const skillDir = path.join(targetDir, slug);
      
      // 执行npx clawhub install命令
      const proc = spawn('npx', ['clawhub@latest', 'install', slug], {
        cwd: targetDir,
        shell: true,
        env: {
          ...process.env,
          OPENCLAW_SKILLS_DIR: skillDir
        }
      });

      let output = '';
      let error = '';

      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.stderr.on('data', (data) => {
        error += data.toString();
      });

      proc.on('close', async (code) => {
        if (code === 0) {
          // 读取安装的技能
          try {
            const skillMdPath = path.join(skillDir, 'SKILL.md');
            const content = await fs.readFile(skillMdPath, 'utf-8');
            const { metadata } = parseSkillMd(content);
            
            resolve({
              success: true,
              message: `Successfully installed ${metadata.name || slug} via ClawHub`,
              skill: {
                id: slug,
                name: metadata.name || slug,
                version: metadata.version || '1.0.0',
                description: metadata.description || '',
                author: metadata.author || 'Unknown',
                category: metadata.category || 'general',
                enabled: true,
                skillMd: content,
                metadata
              }
            });
          } catch {
            resolve({
              success: true,
              message: `Skill ${slug} installed, but failed to read SKILL.md`
            });
          }
        } else {
          resolve({
            success: false,
            message: `Installation failed: ${error || output}`
          });
        }
      });

      // 设置超时
      setTimeout(() => {
        proc.kill();
        resolve({
          success: false,
          message: 'Installation timed out'
        });
      }, 60000);
    });
  }
}

// 技能依赖检查器
export class SkillDependencyChecker {
  // 检查技能依赖
  static async check(skill: Skill): Promise<{
    satisfied: boolean;
    missing: { type: string; name: string }[];
  }> {
    const missing: { type: string; name: string }[] = [];
    const requires = skill.metadata?.openclaw?.requires || {};

    // 检查bins（可执行文件）
    if (requires.bins) {
      for (const bin of requires.bins) {
        const exists = await this.checkBinary(bin);
        if (!exists) {
          missing.push({ type: 'binary', name: bin });
        }
      }
    }

    // 检查env（环境变量）
    if (requires.env) {
      for (const env of requires.env) {
        if (!process.env[env]) {
          missing.push({ type: 'environment', name: env });
        }
      }
    }

    // 检查config（配置文件）
    if (requires.config) {
      for (const config of requires.config) {
        const configPath = path.join(process.cwd(), 'skills', skill.id, config);
        try {
          await fs.access(configPath);
        } catch {
          missing.push({ type: 'config', name: config });
        }
      }
    }

    // 检查os（操作系统）
    const os = skill.metadata?.openclaw?.os;
    if (os && os.length > 0) {
      const currentOs = this.getCurrentOs();
      if (!os.includes(currentOs)) {
        missing.push({ 
          type: 'os', 
          name: `This skill requires ${os.join(' or ')}, but you're on ${currentOs}` 
        });
      }
    }

    return {
      satisfied: missing.length === 0,
      missing
    };
  }

  // 检查可执行文件是否存在
  private static async checkBinary(bin: string): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn('which', [bin], { shell: true });
      proc.on('close', (code) => {
        resolve(code === 0);
      });
    });
  }

  // 获取当前操作系统
  private static getCurrentOs(): string {
    switch (process.platform) {
      case 'darwin':
        return 'darwin';
      case 'linux':
        return 'linux';
      case 'win32':
        return 'windows';
      default:
        return process.platform;
    }
  }
}

// 技能触发器（用于AI识别何时使用技能）
export class SkillTriggerEngine {
  private triggers: Map<string, SkillTrigger[]> = new Map();

  // 注册触发器
  registerTrigger(skillId: string, trigger: SkillTrigger): void {
    const triggers = this.triggers.get(skillId) || [];
    triggers.push(trigger);
    this.triggers.set(skillId, triggers);
  }

  // 匹配触发器
  match(userMessage: string, skills: Skill[]): Skill[] {
    const matched: Skill[] = [];
    const lowerMessage = userMessage.toLowerCase();

    for (const skill of skills) {
      if (!skill.enabled) continue;

      // 检查关键词
      const description = skill.description.toLowerCase();
      const keywords = description.split(/\s+/);
      
      for (const keyword of keywords) {
        if (lowerMessage.includes(keyword)) {
          matched.push(skill);
          break;
        }
      }

      // 检查技能名称
      if (lowerMessage.includes(skill.name.toLowerCase())) {
        if (!matched.includes(skill)) {
          matched.push(skill);
        }
      }

      // 检查分类
      if (lowerMessage.includes(skill.category.toLowerCase())) {
        if (!matched.includes(skill)) {
          matched.push(skill);
        }
      }
    }

    return matched;
  }

  // 清除触发器
  clear(skillId?: string): void {
    if (skillId) {
      this.triggers.delete(skillId);
    } else {
      this.triggers.clear();
    }
  }
}

// 内置技能定义（保持向后兼容）
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
description: "Control browser for web automation"
version: "1.0.0"
---

# Browser Control

Control a web browser to perform automated tasks.

## Capabilities

- Navigate to URLs
- Click elements
- Fill forms
- Take screenshots
- Extract content
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
description: "Manage files and folders"
version: "1.0.0"
---

# File Manager

Manage files and folders on your local system.

## Capabilities

- List files and directories
- Create, read, update, delete files
- Move and copy files
- Search for files
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
description: "Manage calendar events"
version: "1.0.0"
---

# Calendar Manager

Manage calendar events and reminders.

## Capabilities

- Create events
- List upcoming events
- Update events
- Set reminders
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
description: "Manage emails and inbox"
version: "1.0.0"
---

# Email Manager

Manage email operations.

## Capabilities

- Send emails
- Read inbox
- Search emails
- Organize emails
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
description: "Search the web for information"
version: "1.0.0"
---

# Web Search

Search the web for information.

## Capabilities

- Search for current information
- Find specific topics
- Get real-time data
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
description: "Execute code and scripts"
version: "1.0.0"
---

# Code Executor

Execute code and scripts.

## Capabilities

- Run Python scripts
- Execute shell commands
- Run JavaScript
`
  }
];

// 技能工具生成器（将技能转换为LLM可调用的工具）
export function skillToTools(skill: Skill): SkillTool[] {
  const tools: SkillTool[] = [];
  
  // 为每个技能生成一个工具
  tools.push({
    type: 'function',
    function: {
      name: `skill_${skill.id.replace(/-/g, '_')}`,
      description: skill.description,
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: `Query for ${skill.name} skill`
          }
        },
        required: ['query']
      }
    }
  });

  return tools;
}


// ==================== 技能管理器 ====================

// 简单的技能管理器（单例模式）
class SkillManager {
  private skills: Map<string, Skill> = new Map();
  private skillsDir: string;
  private initialized: boolean = false;

  constructor() {
    this.skillsDir = '/tmp/openclaw/skills';
  }

  // 初始化（加载内置技能和已保存的技能）
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // 加载内置技能
    BUILTIN_SKILLS.forEach(skill => {
      this.skills.set(skill.id, { ...skill });
    });

    // 从文件系统加载已保存的技能
    try {
      const savedSkillsPath = `${this.skillsDir}/skills.json`;
      const { promises: fs } = await import('fs');
      const data = await fs.readFile(savedSkillsPath, 'utf-8');
      const savedSkills = JSON.parse(data);
      
      savedSkills.forEach((skill: Skill) => {
        if (!this.skills.has(skill.id)) {
          this.skills.set(skill.id, skill);
        }
      });
    } catch {
      // 文件不存在，忽略
    }

    this.initialized = true;
  }

  // 获取所有技能
  getAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  // 获取启用的技能
  getEnabledSkills(): Skill[] {
    return this.getAllSkills().filter(s => s.enabled);
  }

  // 获取技能
  getSkill(id: string): Skill | undefined {
    return this.skills.get(id);
  }

  // 添加自定义技能
  async addCustomSkill(skill: Skill): Promise<void> {
    this.skills.set(skill.id, skill);
    await this.saveSkills();
  }

  // 从SKILL.md导入技能
  async importFromSkillMd(skillMd: string): Promise<Skill> {
    const { metadata, content } = parseSkillMd(skillMd);
    
    const skill: Skill = {
      id: metadata.name.toLowerCase().replace(/\s+/g, '-'),
      name: metadata.name,
      version: metadata.version,
      description: metadata.description,
      author: metadata.author,
      category: metadata.category,
      enabled: true,
      skillMd: skillMd,
      metadata
    };

    await this.addCustomSkill(skill);
    return skill;
  }

  // 启用技能
  async enableSkill(id: string): Promise<void> {
    const skill = this.skills.get(id);
    if (skill) {
      skill.enabled = true;
      await this.saveSkills();
    }
  }

  // 禁用技能
  async disableSkill(id: string): Promise<void> {
    const skill = this.skills.get(id);
    if (skill) {
      skill.enabled = false;
      await this.saveSkills();
    }
  }

  // 移除技能
  async removeSkill(id: string): Promise<void> {
    this.skills.delete(id);
    await this.saveSkills();
  }

  // 保存技能到文件系统
  private async saveSkills(): Promise<void> {
    const { promises: fs } = await import('fs');
    await fs.mkdir(this.skillsDir, { recursive: true });
    
    const skillsArray = this.getAllSkills();
    await fs.writeFile(
      `${this.skillsDir}/skills.json`,
      JSON.stringify(skillsArray, null, 2)
    );
  }

  // 从ClawHub下载技能
  async downloadFromClawHub(slug: string): Promise<{ success: boolean; message: string; skill?: Skill }> {
    try {
      const result = await ClawHubClient.downloadSkill(slug, this.skillsDir);
      
      if (result.success && result.skill) {
        await this.addCustomSkill(result.skill);
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to download from ClawHub'
      };
    }
  }

  // 检查技能依赖
  async checkDependencies(skillId: string): Promise<{
    satisfied: boolean;
    missing: { type: string; name: string }[];
  }> {
    const skill = this.skills.get(skillId);
    if (!skill) {
      return {
        satisfied: false,
        missing: [{ type: 'error', name: 'Skill not found' }]
      };
    }

    return await SkillDependencyChecker.check(skill);
  }

  // 获取技能工具
  getSkillTools(): SkillTool[] {
    const enabledSkills = this.getEnabledSkills();
    return enabledSkills.flatMap(skill => skillToTools(skill));
  }
}

// 导出单例
export const skillManager = new SkillManager();
