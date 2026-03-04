// OpenClaw 本地工具系统
// 提供文件系统操作、代码执行等能力

import type { Tool, ToolResult, SkillTool } from './types';
import { promises as fs } from 'fs';
import path from 'path';
import { CodeSandbox, getSandbox, type CodeBlock } from './sandbox';

// 权限检查器
export class PermissionChecker {
  private permissions: {
    allowFileSystem: boolean;
    allowNetwork: boolean;
    allowExecuteCode: boolean;
    allowedDomains: string[];
    sandboxMode: boolean;
  };

  constructor(permissions: {
    allowFileSystem: boolean;
    allowNetwork: boolean;
    allowExecuteCode: boolean;
    allowedDomains: string[];
    sandboxMode: boolean;
  }) {
    this.permissions = permissions;
  }

  canAccessFileSystem(): boolean {
    return this.permissions.allowFileSystem;
  }

  canExecuteCode(): boolean {
    return this.permissions.allowExecuteCode;
  }

  canAccessNetwork(domain?: string): boolean {
    if (!this.permissions.allowNetwork) return false;
    if (!domain) return true;
    
    const allowedDomains = this.permissions.allowedDomains;
    if (allowedDomains.includes('*')) return true;
    return allowedDomains.some(d => domain.includes(d));
  }

  isSandboxMode(): boolean {
    return this.permissions.sandboxMode;
  }
}

// ==================== 文件系统工具 ====================

// 文件读取工具
export const fileReadTool: Tool = {
  name: 'fs_read',
  description: 'Read the contents of a file from the local filesystem.',
  input_schema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'The absolute path to the file to read' },
      encoding: { type: 'string', description: 'File encoding (default: utf-8)', enum: ['utf-8', 'binary', 'base64'] }
    },
    required: ['path']
  },
  execute: async (input: Record<string, any>) => {
    try {
      const encoding = input.encoding || 'utf-8';
      const content = await fs.readFile(input.path, encoding);
      return { success: true, path: input.path, content: content.toString(), encoding };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to read file' };
    }
  }
};

// 文件写入工具
export const fileWriteTool: Tool = {
  name: 'fs_write',
  description: 'Write content to a file on the local filesystem.',
  input_schema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'The absolute path where the file should be written' },
      content: { type: 'string', description: 'The content to write to the file' },
      mode: { type: 'string', description: 'Write mode: overwrite (default) or append', enum: ['overwrite', 'append'] }
    },
    required: ['path', 'content']
  },
  execute: async (input: Record<string, any>) => {
    try {
      const mode = input.mode || 'overwrite';
      const dir = path.dirname(input.path);
      await fs.mkdir(dir, { recursive: true });
      
      if (mode === 'append') {
        await fs.appendFile(input.path, input.content, 'utf-8');
      } else {
        await fs.writeFile(input.path, input.content, 'utf-8');
      }
      
      return { success: true, path: input.path, mode, bytesWritten: Buffer.byteLength(input.content, 'utf-8') };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to write file' };
    }
  }
};

// 目录列表工具
export const dirListTool: Tool = {
  name: 'fs_list',
  description: 'List files and directories at a given path.',
  input_schema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'The directory path to list' },
      recursive: { type: 'boolean', description: 'Whether to list recursively (default: false)' }
    },
    required: []
  },
  execute: async (input: Record<string, any>) => {
    try {
      const dirPath = input.path || process.cwd();
      const recursive = input.recursive || false;

      const listDir = async (dir: string): Promise<any[]> => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const results = [];

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const stats = await fs.stat(fullPath);
          
          results.push({
            name: entry.name,
            path: fullPath,
            type: entry.isDirectory() ? 'directory' : 'file',
            size: stats.size,
            modified: stats.mtime.toISOString()
          });

          if (recursive && entry.isDirectory()) {
            const children = await listDir(fullPath);
            results.push(...children);
          }
        }

        return results;
      };

      const items = await listDir(dirPath);
      return { success: true, path: dirPath, items, count: items.length };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to list directory' };
    }
  }
};

// 文件删除工具
export const fileDeleteTool: Tool = {
  name: 'fs_delete',
  description: 'Delete a file or directory from the local filesystem.',
  input_schema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'The path to delete' },
      type: { type: 'string', description: 'Type of path to delete', enum: ['file', 'directory'] },
      recursive: { type: 'boolean', description: 'For directories, delete recursively' }
    },
    required: ['path', 'type']
  },
  execute: async (input: Record<string, any>) => {
    try {
      if (input.type === 'directory') {
        if (input.recursive) {
          await fs.rm(input.path, { recursive: true });
        } else {
          await fs.rmdir(input.path);
        }
      } else {
        await fs.unlink(input.path);
      }
      return { success: true, path: input.path, type: input.type };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete' };
    }
  }
};

