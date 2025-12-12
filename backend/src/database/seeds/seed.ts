import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../modules/users/entities/user.entity';
import { Project, ProjectStatus } from '../../modules/projects/entities/project.entity';
import { ProjectMember, MemberRole } from '../../modules/projects/entities/project-member.entity';
import { Video, VideoStatus, AspectRatio } from '../../modules/videos/entities/video.entity';
import { Tag } from '../../modules/tags/entities/tag.entity';
import { VideoTag } from '../../modules/videos/entities/video-tag.entity';
import { Delivery } from '../../modules/deliveries/entities/delivery.entity';
import { DeliveryFolder, FolderType } from '../../modules/deliveries/entities/delivery-folder.entity';
import { Notification, NotificationType } from '../../modules/notifications/entities/notification.entity';

export async function seedDatabase(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(User);
  const projectRepository = dataSource.getRepository(Project);
  const memberRepository = dataSource.getRepository(ProjectMember);
  const videoRepository = dataSource.getRepository(Video);
  const tagRepository = dataSource.getRepository(Tag);
  const videoTagRepository = dataSource.getRepository(VideoTag);
  const deliveryRepository = dataSource.getRepository(Delivery);
  const folderRepository = dataSource.getRepository(DeliveryFolder);
  const notificationRepository = dataSource.getRepository(Notification);
  
  // 声明变量
  let savedUsers: User[] = [];
  let savedTags: Tag[] = [];
  let savedProjects: Project[] = [];
  let savedVideos: Video[] = [];
  let savedDeliveries: Delivery[] = [];

  console.log('开始注入种子数据...');

  // 1. 创建用户（检查是否已存在）
  const adminPassword = await bcrypt.hash('admin', 10);
  const userEmails = [
    'admin@vioflow.com',
    'sarah@vioflow.com',
    'mike@vioflow.com',
    'alex@vioflow.com',
    'sales@vioflow.com',
  ];
  
  // 检查已存在的用户
  const existingUsers = await userRepository.find({
    where: userEmails.map(email => ({ email })),
  });
  const existingEmails = new Set(existingUsers.map(u => u.email));
  
  const usersToCreate = [
    { email: 'admin@vioflow.com', name: 'admin', role: UserRole.ADMIN },
    { email: 'sarah@vioflow.com', name: 'Sarah D.', role: UserRole.MEMBER },
    { email: 'mike@vioflow.com', name: 'Mike', role: UserRole.MEMBER },
    { email: 'alex@vioflow.com', name: 'Alex', role: UserRole.MEMBER },
    { email: 'sales@vioflow.com', name: '销售负责人', role: UserRole.SALES },
  ].filter(u => !existingEmails.has(u.email));
  
  if (usersToCreate.length > 0) {
    const users = usersToCreate.map(u =>
      userRepository.create({
        email: u.email,
        name: u.name,
        password_hash: adminPassword,
        role: u.role,
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name.toLowerCase().replace(/\s+/g, '')}`,
      })
    );
    const newUsers = await userRepository.save(users);
    console.log(`✓ 创建了 ${newUsers.length} 个新用户`);
  } else {
    console.log(`✓ 所有用户已存在，跳过创建`);
  }
  
  // 获取所有用户（包括新创建的和已存在的）
  const allUsers = await userRepository.find({
    where: userEmails.map(email => ({ email })),
  });
  savedUsers = allUsers;

  // 2. 创建标签（检查是否已存在）
  const tagNames = ['AI生成', '三维制作', '病毒广告', '剧情', '纪录片', '广告片', '社交媒体', '品牌宣传'];
  const existingTags = await tagRepository.find({
    where: tagNames.map(name => ({ name })),
  });
  const existingTagNames = new Set(existingTags.map(t => t.name));
  
  const tagsToCreate = [
    { name: 'AI生成', usage_count: 5 },
    { name: '三维制作', usage_count: 8 },
    { name: '病毒广告', usage_count: 3 },
    { name: '剧情', usage_count: 6 },
    { name: '纪录片', usage_count: 4 },
    { name: '广告片', usage_count: 10 },
    { name: '社交媒体', usage_count: 7 },
    { name: '品牌宣传', usage_count: 9 },
  ].filter(t => !existingTagNames.has(t.name));
  
  if (tagsToCreate.length > 0) {
    const tags = tagsToCreate.map(t => tagRepository.create(t));
    const newTags = await tagRepository.save(tags);
    console.log(`✓ 创建了 ${newTags.length} 个新标签`);
  } else {
    console.log(`✓ 所有标签已存在，跳过创建`);
  }
  
  // 获取所有标签
  const allTags = await tagRepository.find({
    where: tagNames.map(name => ({ name })),
  });
  savedTags = allTags;

  // 3. 创建项目（检查是否已存在）
  const now = new Date();
  const projectNames = [
    '2412_Nike_AirMax_Holiday',
    '2501_Spotify_Wrapped_Asia',
    '2411_Netflix_Docu_S1',
    '2410_Porsche_911_Launch',
    '2409_Apple_Event_Launch',
  ];
  
  const existingProjects = await projectRepository.find({
    where: projectNames.map(name => ({ name })),
  });
  const existingProjectNames = new Set(existingProjects.map(p => p.name));
  
  const projectsToCreate = [
    {
      name: '2412_Nike_AirMax_Holiday',
      client: 'Nike',
      lead: 'Sarah D.',
      post_lead: 'Mike',
      group: '广告片',
      status: ProjectStatus.ACTIVE,
      created_date: new Date('2024-12-01'),
      last_activity_at: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      last_opened_at: new Date(now.getTime() - 1 * 60 * 60 * 1000),
    },
    {
      name: '2501_Spotify_Wrapped_Asia',
      client: 'Spotify',
      lead: 'Alex',
      post_lead: 'Jen',
      group: '社交媒体',
      status: ProjectStatus.ACTIVE,
      created_date: new Date('2025-01-10'),
      last_activity_at: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      last_opened_at: new Date(now.getTime() - 3 * 60 * 60 * 1000),
    },
    {
      name: '2411_Netflix_Docu_S1',
      client: 'Netflix',
      lead: 'Jessica',
      post_lead: 'Tom',
      group: '长视频',
      status: ProjectStatus.FINALIZED,
      created_date: new Date('2024-11-05'),
      finalized_at: new Date('2024-11-20'),
      last_activity_at: new Date('2024-11-20'),
      last_opened_at: new Date('2024-11-25'),
    },
    {
      name: '2410_Porsche_911_Launch',
      client: 'Porsche',
      lead: 'Tom',
      post_lead: 'Sarah',
      group: '广告片',
      status: ProjectStatus.DELIVERED,
      created_date: new Date('2024-10-20'),
      finalized_at: new Date('2024-10-25'),
      delivered_at: new Date('2024-10-28'),
      last_activity_at: new Date('2024-10-28'),
      last_opened_at: new Date('2024-10-30'),
    },
    {
      name: '2409_Apple_Event_Launch',
      client: 'Apple',
      lead: 'Sarah D.',
      post_lead: 'Mike',
      group: '广告片',
      status: ProjectStatus.ACTIVE,
      created_date: new Date('2024-09-15'),
      last_activity_at: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      last_opened_at: new Date(now.getTime() - 12 * 60 * 60 * 1000),
    },
  ].filter(p => !existingProjectNames.has(p.name));
  
  if (projectsToCreate.length > 0) {
    const projects = projectsToCreate.map(p => projectRepository.create(p));
    const newProjects = await projectRepository.save(projects);
    console.log(`✓ 创建了 ${newProjects.length} 个新项目`);
  } else {
    console.log(`✓ 所有项目已存在，跳过创建`);
  }
  
  // 获取所有项目
  const allProjects = await projectRepository.find({
    where: projectNames.map(name => ({ name })),
  });
  savedProjects = allProjects;

  // 4. 创建项目成员（检查是否已存在）
  if (savedProjects.length >= 2 && savedUsers.length >= 4) {
    const membersToCreate = [
      { project_id: savedProjects[0].id, user_id: savedUsers[1].id, role: MemberRole.OWNER }, // Sarah
      { project_id: savedProjects[0].id, user_id: savedUsers[2].id, role: MemberRole.MEMBER }, // Mike
      { project_id: savedProjects[1].id, user_id: savedUsers[3].id, role: MemberRole.OWNER }, // Alex
    ];
    
    // 检查已存在的成员关系
    const existingMembers = await memberRepository.find({
      where: membersToCreate.map(m => ({ project_id: m.project_id, user_id: m.user_id })),
    });
    const existingMemberKeys = new Set(
      existingMembers.map(m => `${m.project_id}-${m.user_id}`)
    );
    
    const newMembers = membersToCreate.filter(
      m => !existingMemberKeys.has(`${m.project_id}-${m.user_id}`)
    );
    
    if (newMembers.length > 0) {
      const members = newMembers.map(m => memberRepository.create(m));
      await memberRepository.save(members);
      console.log(`✓ 创建了 ${members.length} 个新项目成员关系`);
    } else {
      console.log(`✓ 所有项目成员关系已存在，跳过创建`);
    }
  }

  // 5. 创建视频（检查是否已存在）
  if (savedProjects.length >= 4 && savedUsers.length >= 2) {
    const videoNames = [
      'v4_Nike_AirMax.mp4',
      'v3_Nike_AirMax.mp4',
      'v12_Porsche_Launch_Master.mov',
      'v8_Netflix_Ep1_Lock.mp4',
    ];
    
    const existingVideos = await videoRepository.find({
      where: videoNames.map(name => ({ name })),
    });
    const existingVideoNames = new Set(existingVideos.map(v => v.name));
    
    const videosToCreate = [
      {
        project_id: savedProjects[0].id,
        name: 'v4_Nike_AirMax.mp4',
        original_filename: 'Nike_AirMax.mp4',
        base_name: 'Nike_AirMax.mp4',
        version: 4,
        type: 'video' as any,
        storage_url: 'https://example.com/videos/v4_Nike_AirMax.mp4',
        storage_key: 'videos/v4_Nike_AirMax.mp4',
        thumbnail_url: 'https://picsum.photos/seed/nike1/400/225',
        size: 2400000000,
        duration: 90,
        resolution: '3840x2160',
        aspect_ratio: AspectRatio.LANDSCAPE,
        status: VideoStatus.INITIAL,
        change_log: '调整了结尾Logo的入场动画',
        is_case_file: false,
        is_main_delivery: false,
        uploader_id: savedUsers[1].id,
        upload_time: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
      {
        project_id: savedProjects[0].id,
        name: 'v3_Nike_AirMax.mp4',
        original_filename: 'Nike_AirMax.mp4',
        base_name: 'Nike_AirMax.mp4',
        version: 3,
        type: 'video' as any,
        storage_url: 'https://example.com/videos/v3_Nike_AirMax.mp4',
        storage_key: 'videos/v3_Nike_AirMax.mp4',
        thumbnail_url: 'https://picsum.photos/seed/nike2/400/225',
        size: 2400000000,
        duration: 90,
        resolution: '3840x2160',
        aspect_ratio: AspectRatio.LANDSCAPE,
        status: VideoStatus.ANNOTATED,
        change_log: '根据客户意见修改了调色',
        is_case_file: false,
        is_main_delivery: false,
        uploader_id: savedUsers[1].id,
        upload_time: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      },
      {
        project_id: savedProjects[3].id,
        name: 'v12_Porsche_Launch_Master.mov',
        original_filename: 'Porsche_Launch_Master.mov',
        base_name: 'Porsche_Launch_Master.mov',
        version: 12,
        type: 'video' as any,
        storage_url: 'https://example.com/videos/v12_Porsche_Launch_Master.mov',
        storage_key: 'videos/v12_Porsche_Launch_Master.mov',
        thumbnail_url: 'https://picsum.photos/seed/porsche/400/225',
        size: 42000000000,
        duration: 60,
        resolution: '4096x2160',
        aspect_ratio: AspectRatio.LANDSCAPE,
        status: VideoStatus.APPROVED,
        change_log: '最终定版',
        is_case_file: true,
        is_main_delivery: true,
        uploader_id: savedUsers[1].id,
        upload_time: new Date('2024-10-25'),
      },
      {
        project_id: savedProjects[2].id,
        name: 'v8_Netflix_Ep1_Lock.mp4',
        original_filename: 'Netflix_Ep1_Lock.mp4',
        base_name: 'Netflix_Ep1_Lock.mp4',
        version: 8,
        type: 'video' as any,
        storage_url: 'https://example.com/videos/v8_Netflix_Ep1_Lock.mp4',
        storage_key: 'videos/v8_Netflix_Ep1_Lock.mp4',
        thumbnail_url: 'https://picsum.photos/seed/netflix/400/225',
        size: 1800000000,
        duration: 2700,
        resolution: '1920x1080',
        aspect_ratio: AspectRatio.LANDSCAPE,
        status: VideoStatus.INITIAL,
        change_log: '粗剪定版',
        is_case_file: false,
        is_main_delivery: false,
        uploader_id: savedUsers[1].id,
        upload_time: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
    ].filter(v => !existingVideoNames.has(v.name));
    
    if (videosToCreate.length > 0) {
      const videos = videosToCreate.map(v => videoRepository.create(v));
      const newVideos = await videoRepository.save(videos);
      console.log(`✓ 创建了 ${newVideos.length} 个新视频`);
    } else {
      console.log(`✓ 所有视频已存在，跳过创建`);
    }
    
    // 获取所有视频
    const allVideos = await videoRepository.find({
      where: videoNames.map(name => ({ name })),
    });
    savedVideos = allVideos;
  } else {
    savedVideos = [];
  }

  // 6. 创建视频标签关联（检查是否已存在）
  if (savedVideos.length >= 3 && savedTags.length >= 5) {
    const porscheVideo = savedVideos.find(v => v.name === 'v12_Porsche_Launch_Master.mov');
    if (porscheVideo) {
      const videoTagsToCreate = [
        { video_id: porscheVideo.id, tag_id: savedTags[1].id }, // Porsche视频 - 三维制作
        { video_id: porscheVideo.id, tag_id: savedTags[4].id }, // Porsche视频 - 广告片
      ];
      
      // 检查已存在的关联
      const existingVideoTags = await videoTagRepository.find({
        where: videoTagsToCreate.map(vt => ({ video_id: vt.video_id, tag_id: vt.tag_id })),
      });
      const existingVideoTagKeys = new Set(
        existingVideoTags.map(vt => `${vt.video_id}-${vt.tag_id}`)
      );
      
      const newVideoTags = videoTagsToCreate.filter(
        vt => !existingVideoTagKeys.has(`${vt.video_id}-${vt.tag_id}`)
      );
      
      if (newVideoTags.length > 0) {
        const videoTags = newVideoTags.map(vt => videoTagRepository.create(vt));
        await videoTagRepository.save(videoTags);
        console.log(`✓ 创建了 ${videoTags.length} 个新视频标签关联`);
      } else {
        console.log(`✓ 所有视频标签关联已存在，跳过创建`);
      }
    } else {
      console.log(`⚠️  未找到 Porsche 视频，跳过视频标签关联创建`);
    }
  }

  // 7. 创建交付数据（检查是否已存在）
  const deliveryProjectIds = savedProjects.length >= 4 
    ? [savedProjects[2].id, savedProjects[3].id] 
    : [];
  
  const existingDeliveries = deliveryProjectIds.length > 0
    ? await deliveryRepository.find({
        where: deliveryProjectIds.map(projectId => ({ project_id: projectId })),
      })
    : [];
  const existingDeliveryProjectIds = new Set(existingDeliveries.map(d => d.project_id));
  
  const deliveriesToCreate: Array<{
    project_id: string;
    has_clean_feed: boolean;
    has_multi_resolution: boolean;
    has_script: boolean;
    has_copyright_files: boolean;
    has_tech_review: boolean;
    has_copyright_check: boolean;
    has_metadata: boolean;
    delivery_note: string;
    completed_at?: Date;
  }> = [];
  
  if (savedProjects.length >= 4) {
    if (!existingDeliveryProjectIds.has(savedProjects[2].id)) {
      deliveriesToCreate.push({
        project_id: savedProjects[2].id, // Netflix项目
        has_clean_feed: true,
        has_multi_resolution: false,
        has_script: false,
        has_copyright_files: false,
        has_tech_review: false,
        has_copyright_check: false,
        has_metadata: true,
        delivery_note: '待完善交付信息',
      });
    }
    if (!existingDeliveryProjectIds.has(savedProjects[3].id)) {
      deliveriesToCreate.push({
        project_id: savedProjects[3].id, // Porsche项目
        has_clean_feed: true,
        has_multi_resolution: true,
        has_script: true,
        has_copyright_files: true,
        has_tech_review: true,
        has_copyright_check: true,
        has_metadata: true,
        delivery_note: '最终交付版本，包含所有素材和说明文档。',
        completed_at: new Date('2024-10-28'),
      });
    }
  }
  
  if (deliveriesToCreate.length > 0) {
    const deliveries = deliveriesToCreate.map(d => deliveryRepository.create(d));
    const newDeliveries = await deliveryRepository.save(deliveries);
    console.log(`✓ 创建了 ${newDeliveries.length} 个新交付记录`);
  } else {
    if (deliveryProjectIds.length > 0) {
      console.log(`✓ 所有交付记录已存在，跳过创建`);
    }
  }
  
  // 获取所有交付记录
  const allDeliveries = deliveryProjectIds.length > 0
    ? await deliveryRepository.find({
        where: deliveryProjectIds.map(projectId => ({ project_id: projectId })),
      })
    : [];
  savedDeliveries = allDeliveries;

  // 8. 为已完成的交付创建文件夹结构（检查是否已存在）
  if (savedDeliveries.length >= 2 && savedProjects.length >= 4) {
    const porscheDelivery = savedDeliveries.find(d => d.project_id === savedProjects[3].id);
    if (porscheDelivery) {
      const existingFolders = await folderRepository.find({
        where: { delivery_id: porscheDelivery.id },
      });
      const existingFolderTypes = new Set(existingFolders.map(f => f.folder_type));
      
      const foldersToCreate = [
        { folder_type: FolderType.MASTER, storage_path: `deliveries/${savedProjects[3].id}/master` },
        { folder_type: FolderType.VARIANTS, storage_path: `deliveries/${savedProjects[3].id}/variants` },
        { folder_type: FolderType.CLEAN_FEED, storage_path: `deliveries/${savedProjects[3].id}/clean_feed` },
        { folder_type: FolderType.DOCS, storage_path: `deliveries/${savedProjects[3].id}/docs` },
      ].filter(f => !existingFolderTypes.has(f.folder_type));
      
      if (foldersToCreate.length > 0) {
        const folders = foldersToCreate.map(f =>
          folderRepository.create({
            delivery_id: porscheDelivery.id,
            folder_type: f.folder_type,
            storage_path: f.storage_path,
          })
        );
        await folderRepository.save(folders);
        console.log(`✓ 创建了 ${folders.length} 个新交付文件夹`);
      } else {
        console.log(`✓ 所有交付文件夹已存在，跳过创建`);
      }
    }
  }

  // 9. 创建通知（可选，通知通常不需要检查重复）
  if (savedUsers.length >= 2 && savedVideos.length >= 1 && savedProjects.length >= 3) {
    try {
      const notifications = [
        notificationRepository.create({
          user_id: savedUsers[1].id,
          type: NotificationType.SUCCESS,
          title: '视频上传完成',
          message: 'v4_Nike_AirMax.mp4 上传成功',
          related_type: 'video',
          related_id: savedVideos[0].id,
          is_read: false,
        }),
        notificationRepository.create({
          user_id: savedUsers[1].id,
          type: NotificationType.INFO,
          title: '项目定版',
          message: 'Netflix_Docu_S1 项目已定版，请前往交付模块完善信息',
          related_type: 'project',
          related_id: savedProjects[2].id,
          is_read: false,
        }),
      ];
      await notificationRepository.save(notifications);
      console.log(`✓ 创建了 ${notifications.length} 个通知`);
    } catch (error: any) {
      // 通知创建失败不影响整体流程
      console.log(`⚠️  创建通知时出错: ${error.message}，跳过`);
    }
  }

  console.log('✓ 种子数据注入完成！');
  console.log('\n测试账号:');
  console.log('  管理员: admin@vioflow.com / admin');
  console.log('  成员: sarah@vioflow.com / admin');
}

