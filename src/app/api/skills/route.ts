// OpenClaw Skills API - 技能管理接口
// 支持ClawHub无缝下载、依赖检查、SKILL.md导入

import { NextRequest, NextResponse } from 'next/server';
import { skillManager, ClawHubClient } from '@/lib/openclaw/skills';
import type { Skill } from '@/lib/openclaw/types';

// GET /api/skills - 获取技能列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'all';
    const category = searchParams.get('category');
    const skillId = searchParams.get('id');

    // 确保技能已初始化
    await skillManager.initialize();

    switch (action) {
      case 'enabled':
        const enabledSkills = skillManager.getEnabledSkills();
        return NextResponse.json({
          success: true,
          skills: enabledSkills
        });

      case 'categories':
        const allSkills = skillManager.getAllSkills();
        const categories = [...new Set(allSkills.map(s => s.category))];
        return NextResponse.json({
          success: true,
          categories
        });

      case 'detail':
        if (!skillId) {
          return NextResponse.json(
            { error: 'Skill ID is required' },
            { status: 400 }
          );
        }
        const skill = skillManager.getSkill(skillId);
        if (!skill) {
          return NextResponse.json(
            { error: 'Skill not found' },
            { status: 404 }
          );
        }
        return NextResponse.json({
          success: true,
          skill
        });

      case 'hub':
        // 获取ClawHub技能列表
        try {
          const hubSkills = await ClawHubClient.listSkills();
          return NextResponse.json({
            success: true,
            skills: hubSkills
          });
        } catch (error) {
          // ClawHub不可用，返回模拟数据
          const mockHubSkills = [
            {
              slug: 'web-browsing',
              name: 'Web Browsing',
              description: 'Browse websites and extract information',
              category: 'Automation',
              installs: 1250,
              verified: true,
              featured: true
            },
            {
              slug: 'terminal',
              name: 'Terminal',
              description: 'Execute terminal commands safely',
              category: 'System',
              installs: 980,
              verified: true,
              featured: true
            },
            {
              slug: 'memory-enhanced',
              name: 'Memory Enhanced',
              description: 'Advanced memory management with vector search',
              category: 'Memory',
              installs: 650,
              verified: true
            },
            {
              slug: 'api-client',
              name: 'API Client',
              description: 'Make HTTP requests to external APIs',
              category: 'Integration',
              installs: 520,
              verified: true
            },
            {
              slug: 'data-analysis',
              name: 'Data Analysis',
              description: 'Analyze and visualize data',
              category: 'Analysis',
              installs: 430,
              verified: false
            }
          ];
          return NextResponse.json({
            success: true,
            skills: mockHubSkills,
            note: 'Using mock data - ClawHub not available'
          });
        }

      case 'dependencies':
        if (!skillId) {
          return NextResponse.json(
            { error: 'Skill ID is required' },
            { status: 400 }
          );
        }
        const depResult = await skillManager.checkDependencies(skillId);
        return NextResponse.json({
          success: true,
          ...depResult
        });

      default:
        let skills = skillManager.getAllSkills();
        
        if (category) {
          skills = skills.filter(s => s.category === category);
        }

        return NextResponse.json({
          success: true,
          skills,
          count: skills.length
        });
    }
  } catch (error) {
    console.error('Skills API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get skills' },
      { status: 500 }
    );
  }
}

// POST /api/skills - 添加或安装技能
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, skillId, skill, skillMd, slug } = body;

    await skillManager.initialize();

    switch (action) {
      case 'enable':
        if (!skillId) {
          return NextResponse.json(
            { error: 'Skill ID is required' },
            { status: 400 }
          );
        }
        await skillManager.enableSkill(skillId);
        return NextResponse.json({
          success: true,
          message: `Skill ${skillId} enabled`
        });

      case 'disable':
        if (!skillId) {
          return NextResponse.json(
            { error: 'Skill ID is required' },
            { status: 400 }
          );
        }
        await skillManager.disableSkill(skillId);
        return NextResponse.json({
          success: true,
          message: `Skill ${skillId} disabled`
        });

      case 'add':
        if (!skill) {
          return NextResponse.json(
            { error: 'Skill object is required' },
            { status: 400 }
          );
        }
        await skillManager.addCustomSkill(skill as Skill);
        return NextResponse.json({
          success: true,
          skill
        });

      case 'import':
        if (!skillMd) {
          return NextResponse.json(
            { error: 'SKILL.md content is required' },
            { status: 400 }
          );
        }
        const importedSkill = await skillManager.importFromSkillMd(skillMd);
        return NextResponse.json({
          success: true,
          skill: importedSkill
        });

      case 'download':
        // 从ClawHub下载技能
        if (!slug) {
          return NextResponse.json(
            { error: 'Skill slug is required' },
            { status: 400 }
          );
        }
        const downloadResult = await skillManager.downloadFromClawHub(slug);
        return NextResponse.json({
          success: downloadResult.success,
          message: downloadResult.message,
          skill: downloadResult.skill
        });

      case 'check-deps':
        if (!skillId) {
          return NextResponse.json(
            { error: 'Skill ID is required' },
            { status: 400 }
          );
        }
        const checkResult = await skillManager.checkDependencies(skillId);
        return NextResponse.json({
          success: true,
          ...checkResult
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Skills API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to manage skill' },
      { status: 500 }
    );
  }
}

// DELETE /api/skills - 删除技能
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Skill ID is required' },
        { status: 400 }
      );
    }

    await skillManager.initialize();
    await skillManager.removeSkill(id);

    return NextResponse.json({
      success: true,
      message: 'Skill removed'
    });
  } catch (error) {
    console.error('Skills API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove skill' },
      { status: 500 }
    );
  }
}
