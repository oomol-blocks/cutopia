<div align=center>
  <h1>Cutopia</h1>
  <p>中文 | <a href="./README.md">English</a></p>
</div>

基于 OOMOL Blocks 构建的视频处理解决方案，使用 `FFmpeg` 媒体分析和格式转换功能。

## 📈 使用场景

### 内容创作工作流
- **多格式发布** - 一次转换，到处分发
- **质量优化** - 在保持画质的同时减小文件大小
- **元数据管理** - 保留或自定义视频元数据

### 专业视频处理
- **格式标准化** - 确保项目间输出的一致性
- **存档转换** - 将老格式迁移到现代标准
- **交付优化** - 针对不同平台和设备优化

## 📦 模块架构

本项目包含多个模块，相互配合使用：

### 1. **get-media-info** - 媒体分析模块
使用 FFprobe 分析视频文件，提取详细的元数据信息。

```ts
export interface IMediaInfo {
    path: string;                    // 输入文件路径
    dimensions: {
        width: number;
        height: number;
    }                                // 视频尺寸
    size: number;                    // 文件大小
    containerFormat: string;         // 容器格式
    videoCodec?: string;             // 视频编解码器
    audioCodec?: string;             // 音频编解码器
    bitrateMbps?: number;            // 比特率（以兆比特每秒为单位）
}
```

### 2. `convert-to-${container}` - 格式转换模块

目前支持转换为 **MP4** (.mp4)、**QuickTime** (.mov)、**WebM** (.webm)、**Matroska** (.mkv)、**Windows Media** (.wmv) 格式。

## 🚀 快速上手

### 第一步：分析媒体文件
```typescript
// 输入
{
  mediaPath: "/path/to/video.mp4"
}

// 输出
{
  mediaInfo: {
    path: string,
    dimensions: { width: number, height: number },
    size: number,
    containerFormat: string,
    videoCodec: string,
    audioCodec: string,
    bitrateMbps: number
  }
}
```

### 第二步：转换视频
```typescript
// 输入
{
  mediaInfo: /* 来自第一步的结果 */,
  outputDir?: string,          // 可选的输出目录
  // 高级用户还有更多选项可用
}

// 输出
{
  mediaPath: string  // 转换后文件的路径
}
```

## 🎛️ 高级配置

### 质量预设
系统会根据内容分析自动选择最佳的质量设置：

- **超高质量** (4K 60fps)：CRF 18，顶级编码
- **高质量** (4K/2K)：CRF 20，专业级别
- **中等质量** (1080p)：CRF 23，均衡编码
- **快速质量** (720p)：CRF 26，速度优化

### 编解码器兼容性表
智能检测确保最优的转换路径：

| 格式 | 视频编解码器 | 音频编解码器 | 容器 |
|------|-------------|-------------|------|
| MP4  | H.264, H.265, AV1 | AAC, MP3 | MPEG-4 |
| WebM | VP8, VP9, AV1 | Opus, Vorbis | WebM |
| MOV  | H.264, H.265, ProRes | AAC, PCM | QuickTime |
| MKV  | H.264, H.265, VP9 | AAC, Opus, FLAC | Matroska |
| WMV  | WMV, VC-1 | WMA, MP3 | ASF |

## ⚡ 性能特色

1. **当源格式和目标格式兼容时：**
- **零质量损失** - 完美的流复制
- **超快处理速度** - 无需重新编码
- **最小 CPU 占用** - 仅做容器封装

2. **质量基于以下因素自动评估：**
- 分辨率
- 比特率分析

3. **实时反馈：**
- 完成百分比
- 文件大小对比

## 📊 监控和报告

### 错误处理
全面的错误检测和报告：
- 输入验证错误
- 编解码器兼容性问题
- 处理失败的详细日志
- 资源可用性问题

## 🔍 依赖项

- **FFmpeg** - 视频处理引擎 (通过 @ffmpeg-installer/ffmpeg)
- **FFprobe** - 媒体分析工具 (通过 @ffprobe-installer/ffprobe)
- **Node.js** - 运行时环境
- **Oomol 平台** - 模块执行环境
