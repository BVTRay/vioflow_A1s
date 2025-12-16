# FFmpeg 安装指南

## 为什么需要 FFmpeg？

FFmpeg 用于从视频文件中提取帧并生成缩略图。系统会在视频上传后自动生成预览图。

## 安装方法

### Ubuntu/Debian

```bash
sudo apt-get update
sudo apt-get install -y ffmpeg
```

### CentOS/RHEL

```bash
sudo yum install -y ffmpeg
# 或者对于较新版本
sudo dnf install -y ffmpeg
```

### macOS

```bash
brew install ffmpeg
```

### 验证安装

安装完成后，运行以下命令验证：

```bash
ffmpeg -version
```

应该能看到 FFmpeg 的版本信息。

## 如果无法安装 FFmpeg

如果您的服务器环境无法安装 FFmpeg，系统仍然可以正常工作，只是不会自动生成视频缩略图。您可以：

1. 手动上传缩略图
2. 使用其他方式生成缩略图后上传
3. 系统会使用占位图片作为预览图

## 故障排除

### 错误：ffmpeg not found

如果看到此错误，说明 FFmpeg 未安装或不在系统 PATH 中。

**解决方案：**
1. 安装 FFmpeg（见上方安装方法）
2. 确保 FFmpeg 在系统 PATH 中
3. 重启后端服务

### 错误：无法生成缩略图

可能的原因：
1. FFmpeg 未正确安装
2. 视频文件格式不支持
3. 视频文件损坏

**解决方案：**
1. 检查 FFmpeg 是否正确安装：`ffmpeg -version`
2. 检查视频文件是否完整
3. 查看后端日志获取详细错误信息

## 性能考虑

- 缩略图生成是异步进行的，不会阻塞视频上传
- 如果缩略图生成失败，视频上传仍然会成功
- 生成的缩略图大小约为 400px 宽度，文件大小通常 < 100KB



