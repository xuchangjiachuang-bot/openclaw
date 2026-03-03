// OpenClaw Canvas - 交互画布系统
// 提供可视化交互界面

import type { CanvasAction, CanvasComponent } from './types';

// Canvas组件类型
export type ComponentType = 
  | 'button' 
  | 'text' 
  | 'image' 
  | 'chart' 
  | 'list' 
  | 'form' 
  | 'card' 
  | 'container'
  | 'custom';

// Canvas Surface定义
export interface CanvasSurface {
  id: string;
  name: string;
  components: CanvasComponent[];
  metadata?: Record<string, any>;
}

// Canvas管理器
export class CanvasManager {
  private surfaces: Map<string, CanvasSurface> = new Map();
  private storageKey = 'openclaw_canvas';

  // 初始化
  async initialize(): Promise<void> {
    try {
      const { promises: fs } = await import('fs');
      const data = await fs.readFile('/tmp/openclaw/canvas.json', 'utf-8');
      const savedSurfaces = JSON.parse(data);
      
      savedSurfaces.forEach((surface: CanvasSurface) => {
        this.surfaces.set(surface.id, surface);
      });
    } catch {
      // 使用默认配置
      this.createDefaultSurfaces();
    }
  }

  // 创建默认surfaces
  private createDefaultSurfaces(): void {
    this.surfaces.set('main', {
      id: 'main',
      name: 'Main Canvas',
      components: [
        {
          id: 'welcome-text',
          type: 'text',
          props: {
            content: 'Welcome to OpenClaw Canvas',
            style: { fontSize: '24px', fontWeight: 'bold' }
          }
        },
        {
          id: 'action-buttons',
          type: 'container',
          props: { direction: 'row', gap: '8px' },
          children: [
            {
              id: 'btn-chat',
              type: 'button',
              props: { label: 'Start Chat', variant: 'primary' }
            },
            {
              id: 'btn-settings',
              type: 'button',
              props: { label: 'Settings', variant: 'secondary' }
            }
          ]
        }
      ]
    });
  }

  // 获取所有surfaces
  getAllSurfaces(): CanvasSurface[] {
    return Array.from(this.surfaces.values());
  }

  // 获取surface
  getSurface(id: string): CanvasSurface | undefined {
    return this.surfaces.get(id);
  }

  // 创建surface
  async createSurface(surface: CanvasSurface): Promise<void> {
    this.surfaces.set(surface.id, surface);
    await this.saveSurfaces();
  }

  // 更新surface
  async updateSurface(id: string, updates: Partial<CanvasSurface>): Promise<void> {
    const surface = this.surfaces.get(id);
    if (surface) {
      this.surfaces.set(id, { ...surface, ...updates });
      await this.saveSurfaces();
    }
  }

  // 删除surface
  async deleteSurface(id: string): Promise<void> {
    this.surfaces.delete(id);
    await this.saveSurfaces();
  }

  // 添加组件到surface
  async addComponent(surfaceId: string, component: CanvasComponent): Promise<void> {
    const surface = this.surfaces.get(surfaceId);
    if (surface) {
      surface.components.push(component);
      await this.saveSurfaces();
    }
  }

  // 更新组件
  async updateComponent(
    surfaceId: string, 
    componentId: string, 
    updates: Partial<CanvasComponent>
  ): Promise<void> {
    const surface = this.surfaces.get(surfaceId);
    if (surface) {
      const index = surface.components.findIndex(c => c.id === componentId);
      if (index >= 0) {
        surface.components[index] = { ...surface.components[index], ...updates };
        await this.saveSurfaces();
      }
    }
  }

  // 删除组件
  async deleteComponent(surfaceId: string, componentId: string): Promise<void> {
    const surface = this.surfaces.get(surfaceId);
    if (surface) {
      surface.components = surface.components.filter(c => c.id !== componentId);
      await this.saveSurfaces();
    }
  }

  // 处理Canvas动作
  async handleAction(action: CanvasAction): Promise<any> {
    const surface = this.surfaces.get(action.surfaceId);
    if (!surface) {
      throw new Error(`Surface not found: ${action.surfaceId}`);
    }

    // 根据动作类型处理
    switch (action.name) {
      case 'click':
        return this.handleClick(surface, action);
      
      case 'submit':
        return this.handleSubmit(surface, action);
      
      case 'update':
        return this.handleUpdate(surface, action);
      
      default:
        throw new Error(`Unknown action: ${action.name}`);
    }
  }

  // 处理点击
  private handleClick(surface: CanvasSurface, action: CanvasAction): any {
    const component = this.findComponent(surface.components, action.sourceComponentId);
    
    if (component?.type === 'button') {
      // 触发按钮动作
      return {
        type: 'button_click',
        componentId: component.id,
        props: component.props
      };
    }
    
    return { type: 'click', componentId: action.sourceComponentId };
  }

  // 处理表单提交
  private handleSubmit(surface: CanvasSurface, action: CanvasAction): any {
    return {
      type: 'form_submit',
      data: action.context,
      timestamp: new Date()
    };
  }

  // 处理更新
  private async handleUpdate(surface: CanvasSurface, action: CanvasAction): Promise<any> {
    await this.updateComponent(surface.id, action.sourceComponentId, {
      props: { ...action.context }
    });
    
    return { type: 'update', success: true };
  }

  // 查找组件
  private findComponent(components: CanvasComponent[], id: string): CanvasComponent | null {
    for (const component of components) {
      if (component.id === id) return component;
      if (component.children) {
        const found = this.findComponent(component.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  // 保存到文件系统
  private async saveSurfaces(): Promise<void> {
    const { promises: fs } = await import('fs');
    await fs.mkdir('/tmp/openclaw', { recursive: true });
    await fs.writeFile(
      '/tmp/openclaw/canvas.json',
      JSON.stringify(this.getAllSurfaces(), null, 2)
    );
  }

  // 导出为JSON
  exportAsJson(): string {
    return JSON.stringify(this.getAllSurfaces(), null, 2);
  }

  // 从JSON导入
  async importFromJson(data: string): Promise<number> {
    const surfaces: CanvasSurface[] = JSON.parse(data);
    
    for (const surface of surfaces) {
      this.surfaces.set(surface.id, surface);
    }
    
    await this.saveSurfaces();
    return surfaces.length;
  }
}

// 导出单例
export const canvasManager = new CanvasManager();

// 预定义组件模板
export const COMPONENT_TEMPLATES: Record<string, CanvasComponent> = {
  'button-primary': {
    id: '',
    type: 'button',
    props: { label: 'Button', variant: 'primary', size: 'md' }
  },
  'button-secondary': {
    id: '',
    type: 'button',
    props: { label: 'Button', variant: 'secondary', size: 'md' }
  },
  'text-heading': {
    id: '',
    type: 'text',
    props: { content: 'Heading', variant: 'heading' }
  },
  'text-body': {
    id: '',
    type: 'text',
    props: { content: 'Body text', variant: 'body' }
  },
  'image': {
    id: '',
    type: 'image',
    props: { src: '', alt: 'Image' }
  },
  'card': {
    id: '',
    type: 'card',
    props: { title: 'Card Title', content: 'Card content' }
  },
  'list': {
    id: '',
    type: 'list',
    props: { items: [] }
  },
  'form': {
    id: '',
    type: 'form',
    props: { fields: [] },
    children: []
  }
};
