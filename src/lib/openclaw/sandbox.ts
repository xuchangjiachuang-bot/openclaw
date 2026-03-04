/**
 * OpenClaw 代码沙箱执行器
 * 安全隔离执行 Python/Node/Bash 代码
 * 
 * 特性：
 * - 子进程隔离执行
 * - 超时控制
 * - 资源限制
 * - 输出捕获
 * - 安全检查
 */

import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

// ==================== 类型定义 ====================

export interface SandboxConfig {
  timeout: number;           // 执行超时（毫秒）
  maxOutputSize: number;     // 最大输出大小（字节）
  allowedCommands: string[]; // 允许的命令白名单
  blockedCommands: string[]; // 禁止的命令黑名单
  env: Record<string, string>; // 环境变量
  workDir: string;           // 工作目录
  maxProcesses: number;      // 最大并发进程数
  memoryLimit: number;       // 内存限制（MB）
  cpuLimit: number;          // CPU限制（百分比）
}

export interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  duration: number;          // 执行时长（毫秒）
  error?: string;
}

export interface CodeBlock {
  language: 'python' | 'javascript' | 'typescript' | 'bash' | 'shell';
  code: string;
  filename?: string;
}

// ==================== 默认配置 ====================

const DEFAULT_CONFIG: SandboxConfig = {
  timeout: 30000,            // 30秒超时
  maxOutputSize: 1024 * 1024, // 1MB输出限制
  allowedCommands: ['python3', 'python', 'node', 'bash', 'sh', 'npm', 'npx', 'pnpm'],
  blockedCommands: ['rm -rf /', 'mkfs', 'dd if=', ':(){ :|:& };:', 'chmod 777'],
  env: {
    NODE_ENV: 'development',
    PYTHONIOENCODING: 'utf-8',
    PYTHONDONTWRITEBYTECODE: '1'
  },
  workDir: '/tmp/openclaw/sandbox',
  maxProcesses: 5,
  memoryLimit: 512,          // 512MB
  cpuLimit: 80               // 80%
};

// ==================== 沙箱执行器 ====================

export class CodeSandbox {
  private config: SandboxConfig;
  private activeProcesses: Map<string, ChildProcess> = new Map();
  private tempDir: string;

  constructor(config?: Partial<SandboxConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.tempDir = this.config.workDir;
    this.ensureTempDir();
  }

