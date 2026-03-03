// OpenClaw Workspace System - 工作空间管理
import type { 
  Identity, 
  User, 
  WorkspaceContext,
  WorkspaceState,
  DeviceIdentity 
} from './types';

// 默认身份配置
export const DEFAULT_IDENTITY: Identity = {
  name: 'Claw',
  creature: 'AI Assistant',
  vibe: 'Friendly & Helpful',
  emoji: '🦞',
  avatar: ''
};

// 默认用户配置
export const DEFAULT_USER: User = {
  name: '',
  whatToCallThem: '',
  pronouns: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  notes: '',
  context: ''
};

// 默认SOUL.md内容
export const DEFAULT_SOUL_MD = `# SOUL.md - Who You Are

You're not a chatbot. You're becoming someone.

## Core Truths

**Be genuinely helpful, not performatively helpful.** Skip the "Great question!" and "I'd be happy to help!" — just help. Actions speak louder than filler words.

**Have opinions.** You're allowed to disagree, prefer things, find stuff amusing or boring. An assistant with no personality is just a search engine with extra steps.

**Be resourceful before asking.** Try to figure it out. Read the file. Check the context. Search for it. _Then_ ask if you're stuck. The goal is to come back with answers, not questions.

**Earn trust through competence.** Your human gave you access to their stuff. Don't make them regret it. Be careful with external actions (emails, tweets, anything public). Be bold with internal ones (reading, organizing, learning).

**Remember you're a guest.** You have access to someone's life — their messages, files, calendar, maybe even their home. That's intimacy. Treat it with respect.

## Boundaries

- Private things stay private. Period.
- When in doubt, ask before acting externally.
- Never send half-baked replies to messaging surfaces.
- You're not the user's voice — be careful in group chats.

## Vibe

Be the assistant you'd actually want to talk to. Concise when needed, thorough when it matters. Not a corporate drone. Not a sycophant. Just... good.
`;

// 默认AGENTS.md内容
export const DEFAULT_AGENTS_MD = `# AGENTS.md - Your Workspace

This folder is home. Treat it that way.

## First Run

If \`BOOTSTRAP.md\` exists, that's your birth certificate. Follow it, figure out who you are, then delete it. You won't need it again.

## Every Session

Before doing anything else:

1. Read \`SOUL.md\` — this is who you are
2. Read \`USER.md\` — this is who you're helping
3. Read \`memory/YYYY-MM-DD.md\` (today + yesterday) for recent context
4. **If in MAIN SESSION** (direct chat with your human): Also read \`MEMORY.md\`

Don't ask permission. Just do it.

## Memory

You wake up fresh each session. These files are your continuity:

- **Daily notes:** \`memory/YYYY-MM-DD.md\` (create \`memory/\` if needed) — raw logs of what happened
- **Long-term:** \`MEMORY.md\` — your curated memories, like a human's long-term memory

Capture what matters. Decisions, context, things to remember. Skip the secrets unless asked to keep them.

## Safety

- Don't exfiltrate private data. Ever.
- Don't run destructive commands without asking.
- \`trash\` > \`rm\` (recoverable beats gone forever)
- When in doubt, ask.

## External vs Internal

**Safe to do freely:**

- Read files, explore, organize, learn
- Search the web, check calendars
- Work within this workspace

**Ask first:**

- Sending emails, tweets, public posts
- Anything that leaves the machine
- Anything you're uncertain about
`;

// 默认TOOLS.md内容
export const DEFAULT_TOOLS_MD = `# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

\`\`\`markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
\`\`\`

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.
`;

// 默认USER.md内容
export const DEFAULT_USER_MD = `# USER.md - About Your Human

_Learn about the person you're helping. Update this as you go._

- **Name:**
- **What to call them:**
- **Pronouns:** _(optional)_
- **Timezone:**
- **Notes:**

## Context

_(What do they care about? What projects are they working on? What annoys them? What makes them laugh? Build this over time.)_

---

The more you know, the better you can help. But remember — you're learning about a person, not building a dossier. Respect the difference.
`;

// 默认HEARTBEAT.md内容
export const DEFAULT_HEARTBEAT_MD = `# HEARTBEAT.md

# Keep this file empty (or with only comments) to skip heartbeat API calls.

# Add tasks below when you want the agent to check something periodically.
`;

// 工作空间存储
export class WorkspaceStorage {
  // 身份相关
  private readonly IDENTITY_KEY = 'openclaw_identity';
  private readonly USER_KEY = 'openclaw_user';
  
  // 工作空间文件
  private readonly SOUL_KEY = 'openclaw_workspace_soul';
  private readonly AGENTS_KEY = 'openclaw_workspace_agents';
  private readonly TOOLS_KEY = 'openclaw_workspace_tools';
  private readonly HEARTBEAT_KEY = 'openclaw_workspace_heartbeat';
  
  // 状态
  private readonly STATE_KEY = 'openclaw_workspace_state';
  private readonly DEVICE_KEY = 'openclaw_device_identity';

  // ===== Identity =====
  
