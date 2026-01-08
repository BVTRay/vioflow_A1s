module.exports = {
    apps: [
      {
        name: "vioflow",           // 应用名称，跟我们命令里保持一致
        script: "./dist/main.js",  // NestJS 编译后的启动文件路径
        instances: 1,              // 启动 1 个实例
        autorestart: true,         // 崩溃后自动重启
        watch: false,              // 生产环境不需要监控文件变动
        max_memory_restart: "1G",  // 内存占用超过 1G 自动重启（防止内存泄漏）
        env: {
          NODE_ENV: "production",
          PORT: 3002               // 你的服务端口
        }
      }
    ]
  };