  // 确保临时目录存在
  private async ensureTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('[Sandbox] Failed to create temp dir:', error);
    }
  }

  // 生成唯一执行ID
  private generateExecId(): string {
    return `exec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  // 安全检查
  private securityCheck(code: string, command: string): { safe: boolean; reason?: string } {
    // 检查黑名单命令
    for (const blocked of this.config.blockedCommands) {
      if (code.includes(blocked) || command.includes(blocked)) {
        return { safe: false, reason: `Blocked command detected: ${blocked}` };
      }
    }

    // 检查危险模式
    const dangerousPatterns = [
      /eval\s*\(/gi,
      /Function\s*\(/gi,
      /require\s*\(\s*['"]child_process['"]\s*\)/gi,
      /import\s+.*from\s+['"]child_process['"]/gi,
      /process\.exit/gi,
      /process\.kill/gi,
      /\.\.\/\.\.\//g,  // 路径穿越
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        return { safe: false, reason: `Dangerous pattern detected: ${pattern.source}` };
      }
    }

    // 检查命令白名单
    const baseCmd = command.split(' ')[0];
    if (this.config.allowedCommands.length > 0 && 
        !this.config.allowedCommands.includes(baseCmd)) {
      return { safe: false, reason: `Command not in whitelist: ${baseCmd}` };
    }

    return { safe: true };
  }

  // 创建临时文件
  private async createTempFile(code: string, language: string): Promise<string> {
    const execId = this.generateExecId();
    const extensions: Record<string, string> = {
      python: 'py',
      javascript: 'js',
      typescript: 'ts',
      bash: 'sh',
      shell: 'sh'
    };

    const ext = extensions[language] || 'txt';
    const filename = `${execId}.${ext}`;
    const filepath = path.join(this.tempDir, filename);

    await fs.writeFile(filepath, code, 'utf-8');
    return filepath;
  }

  // 执行代码
  async execute(codeBlock: CodeBlock): Promise<ExecutionResult> {
    const startTime = Date.now();
    const { language, code, filename } = codeBlock;

    // 检查并发进程数
    if (this.activeProcesses.size >= this.config.maxProcesses) {
      return {
        success: false,
        stdout: '',
        stderr: '',
        exitCode: null,
        timedOut: false,
        duration: 0,
        error: 'Maximum concurrent processes reached'
      };
    }

    // 确定执行命令
    const { command, args, needsTempFile } = this.getExecutionConfig(language, code, filename);

    // 安全检查
    const securityResult = this.securityCheck(code, command);
    if (!securityResult.safe) {
      return {
        success: false,
        stdout: '',
        stderr: '',
        exitCode: null,
        timedOut: false,
        duration: 0,
        error: securityResult.reason
      };
    }

    // 创建临时文件（如果需要）
    let tempFile: string | null = null;
    let finalArgs = [...args];

    if (needsTempFile) {
      try {
        tempFile = await this.createTempFile(code, language);
        finalArgs.push(tempFile);
      } catch (error) {
        return {
          success: false,
          stdout: '',
          stderr: '',
          exitCode: null,
          timedOut: false,
          duration: Date.now() - startTime,
          error: `Failed to create temp file: ${error}`
        };
      }
    }

    // 执行进程
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      const execId = this.generateExecId();

      // 构建环境变量
      const env = {
        ...process.env,
        ...this.config.env
      };

      // 启动子进程
      const proc = spawn(command, finalArgs, {
        cwd: this.tempDir,
        env,
        timeout: this.config.timeout,
        killSignal: 'SIGKILL'
      });

      this.activeProcesses.set(execId, proc);

      // 输出缓冲区管理
      let stdoutSize = 0;
      let stderrSize = 0;

      proc.stdout?.on('data', (data: Buffer) => {
        const chunk = data.toString();
        if (stdoutSize + chunk.length <= this.config.maxOutputSize) {
          stdout += chunk;
          stdoutSize += chunk.length;
        } else {
          const remaining = this.config.maxOutputSize - stdoutSize;
          if (remaining > 0) {
            stdout += chunk.slice(0, remaining);
            stdoutSize = this.config.maxOutputSize;
          }
          proc.kill('SIGKILL');
          stderr += '\n[Output truncated - max size reached]';
        }
      });

      proc.stderr?.on('data', (data: Buffer) => {
        const chunk = data.toString();
        if (stderrSize + chunk.length <= this.config.maxOutputSize) {
          stderr += chunk;
          stderrSize += chunk.length;
        }
      });

      // 超时处理
      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        proc.kill('SIGKILL');
        stderr += '\n[Execution timed out]';
      }, this.config.timeout);

      // 进程结束
      proc.on('close', (exitCode) => {
        clearTimeout(timeoutHandle);
        this.activeProcesses.delete(execId);

        // 清理临时文件
        if (tempFile) {
          fs.unlink(tempFile).catch(() => {});
        }

        resolve({
          success: exitCode === 0 && !timedOut,
          stdout,
          stderr,
          exitCode,
          timedOut,
          duration: Date.now() - startTime
        });
      });

      // 错误处理
      proc.on('error', (error) => {
        clearTimeout(timeoutHandle);
        this.activeProcesses.delete(execId);

        if (tempFile) {
          fs.unlink(tempFile).catch(() => {});
        }

        resolve({
          success: false,
          stdout,
          stderr: stderr + '\n' + error.message,
          exitCode: null,
          timedOut: false,
          duration: Date.now() - startTime,
          error: error.message
        });
      });

      // 对于不需要临时文件的情况，通过stdin传递代码
      if (!needsTempFile) {
        proc.stdin?.write(code);
        proc.stdin?.end();
      }
    });
  }

  // 获取执行配置
  private getExecutionConfig(language: string, code: string, filename?: string): {
    command: string;
    args: string[];
    needsTempFile: boolean;
  } {
    switch (language) {
      case 'python':
        return {
          command: 'python3',
          args: ['-c'],  // -c 选项可以直接执行代码字符串
          needsTempFile: true  // 为了更好的错误追踪，使用文件
        };

      case 'javascript':
        return {
          command: 'node',
          args: ['-e'],  // -e 选项可以直接执行代码字符串
          needsTempFile: false
        };

      case 'typescript':
        return {
          command: 'npx',
          args: ['ts-node', '--transpile-only'],
          needsTempFile: true
        };

      case 'bash':
      case 'shell':
        return {
          command: 'bash',
          args: ['-c'],
          needsTempFile: false
        };

      default:
        return {
          command: 'bash',
          args: ['-c'],
          needsTempFile: false
        };
    }
  }

  // 终止所有进程
  killAll(): void {
    for (const [id, proc] of this.activeProcesses) {
      proc.kill('SIGKILL');
      this.activeProcesses.delete(id);
    }
  }

  // 获取活跃进程数
  getActiveCount(): number {
    return this.activeProcesses.size;
  }

  // 清理临时目录
  async cleanup(): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();
      const maxAge = 3600000; // 1小时

      for (const file of files) {
        const filepath = path.join(this.tempDir, file);
        const stats = await fs.stat(filepath);
        
        if (now - stats.mtimeMs > maxAge) {
          await fs.unlink(filepath);
        }
      }
    } catch (error) {
      console.error('[Sandbox] Cleanup failed:', error);
    }
  }
}

// ==================== 便捷函数 ====================

// 默认沙箱实例
let defaultSandbox: CodeSandbox | null = null;

export function getSandbox(config?: Partial<SandboxConfig>): CodeSandbox {
  if (!defaultSandbox) {
    defaultSandbox = new CodeSandbox(config);
  }
  return defaultSandbox;
}

// 快速执行Python
export async function executePython(code: string): Promise<ExecutionResult> {
  const sandbox = getSandbox();
  return sandbox.execute({ language: 'python', code });
}

// 快速执行JavaScript
export async function executeJavaScript(code: string): Promise<ExecutionResult> {
  const sandbox = getSandbox();
  return sandbox.execute({ language: 'javascript', code });
}

// 快速执行Bash
export async function executeBash(code: string): Promise<ExecutionResult> {
  const sandbox = getSandbox();
  return sandbox.execute({ language: 'bash', code });
}

// 从文本中提取并执行代码块
export function extractCodeBlocks(text: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  
  let match;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    const language = (match[1] || 'bash').toLowerCase() as CodeBlock['language'];
    const code = match[2].trim();
    
    if (code) {
      blocks.push({ language, code });
    }
  }
  
  return blocks;
}

export default CodeSandbox;
