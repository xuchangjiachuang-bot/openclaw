// OpenClaw Heartbeat API - 心跳任务管理接口
import { NextRequest, NextResponse } from 'next/server';
import type { HeartbeatTask, HeartbeatResult } from '@/lib/openclaw/types';

// 心跳任务存储键
const TASKS_KEY = 'openclaw_heartbeat_tasks';
const RESULTS_KEY = 'openclaw_heartbeat_results';

// 心跳任务存储（服务端模拟）
class HeartbeatStore {
  private tasks: Map<string, HeartbeatTask> = new Map();
  private results: HeartbeatResult[] = [];

  loadTasks(): void {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem(TASKS_KEY);
      if (data) {
        try {
          const tasks = JSON.parse(data);
          tasks.forEach((t: HeartbeatTask) => {
            this.tasks.set(t.id, t);
          });
        } catch (e) {
          console.error('Failed to load tasks:', e);
        }
      }
    }
  }

  saveTasks(): void {
    if (typeof window !== 'undefined') {
      const tasks = Array.from(this.tasks.values());
      localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    }
  }

  getTasks(): HeartbeatTask[] {
    this.loadTasks();
    return Array.from(this.tasks.values());
  }

  getTask(id: string): HeartbeatTask | undefined {
    this.loadTasks();
    return this.tasks.get(id);
  }

  addTask(task: HeartbeatTask): void {
    this.loadTasks();
    this.tasks.set(task.id, task);
    this.saveTasks();
  }

  updateTask(task: HeartbeatTask): void {
    this.loadTasks();
    this.tasks.set(task.id, task);
    this.saveTasks();
  }

  deleteTask(id: string): void {
    this.loadTasks();
    this.tasks.delete(id);
    this.saveTasks();
  }

  getResults(): HeartbeatResult[] {
    return this.results;
  }

  addResult(result: HeartbeatResult): void {
    this.results.unshift(result);
    if (this.results.length > 100) {
      this.results = this.results.slice(0, 100);
    }
  }
}

const heartbeatStore = new HeartbeatStore();

// 预设任务模板
const PRESET_TASKS: Omit<HeartbeatTask, 'id'>[] = [
  {
    name: 'Email Check',
    description: 'Check inbox for unread emails',
    interval: 30,
    enabled: true,
    status: 'pending',
    actions: [{ type: 'check_email', config: {} }]
  },
  {
    name: 'Calendar Reminder',
    description: 'Check upcoming events in the next 24 hours',
    interval: 60,
    enabled: true,
    status: 'pending',
    actions: [{ type: 'check_calendar', config: {} }]
  },
  {
    name: 'Weather Update',
    description: 'Get latest weather information',
    interval: 120,
    enabled: true,
    status: 'pending',
    actions: [{ type: 'check_weather', config: {} }]
  }
];

// GET /api/heartbeat - 获取心跳任务
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'all';
    const id = searchParams.get('id');

    switch (action) {
      case 'presets':
        return NextResponse.json({
          success: true,
          presets: PRESET_TASKS
        });

      case 'results':
        const results = heartbeatStore.getResults();
        return NextResponse.json({
          success: true,
          results
        });

      case 'task':
        if (!id) {
          return NextResponse.json(
            { error: 'Task ID is required' },
            { status: 400 }
          );
        }
        const task = heartbeatStore.getTask(id);
        return NextResponse.json({
          success: true,
          task
        });

      default:
        const tasks = heartbeatStore.getTasks();
        return NextResponse.json({
          success: true,
          tasks
        });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get heartbeat tasks' },
      { status: 500 }
    );
  }
}

// POST /api/heartbeat - 创建或执行心跳任务
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, task, taskName } = body;

    switch (action) {
      case 'add':
        if (!task) {
          return NextResponse.json(
            { error: 'Task object is required' },
            { status: 400 }
          );
        }
        
        const newTask: HeartbeatTask = {
          ...task,
          id: `hb-${Date.now()}`,
          status: 'pending',
          nextCheck: new Date(Date.now() + task.interval * 60 * 1000)
        };
        
        heartbeatStore.addTask(newTask);
        
        return NextResponse.json({
          success: true,
          task: newTask
        });

      case 'add-preset':
        const preset = PRESET_TASKS.find(p => p.name === taskName);
        if (!preset) {
          return NextResponse.json(
            { error: 'Preset not found' },
            { status: 404 }
          );
        }
        
        const presetTask: HeartbeatTask = {
          ...preset,
          id: `hb-${Date.now()}`,
          nextCheck: new Date(Date.now() + preset.interval * 60 * 1000)
        };
        
        heartbeatStore.addTask(presetTask);
        
        return NextResponse.json({
          success: true,
          task: presetTask
        });

      case 'toggle':
        const { taskId, enabled } = body;
        const existingTask = heartbeatStore.getTask(taskId);
        
        if (!existingTask) {
          return NextResponse.json(
            { error: 'Task not found' },
            { status: 404 }
          );
        }
        
        existingTask.enabled = enabled;
        heartbeatStore.updateTask(existingTask);
        
        return NextResponse.json({
          success: true,
          task: existingTask
        });

      case 'execute':
        // 模拟执行任务
        const executeTaskId = body.taskId;
        const executeTask = heartbeatStore.getTask(executeTaskId);
        
        if (!executeTask) {
          return NextResponse.json(
            { error: 'Task not found' },
            { status: 404 }
          );
        }
        
        executeTask.status = 'running';
        executeTask.lastCheck = new Date();
        heartbeatStore.updateTask(executeTask);
        
        // 模拟执行延迟
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 模拟成功结果
        const result: HeartbeatResult = {
          taskId: executeTaskId,
          timestamp: new Date(),
          success: true,
          message: `Task "${executeTask.name}" executed successfully`,
          data: { checked: true, count: Math.floor(Math.random() * 10) }
        };
        
        heartbeatStore.addResult(result);
        
        executeTask.status = 'success';
        executeTask.nextCheck = new Date(Date.now() + executeTask.interval * 60 * 1000);
        heartbeatStore.updateTask(executeTask);
        
        return NextResponse.json({
          success: true,
          result
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to manage heartbeat task' },
      { status: 500 }
    );
  }
}

// DELETE /api/heartbeat - 删除心跳任务
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    heartbeatStore.deleteTask(id);

    return NextResponse.json({
      success: true,
      message: 'Task deleted'
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete task' },
      { status: 500 }
    );
  }
}
