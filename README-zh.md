<div align=center>
  <h1>Cutopia</h1>
  <p><a href="./README.md">English</a> | 中文</p>
</div>

基于 OOMOL Blocks 构建的视频处理解决方案，使用 `FFmpeg` 媒体分析和格式转换功能。

### 📦 `Blocks` 概览

该项目由两个主要 `blocks` 组成，协同工作提供完整的视频处理功能：

#### 1. **get-media-info** - 媒体分析
分析视频文件并提取全面的元数据信息。

#### 2. **cutopia** - 视频转换
支持不同格式的视频之间转换，支持可选的压缩和质量优化。

### 支持的输入格式
- MP4 (.mp4)
- QuickTime (.mov)
- WebM (.webm)
<!-- - AVI (.avi)
- Matroska (.mkv)
- Windows Media Video (.wmv) -->

### 支持的输出格式
- MP4
- WebM
- MOV
<!-- - AVI
- WMV -->

### 质量预设（当前为内置）
- **超高质量 (4K 60fps)**: 4K内容的顶级质量
- **极高质量 (4K/2K)**: UHD内容的高质量编码
- **高质量 (1080p)**: 标准高清质量
- **中等质量 (720p)**: 质量与文件大小的平衡
- **低质量 (SD)**: 针对小文件大小优化

### 📋 使用方法

#### Block 1：媒体分析
```typescript
// 输入
{
  mediaPath: string  // 视频文件路径
}

// 输出
{
  mediaPath: string,
  mediaInfo: {
    name: string,           // 文件名
    kind: string,           // 文件扩展名
    size: string,           // 文件大小（格式化）
    dimensions: string,     // 分辨率（如："1920x1080"）
    duration: string,       // 时长（时:分:秒）
    quality: string,        // 质量评估
    codecs: string,         // 视频和音频编解码器
    colorProfile: string,   // 色彩空间信息
    codeRate: string,       // 比特率信息
    audioChannels: string,  // 音频声道布局
    format_name: string     // 容器格式
  }
}
```

#### Block 2：视频转换
```typescript
// 输入
{
  mediaPath: string,      // 输入文件路径
  mediaInfo: object,      // 媒体分析 Block 的输出
  targetFormat: {         // 目标格式配置
    value: string,        // 格式扩展名（如：".mp4"）
    label: string         // 显示名称
  },
  isCompress: boolean,    // 启用压缩
//   customQuality?: number, // 自定义质量设置
//   customBitrate?: string, // 自定义比特率
//   preserveMetadata?: boolean,
//   hardwareAcceleration?: string,
//   preset?: string
}

// 输出
{
  media: string  // 转换后文件的路径
}
```

### 🎯 使用场景

#### 内容创作
- **格式标准化**: 将混合格式内容转换为一致的输出
- **质量优化**: 在保持视觉质量的同时减小文件大小
- **平台兼容性**: 确保视频在不同平台上正常工作

#### 媒体处理工作流
- **元数据管理**: 提取和保存重要的文件信息

#### 存储优化
- **压缩**: 在不损失质量的情况下减少存储需求
- **格式迁移**: 将旧格式更新为现代标准
- **比特率优化**: 平衡质量和带宽需求

### 🔍 高级功能

#### 智能流复制
转换器智能检测视频/音频流是否已与目标格式兼容，实现：
- **超快转换**（无需重新编码）
- **零质量损失**
- **最短处理时间**

#### 编解码器兼容性矩阵
自动检测跨格式的编解码器兼容性：
- H.264/H.265 与 MP4/MOV 的兼容性
- VP8/VP9 与 WebM 的兼容性
- 音频编解码器匹配 (AAC, MP3, Opus)

#### 进度监控
实时转换进度，包括：
- **完成百分比**
- **时间估算**
- **处理速度指标**

### 📊 性能优化

### 🚦 错误处理

全面的错误处理，包括：
- **输入验证**: 文件格式和路径验证
- **转换监控**: 实时错误检测
- **优雅降级**: 替代处理方法
- **详细错误报告**: 清晰的错误信息和故障排除信息

### 📈 监控与报告

#### 转换报告
- 处理时间指标
- 文件大小比较
- 压缩比率
- 质量评估

#### 预览表格
两个 Block 都提供了详细的 OOMOL 预览表格，显示：
- 输入/输出文件信息
- 处理统计信息
- 质量指标
- 错误详情（如适用）

### 📚 依赖项

#### 核心依赖
- **FFmpeg**: 视频处理引擎
- **FFprobe**: 媒体分析工具
- **Node.js**: 运行时环境