// 文件搜索工具
export const fileSearchTool: Tool = {
  name: 'fs_search',
  description: 'Search for files matching a pattern in a directory.',
  input_schema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'The directory to search in' },
      pattern: { type: 'string', description: 'Glob pattern to match files' },
      contentSearch: { type: 'string', description: 'Text to search within file contents' }
    },
    required: ['pattern']
  },
  execute: async (input: Record<string, any>) => {
    try {
      const dirPath = input.path || process.cwd();
      // 简化的搜索实现（不依赖glob包）
      const searchPattern = input.pattern.replace(/\*/g, '');
      
      const searchDir = async (dir: string): Promise<any[]> => {
        const results: any[] = [];
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.name.includes(searchPattern)) {
              results.push({ path: fullPath, matches: [] });
            }
            
            if (entry.isDirectory()) {
              const childResults = await searchDir(fullPath);
              results.push(...childResults);
            }
          }
        } catch {
          // 忽略权限错误
        }
        
        return results;
      };

      const results = await searchDir(dirPath);
      return { success: true, pattern: input.pattern, basePath: dirPath, results, count: results.length };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Search failed' };
    }
  }
};

// ==================== 代码执行工具 ====================

export const codeExecuteTool: Tool = {
  name: 'code_execute',
  description: 'Execute code or shell commands in a sandboxed environment.',
  input_schema: {
    type: 'object',
    properties: {
      code: { type: 'string', description: 'The code or command to execute' },
      language: { type: 'string', description: 'Language/runtime to use', enum: ['bash', 'shell', 'python', 'javascript', 'typescript', 'node', 'js'] },
      timeout: { type: 'number', description: 'Timeout in seconds (default: 30)' },
      cwd: { type: 'string', description: 'Working directory for execution' }
    },
    required: ['code', 'language']
  },
  execute: async (input: Record<string, any>) => {
    try {
      const sandbox = getSandbox();
      
      // 标准化语言名称
      let language = input.language.toLowerCase();
      if (language === 'js') language = 'javascript';
      if (language === 'node') language = 'javascript';
      if (language === 'sh') language = 'bash';
      
      const codeBlock: CodeBlock = {
        language: language as CodeBlock['language'],
        code: input.code
      };

      const result = await sandbox.execute(codeBlock);

      return {
        success: result.success,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        timedOut: result.timedOut,
        duration: result.duration,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        stdout: '',
        stderr: '',
        error: error instanceof Error ? error.message : 'Execution failed'
      };
    }
  }
};

// ==================== 网络请求工具 ====================

export const httpRequestTool: Tool = {
  name: 'http_request',
  description: 'Make HTTP requests to external APIs.',
  input_schema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'The URL to request' },
      method: { type: 'string', description: 'HTTP method', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
      headers: { type: 'object', description: 'Request headers' },
      body: { type: 'string', description: 'Request body' },
      timeout: { type: 'number', description: 'Timeout in seconds' }
    },
    required: ['url']
  },
  execute: async (input: Record<string, any>) => {
    try {
      const method = input.method || 'GET';
      const timeout = (input.timeout || 30) * 1000;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const options: RequestInit = {
        method,
        headers: input.headers,
        signal: controller.signal
      };

      if (input.body && ['POST', 'PUT', 'PATCH'].includes(method)) {
        options.body = input.body;
      }

      const response = await fetch(input.url, options);
      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || '';
      let data: any;

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        data
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Request failed' };
    }
  }
};

// ==================== 工具注册表 ====================

export const LOCAL_TOOLS: Tool[] = [
  fileReadTool,
  fileWriteTool,
  dirListTool,
  fileDeleteTool,
  fileSearchTool,
  codeExecuteTool,
  httpRequestTool
];

// 获取所有工具定义（用于LLM）
export function getToolDefinitions(): SkillTool[] {
  return LOCAL_TOOLS.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema
    }
  }));
}

// 执行工具调用
export async function executeToolCall(
  toolName: string, 
  input: Record<string, any>
): Promise<ToolResult> {
  const tool = LOCAL_TOOLS.find(t => t.name === toolName);
  
  if (!tool) {
    return {
      tool_use_id: '',
      content: JSON.stringify({ error: `Tool "${toolName}" not found` }),
      is_error: true
    };
  }

  try {
    const result = await tool.execute(input);
    return {
      tool_use_id: '',
      content: JSON.stringify(result),
      is_error: !result.success
    };
  } catch (error) {
    return {
      tool_use_id: '',
      content: JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Execution failed' 
      }),
      is_error: true
    };
  }
}
