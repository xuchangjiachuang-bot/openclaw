// OpenClaw Channel - 消息通道系统
// 支持多种聊天软件集成

import type { Channel, ChannelMessage, ChannelType } from './types';

// Channel配置模板
export const CHANNEL_TEMPLATES: Record<ChannelType, {
  name: string;
  description: string;
  configFields: Array<{ key: string; label: string; type: string; required: boolean }>;
}> = {
  webchat: {
    name: 'Web Chat',
    description: 'Built-in web chat interface',
    configFields: []
  },
  whatsapp: {
    name: 'WhatsApp',
    description: 'WhatsApp Business API integration',
    configFields: [
      { key: 'phoneNumberId', label: 'Phone Number ID', type: 'text', required: true },
      { key: 'businessAccountId', label: 'Business Account ID', type: 'text', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
      { key: 'webhookVerifyToken', label: 'Webhook Verify Token', type: 'text', required: true }
    ]
  },
  telegram: {
    name: 'Telegram',
    description: 'Telegram Bot API integration',
    configFields: [
      { key: 'botToken', label: 'Bot Token', type: 'password', required: true },
      { key: 'webhookUrl', label: 'Webhook URL', type: 'text', required: false }
    ]
  },
  discord: {
    name: 'Discord',
    description: 'Discord Bot integration',
    configFields: [
      { key: 'botToken', label: 'Bot Token', type: 'password', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'guildId', label: 'Guild ID (Optional)', type: 'text', required: false }
    ]
  },
  slack: {
    name: 'Slack',
    description: 'Slack App integration',
    configFields: [
      { key: 'botToken', label: 'Bot Token', type: 'password', required: true },
      { key: 'appToken', label: 'App Token', type: 'password', required: true },
      { key: 'signingSecret', label: 'Signing Secret', type: 'password', required: true }
    ]
  },
  imessage: {
    name: 'iMessage',
    description: 'iMessage integration (macOS only)',
    configFields: [
      { key: 'appleId', label: 'Apple ID', type: 'text', required: true },
      { key: 'deviceId', label: 'Device ID', type: 'text', required: true }
    ]
  }
};

// Channel管理器
export class ChannelManager {
  private channels: Map<string, Channel> = new Map();
  private storageKey = 'openclaw_channels';

  // 初始化
  async initialize(): Promise<void> {
    // 从文件系统加载已保存的channels
    try {
      const { promises: fs } = await import('fs');
      const data = await fs.readFile('/tmp/openclaw/channels.json', 'utf-8');
      const savedChannels = JSON.parse(data);
      
      savedChannels.forEach((channel: Channel) => {
        this.channels.set(channel.id, {
          ...channel,
          createdAt: new Date(channel.createdAt)
        });
      });
    } catch {
      // 文件不存在，使用默认配置
      this.addDefaultChannels();
    }
  }

  // 添加默认channels
  private addDefaultChannels(): void {
    this.channels.set('webchat', {
      id: 'webchat',
      type: 'webchat',
      name: 'Web Chat',
      enabled: true,
      config: {},
      createdAt: new Date()
    });
  }

  // 获取所有channels
  getAllChannels(): Channel[] {
    return Array.from(this.channels.values());
  }

  // 获取启用的channels
  getEnabledChannels(): Channel[] {
    return this.getAllChannels().filter(c => c.enabled);
  }

  // 获取channel
  getChannel(id: string): Channel | undefined {
    return this.channels.get(id);
  }

  // 添加channel
  async addChannel(channel: Channel): Promise<void> {
    this.channels.set(channel.id, channel);
    await this.saveChannels();
  }

  // 更新channel
  async updateChannel(id: string, updates: Partial<Channel>): Promise<void> {
    const channel = this.channels.get(id);
    if (channel) {
      this.channels.set(id, { ...channel, ...updates });
      await this.saveChannels();
    }
  }

  // 删除channel
  async deleteChannel(id: string): Promise<void> {
    this.channels.delete(id);
    await this.saveChannels();
  }

  // 启用/禁用channel
  async toggleChannel(id: string, enabled: boolean): Promise<void> {
    const channel = this.channels.get(id);
    if (channel) {
      channel.enabled = enabled;
      await this.saveChannels();
    }
  }

  // 保存到文件系统
  private async saveChannels(): Promise<void> {
    const { promises: fs } = await import('fs');
    await fs.mkdir('/tmp/openclaw', { recursive: true });
    await fs.writeFile(
      '/tmp/openclaw/channels.json',
      JSON.stringify(this.getAllChannels(), null, 2)
    );
  }

  // 发送消息到channel
  async sendMessage(channelId: string, message: ChannelMessage): Promise<boolean> {
    const channel = this.channels.get(channelId);
    if (!channel || !channel.enabled) {
      return false;
    }

    // 根据channel类型处理消息发送
    switch (channel.type) {
      case 'webchat':
        // WebChat直接返回，由前端处理
        return true;
      
      case 'whatsapp':
        // WhatsApp API调用
        return await this.sendToWhatsApp(channel, message);
      
      case 'telegram':
        // Telegram API调用
        return await this.sendToTelegram(channel, message);
      
      case 'discord':
        // Discord API调用
        return await this.sendToDiscord(channel, message);
      
      case 'slack':
        // Slack API调用
        return await this.sendToSlack(channel, message);
      
      case 'imessage':
        // iMessage API调用
        return await this.sendToIMessage(channel, message);
      
      default:
        return false;
    }
  }

  // WhatsApp发送
  private async sendToWhatsApp(channel: Channel, message: ChannelMessage): Promise<boolean> {
    try {
      const { phoneNumberId, accessToken } = channel.config;
      
      const response = await fetch(
        `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: message.userId,
            type: 'text',
            text: { body: message.content }
          })
        }
      );

      return response.ok;
    } catch (error) {
      console.error('WhatsApp send error:', error);
      return false;
    }
  }

  // Telegram发送
  private async sendToTelegram(channel: Channel, message: ChannelMessage): Promise<boolean> {
    try {
      const { botToken } = channel.config;
      
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: message.userId,
            text: message.content
          })
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Telegram send error:', error);
      return false;
    }
  }

  // Discord发送
  private async sendToDiscord(channel: Channel, message: ChannelMessage): Promise<boolean> {
    try {
      const { webhookUrl } = channel.config;
      
      if (!webhookUrl) return false;

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: message.content
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Discord send error:', error);
      return false;
    }
  }

  // Slack发送
  private async sendToSlack(channel: Channel, message: ChannelMessage): Promise<boolean> {
    try {
      const { botToken, channel: slackChannel } = channel.config;
      
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${botToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel: slackChannel || message.userId,
          text: message.content
        })
      });

      const data = await response.json();
      return data.ok;
    } catch (error) {
      console.error('Slack send error:', error);
      return false;
    }
  }

  // iMessage发送
  private async sendToIMessage(channel: Channel, message: ChannelMessage): Promise<boolean> {
    // iMessage需要macOS环境和特殊权限
    // 这里返回false，实际实现需要原生代码
    console.log('iMessage sending not implemented');
    return false;
  }
}

// 导出单例
export const channelManager = new ChannelManager();
