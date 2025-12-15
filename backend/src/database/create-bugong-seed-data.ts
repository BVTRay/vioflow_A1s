import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';
import { Team } from '../modules/teams/entities/team.entity';
import { TeamMember } from '../modules/teams/entities/team-member.entity';
import { User } from '../modules/users/entities/user.entity';
import { Project, ProjectStatus } from '../modules/projects/entities/project.entity';
import { ProjectMember, MemberRole } from '../modules/projects/entities/project-member.entity';
import { Video, VideoStatus, AspectRatio } from '../modules/videos/entities/video.entity';
import { Tag } from '../modules/tags/entities/tag.entity';
import { VideoTag } from '../modules/videos/entities/video-tag.entity';
import { Delivery } from '../modules/deliveries/entities/delivery.entity';
import { DeliveryFolder, FolderType } from '../modules/deliveries/entities/delivery-folder.entity';

config({ path: path.join(__dirname, '../../.env') });

const databaseUrl = process.env.DATABASE_URL;

let dataSourceConfig: any;

if (databaseUrl) {
  const urlObj = new URL(databaseUrl);
  const isSupabase = databaseUrl.includes('supabase') || databaseUrl.includes('pooler.supabase.com');
  
  dataSourceConfig = {
    type: 'postgres',
    host: urlObj.hostname,
    port: parseInt(urlObj.port, 10) || 5432,
    username: decodeURIComponent(urlObj.username),
    password: decodeURIComponent(urlObj.password),
    database: urlObj.pathname.slice(1),
    ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
  };
} else {
  dataSourceConfig = {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'vioflow_mam',
  };
}

const dataSource = new DataSource({
  ...dataSourceConfig,
  entities: [path.join(__dirname, '../**/*.entity{.ts,.js}')],
  synchronize: false,
  logging: false,
});

