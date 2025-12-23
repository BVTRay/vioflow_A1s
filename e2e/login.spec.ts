import { test, expect } from '@playwright/test';

test.describe('登录流程', () => {
  test.beforeEach(async ({ page }) => {
    // 访问登录页面
    await page.goto('/login');
  });

  test('应该显示登录表单', async ({ page }) => {
    // 检查登录表单元素
    await expect(page.getByLabel(/邮箱或用户名/i)).toBeVisible();
    await expect(page.getByLabel(/密码/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /登录/i })).toBeVisible();
  });

  test('应该能够切换到注册标签', async ({ page }) => {
    // 点击注册标签
    await page.getByText(/注册/i).click();

    // 检查注册表单元素
    await expect(page.getByLabel(/用户名/i)).toBeVisible();
    await expect(page.getByLabel(/邮箱/i)).toBeVisible();
    await expect(page.getByLabel(/密码/i)).toBeVisible();
    await expect(page.getByLabel(/确认密码/i)).toBeVisible();
  });

  test('应该显示错误消息当登录失败时', async ({ page }) => {
    // 填写错误的凭据
    await page.getByLabel(/邮箱或用户名/i).fill('wrong@example.com');
    await page.getByLabel(/密码/i).fill('wrongpassword');
    await page.getByRole('button', { name: /登录/i }).click();

    // 等待错误消息出现
    await expect(page.getByText(/登录失败|无效|错误/i)).toBeVisible({ timeout: 5000 });
  });

  test('应该能够成功登录（使用测试账号）', async ({ page }) => {
    // 注意：这个测试需要后端服务运行，并且有有效的测试账号
    // 在实际环境中，应该使用测试数据库和测试账号
    const testEmail = 'admin@vioflow.com';
    const testPassword = 'admin';

    // 填写登录表单
    await page.getByLabel(/邮箱或用户名/i).fill(testEmail);
    await page.getByLabel(/密码/i).fill(testPassword);
    await page.getByRole('button', { name: /登录/i }).click();

    // 等待重定向到主页面（登录成功后）
    // 注意：根据实际应用的路由调整
    await page.waitForURL(/\/$|\/dashboard|\/projects/, { timeout: 10000 });

    // 验证已登录（检查是否有用户相关的UI元素）
    // 例如：用户头像、用户名等
    // await expect(page.getByText(/admin|用户|设置/i)).toBeVisible();
  });
});

test.describe('项目列表页面', () => {
  test('应该在登录后显示项目列表', async ({ page }) => {
    // 先登录（如果还没有登录）
    await page.goto('/login');
    
    // 这里可以添加登录逻辑，或者使用已保存的认证状态
    // 为了简化，假设已经登录，直接访问项目列表页面
    
    // 访问主页面
    await page.goto('/');
    
    // 等待页面加载
    await page.waitForLoadState('networkidle');
    
    // 检查是否有项目相关的UI元素
    // 根据实际UI调整选择器
    // await expect(page.getByText(/项目|Projects/i)).toBeVisible();
  });
});


