/**
 * OpenClaw ClawHub API集成
 * 技能市场下载、安装、更新
 * 
 * ClawHub是OpenClaw的官方技能仓库
 * API: https://clawhub.ai/api/v1
 */

// ==================== 类型定义 ====================

export interface ClawHubSkill {
  slug: string;
  name: string;
  description: string;
  category: string;
  author: string;
  version: string;
  installs: number;
  verified: boolean;
  featured: boolean;
  tags: string[];
  readmeUrl: string;
  downloadUrl: string;
  updatedAt: string;
  createdAt: string;
}

export interface ClawHubSearchResult {
  skills: ClawHubSkill[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ClawHubCategory {
  id: string;
  name: string;
  description: string;
  count: number;
}

export interface InstallProgress {
  stage: 'downloading' | 'extracting' | 'validating' | 'installing' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
}

// ==================== API配置 ====================

const CLAWHUB_API = process.env.CLAWHUB_API_URL || 'https://clawhub.ai/api/v1';
const CLAWHUB_REGISTRY = process.env.CLAWHUB_REGISTRY_URL || 'https://registry.clawhub.ai';

// ==================== ClawHub客户端 ====================

export class ClawHubClient {
  private apiToken?: string;
  private cache: Map<string, { data: any; expiry: number }> = new Map();
  private cacheTTL = 300000; // 5分钟缓存

  constructor(apiToken?: string) {
    this.apiToken = apiToken || process.env.CLAWHUB_API_TOKEN;
  }

  // 带缓存的fetch
  private async cachedFetch<T>(url: string, ttl = this.cacheTTL): Promise<T> {
    const cached = this.cache.get(url);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`ClawHub API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    this.cache.set(url, { data, expiry: Date.now() + ttl });
    return data;
  }

  // 搜索技能
  async search(query: string, options?: {
    category?: string;
    page?: number;
    pageSize?: number;
    sort?: 'installs' | 'updated' | 'name';
  }): Promise<ClawHubSearchResult> {
    const params = new URLSearchParams({
      q: query,
      page: String(options?.page || 1),
      pageSize: String(options?.pageSize || 20),
      sort: options?.sort || 'installs'
    });

    if (options?.category) {
      params.set('category', options.category);
    }

    return this.cachedFetch<ClawHubSearchResult>(
      `${CLAWHUB_API}/skills/search?${params}`
    );
  }

  // 获取技能详情
  async getSkill(slug: string): Promise<ClawHubSkill> {
    return this.cachedFetch<ClawHubSkill>(`${CLAWHUB_API}/skills/${slug}`);
  }

  // 获取分类列表
  async getCategories(): Promise<ClawHubCategory[]> {
    return this.cachedFetch<ClawHubCategory[]>(`${CLAWHUB_API}/categories`);
  }

  // 获取热门技能
  async getFeatured(): Promise<ClawHubSkill[]> {
    return this.cachedFetch<ClawHubSkill[]>(`${CLAWHUB_API}/skills/featured`);
  }

  // 获取最新技能
  async getLatest(): Promise<ClawHubSkill[]> {
    return this.cachedFetch<ClawHubSkill[]>(`${CLAWHUB_API}/skills/latest`);
  }

  // 下载技能
  async downloadSkill(slug: string): Promise<string> {
    const skill = await this.getSkill(slug);
    return skill.downloadUrl;
  }

  // 安装技能
  async installSkill(
    slug: string,
    targetDir: string,
    onProgress?: (progress: InstallProgress) => void
  ): Promise<{ success: boolean; path: string; error?: string }> {
    try {
      // 1. 下载
      onProgress?.({ stage: 'downloading', progress: 0, message: 'Downloading skill package...' });
      
      const skill = await this.getSkill(slug);
      const downloadUrl = skill.downloadUrl;

      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const contentLength = parseInt(response.headers.get('content-length') || '0');
      let downloaded = 0;
      const chunks: Uint8Array[] = [];
      const reader = response.body?.getReader();

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        chunks.push(value);
        downloaded += value.length;
        
        const progress = contentLength ? Math.round((downloaded / contentLength) * 50) : 50;
        onProgress?.({ 
          stage: 'downloading', 
          progress, 
          message: `Downloaded ${downloaded} bytes...` 
        });
      }

      onProgress?.({ stage: 'downloading', progress: 50, message: 'Download complete' });

      // 2. 解压
      onProgress?.({ stage: 'extracting', progress: 60, message: 'Extracting files...' });
      
      const { promises: fs } = await import('fs');
      const path = await import('path');
      
      const buffer = Buffer.concat(chunks);
      const tempFile = path.join('/tmp', `${slug}.tar.gz`);
      await fs.writeFile(tempFile, buffer);

      // 解压tar.gz
      const { exec } = await import('child_process');
      const util = await import('util');
      const execAsync = util.promisify(exec);

      const skillDir = path.join(targetDir, slug);
      await fs.mkdir(skillDir, { recursive: true });

      await execAsync(`tar -xzf ${tempFile} -C ${skillDir}`);
      await fs.unlink(tempFile);

      onProgress?.({ stage: 'extracting', progress: 80, message: 'Files extracted' });

      // 3. 验证
      onProgress?.({ stage: 'validating', progress: 85, message: 'Validating skill...' });

      const skillMdPath = path.join(skillDir, 'SKILL.md');
      const hasSkillMd = await fs.access(skillMdPath).then(() => true).catch(() => false);

      if (!hasSkillMd) {
        throw new Error('Invalid skill: missing SKILL.md');
      }

      onProgress?.({ stage: 'validating', progress: 90, message: 'Skill validated' });

      // 4. 安装依赖（如果有）
      onProgress?.({ stage: 'installing', progress: 95, message: 'Installing dependencies...' });

      const packageJsonPath = path.join(skillDir, 'package.json');
      const hasPackageJson = await fs.access(packageJsonPath).then(() => true).catch(() => false);

      if (hasPackageJson) {
        try {
          await execAsync('pnpm install', { cwd: skillDir });
        } catch (error) {
          console.warn('[ClawHub] Dependency install failed:', error);
        }
      }

      // 5. 完成
      onProgress?.({ stage: 'complete', progress: 100, message: 'Skill installed successfully!' });

      return { success: true, path: skillDir };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onProgress?.({ stage: 'error', progress: 0, message: errorMessage });
      return { success: false, path: '', error: errorMessage };
    }
  }

  // 更新技能
  async updateSkill(slug: string, targetDir: string): Promise<{ success: boolean; version?: string; error?: string }> {
    try {
      // 获取远程版本
      const remoteSkill = await this.getSkill(slug);
      const remoteVersion = remoteSkill.version;

      // 检查本地版本
      const { promises: fs } = await import('fs');
      const path = await import('path');
      
      const localSkillMd = path.join(targetDir, slug, 'SKILL.md');
      const localContent = await fs.readFile(localSkillMd, 'utf-8');
      
      // 解析版本（简化处理）
      const versionMatch = localContent.match(/version:\s*['"]?([^'"\n]+)['"]?/);
      const localVersion = versionMatch ? versionMatch[1] : '0.0.0';

      if (remoteVersion === localVersion) {
        return { success: true, version: localVersion };
      }

      // 删除旧版本并重新安装
      const skillDir = path.join(targetDir, slug);
      await fs.rm(skillDir, { recursive: true, force: true });

      const result = await this.installSkill(slug, targetDir);
      
      return {
        success: result.success,
        version: result.success ? remoteVersion : undefined,
        error: result.error
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // 卸载技能
  async uninstallSkill(slug: string, targetDir: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { promises: fs } = await import('fs');
      const path = await import('path');
      
      const skillDir = path.join(targetDir, slug);
      await fs.rm(skillDir, { recursive: true, force: true });
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // 清除缓存
  clearCache(): void {
    this.cache.clear();
  }
}

// ==================== 导出单例 ====================

export const clawHubClient = new ClawHubClient();

export default ClawHubClient;
