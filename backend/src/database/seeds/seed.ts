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

  console.log('开始注入种子数据...');

  // 1. 创建用户
  const adminPassword = await bcrypt.hash('admin', 10);
  const users = [
    userRepository.create({
      email: 'admin@vioflow.com',
      name: 'admin',
      password_hash: adminPassword,
      role: UserRole.ADMIN,
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    }),
    userRepository.create({
      email: 'sarah@vioflow.com',
      name: 'Sarah D.',
      password_hash: adminPassword,
      role: UserRole.MEMBER,
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
    }),
    userRepository.create({
      email: 'mike@vioflow.com',
      name: 'Mike',
      password_hash: adminPassword,
      role: UserRole.MEMBER,
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mike',
    }),
    userRepository.create({
      email: 'alex@vioflow.com',
      name: 'Alex',
      password_hash: adminPassword,
      role: UserRole.MEMBER,
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
    }),
    userRepository.create({
      email: 'sales@vioflow.com',
      name: '销售负责人',
      password_hash: adminPassword,
      role: UserRole.SALES,
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sales',
    }),
  ];
  const savedUsers = await userRepository.save(users);
  console.log(`✓ 创建了 ${savedUsers.length} 个用户`);

  // 2. 创建标签
  const tags = [
    tagRepository.create({ name: 'AI生成', usage_count: 5 }),
    tagRepository.create({ name: '三维制作', usage_count: 8 }),
    tagRepository.create({ name: '病毒广告', usage_count: 3 }),
    tagRepository.create({ name: '剧情', usage_count: 6 }),
    tagRepository.create({ name: '纪录片', usage_count: 4 }),
    tagRepository.create({ name: '广告片', usage_count: 10 }),
    tagRepository.create({ name: '社交媒体', usage_count: 7 }),
    tagRepository.create({ name: '品牌宣传', usage_count: 9 }),
  ];
  const savedTags = await tagRepository.save(tags);
  console.log(`✓ 创建了 ${savedTags.length} 个标签`);

  // 3. 创建项目
  const now = new Date();
  const projects = [
    projectRepository.create({
      name: '2412_Nike_AirMax_Holiday',
      client: 'Nike',
      lead: 'Sarah D.',
      post_lead: 'Mike',
      group: '广告片',
      status: ProjectStatus.ACTIVE,
      created_date: new Date('2024-12-01'),
      last_activity_at: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2小时前
      last_opened_at: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1小时前
    }),
    projectRepository.create({
      name: '2501_Spotify_Wrapped_Asia',
      client: 'Spotify',
      lead: 'Alex',
      post_lead: 'Jen',
      group: '社交媒体',
      status: ProjectStatus.ACTIVE,
      created_date: new Date('2025-01-10'),
      last_activity_at: new Date(now.getTime() - 5 * 60 * 60 * 1000), // 5小时前
      last_opened_at: new Date(now.getTime() - 3 * 60 * 60 * 1000), // 3小时前
    }),
    projectRepository.create({
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
    }),
    projectRepository.create({
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
    }),
    projectRepository.create({
      name: '2409_Apple_Event_Launch',
      client: 'Apple',
      lead: 'Sarah D.',
      post_lead: 'Mike',
      group: '广告片',
      status: ProjectStatus.ACTIVE,
      created_date: new Date('2024-09-15'),
      last_activity_at: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1天前
      last_opened_at: new Date(now.getTime() - 12 * 60 * 60 * 1000), // 12小时前
    }),
  ];
  const savedProjects = await projectRepository.save(projects);
  console.log(`✓ 创建了 ${savedProjects.length} 个项目`);

  // 4. 创建项目成员
  const members = [
    memberRepository.create({
      project_id: savedProjects[0].id,
      user_id: savedUsers[1].id, // Sarah
      role: MemberRole.OWNER,
    }),
    memberRepository.create({
      project_id: savedProjects[0].id,
      user_id: savedUsers[2].id, // Mike
      role: MemberRole.MEMBER,
    }),
    memberRepository.create({
      project_id: savedProjects[1].id,
      user_id: savedUsers[3].id, // Alex
      role: MemberRole.OWNER,
    }),
  ];
  await memberRepository.save(members);
  console.log(`✓ 创建了项目成员关系`);

  // 5. 创建视频
  const videos = [
    videoRepository.create({
      project_id: savedProjects[0].id,
      name: 'v4_Nike_AirMax.mp4',
      original_filename: 'Nike_AirMax.mp4',
      base_name: 'Nike_AirMax.mp4',
      version: 4,
      type: 'video' as any,
      storage_url: 'https://example.com/videos/v4_Nike_AirMax.mp4',
      storage_key: 'videos/v4_Nike_AirMax.mp4',
      thumbnail_url: 'https://picsum.photos/seed/nike1/400/225',
      size: 2400000000, // 2.4 GB
      duration: 90, // 90秒
      resolution: '3840x2160',
      aspect_ratio: AspectRatio.LANDSCAPE,
      status: VideoStatus.INITIAL,
      change_log: '调整了结尾Logo的入场动画',
      is_case_file: false,
      is_main_delivery: false,
      uploader_id: savedUsers[1].id,
      upload_time: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    }),
    videoRepository.create({
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
    }),
    videoRepository.create({
      project_id: savedProjects[3].id,
      name: 'v12_Porsche_Launch_Master.mov',
      original_filename: 'Porsche_Launch_Master.mov',
      base_name: 'Porsche_Launch_Master.mov',
      version: 12,
      type: 'video' as any,
      storage_url: 'https://example.com/videos/v12_Porsche_Launch_Master.mov',
      storage_key: 'videos/v12_Porsche_Launch_Master.mov',
      thumbnail_url: 'https://picsum.photos/seed/porsche/400/225',
      size: 42000000000, // 42 GB
      duration: 60,
      resolution: '4096x2160',
      aspect_ratio: AspectRatio.LANDSCAPE,
      status: VideoStatus.APPROVED,
      change_log: '最终定版',
      is_case_file: true,
      is_main_delivery: true,
      uploader_id: savedUsers[1].id,
      upload_time: new Date('2024-10-25'),
    }),
    videoRepository.create({
      project_id: savedProjects[2].id,
      name: 'v8_Netflix_Ep1_Lock.mp4',
      original_filename: 'Netflix_Ep1_Lock.mp4',
      base_name: 'Netflix_Ep1_Lock.mp4',
      version: 8,
      type: 'video' as any,
      storage_url: 'https://example.com/videos/v8_Netflix_Ep1_Lock.mp4',
      storage_key: 'videos/v8_Netflix_Ep1_Lock.mp4',
      thumbnail_url: 'https://picsum.photos/seed/netflix/400/225',
      size: 1800000000, // 1.8 GB
      duration: 2700, // 45分钟
      resolution: '1920x1080',
      aspect_ratio: AspectRatio.LANDSCAPE,
      status: VideoStatus.INITIAL,
      change_log: '粗剪定版',
      is_case_file: false,
      is_main_delivery: false,
      uploader_id: savedUsers[1].id,
      upload_time: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    }),
  ];
  const savedVideos = await videoRepository.save(videos);
  console.log(`✓ 创建了 ${savedVideos.length} 个视频`);

  // 6. 创建视频标签关联
  const videoTags = [
    videoTagRepository.create({
      video_id: savedVideos[2].id, // Porsche视频
      tag_id: savedTags[1].id, // 三维制作
    }),
    videoTagRepository.create({
      video_id: savedVideos[2].id,
      tag_id: savedTags[4].id, // 广告片
    }),
  ];
  await videoTagRepository.save(videoTags);
  console.log(`✓ 创建了视频标签关联`);

  // 7. 创建交付数据
  const deliveries = [
    deliveryRepository.create({
      project_id: savedProjects[2].id, // Netflix项目
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
    }),
  ];
  const savedDeliveries = await deliveryRepository.save(deliveries);
  console.log(`✓ 创建了 ${savedDeliveries.length} 个交付记录`);

  // 8. 为已完成的交付创建文件夹结构
  const folders = [
    folderRepository.create({
      delivery_id: savedDeliveries[1].id,
      folder_type: FolderType.MASTER,
      storage_path: `deliveries/${savedProjects[3].id}/master`,
    }),
    folderRepository.create({
      delivery_id: savedDeliveries[1].id,
      folder_type: FolderType.VARIANTS,
      storage_path: `deliveries/${savedProjects[3].id}/variants`,
    }),
    folderRepository.create({
      delivery_id: savedDeliveries[1].id,
      folder_type: FolderType.CLEAN_FEED,
      storage_path: `deliveries/${savedProjects[3].id}/clean_feed`,
    }),
    folderRepository.create({
      delivery_id: savedDeliveries[1].id,
      folder_type: FolderType.DOCS,
      storage_path: `deliveries/${savedProjects[3].id}/docs`,
    }),
  ];
  await folderRepository.save(folders);
  console.log(`✓ 创建了交付文件夹结构`);

  // 9. 创建通知
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

  console.log('✓ 种子数据注入完成！');
  console.log('\n测试账号:');
  console.log('  管理员: admin@vioflow.com / admin');
  console.log('  成员: sarah@vioflow.com / admin');
}

