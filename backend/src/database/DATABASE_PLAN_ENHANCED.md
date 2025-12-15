# 数据库规划方案（完善版）

## 一、方案概述

### 1.1 方案目标
完善Vioflow MAM系统的数据库结构，支持完整的团队管理、权限控制、项目组管理和存储统计功能，确保所有业务需求都能通过数据库结构实现。

### 1.2 方案范围
- 新增5个核心表（teams, team_members, project_groups, audit_logs, storage_usage）
- 修改3个现有表（users, projects, share_links）
- 新增2个枚举类型（team_role_enum, member_status_enum）
- 创建数据迁移脚本
- 创建自动维护触发器
- 完善索引和约束

### 1.3 方案价值
- ✅ 支持多团队协作
- ✅ 细粒度权限控制
- ✅ 完整的审计追踪
- ✅ 自动化的存储统计
- ✅ 数据完整性保障

## 二、详细设计

### 2.1 团队管理模块

#### 2.1.1 teams表设计
```sql
CREATE TABLE "teams" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(100) NOT NULL,
  "code" varchar(12) UNIQUE NOT NULL,  -- 8-12位字母数字，用于邀请
  "description" text,
  "created_by" uuid NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
```

**设计要点：**
- `code`字段用于团队邀请，需要保证唯一性和可读性
- 建议使用大写字母+数字组合，便于用户输入
- 需要应用层实现编码生成算法，确保唯一性

**业务规则：**
- 团队编码一旦创建不可修改
- 删除团队需要先处理所有关联数据
- 团队创建者自动成为超级管理员

#### 2.1.2 team_members表设计
```sql
CREATE TABLE "team_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "team_id" uuid NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" "team_role_enum" NOT NULL DEFAULT 'member',
  "status" "member_status_enum" DEFAULT 'active',
  "invited_by" uuid REFERENCES "users"("id"),
  "joined_at" timestamp DEFAULT now(),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  UNIQUE("team_id", "user_id")
);
```

**权限矩阵：**
| 操作 | super_admin | admin | member |
|------|-------------|-------|--------|
| 删除团队 | ✅ | ❌ | ❌ |
| 修改团队信息 | ✅ | ❌ | ❌ |
| 管理成员 | ✅ | ✅ | ❌ |
| 管理项目组 | ✅ | ✅ | ❌ |
| 管理标签 | ✅ | ✅ | ❌ |
| 查看存储空间 | ✅ | ✅ | ✅ |
| 创建项目 | ✅ | ✅ | ✅ |
| 上传视频 | ✅ | ✅ | ✅ |

**业务规则：**
- 每个团队至少需要一个超级管理员
- 超级管理员不能删除自己（最后一个超级管理员）
- 成员状态变更需要记录到audit_logs

### 2.2 项目组管理模块

#### 2.2.1 project_groups表设计
```sql
CREATE TABLE "project_groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "team_id" uuid NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
  "name" varchar(100) NOT NULL,
  "description" text,
  "icon" varchar(50),  -- 图标标识，用于UI显示
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  UNIQUE("team_id", "name")
);
```

**设计要点：**
- 项目组是团队级别的，不同团队可以有同名项目组
- `icon`字段存储图标标识符，前端根据标识符显示对应图标
- 删除项目组时，项目自动移动到"未分类"组

**迁移策略：**
1. 为每个团队的所有唯一项目组名称创建project_groups记录
2. 更新projects表的group_id字段
3. 保留projects.group字段作为冗余，用于兼容旧代码
4. 逐步迁移后，可考虑删除projects.group字段

### 2.3 审计日志模块

#### 2.3.1 audit_logs表设计
```sql
CREATE TABLE "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "team_id" uuid REFERENCES "teams"("id"),
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "action" varchar(50) NOT NULL,  -- 'create', 'update', 'delete', 'permission_change'
  "resource_type" varchar(50) NOT NULL,  -- 'project', 'video', 'delivery', 'team_member'
  "resource_id" uuid,
  "old_value" jsonb,
  "new_value" jsonb,
  "ip_address" varchar(45),
  "user_agent" varchar(500),
  "created_at" timestamp DEFAULT now()
);
```

**记录范围：**
- 权限变更（角色变更、成员加入/移除）
- 敏感操作（删除项目、删除团队）
- 重要数据修改（项目状态变更、交付完成）

**性能考虑：**
- 使用分区表（按月分区）提高查询性能
- 定期归档旧日志（建议保留6个月）
- 使用异步写入减少对主业务的影响

### 2.4 存储空间统计模块

#### 2.4.1 storage_usage表设计
```sql
CREATE TABLE "storage_usage" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "team_id" uuid NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
  "total_size" bigint DEFAULT 0,
  "standard_size" bigint DEFAULT 0,
  "cold_size" bigint DEFAULT 0,
  "file_count" integer DEFAULT 0,
  "updated_at" timestamp DEFAULT now(),
  UNIQUE("team_id")
);
```

**统计范围：**
- videos表的所有文件
- delivery_files表的所有文件
- 区分标准存储和冷存储

