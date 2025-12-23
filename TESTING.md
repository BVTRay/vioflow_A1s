# 测试指南

本文档说明如何运行项目的各种测试。

## 后端测试

### 运行单元测试

```bash
cd backend
npm test
```

### 运行测试并生成覆盖率报告

```bash
cd backend
npm run test:cov
```

### 运行 E2E 测试

```bash
cd backend
npm run test:e2e
```

### 测试文件位置

- 单元测试：`backend/src/**/*.spec.ts`
- E2E 测试：`backend/test/**/*.e2e-spec.ts`

## 前端测试

### 运行单元测试

```bash
npm test
```

### 运行测试并生成覆盖率报告

```bash
npm run test:coverage
```

### 运行测试 UI

```bash
npm run test:ui
```

### 测试文件位置

- 单元测试：`src/**/*.test.tsx` 或 `src/**/*.test.ts`
- 测试配置：`vite.config.ts`

## E2E 测试（Playwright）

### 安装依赖

```bash
npm install
npx playwright install
```

### 运行 E2E 测试

```bash
npm run test:e2e
```

### 运行 E2E 测试 UI

```bash
npm run test:e2e:ui
```

### 测试文件位置

- E2E 测试：`e2e/**/*.spec.ts`
- 配置文件：`playwright.config.ts`

### 注意事项

1. 运行 E2E 测试前，确保后端服务正在运行（默认端口 3002）
2. 前端开发服务器会自动启动（默认端口 3009）
3. 测试使用测试数据库，不会影响生产数据

## CI/CD

GitHub Actions 会自动运行以下测试：

1. **后端测试**：单元测试 + 覆盖率
2. **前端测试**：单元测试 + 构建
3. **E2E 测试**：Playwright 端到端测试
4. **安全扫描**：npm audit

查看 `.github/workflows/ci.yml` 了解详细配置。

## 测试覆盖率目标

- 后端核心服务：> 60%
- 前端关键组件：> 50%
- E2E 关键流程：100% 覆盖

## 编写新测试

### 后端测试示例

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { YourService } from './your.service';

describe('YourService', () => {
  let service: YourService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [YourService],
    }).compile();

    service = module.get<YourService>(YourService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

### 前端测试示例

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { YourComponent } from './YourComponent';

describe('YourComponent', () => {
  it('should render', () => {
    render(<YourComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### E2E 测试示例

```typescript
import { test, expect } from '@playwright/test';

test('should navigate to home page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Vioflow/);
});
```


