// OpenClaw Skills API - 技能管理接口
import { NextRequest, NextResponse } from 'next/server';
import { skillManager } from '@/lib/openclaw/skills';
import type { Skill } from '@/lib/openclaw/types';

// GET /api/skills - 获取技能列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'all';
    const category = searchParams.get('category');

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

      default:
        let skills = skillManager.getAllSkills();
        
        if (category) {
          skills = skills.filter(s => s.category === category);
        }

        return NextResponse.json({
          success: true,
          skills
        });
    }
  } catch (error) {
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
    const { action, skillId, skill, skillMd } = body;

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

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove skill' },
      { status: 500 }
    );
  }
}