**更新机制：**
- 通过触发器自动更新（实时）
- 定期校验脚本（每日一次，修正误差）
- 支持手动重新计算

## 三、实施计划

### 3.1 阶段划分

#### 阶段1：数据库结构准备（1-2天）
**目标：** 创建所有新表和修改现有表

**任务清单：**
- [ ] 创建枚举类型
- [ ] 创建teams表
- [ ] 创建team_members表
- [ ] 创建project_groups表
- [ ] 创建audit_logs表
- [ ] 创建storage_usage表
- [ ] 修改users表（添加字段）
- [ ] 修改projects表（添加字段）
- [ ] 修改share_links表（添加字段）
- [ ] 创建所有索引

**验收标准：**
- 所有表结构创建成功
- 所有索引创建成功
- 外键约束正确
- 可以正常查询新表

#### 阶段2：数据迁移（1天）
**目标：** 将现有数据迁移到新结构

**任务清单：**
- [ ] 为现有用户创建默认团队
- [ ] 为现有项目关联团队
- [ ] 迁移项目组数据
- [ ] 初始化存储空间统计
- [ ] 验证数据迁移完整性

**验收标准：**
- 所有用户都有团队关联
- 所有项目都有团队关联
- 项目组数据迁移完整
- 存储统计准确

#### 阶段3：自动化功能（1天）
**目标：** 创建触发器和约束

**任务清单：**
- [ ] 创建存储空间更新触发器
- [ ] 创建业务规则约束
- [ ] 测试触发器功能
- [ ] 测试约束有效性

**验收标准：**
- 触发器正常工作
- 约束正确执行
- 性能影响可接受

#### 阶段4：后端代码更新（3-5天）
**目标：** 更新后端代码以支持新功能

**任务清单：**
- [ ] 更新实体类（Entity）
- [ ] 更新DTO类
- [ ] 创建团队管理服务
- [ ] 创建权限验证中间件
- [ ] 更新项目服务（支持团队）
- [ ] 更新API接口
- [ ] 添加审计日志记录

**验收标准：**
- 所有新功能API可用
- 权限控制正确
- 数据查询正确
- 单元测试通过

#### 阶段5：前端代码更新（3-5天）
**目标：** 更新前端代码以支持新功能

**任务清单：**
- [ ] 更新用户界面（团队管理）
- [ ] 更新权限控制逻辑
- [ ] 更新项目组管理界面
- [ ] 更新存储空间显示
- [ ] 更新设置页面

**验收标准：**
- UI功能完整
- 权限控制正确
- 用户体验良好
- 响应式设计正常

#### 阶段6：测试验证（2-3天）
**目标：** 全面测试新功能

**任务清单：**
- [ ] 功能测试
- [ ] 权限测试
- [ ] 数据完整性测试
- [ ] 性能测试
- [ ] 安全测试

**验收标准：**
- 所有测试用例通过
- 性能指标达标
- 无安全漏洞

### 3.2 时间估算

| 阶段 | 预计时间 | 关键路径 |
|------|----------|----------|
| 阶段1：数据库结构准备 | 1-2天 | ✅ |
| 阶段2：数据迁移 | 1天 | ✅ |
| 阶段3：自动化功能 | 1天 | ✅ |
| 阶段4：后端代码更新 | 3-5天 | ✅ |
| 阶段5：前端代码更新 | 3-5天 | - |
| 阶段6：测试验证 | 2-3天 | ✅ |
| **总计** | **11-17天** | |

### 3.3 资源需求

**人员：**
- 数据库管理员：1人（阶段1-3）
- 后端开发：1-2人（阶段4）
- 前端开发：1-2人（阶段5）
- 测试工程师：1人（阶段6）

**环境：**
- 开发环境：用于开发和测试
- 测试环境：用于完整测试
- 生产环境：用于最终部署

## 四、风险评估与应对

### 4.1 技术风险

#### 风险1：数据迁移失败
**风险等级：** 高
**影响：** 数据丢失或不一致
**应对措施：**
- 迁移前完整备份数据库
- 在测试环境先验证迁移脚本
- 准备回滚方案
- 分批次迁移，每批次后验证

#### 风险2：性能下降
**风险等级：** 中
**影响：** 查询变慢，用户体验下降
**应对措施：**
- 所有外键字段创建索引
- 使用复合索引优化常用查询
- 监控查询性能
- 必要时优化查询语句

#### 风险3：触发器性能问题
**风险等级：** 低
**影响：** 写入操作变慢
**应对措施：**
- 触发器逻辑尽量简单
- 使用批量操作减少触发器执行次数
- 监控触发器执行时间
- 必要时改为异步处理

### 4.2 业务风险

#### 风险1：权限控制漏洞
**风险等级：** 高
**影响：** 数据泄露或误操作
**应对措施：**
- 完整的权限矩阵设计
- 所有敏感操作都进行权限验证
- 记录所有权限变更到审计日志
- 定期审计权限配置

#### 风险2：团队数据隔离问题
**风险等级：** 中
**影响：** 团队间数据泄露
**应对措施：**
- 所有查询都添加团队过滤条件
- 使用中间件统一处理团队过滤
- 测试跨团队访问场景
- 定期检查数据隔离