async function createBugongSeedData() {
  try {
    console.log('🔄 开始为"不恭文化"团队创建种子数据...\n');
    
    await dataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    const teamRepository = dataSource.getRepository(Team);
    const teamMemberRepository = dataSource.getRepository(TeamMember);
    const userRepository = dataSource.getRepository(User);
    const projectRepository = dataSource.getRepository(Project);
    const projectMemberRepository = dataSource.getRepository(ProjectMember);
    const videoRepository = dataSource.getRepository(Video);
    const tagRepository = dataSource.getRepository(Tag);
    const videoTagRepository = dataSource.getRepository(VideoTag);
    const deliveryRepository = dataSource.getRepository(Delivery);
    const folderRepository = dataSource.getRepository(DeliveryFolder);

    // 1. 查找"不恭文化"团队
    console.log('1️⃣ 查找"不恭文化"团队...');
    const bugongTeam = await teamRepository.findOne({
      where: { name: '不恭文化' },
    });

    if (!bugongTeam) {
      console.log('   ❌ 未找到"不恭文化"团队');
      process.exit(1);
    }

    console.log(`   ✅ 找到团队: ${bugongTeam.name} (${bugongTeam.code})\n`);
    const teamId = bugongTeam.id;

    // 2. 查找团队成员
    console.log('2️⃣ 查找团队成员...');
    const teamMembers = await teamMemberRepository.find({
      where: { team_id: teamId, status: 'active' as any },
      relations: ['user'],
    });

    if (teamMembers.length === 0) {
      console.log('   ❌ 未找到团队成员');
      process.exit(1);
    }

    const bugongUsers = teamMembers.map(tm => tm.user);
    console.log(`   ✅ 找到 ${bugongUsers.length} 个成员:`);
    bugongUsers.forEach(u => {
      console.log(`      - ${u.name} (${u.email})`);
    });
    console.log('');

    // 3. 检查是否已有项目
    console.log('3️⃣ 检查现有项目...');
    const existingProjects = await projectRepository.find({
      where: { team_id: teamId },
    });

    if (existingProjects.length > 0) {
      console.log(`   ⚠️  已存在 ${existingProjects.length} 个项目，跳过创建\n`);
    } else {
      // 4. 创建项目
      console.log('4️⃣ 创建项目...');
      const now = new Date();
      const projects = [
        projectRepository.create({
          name: '2501_不恭文化_品牌宣传片',
          client: '不恭文化',
          lead: bugongUsers[0]?.name || 'ray',
          post_lead: bugongUsers[1]?.name || 'jeff',
          group: '品牌宣传',
          team_id: teamId,
          status: ProjectStatus.ACTIVE,
          created_date: new Date('2025-01-15'),
          last_activity_at: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          last_opened_at: new Date(now.getTime() - 1 * 60 * 60 * 1000),
        }),
        projectRepository.create({
          name: '2412_不恭文化_年度总结',
          client: '不恭文化',
          lead: bugongUsers[0]?.name || 'ray',
          post_lead: bugongUsers[2]?.name || 'bevis',
          group: '纪录片',
          team_id: teamId,
          status: ProjectStatus.ACTIVE,
          created_date: new Date('2024-12-10'),
          last_activity_at: new Date(now.getTime() - 5 * 60 * 60 * 1000),
          last_opened_at: new Date(now.getTime() - 3 * 60 * 60 * 1000),
        }),
        projectRepository.create({
          name: '2411_不恭文化_产品发布',
          client: '不恭文化',
          lead: bugongUsers[1]?.name || 'jeff',
          post_lead: bugongUsers[0]?.name || 'ray',
          group: '广告片',
          team_id: teamId,
          status: ProjectStatus.FINALIZED,
          created_date: new Date('2024-11-20'),
          finalized_at: new Date('2024-12-05'),
          last_activity_at: new Date('2024-12-05'),
          last_opened_at: new Date('2024-12-10'),
        }),
      ];

      const savedProjects = await projectRepository.save(projects);
      console.log(`   ✅ 创建了 ${savedProjects.length} 个项目\n`);

      // 5. 创建项目成员
      console.log('5️⃣ 创建项目成员...');
      const projectMembers = [];
      for (let i = 0; i < savedProjects.length && i < bugongUsers.length; i++) {
        projectMembers.push(
          projectMemberRepository.create({
            project_id: savedProjects[i].id,
            user_id: bugongUsers[i].id,
            role: i === 0 ? MemberRole.OWNER : MemberRole.MEMBER,
          })
        );
      }
      await projectMemberRepository.save(projectMembers);
      console.log(`   ✅ 创建了 ${projectMembers.length} 个项目成员关系\n`);

      // 6. 创建标签（如果不存在）
      console.log('6️⃣ 检查标签...');
      const tagNames = ['品牌宣传', '纪录片', '广告片', '三维制作'];
      const existingTags = await tagRepository.find({
        where: tagNames.map(name => ({ name })),
      });
      const existingTagNames = new Set(existingTags.map(t => t.name));

      const tagsToCreate = tagNames
        .filter(name => !existingTagNames.has(name))
        .map(name => tagRepository.create({ name, usage_count: 0 }));

      let savedTags = [...existingTags];
      if (tagsToCreate.length > 0) {
        const newTags = await tagRepository.save(tagsToCreate);
        savedTags.push(...newTags);
        console.log(`   ✅ 创建了 ${newTags.length} 个新标签`);
      }
      console.log(`   📋 共有 ${savedTags.length} 个标签可用\n`);

      // 7. 创建视频
      console.log('7️⃣ 创建视频...');
      const videos = [
        videoRepository.create({
          project_id: savedProjects[0].id,
          name: 'v3_不恭文化_品牌宣传片.mp4',
          original_filename: '不恭文化_品牌宣传片.mp4',
          base_name: '不恭文化_品牌宣传片.mp4',
          version: 3,
          type: 'video' as any,
          storage_url: 'https://example.com/videos/v3_bugong_brand.mp4',
          storage_key: 'videos/v3_bugong_brand.mp4',
          thumbnail_url: 'https://picsum.photos/seed/bugong1/400/225',
          size: 1800000000, // 1.8 GB
          duration: 120,
          resolution: '1920x1080',
          aspect_ratio: AspectRatio.LANDSCAPE,
          status: VideoStatus.INITIAL,
          change_log: '初版完成',
          is_case_file: false,
          is_main_delivery: false,
          uploader_id: bugongUsers[0]?.id,
          upload_time: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        }),
        videoRepository.create({
          project_id: savedProjects[0].id,
          name: 'v2_不恭文化_品牌宣传片.mp4',
          original_filename: '不恭文化_品牌宣传片.mp4',
          base_name: '不恭文化_品牌宣传片.mp4',
          version: 2,
          type: 'video' as any,
          storage_url: 'https://example.com/videos/v2_bugong_brand.mp4',
          storage_key: 'videos/v2_bugong_brand.mp4',
          thumbnail_url: 'https://picsum.photos/seed/bugong2/400/225',
          size: 1800000000,
          duration: 120,
          resolution: '1920x1080',
          aspect_ratio: AspectRatio.LANDSCAPE,
          status: VideoStatus.ANNOTATED,
          change_log: '根据反馈调整了节奏',
          is_case_file: false,
          is_main_delivery: false,
          uploader_id: bugongUsers[0]?.id,
          upload_time: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        }),
        videoRepository.create({
          project_id: savedProjects[1].id,
          name: 'v5_不恭文化_年度总结.mp4',
          original_filename: '不恭文化_年度总结.mp4',
          base_name: '不恭文化_年度总结.mp4',
          version: 5,
          type: 'video' as any,
          storage_url: 'https://example.com/videos/v5_bugong_year.mp4',
          storage_key: 'videos/v5_bugong_year.mp4',
          thumbnail_url: 'https://picsum.photos/seed/bugong3/400/225',
          size: 3200000000, // 3.2 GB
          duration: 600,
          resolution: '3840x2160',
          aspect_ratio: AspectRatio.LANDSCAPE,
          status: VideoStatus.INITIAL,
          change_log: '粗剪完成',
          is_case_file: false,
          is_main_delivery: false,
          uploader_id: bugongUsers[1]?.id || bugongUsers[0]?.id,
          upload_time: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        }),
        videoRepository.create({
          project_id: savedProjects[2].id,
          name: 'v8_不恭文化_产品发布_Master.mov',
          original_filename: '不恭文化_产品发布_Master.mov',
          base_name: '不恭文化_产品发布_Master.mov',
          version: 8,
          type: 'video' as any,
          storage_url: 'https://example.com/videos/v8_bugong_product_master.mov',
          storage_key: 'videos/v8_bugong_product_master.mov',
          thumbnail_url: 'https://picsum.photos/seed/bugong4/400/225',
          size: 4200000000, // 4.2 GB
          duration: 90,
          resolution: '4096x2160',
          aspect_ratio: AspectRatio.LANDSCAPE,
          status: VideoStatus.APPROVED,
          change_log: '最终定版',
          is_case_file: true,
          is_main_delivery: true,
          uploader_id: bugongUsers[2]?.id || bugongUsers[0]?.id,
          upload_time: new Date('2024-12-05'),
        }),
      ];

      const savedVideos = await videoRepository.save(videos);
      console.log(`   ✅ 创建了 ${savedVideos.length} 个视频\n`);

      // 8. 创建视频标签关联
      console.log('8️⃣ 创建视频标签关联...');
      const brandTag = savedTags.find(t => t.name === '品牌宣传');
      const docTag = savedTags.find(t => t.name === '纪录片');
      const adTag = savedTags.find(t => t.name === '广告片');

      const videoTags = [];
      if (brandTag && savedVideos[0]) {
        videoTags.push(
          videoTagRepository.create({
            video_id: savedVideos[0].id,
            tag_id: brandTag.id,
          })
        );
      }
      if (docTag && savedVideos[2]) {
        videoTags.push(
          videoTagRepository.create({
            video_id: savedVideos[2].id,
            tag_id: docTag.id,
          })
        );
      }
      if (adTag && savedVideos[3]) {
        videoTags.push(
          videoTagRepository.create({
            video_id: savedVideos[3].id,
            tag_id: adTag.id,
          })
        );
      }

      if (videoTags.length > 0) {
        await videoTagRepository.save(videoTags);
        console.log(`   ✅ 创建了 ${videoTags.length} 个视频标签关联\n`);
      }

      // 9. 创建交付数据
      console.log('9️⃣ 创建交付数据...');
      const deliveries = [
        deliveryRepository.create({
          project_id: savedProjects[1].id,
          has_clean_feed: true,
          has_multi_resolution: false,
          has_script: false,
          has_copyright_files: false,
          has_tech_review: false,
          has_copyright_check: false,
          has_metadata: true,
          delivery_note: '待完善交付信息',
        }),
        deliveryRepository.create({
          project_id: savedProjects[2].id,
          has_clean_feed: true,
          has_multi_resolution: true,
          has_script: true,
          has_copyright_files: true,
          has_tech_review: true,
          has_copyright_check: true,
          has_metadata: true,
          delivery_note: '最终交付版本，包含所有素材和说明文档。',
          completed_at: new Date('2024-12-05'),
        }),
      ];

      const savedDeliveries = await deliveryRepository.save(deliveries);
      console.log(`   ✅ 创建了 ${savedDeliveries.length} 个交付记录\n`);

      // 10. 创建交付文件夹
      console.log('🔟 创建交付文件夹...');
      if (savedDeliveries[1]) {
        const folders = [
          folderRepository.create({
            delivery_id: savedDeliveries[1].id,
            folder_type: FolderType.MASTER,
            storage_path: `deliveries/${savedProjects[2].id}/master`,
          }),
          folderRepository.create({
            delivery_id: savedDeliveries[1].id,
            folder_type: FolderType.VARIANTS,
            storage_path: `deliveries/${savedProjects[2].id}/variants`,
          }),
          folderRepository.create({
            delivery_id: savedDeliveries[1].id,
            folder_type: FolderType.CLEAN_FEED,
            storage_path: `deliveries/${savedProjects[2].id}/clean_feed`,
          }),
          folderRepository.create({
            delivery_id: savedDeliveries[1].id,
            folder_type: FolderType.DOCS,
            storage_path: `deliveries/${savedProjects[2].id}/docs`,
          }),
        ];
        await folderRepository.save(folders);
        console.log(`   ✅ 创建了 ${folders.length} 个交付文件夹\n`);
      }
    }

    // 11. 生成最终报告
    console.log('📊 生成最终报告...');
    const finalProjects = await projectRepository.find({
      where: { team_id: teamId },
    });

    const finalVideos = await dataSource.query(`
      SELECT COUNT(*) as count 
      FROM videos v
      JOIN projects p ON v.project_id = p.id
      WHERE p.team_id = $1
    `, [teamId]);

    const finalDeliveries = await dataSource.query(`
      SELECT COUNT(*) as count 
      FROM deliveries d
      JOIN projects p ON d.project_id = p.id
      WHERE p.team_id = $1
    `, [teamId]);

    console.log('\n📊 "不恭文化"团队数据:');
    console.log(`   团队: ${bugongTeam.name} (${bugongTeam.code})`);
    console.log(`   成员数: ${bugongUsers.length}`);
    console.log(`   项目数: ${finalProjects.length}`);
    console.log(`   视频数: ${finalVideos[0]?.count || 0}`);
    console.log(`   交付数: ${finalDeliveries[0]?.count || 0}`);
    console.log('');

    if (finalProjects.length > 0) {
      console.log('📋 项目列表:');
      finalProjects.forEach(p => {
        console.log(`   - ${p.name} (${p.status})`);
      });
      console.log('');
    }

    await dataSource.destroy();
    console.log('✅ 种子数据创建完成！');
    console.log('\n💡 下一步：');
    console.log('   1. 使用不恭文化团队的账号登录（ray、jeff、bevis）');
    console.log('   2. 应该能看到项目和视频数据了');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ 创建失败:', error.message);
    console.error('\n完整错误:', error);
    process.exit(1);
  }
}

createBugongSeedData();