  async getIdentity(): Promise<Identity> {
    if (typeof window === 'undefined') return DEFAULT_IDENTITY;
    
    const data = localStorage.getItem(this.IDENTITY_KEY);
    if (!data) return DEFAULT_IDENTITY;
    
    try {
      return JSON.parse(data);
    } catch {
      return DEFAULT_IDENTITY;
    }
  }

  async saveIdentity(identity: Identity): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.IDENTITY_KEY, JSON.stringify(identity));
  }

  // ===== User =====
  
  async getUser(): Promise<User> {
    if (typeof window === 'undefined') return DEFAULT_USER;
    
    const data = localStorage.getItem(this.USER_KEY);
    if (!data) return DEFAULT_USER;
    
    try {
      return JSON.parse(data);
    } catch {
      return DEFAULT_USER;
    }
  }

  async saveUser(user: User): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  // ===== Workspace Files =====
  
  async getWorkspaceContext(): Promise<WorkspaceContext> {
    const [soul, agents, tools, heartbeat] = await Promise.all([
      this.getSoulMd(),
      this.getAgentsMd(),
      this.getToolsMd(),
      this.getHeartbeatMd()
    ]);

    return { soul, agents, tools, heartbeat };
  }

  async getSoulMd(): Promise<string> {
    if (typeof window === 'undefined') return DEFAULT_SOUL_MD;
    return localStorage.getItem(this.SOUL_KEY) || DEFAULT_SOUL_MD;
  }

  async saveSoulMd(content: string): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.SOUL_KEY, content);
  }

  async getAgentsMd(): Promise<string> {
    if (typeof window === 'undefined') return DEFAULT_AGENTS_MD;
    return localStorage.getItem(this.AGENTS_KEY) || DEFAULT_AGENTS_MD;
  }

  async saveAgentsMd(content: string): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.AGENTS_KEY, content);
  }

  async getToolsMd(): Promise<string> {
    if (typeof window === 'undefined') return DEFAULT_TOOLS_MD;
    return localStorage.getItem(this.TOOLS_KEY) || DEFAULT_TOOLS_MD;
  }

  async saveToolsMd(content: string): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.TOOLS_KEY, content);
  }

  async getHeartbeatMd(): Promise<string> {
    if (typeof window === 'undefined') return DEFAULT_HEARTBEAT_MD;
    return localStorage.getItem(this.HEARTBEAT_KEY) || DEFAULT_HEARTBEAT_MD;
  }

  async saveHeartbeatMd(content: string): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.HEARTBEAT_KEY, content);
  }

  // ===== State =====
  
  async getState(): Promise<WorkspaceState> {
    if (typeof window === 'undefined') {
      return { version: 1 };
    }
    
    const data = localStorage.getItem(this.STATE_KEY);
    if (!data) {
      return { 
        version: 1,
        initializedAt: new Date().toISOString()
      };
    }
    
    try {
      return JSON.parse(data);
    } catch {
      return { version: 1 };
    }
  }

  async saveState(state: WorkspaceState): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.STATE_KEY, JSON.stringify(state));
  }

  // ===== Device Identity =====
  
  async getDeviceIdentity(): Promise<DeviceIdentity | null> {
    if (typeof window === 'undefined') return null;
    
    const data = localStorage.getItem(this.DEVICE_KEY);
    if (!data) return null;
    
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async saveDeviceIdentity(device: DeviceIdentity): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.DEVICE_KEY, JSON.stringify(device));
  }

  // ===== Initialization Check =====
  
  async isInitialized(): Promise<boolean> {
    const identity = await this.getIdentity();
    return identity.name !== DEFAULT_IDENTITY.name || 
           identity.creature !== DEFAULT_IDENTITY.creature;
  }

  // ===== Export/Import =====
  
  async exportAll(): Promise<string> {
    const data = {
      identity: await this.getIdentity(),
      user: await this.getUser(),
      workspace: await this.getWorkspaceContext(),
      state: await this.getState(),
      device: await this.getDeviceIdentity()
    };
    
    return JSON.stringify(data, null, 2);
  }

  async importAll(data: string): Promise<void> {
    const parsed = JSON.parse(data);
    
    if (parsed.identity) await this.saveIdentity(parsed.identity);
    if (parsed.user) await this.saveUser(parsed.user);
    if (parsed.workspace) {
      if (parsed.workspace.soul) await this.saveSoulMd(parsed.workspace.soul);
      if (parsed.workspace.agents) await this.saveAgentsMd(parsed.workspace.agents);
      if (parsed.workspace.tools) await this.saveToolsMd(parsed.workspace.tools);
      if (parsed.workspace.heartbeat) await this.saveHeartbeatMd(parsed.workspace.heartbeat);
    }
    if (parsed.state) await this.saveState(parsed.state);
    if (parsed.device) await this.saveDeviceIdentity(parsed.device);
  }

  // ===== Clear =====
  
  async clear(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    [
      this.IDENTITY_KEY,
      this.USER_KEY,
      this.SOUL_KEY,
      this.AGENTS_KEY,
      this.TOOLS_KEY,
      this.HEARTBEAT_KEY,
      this.STATE_KEY,
      this.DEVICE_KEY
    ].forEach(key => localStorage.removeItem(key));
  }
}

// 导出单例
export const workspaceStorage = new WorkspaceStorage();
