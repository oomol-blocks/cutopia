<div align=center>
  <h1>Cutopia</h1>
  <p><a href="./README_CN.md">中文</a> | English</p>
</div>

A video processing solution built on OOMOL Blocks, utilizing `FFmpeg` for media analysis and format conversion.

## 📈 Use Cases

### Content Creation Workflow
- **Multi-format Publishing** - Convert once, distribute everywhere
- **Quality Optimization** - Reduce file sizes while maintaining visual quality
- **Metadata Management** - Preserve or customize video metadata

### Professional Video Processing
- **Format Standardization** - Ensure consistent output across projects
- **Archive Migration** - Convert legacy formats to modern standards
- **Delivery Optimization** - Optimize for different platforms and devices

## 📦 Module Architecture

This project consists of multiple modules that work together:

### 1. **get-media-info** - Media Analysis Module
Uses FFprobe to analyze video files and extract detailed metadata information.

```ts
export interface IMediaInfo {
    path: string;                    // Input file path
    dimensions: {
        width: number;
        height: number;
    }                                // Video dimensions
    size: number;                    // File size
    containerFormat: string;         // Container format
    videoCodec?: string;             // Video codec
    audioCodec?: string;             // Audio codec
    bitrateMbps?: number;            // Bitrate in megabits per second
}
```

### 2. `convert-to-${container}` - Format Conversion Modules

Currently supports conversion to **MP4** (.mp4), **QuickTime** (.mov), **WebM** (.webm), **Matroska** (.mkv), and **Windows Media** (.wmv) formats.

## 🚀 Quick Start

### Step 1: Analyze Media File
```typescript
// Input
{
  mediaPath: "/path/to/video.mp4"
}

// Output
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

### Step 2: Convert Video
```typescript
// Input
{
  mediaInfo: /* Result from step 1 */,
  outputDir?: string,          // Optional output directory
  // More options available for advanced users
}

// Output
{
  mediaPath: string  // Path to converted file
}
```

## 🎛️ Advanced Configuration

### Quality Presets
The system automatically selects optimal quality settings based on content analysis:

- **Ultra High Quality** (4K 60fps): CRF 18, premium encoding
- **High Quality** (4K/2K): CRF 20, professional grade
- **Medium Quality** (1080p): CRF 23, balanced encoding
- **Fast Quality** (720p): CRF 26, speed optimized

### Codec Compatibility Matrix
Intelligent detection ensures optimal conversion paths:

| Format | Video Codecs | Audio Codecs | Container |
|--------|-------------|-------------|-----------|
| MP4    | H.264, H.265, AV1 | AAC, MP3 | MPEG-4 |
| WebM   | VP8, VP9, AV1 | Opus, Vorbis | WebM |
| MOV    | H.264, H.265, ProRes | AAC, PCM | QuickTime |
| MKV    | H.264, H.265, VP9 | AAC, Opus, FLAC | Matroska |
| WMV    | WMV, VC-1 | WMA, MP3 | ASF |

## ⚡ Performance Features

1. **When source and target formats are compatible:**
- **Zero Quality Loss** - Perfect stream copying
- **Ultra-fast Processing** - No re-encoding required
- **Minimal CPU Usage** - Container wrapping only

2. **Quality automatically assessed based on:**
- Resolution
- Bitrate analysis

3. **Real-time Feedback:**
- Completion percentage
- File size comparison

## 📊 Monitoring and Reporting

### Error Handling
Comprehensive error detection and reporting:
- Input validation errors
- Codec compatibility issues
- Detailed logs for processing failures
- Resource availability problems

## 🔍 Dependencies

- **FFmpeg** - Video processing engine (via @ffmpeg-installer/ffmpeg)
- **FFprobe** - Media analysis tool (via @ffprobe-installer/ffprobe)
- **Node.js** - Runtime environment
- **Oomol Platform** - Module execution environment