### 4.3 运维风险

#### 风险1：存储统计不准确
**风险等级：** 低
**影响：** 存储使用情况显示错误
**应对措施：**
- 触发器自动更新
- 定期校验脚本修正误差
- 支持手动重新计算
- 监控统计数据变化

## 五、测试计划

### 5.1 单元测试

**测试范围：**
- 数据模型验证
- 业务逻辑验证
- 权限验证逻辑

**测试用例示例：**
```typescript
describe('TeamService', () => {
  it('should create team with unique code', async () => {
    // 测试团队创建
  });
  
  it('should prevent duplicate team codes', async () => {
    // 测试团队编码唯一性
  });
  
  it('should assign super_admin role to creator', async () => {
    // 测试创建者权限
  });
});
```

### 5.2 集成测试

**测试范围：**
- API接口测试
- 数据库操作测试
- 权限控制测试

**测试场景：**
1. 创建团队 → 添加成员 → 创建项目
2. 权限变更 → 验证权限 → 记录审计日志
3. 上传视频 → 更新存储统计 → 验证统计准确

### 5.3 性能测试

**测试指标：**
- 查询响应时间 < 100ms（权限验证）
- 查询响应时间 < 500ms（列表查询）
- 触发器执行时间 < 10ms
- 并发用户数 > 100

**测试工具：**
- PostgreSQL EXPLAIN ANALYZE
- Apache JMeter
- 自定义性能测试脚本

### 5.4 安全测试

**测试范围：**
- SQL注入防护
- 权限越权测试
- 数据隔离测试
- 敏感信息泄露测试

## 六、后续开发建议

### 6.1 API设计建议

#### 团队管理API
```
POST   /api/teams                    # 创建团队
GET    /api/teams                    # 获取团队列表
GET    /api/teams/:id                # 获取团队详情
PUT    /api/teams/:id                # 更新团队信息
DELETE /api/teams/:id                # 删除团队
POST   /api/teams/:id/members        # 添加成员
GET    /api/teams/:id/members        # 获取成员列表
PUT    /api/teams/:id/members/:userId # 更新成员角色
DELETE /api/teams/:id/members/:userId # 移除成员
```

#### 项目组管理API
```
POST   /api/project-groups            # 创建项目组
GET    /api/project-groups            # 获取项目组列表
PUT    /api/project-groups/:id        # 更新项目组
DELETE /api/project-groups/:id        # 删除项目组
```

#### 存储统计API
```
GET    /api/storage/usage             # 获取存储使用情况
POST   /api/storage/recalculate       # 重新计算存储统计
```

### 6.2 前端集成建议

#### 权限控制组件
```typescript
// 权限检查Hook
const usePermission = (permission: string) => {
  const { user, team } = useAuth();
  // 检查用户是否有权限
  return checkPermission(user, team, permission);
};

// 权限保护组件
<PermissionGuard permission="manage_members">
  <MemberManagement />
</PermissionGuard>
```

#### 团队选择器
```typescript
// 团队切换组件
<TeamSelector 
  teams={userTeams}
  currentTeam={currentTeam}
  onTeamChange={handleTeamChange}
/>
```

### 6.3 监控建议

#### 关键指标监控
- 团队数量增长趋势
- 存储使用增长趋势
- 权限变更频率
- 审计日志生成量
- 查询性能指标

#### 告警规则
- 存储使用超过80% → 发送告警
- 权限变更异常频繁 → 发送告警
- 查询响应时间超过阈值 → 发送告警

## 七、最佳实践

### 7.1 数据库设计
- ✅ 使用UUID作为主键，避免ID冲突
- ✅ 所有外键都创建索引
- ✅ 使用枚举类型保证数据一致性
- ✅ 使用触发器自动维护统计数据
- ✅ 使用约束保证数据完整性

### 7.2 代码开发
- ✅ 所有数据库操作都通过ORM
- ✅ 所有权限检查都通过中间件
- ✅ 所有敏感操作都记录审计日志
- ✅ 使用事务保证数据一致性
- ✅ 使用缓存减少数据库查询

### 7.3 安全实践
- ✅ 所有API都进行权限验证
- ✅ 所有查询都添加团队过滤
- ✅ 敏感信息不记录在日志中
- ✅ 定期审计权限配置
- ✅ 使用参数化查询防止SQL注入

## 八、总结

### 8.1 方案优势
- ✅ 完整的功能覆盖
- ✅ 清晰的权限体系
- ✅ 完善的审计追踪
- ✅ 自动化的统计维护
- ✅ 良好的扩展性

### 8.2 实施建议
1. **分阶段实施**：按照计划分阶段实施，降低风险
2. **充分测试**：每个阶段都要充分测试，确保质量
3. **及时沟通**：团队成员及时沟通，避免理解偏差
4. **文档完善**：及时更新文档，便于后续维护

### 8.3 成功标准
- ✅ 所有功能需求实现
- ✅ 所有测试用例通过
- ✅ 性能指标达标
- ✅ 无安全漏洞
- ✅ 文档完整


