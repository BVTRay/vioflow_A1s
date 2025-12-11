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

export async function seedDatabaseExtended(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(User);
  const projectRepository = dataSource.getRepository(Project);
  const memberRepository = dataSource.getRepository(ProjectMember);
  const videoRepository = dataSource.getRepository(Video);
  const tagRepository = dataSource.getRepository(Tag);
  const videoTagRepository = dataSource.getRepository(VideoTag);
  const deliveryRepository = dataSource.getRepository(Delivery);
  const folderRepository = dataSource.getRepository(DeliveryFolder);
  const notificationRepository = dataSource.getRepository(Notification);

  console.log('开始注入扩展种子数据...');

  // 1. 创建更多用户（如果不存在）
  const adminPassword = await bcrypt.hash('admin', 10);
  const existingUsers = await userRepository.find();
  const userEmails = existingUsers.map(u => u.email);
  
  const newUsers = [];
  const userData = [
    { email: 'jen@vioflow.com', name: 'Jen', role: UserRole.MEMBER },
    { email: 'jessica@vioflow.com', name: 'Jessica', role: UserRole.MEMBER },
    { email: 'tom@vioflow.com', name: 'Tom', role: UserRole.MEMBER },
    { email: 'lisa@vioflow.com', name: 'Lisa', role: UserRole.MEMBER },
  ];

  for (const userInfo of userData) {
    if (!userEmails.includes(userInfo.email)) {
      newUsers.push(userRepository.create({
        email: userInfo.email,
        name: userInfo.name,
        password_hash: adminPassword,
        role: userInfo.role,
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userInfo.name.toLowerCase()}`,
      }));
    }
  }

  if (newUsers.length > 0) {
    const savedNewUsers = await userRepository.save(newUsers);
    console.log(`✓ 创建了 ${savedNewUsers.length} 个新用户`);
  }

  const allUsers = await userRepository.find();
  const adminUser = allUsers.find(u => u.email === 'admin@vioflow.com')!;
  const sarahUser = allUsers.find(u => u.email === 'sarah@vioflow.com')!;
  const alexUser = allUsers.find(u => u.email === 'alex@vioflow.com')!;
  const mikeUser = allUsers.find(u => u.email === 'mike@vioflow.com')!;

  // 2. 创建更多标签（如果不存在）
  const existingTags = await tagRepository.find();
  const tagNames = existingTags.map(t => t.name);
  
  const newTags = [];
  const tagData = [
    { name: '运动', usage_count: 12 },
    { name: '音乐', usage_count: 8 },
    { name: '科技', usage_count: 15 },
    { name: '时尚', usage_count: 6 },
    { name: '汽车', usage_count: 9 },
    { name: '美食', usage_count: 4 },
    { name: '旅游', usage_count: 5 },
    { name: '教育', usage_count: 7 },
    { name: '游戏', usage_count: 11 },
    { name: '娱乐', usage_count: 13 },
  ];

  for (const tagInfo of tagData) {
    if (!tagNames.includes(tagInfo.name)) {
      newTags.push(tagRepository.create(tagInfo));
    }
  }

  if (newTags.length > 0) {
    const savedNewTags = await tagRepository.save(newTags);
    console.log(`✓ 创建了 ${savedNewTags.length} 个新标签`);
  }

  const allTags = await tagRepository.find();

  // 3. 创建更多项目
  const now = new Date();
  const existingProjects = await projectRepository.find();
  const projectNames = existingProjects.map(p => p.name);

  const newProjects = [];
  const projectData = [
    {
      name: '2502_Adidas_Spring_Collection',
      client: 'Adidas',
      lead: 'Alex',
      post_lead: 'Jen',
      group: '广告片',
      status: ProjectStatus.ACTIVE,
      created_date: new Date('2025-01-15'),
      last_activity_at: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      last_opened_at: new Date(now.getTime() - 30 * 60 * 1000),
    },
    {
      name: '2501_Samsung_Galaxy_Launch',
      client: 'Samsung',
      lead: 'Mike',
      post_lead: 'Sarah D.',
      group: '广告片',
      status: ProjectStatus.ACTIVE,
      created_date: new Date('2025-01-08'),
      last_activity_at: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      last_opened_at: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    },
    {
      name: '2412_Tesla_Cybertruck_Reveal',
      client: 'Tesla',
      lead: 'Sarah D.',
      post_lead: 'Mike',
      group: '广告片',
      status: ProjectStatus.ACTIVE,
      created_date: new Date('2024-12-10'),
      last_activity_at: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      last_opened_at: new Date(now.getTime() - 4 * 60 * 60 * 1000),
    },
    {
      name: '2411_Microsoft_Surface_Pro',
      client: 'Microsoft',
      lead: 'Alex',
      post_lead: 'Jen',
      group: '广告片',
      status: ProjectStatus.ACTIVE,
      created_date: new Date('2024-11-20'),
      last_activity_at: new Date(now.getTime() - 12 * 60 * 60 * 1000),
      last_opened_at: new Date(now.getTime() - 10 * 60 * 60 * 1000),
    },
    {
      name: '2410_Google_Pixel_8_Launch',
      client: 'Google',
      lead: 'Mike',
      post_lead: 'Sarah D.',
      group: '广告片',
      status: ProjectStatus.FINALIZED,
      created_date: new Date('2024-10-15'),
      finalized_at: new Date('2024-10-30'),
      last_activity_at: new Date('2024-10-30'),
      last_opened_at: new Date('2024-11-05'),
    },
    {
      name: '2409_Meta_Quest_3_Launch',
      client: 'Meta',
      lead: 'Alex',
      post_lead: 'Jen',
      group: '广告片',
      status: ProjectStatus.DELIVERED,
      created_date: new Date('2024-09-10'),
      finalized_at: new Date('2024-09-25'),
      delivered_at: new Date('2024-09-28'),
      last_activity_at: new Date('2024-09-28'),
      last_opened_at: new Date('2024-10-01'),
    },
    {
      name: '2408_Amazon_Prime_Day',
      client: 'Amazon',
      lead: 'Sarah D.',
      post_lead: 'Mike',
      group: '社交媒体',
      status: ProjectStatus.ACTIVE,
      created_date: new Date('2024-08-05'),
      last_activity_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      last_opened_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      name: '2407_Disney_Plus_Original',
      client: 'Disney',
      lead: 'Alex',
      post_lead: 'Jen',
      group: '长视频',
      status: ProjectStatus.ACTIVE,
      created_date: new Date('2024-07-20'),
      last_activity_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      last_opened_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const projectInfo of projectData) {
    if (!projectNames.includes(projectInfo.name)) {
      newProjects.push(projectRepository.create(projectInfo));
    }
  }

  let savedNewProjects = [];
  if (newProjects.length > 0) {
    savedNewProjects = await projectRepository.save(newProjects);
    console.log(`✓ 创建了 ${savedNewProjects.length} 个新项目`);
  }

  const allProjects = await projectRepository.find();

  // 4. 创建更多项目成员
  const existingMembers = await memberRepository.find();
  const newMembers = [];

  // 为每个新项目添加成员
  for (const project of savedNewProjects) {
    // 随机选择2-3个成员
    const randomUsers = allUsers.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 2) + 2);
    for (let i = 0; i < randomUsers.length; i++) {
      const memberExists = existingMembers.some(
        m => m.project_id === project.id && m.user_id === randomUsers[i].id
      );
      if (!memberExists) {
        newMembers.push(memberRepository.create({
          project_id: project.id,
          user_id: randomUsers[i].id,
          role: i === 0 ? MemberRole.OWNER : MemberRole.MEMBER,
        }));
      }
    }
  }

  if (newMembers.length > 0) {
    await memberRepository.save(newMembers);
    console.log(`✓ 创建了 ${newMembers.length} 个新项目成员关系`);
  }

  // 5. 创建更多视频
  const existingVideos = await videoRepository.find();
  const videoNames = existingVideos.map(v => v.name);

  const newVideos = [];
  const videoData = [
    {
      project: allProjects.find(p => p.name === '2502_Adidas_Spring_Collection'),
      name: 'v2_Adidas_Spring.mp4',
      version: 2,
      status: VideoStatus.INITIAL,
      duration: 60,
      resolution: '3840x2160',
      size: 1800000000,
      uploader: alexUser,
      uploadTime: new Date(now.getTime() - 1 * 60 * 60 * 1000),
    },
    {
      project: allProjects.find(p => p.name === '2501_Samsung_Galaxy_Launch'),
      name: 'v5_Samsung_Galaxy.mp4',
      version: 5,
      status: VideoStatus.ANNOTATED,
      duration: 90,
      resolution: '3840x2160',
      size: 2700000000,
      uploader: mikeUser,
      uploadTime: new Date(now.getTime() - 3 * 60 * 60 * 1000),
    },
    {
      project: allProjects.find(p => p.name === '2412_Tesla_Cybertruck_Reveal'),
      name: 'v3_Tesla_Cybertruck.mp4',
      version: 3,
      status: VideoStatus.INITIAL,
      duration: 120,
      resolution: '4096x2160',
      size: 3600000000,
      uploader: sarahUser,
      uploadTime: new Date(now.getTime() - 6 * 60 * 60 * 1000),
    },
    {
      project: allProjects.find(p => p.name === '2411_Microsoft_Surface_Pro'),
      name: 'v4_Microsoft_Surface.mp4',
      version: 4,
      status: VideoStatus.APPROVED,
      duration: 75,
      resolution: '3840x2160',
      size: 2250000000,
      uploader: alexUser,
      uploadTime: new Date(now.getTime() - 12 * 60 * 60 * 1000),
    },
    {
      project: allProjects.find(p => p.name === '2410_Google_Pixel_8_Launch'),
      name: 'v8_Google_Pixel_Master.mov',
      version: 8,
      status: VideoStatus.APPROVED,
      duration: 60,
      resolution: '4096x2160',
      size: 4200000000,
      uploader: mikeUser,
      uploadTime: new Date('2024-10-30'),
      isCaseFile: true,
      isMainDelivery: true,
    },
    {
      project: allProjects.find(p => p.name === '2409_Meta_Quest_3_Launch'),
      name: 'v10_Meta_Quest_Master.mov',
      version: 10,
      status: VideoStatus.APPROVED,
      duration: 90,
      resolution: '4096x2160',
      size: 5400000000,
      uploader: sarahUser,
      uploadTime: new Date('2024-09-28'),
      isCaseFile: true,
      isMainDelivery: true,
    },
    {
      project: allProjects.find(p => p.name === '2408_Amazon_Prime_Day'),
      name: 'v6_Amazon_Prime.mp4',
      version: 6,
      status: VideoStatus.ANNOTATED,
      duration: 45,
      resolution: '1920x1080',
      size: 1350000000,
      uploader: alexUser,
      uploadTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      project: allProjects.find(p => p.name === '2407_Disney_Plus_Original'),
      name: 'v12_Disney_Original.mp4',
      version: 12,
      status: VideoStatus.INITIAL,
      duration: 1800,
      resolution: '1920x1080',
      size: 5400000000,
      uploader: sarahUser,
      uploadTime: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const videoInfo of videoData) {
    if (videoInfo.project && !videoNames.includes(videoInfo.name)) {
      newVideos.push(videoRepository.create({
        project_id: videoInfo.project.id,
        name: videoInfo.name,
        original_filename: videoInfo.name.replace(/^v\d+_/, ''),
        base_name: videoInfo.name.replace(/^v\d+_/, ''),
        version: videoInfo.version,
        type: 'video' as any,
        storage_url: `https://example.com/videos/${videoInfo.name}`,
        storage_key: `videos/${videoInfo.name}`,
        thumbnail_url: `https://picsum.photos/seed/${videoInfo.name}/400/225`,
        size: videoInfo.size,
        duration: videoInfo.duration,
        resolution: videoInfo.resolution,
        aspect_ratio: AspectRatio.LANDSCAPE,
        status: videoInfo.status,
        change_log: `版本 ${videoInfo.version} 更新`,
        is_case_file: videoInfo.isCaseFile || false,
        is_main_delivery: videoInfo.isMainDelivery || false,
        uploader_id: videoInfo.uploader.id,
        upload_time: videoInfo.uploadTime,
      }));
    }
  }

  let savedNewVideos = [];
  if (newVideos.length > 0) {
    savedNewVideos = await videoRepository.save(newVideos);
    console.log(`✓ 创建了 ${savedNewVideos.length} 个新视频`);
  }

  // 6. 为视频添加标签关联
  const existingVideoTags = await videoTagRepository.find();
  const newVideoTags = [];

  for (const video of savedNewVideos) {
    // 每个视频随机添加2-4个标签
    const randomTags = allTags.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 3) + 2);
    for (const tag of randomTags) {
      const tagExists = existingVideoTags.some(
        vt => vt.video_id === video.id && vt.tag_id === tag.id
      );
      if (!tagExists) {
        newVideoTags.push(videoTagRepository.create({
          video_id: video.id,
          tag_id: tag.id,
        }));
      }
    }
  }

  // 也为现有视频添加更多标签
  const existingVideosList = await videoRepository.find();
  for (const video of existingVideosList.slice(0, 3)) {
    const randomTags = allTags.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 2) + 1);
    for (const tag of randomTags) {
      const tagExists = existingVideoTags.some(
        vt => vt.video_id === video.id && vt.tag_id === tag.id
      );
      if (!tagExists) {
        newVideoTags.push(videoTagRepository.create({
          video_id: video.id,
          tag_id: tag.id,
        }));
      }
    }
  }

  if (newVideoTags.length > 0) {
    await videoTagRepository.save(newVideoTags);
    console.log(`✓ 创建了 ${newVideoTags.length} 个新视频标签关联`);
  }

  // 7. 创建更多交付记录
  const finalizedProjects = allProjects.filter(p => p.status === ProjectStatus.FINALIZED || p.status === ProjectStatus.DELIVERED);
  const existingDeliveries = await deliveryRepository.find();
  const deliveredProjectIds = existingDeliveries.map(d => d.project_id);

  const newDeliveries = [];
  for (const project of finalizedProjects) {
    if (!deliveredProjectIds.includes(project.id)) {
      newDeliveries.push(deliveryRepository.create({
        project_id: project.id,
        has_clean_feed: Math.random() > 0.5,
        has_multi_resolution: Math.random() > 0.5,
        has_script: Math.random() > 0.5,
        has_copyright_files: Math.random() > 0.5,
        has_tech_review: project.status === ProjectStatus.DELIVERED,
        has_copyright_check: project.status === ProjectStatus.DELIVERED,
        has_metadata: true,
        delivery_note: project.status === ProjectStatus.DELIVERED ? '已完成交付' : '待完善交付信息',
        completed_at: project.status === ProjectStatus.DELIVERED ? project.delivered_at : null,
      }));
    }
  }

  let savedNewDeliveries = [];
  if (newDeliveries.length > 0) {
    savedNewDeliveries = await deliveryRepository.save(newDeliveries);
    console.log(`✓ 创建了 ${savedNewDeliveries.length} 个新交付记录`);
  }

  // 8. 创建更多通知
  const existingNotifications = await notificationRepository.find();
  const newNotifications = [];

  // 为最近上传的视频创建通知
  const recentVideos = savedNewVideos.slice(0, 3);
  for (const video of recentVideos) {
    const project = allProjects.find(p => p.id === video.project_id);
    if (project) {
      const projectMembers = await memberRepository.find({ where: { project_id: project.id } });
      for (const member of projectMembers) {
        newNotifications.push(notificationRepository.create({
          user_id: member.user_id,
          type: NotificationType.SUCCESS,
          title: '新视频上传',
          message: `${video.name} 已上传到项目 ${project.name}`,
          related_type: 'video',
          related_id: video.id,
          is_read: false,
        }));
      }
    }
  }

  if (newNotifications.length > 0) {
    await notificationRepository.save(newNotifications);
    console.log(`✓ 创建了 ${newNotifications.length} 个新通知`);
  }

  console.log('✓ 扩展种子数据注入完成！');
}

