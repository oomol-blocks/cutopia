<div align=center>
  <h1>Cutopia</h1>
  <p><a href="./README-zh.md">中文</a> | English</p>
</div>

A comprehensive video processing solution built with Oomol blocks, powered by `FFmpeg` for professional-grade media analysis and format conversion capabilities.

## 📦 Blocks Overview

This project consists of two main blocks that work together to provide complete video processing functionality:

### 1. **get-media-info** - Media Analysis Block
Analyzes video files and extracts comprehensive metadata information.

### 2. **cutopia** - Video Conversion Block  
Converts videos between different formats with optional compression and quality optimization.

### Supported Input Formats
- MP4 (.mp4)
- QuickTime (.mov)
- WebM (.webm)
<!-- - AVI (.avi)
- Matroska (.mkv)
- Windows Media Video (.wmv) -->

### Supported Output Formats
- MP4
- WebM
- MOV
<!-- - AVI
- WMV -->

### Quality Presets（Build-In temporarily）
- **Ultra High (4K 60fps)**: Premium quality for 4K content
- **Very High (4K/2K)**: High-quality encoding for UHD content
- **High (1080p)**: Standard high-definition quality
- **Medium (720p)**: Balanced quality and file size
- **Low (SD)**: Optimized for smaller file sizes

## 📋 Usage

### Block 1: Media Analysis
```typescript
// Input
{
  mediaPath: string  // Path to the video file
}

// Output
{
  mediaPath: string,
  mediaInfo: {
    name: string,           // File name
    kind: string,           // File extension
    size: string,           // File size (formatted)
    dimensions: string,     // Resolution (e.g., "1920x1080")
    duration: string,       // Duration (HH:MM:SS)
    quality: string,        // Quality assessment
    codecs: string,         // Video and audio codecs
    colorProfile: string,   // Color space information
    codeRate: string,       // Bitrate information
    audioChannels: string,  // Audio channel layout
    format_name: string     // Container format
  }
}
```

### Block 2: Video Conversion
```typescript
// Input
{
  mediaPath: string,      // Input file path
  mediaInfo: object,      // Media info from analysis block
  targetFormat: {         // Target format configuration
    value: string,        // Format extension (e.g., ".mp4")
    label: string         // Display name
  },
  isCompress: boolean,    // Enable compression
//   customQuality?: number, // Custom quality setting
//   customBitrate?: string, // Custom bitrate
//   preserveMetadata?: boolean,
//   hardwareAcceleration?: string,
//   preset?: string
}

// Output
{
  media: string  // Path to converted file
}
```

## 🎯 Use Cases

### Content Creation
- **Format Standardization**: Convert mixed-format content to consistent output
- **Quality Optimization**: Reduce file sizes while maintaining visual quality
- **Platform Compatibility**: Ensure videos work across different platforms

### Media Processing Workflows
- **Metadata Management**: Extract and preserve important file information

### Storage Optimization
- **Compression**: Reduce storage requirements without quality loss
- **Format Migration**: Update legacy formats to modern standards
- **Bitrate Optimization**: Balance quality and bandwidth requirements

## 🔍 Advanced Features

### Smart Stream Copying
The converter intelligently detects when video/audio streams are already compatible with the target format, allowing for:
- **Ultra-fast conversion** (no re-encoding needed)
- **Zero quality loss**
- **Minimal processing time**

### Codec Compatibility Matrix
Automatic detection of codec compatibility across formats:
- H.264/H.265 compatibility with MP4/MOV
- VP8/VP9 compatibility with WebM
- Audio codec matching (AAC, MP3, Opus)

### Progress Monitoring
Real-time conversion progress with:
- **Percentage completion**
- **Time estimates**
- **Processing speed metrics**

## 📊 Performance Optimizations

<!-- ### Hardware Acceleration
- **NVIDIA NVENC**: GPU-accelerated encoding
- **Intel Quick Sync**: Hardware-accelerated processing
- **Automatic fallback**: Software encoding when hardware unavailable -->

## 🚦 Error Handling

Comprehensive error handling with:
- **Input validation**: File format and path verification
- **Conversion monitoring**: Real-time error detection
- **Graceful fallbacks**: Alternative processing methods
- **Detailed error reporting**: Clear error messages and troubleshooting info

## 📈 Monitoring & Reporting

### Conversion Reports
- Processing time metrics
- File size comparisons
- Compression ratios
- Quality assessments

### Preview Tables
Both blocks provide detailed preview tables showing:
- Input/output file information
- Processing statistics
- Quality metrics
- Error details (when applicable)

## 📚 Dependencies

### Core Dependencies
- **FFmpeg**: Video processing engine
- **FFprobe**: Media analysis tool
- **Node.js**: Runtime environment
