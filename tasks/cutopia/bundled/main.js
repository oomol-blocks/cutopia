
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


// tasks/cutopia/main.ts
import * as fs2 from "node:fs/promises";

// tasks/cutopia/converter.ts
import { spawn } from "child_process";
import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg";
import path from "path";
import * as fs from "node:fs/promises";

// tasks/cutopia/constants.ts
var VIDEO_FORMATS = [
  ".mp4",
  ".avi",
  ".mkv",
  ".mov",
  ".wmv",
  ".flv",
  ".webm"
];
var FORMAT_CONFIGS = {
  mp4: {
    video: "libx264",
    videoHW: "h264_nvenc",
    videoQSV: "h264_qsv",
    audio: "aac",
    container: "mp4",
    pixelFormat: "yuv420p"
  },
  avi: {
    video: "libx264",
    videoHW: "h264_nvenc",
    videoQSV: "h264_qsv",
    audio: "mp3",
    container: "avi",
    pixelFormat: "yuv420p"
  },
  mkv: {
    video: "libx264",
    videoHW: "h264_nvenc",
    videoQSV: "h264_qsv",
    audio: "aac",
    container: "matroska",
    pixelFormat: "yuv420p"
  },
  mov: {
    video: "libx264",
    videoHW: "h264_nvenc",
    videoQSV: "h264_qsv",
    audio: "aac",
    container: "mov",
    pixelFormat: "yuv420p"
  },
  wmv: {
    video: "wmv2",
    audio: "wmav2",
    container: "asf",
    pixelFormat: "yuv420p"
  },
  webm: {
    video: "libvpx-vp9",
    audio: "libopus",
    container: "webm",
    pixelFormat: "yuv420p"
  },
  flv: {
    video: "libx264",
    videoHW: "h264_nvenc",
    videoQSV: "h264_qsv",
    audio: "aac",
    container: "flv",
    pixelFormat: "yuv420p"
  }
};
var FFMPEG_PARAMS = {
  INPUT_OPTIMIZATION: {
    fflags: "+fastseek+genpts",
    probesize: "16M",
    // 从32M降低到16M
    analyzeduration: "5M"
    // 从10M降低到5M
  },
  THREAD_OPTIMIZATION: {
    maxThreads: 4,
    // 限制最大线程数
    defaultThreads: 2
    // 默认线程数
  },
  QUALITY_PRESETS: {
    fast: { crf: 28, nvenc_cq: 28, qsv_q: 28 },
    medium: { crf: 24, nvenc_cq: 24, qsv_q: 24 },
    high: { crf: 20, nvenc_cq: 20, qsv_q: 20 },
    lossless: { crf: 18, nvenc_cq: 18, qsv_q: 18 }
  },
  AUDIO_BITRATES: {
    low: "96k",
    medium: "128k",
    high: "192k",
    lossless: "320k"
  },
  PRESETS: {
    software: ["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow"],
    nvenc: ["fast", "medium", "slow"],
    qsv: ["veryfast", "faster", "fast", "medium", "slow"]
  }
};
var CODEC_COMPATIBILITY = {
  // 视频编码兼容性
  video: {
    h264: ["mp4", "avi", "mkv", "mov", "flv"],
    h265: ["mp4", "mkv", "mov"],
    vp8: ["webm"],
    vp9: ["webm", "mkv"],
    wmv2: ["wmv"],
    xvid: ["avi"]
  },
  // 音频编码兼容性
  audio: {
    aac: ["mp4", "mkv", "mov", "flv"],
    mp3: ["avi", "mkv"],
    opus: ["webm", "mkv"],
    vorbis: ["webm", "mkv"],
    wmav2: ["wmv"]
  }
};
var BYTES_PER_GB = 1e9;
var BYTES_PER_MB = 1e6;

// tasks/cutopia/converter.ts
var VideoConverter = class _VideoConverter {
  constructor(context, options = {}) {
    this.totalDuration = 0;
    this.context = context;
    this.options = {
      preserveMetadata: true,
      hardwareAcceleration: "auto",
      preset: "fast",
      copyStreams: true,
      threads: Math.min(options.maxThreads || FFMPEG_PARAMS.THREAD_OPTIMIZATION.maxThreads, 4),
      ...options
    };
  }
  static validateInputs(params) {
    const { mediaPath, mediaInfo, targetFormat } = params;
    if (!mediaPath) {
      throw new Error("Media path is required");
    }
    if (!mediaInfo || !mediaInfo.dimensions) {
      throw new Error("Media info with dimensions is required");
    }
    if (!targetFormat || !targetFormat.value) {
      throw new Error("Target format is required");
    }
    const supportedFormat = VIDEO_FORMATS.includes(targetFormat.value);
    if (!supportedFormat) {
      throw new Error(`Unsupported target format: ${targetFormat.value}`);
    }
  }
  static parseDimensions(dimensions) {
    const [width, height] = dimensions.split("x").map(Number);
    if (isNaN(width) || isNaN(height)) {
      throw new Error(`Invalid dimensions format: ${dimensions}`);
    }
    return { width, height };
  }
  static formatFileSize(bytes) {
    if (bytes >= BYTES_PER_GB) {
      return `${(bytes / BYTES_PER_GB).toFixed(2)} GB`;
    }
    return `${(bytes / BYTES_PER_MB).toFixed(2)} MB`;
  }
  static async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }
  static getFileSizeFromMediaInfo(mediaInfo) {
    if (typeof mediaInfo.size === "number") {
      return mediaInfo.size;
    }
    if (typeof mediaInfo.size === "string") {
      const sizeMatch = mediaInfo.size.match(/^([\d.]+)\s*(GB|MB|KB|B)$/i);
      if (sizeMatch) {
        const value = parseFloat(sizeMatch[1]);
        const unit = sizeMatch[2].toUpperCase();
        switch (unit) {
          case "GB":
            return Math.floor(value * BYTES_PER_GB);
          case "MB":
            return Math.floor(value * BYTES_PER_MB);
          case "KB":
            return Math.floor(value * 1e3);
          case "B":
            return Math.floor(value);
          default:
            return 0;
        }
      }
    }
    return 0;
  }
  static generateOutputPath(inputPath, targetFormat) {
    return `${inputPath.replace(path.extname(inputPath), "")}-${Date.now()}${targetFormat}`;
  }
  getQualityPreset(quality, isCompress) {
    if (!isCompress) {
      return FFMPEG_PARAMS.QUALITY_PRESETS.lossless;
    }
    if (quality.includes("4K") || quality.includes("UHD")) {
      return FFMPEG_PARAMS.QUALITY_PRESETS.medium;
    }
    if (quality.includes("2K") || quality.includes("QHD")) {
      return FFMPEG_PARAMS.QUALITY_PRESETS.medium;
    }
    if (quality.includes("1080p") || quality.includes("FHD")) {
      return FFMPEG_PARAMS.QUALITY_PRESETS.fast;
    }
    if (quality.includes("720p") || quality.includes("HD")) {
      return FFMPEG_PARAMS.QUALITY_PRESETS.fast;
    }
    return FFMPEG_PARAMS.QUALITY_PRESETS.medium;
  }
  canCopyAllStreams(mediaInfo, targetFormat) {
    if (!this.options.copyStreams) return false;
    const { videoCompatible, audioCompatible } = this.checkStreamCompatibility(mediaInfo, targetFormat);
    console.log(`\u{1F50D} \u5B8C\u5168\u6D41\u590D\u5236\u68C0\u67E5:`);
    console.log(`   \u89C6\u9891\u517C\u5BB9: ${videoCompatible ? "\u2705" : "\u274C"}`);
    console.log(`   \u97F3\u9891\u517C\u5BB9: ${audioCompatible ? "\u2705" : "\u274C"}`);
    console.log(`   \u53EF\u5B8C\u5168\u590D\u5236: ${videoCompatible && audioCompatible ? "\u2705" : "\u274C"}`);
    return videoCompatible && audioCompatible;
  }
  checkStreamCompatibility(mediaInfo, targetFormat) {
    const targetFormatKey = targetFormat.substring(1);
    const targetConfig = FORMAT_CONFIGS[targetFormatKey.toLowerCase()];
    if (!targetConfig) {
      return {
        videoCompatible: false,
        audioCompatible: false,
        videoCodec: null,
        audioCodec: null
      };
    }
    const videoCodec = this.extractVideoCodec(mediaInfo);
    const audioCodec = this.extractAudioCodec(mediaInfo);
    if (!videoCodec || !audioCodec) {
      return {
        videoCompatible: false,
        audioCompatible: false,
        videoCodec,
        audioCodec
      };
    }
    const videoCompatible = this.isCodecCompatible(videoCodec, targetFormatKey, "video");
    const audioCompatible = this.isCodecCompatible(audioCodec, targetFormatKey, "audio");
    return {
      videoCompatible,
      audioCompatible,
      videoCodec,
      audioCodec
    };
  }
  addVideoCodecArgs(args, formatConfig, videoCompatible, isCompress, mediaInfo) {
    if (videoCompatible && !isCompress) {
      console.log("\u{1F3A5} \u89C6\u9891\u6D41\u590D\u5236\u6A21\u5F0F");
      args.push("-c:v", "copy");
    } else {
      console.log("\u{1F3A5} \u89C6\u9891\u91CD\u65B0\u7F16\u7801");
      const videoCodecName = formatConfig.video;
      args.push("-c:v", videoCodecName);
      this.addVideoQualityArgs(args, videoCodecName, isCompress, mediaInfo);
    }
  }
  addAudioCodecArgs(args, formatConfig, audioCompatible, isCompress) {
    if (audioCompatible && !isCompress) {
      console.log("\u{1F3B5} \u97F3\u9891\u6D41\u590D\u5236\u6A21\u5F0F");
      args.push("-c:a", "copy");
    } else {
      console.log("\u{1F3B5} \u97F3\u9891\u91CD\u65B0\u7F16\u7801");
      args.push("-c:a", formatConfig.audio);
      const audioBitrate = this.options.customBitrate || FFMPEG_PARAMS.AUDIO_BITRATES.medium;
      args.push("-b:a", audioBitrate);
    }
  }
  addVideoQualityArgs(args, videoCodecName, isCompress, mediaInfo) {
    const qualityPreset = this.getQualityPreset(mediaInfo.quality, isCompress);
    if (isCompress) {
      const { width, height } = _VideoConverter.parseDimensions(mediaInfo.dimensions);
      if (width > 1920 || height > 1080) {
        args.push(
          "-vf",
          "scale=1920:1080:force_original_aspect_ratio=decrease:force_divisible_by=2"
        );
      }
    }
    const customQuality = this.options.customQuality;
    let qualityValue;
    if (videoCodecName.includes("nvenc")) {
      qualityValue = customQuality || qualityPreset.nvenc_cq;
      args.push("-cq", qualityValue.toString());
      args.push("-preset", "fast");
    } else if (videoCodecName.includes("qsv")) {
      qualityValue = customQuality || qualityPreset.qsv_q;
      args.push("-q", qualityValue.toString());
      args.push("-preset", "fast");
    } else {
      qualityValue = customQuality || qualityPreset.crf;
      args.push("-crf", qualityValue.toString());
      args.push("-preset", this.options.preset);
    }
  }
  extractVideoCodec(mediaInfo) {
    if (mediaInfo.videoCodec) {
      return mediaInfo.videoCodec.toLowerCase();
    }
    if (mediaInfo.codecs) {
      const codecs = mediaInfo.codecs.toLowerCase();
      if (codecs.includes("h264") || codecs.includes("avc")) return "h264";
      if (codecs.includes("h265") || codecs.includes("hevc")) return "h265";
      if (codecs.includes("vp9")) return "vp9";
      if (codecs.includes("vp8")) return "vp8";
      if (codecs.includes("wmv")) return "wmv2";
    }
    const containerFormat = mediaInfo.containerFormat || mediaInfo.kind;
    if (containerFormat) {
      const format = containerFormat.toLowerCase();
      if (format === "webm") return "vp9";
      if (format === "wmv") return "wmv2";
    }
    return null;
  }
  extractAudioCodec(mediaInfo) {
    if (mediaInfo.audioCodec) {
      return mediaInfo.audioCodec.toLowerCase();
    }
    if (mediaInfo.codecs) {
      const codecs = mediaInfo.codecs.toLowerCase();
      if (codecs.includes("aac")) return "aac";
      if (codecs.includes("mp3")) return "mp3";
      if (codecs.includes("opus")) return "opus";
      if (codecs.includes("vorbis")) return "vorbis";
      if (codecs.includes("wmav2")) return "wmav2";
    }
    const containerFormat = mediaInfo.containerFormat || mediaInfo.kind;
    if (containerFormat) {
      const format = containerFormat.toLowerCase();
      if (format === "webm") return "opus";
      if (format === "wmv") return "wmav2";
    }
    return null;
  }
  isCodecCompatible(codec, targetFormat, type) {
    const compatibility = CODEC_COMPATIBILITY[type];
    const codecFormats = compatibility[codec];
    return codecFormats ? codecFormats.includes(targetFormat) : false;
  }
  buildFFmpegArgs(params, outputPath) {
    const { mediaPath, mediaInfo, targetFormat, isCompress } = params;
    const args = [];
    args.push(
      "-fflags",
      FFMPEG_PARAMS.INPUT_OPTIMIZATION.fflags,
      "-probesize",
      FFMPEG_PARAMS.INPUT_OPTIMIZATION.probesize,
      "-analyzeduration",
      FFMPEG_PARAMS.INPUT_OPTIMIZATION.analyzeduration
    );
    args.push("-i", mediaPath);
    const targetFormatKey = targetFormat.value.substring(1);
    const formatConfig = FORMAT_CONFIGS[targetFormatKey.toLowerCase()];
    if (!formatConfig) {
      throw new Error(`Unsupported format: ${targetFormat.value}`);
    }
    const streamCompatibility = this.checkStreamCompatibility(mediaInfo, targetFormat.value);
    const { videoCompatible, audioCompatible, videoCodec, audioCodec } = streamCompatibility;
    if (this.canCopyAllStreams(mediaInfo, targetFormat.value) && !isCompress) {
      console.log("\u{1F680} \u4F7F\u7528\u5B8C\u5168\u6D41\u590D\u5236\u6A21\u5F0F");
      args.push("-c", "copy");
    } else {
      this.addVideoCodecArgs(args, formatConfig, videoCompatible, isCompress, mediaInfo);
      this.addAudioCodecArgs(args, formatConfig, audioCompatible, isCompress);
    }
    const maxThreads = this.options.threads || FFMPEG_PARAMS.THREAD_OPTIMIZATION.defaultThreads;
    args.push("-threads", maxThreads.toString());
    if (this.options.preserveMetadata) {
      args.push("-map_metadata", "0");
    }
    args.push(
      "-movflags",
      "+faststart",
      "-pix_fmt",
      formatConfig.pixelFormat || "yuv420p",
      "-y",
      outputPath
    );
    console.log("\u{1F527} FFmpeg\u53C2\u6570:", args.join(" "));
    return args;
  }
  parseDurationFromFFmpegOutput(data) {
    if (this.totalDuration <= 0) {
      const durationMatch = data.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
      if (durationMatch) {
        const hours = parseInt(durationMatch[1], 10);
        const minutes = parseInt(durationMatch[2], 10);
        const seconds = parseFloat(durationMatch[3]);
        this.totalDuration = hours * 3600 + minutes * 60 + seconds;
        console.log(`\u{1F4CF} \u4ECEFFmpeg\u8F93\u51FA\u89E3\u6790\u5230\u89C6\u9891\u65F6\u957F: ${this.totalDuration.toFixed(2)}\u79D2`);
      }
    }
  }
  /**
   * Execute FFmpeg conversion
   */
  executeFFmpeg(args) {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn(ffmpegPath, args);
      let stdout = "";
      let stderr = "";
      ffmpeg.stdout.on("data", (data) => {
        stdout += data.toString();
      });
      ffmpeg.stderr.on("data", (data) => {
        const dataStr = data.toString();
        stderr += dataStr;
        this.parseDurationFromFFmpegOutput(dataStr);
        this.parseProgress(dataStr);
      });
      ffmpeg.on("close", (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`FFmpeg failed with exit code ${code}
Error: ${stderr}`));
        }
      });
      ffmpeg.on("error", (error) => {
        reject(new Error(`FFmpeg process error: ${error.message}`));
      });
    });
  }
  /**
   * Parse progress information
   */
  parseProgress(data) {
    const timeMatch = data.match(/time=(\d+):(\d+):(\d+\.\d+)/);
    if (timeMatch && this.totalDuration > 0) {
      const hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const seconds = parseFloat(timeMatch[3]);
      const currentTimeInSeconds = hours * 3600 + minutes * 60 + seconds;
      const progress = Math.min(currentTimeInSeconds / this.totalDuration * 100, 100);
      this.context.reportProgress(progress);
    }
  }
  /**
   * Create preview of the current task
   */
  createPreview(mediaInfo, targetFormat, originalSize, outputSize, compressionRatio, conversionTime, isCompress) {
    const compressionInfo = isCompress && compressionRatio > 0 ? ` (compressed ${compressionRatio.toFixed(1)}%)` : "";
    const previewRows = [
      ["Status", "\u2705 Conversion Successful"],
      ["Original File", `${mediaInfo.name} (${mediaInfo.kind.toUpperCase()})`],
      ["Target Format", targetFormat.value.toLowerCase()],
      ["Original Size", _VideoConverter.formatFileSize(originalSize)],
      ["Output Size", _VideoConverter.formatFileSize(outputSize) + compressionInfo],
      ["Conversion Time", `${(conversionTime / 1e3).toFixed(1)}s`],
      ...compressionRatio > 0 ? [["Compression Ratio", `${compressionRatio.toFixed(1)}%`]] : [],
      ["Quality", mediaInfo.quality],
      ["Dimensions", mediaInfo.dimensions]
    ];
    this.context.preview({
      type: "table",
      data: {
        columns: ["Property", "Value"],
        rows: previewRows
      }
    });
  }
  /**
   * Execute video conversion
   */
  async convert(params) {
    console.log("\u{1F3AC} \u5F00\u59CB\u89C6\u9891\u8F6C\u6362\u6D41\u7A0B...");
    _VideoConverter.validateInputs(params);
    console.log("\u2705 \u53C2\u6570\u9A8C\u8BC1\u901A\u8FC7");
    const { mediaPath, mediaInfo, targetFormat, isCompress } = params;
    let originalSize = _VideoConverter.getFileSizeFromMediaInfo(mediaInfo);
    if (originalSize === 0) {
      originalSize = await _VideoConverter.getFileSize(mediaPath);
      mediaInfo.size = originalSize;
    }
    console.log("\u{1F4C2} \u8F93\u5165\u6587\u4EF6\u4FE1\u606F:");
    console.log(`   \u6587\u4EF6\u8DEF\u5F84: ${mediaPath}`);
    console.log(`   \u6587\u4EF6\u5927\u5C0F: ${_VideoConverter.formatFileSize(originalSize)}`);
    console.log(`   \u76EE\u6807\u683C\u5F0F: ${targetFormat.value.toUpperCase()}`);
    console.log(`   \u538B\u7F29\u6A21\u5F0F: ${isCompress ? "\u662F" : "\u5426"}`);
    const outputPath = _VideoConverter.generateOutputPath(mediaPath, targetFormat.value);
    console.log(`\u2705 \u8F93\u51FA\u8DEF\u5F84: ${outputPath}`);
    const ffmpegArgs = this.buildFFmpegArgs(params, outputPath);
    console.log("\u{1F680} \u5F00\u59CB\u6267\u884C\u89C6\u9891\u8F6C\u6362...");
    const startTime = Date.now();
    try {
      await this.executeFFmpeg(ffmpegArgs);
      console.log("\u2705 \u89C6\u9891\u8F6C\u6362\u6210\u529F\u5B8C\u6210!");
    } catch (error) {
      console.error("\u274C \u89C6\u9891\u8F6C\u6362\u5931\u8D25:", error.message);
      throw error;
    }
    const conversionTime = Date.now() - startTime;
    console.log(`\u23F1\uFE0F \u8F6C\u6362\u8017\u65F6: ${(conversionTime / 1e3).toFixed(1)}\u79D2`);
    console.log("\u{1F4CA} \u83B7\u53D6\u8F93\u51FA\u6587\u4EF6\u4FE1\u606F...");
    const outputSize = await _VideoConverter.getFileSize(outputPath);
    const compressionRatio = originalSize > 0 ? (originalSize - outputSize) / originalSize * 100 : 0;
    console.log(`\u2705 \u8F93\u51FA\u6587\u4EF6\u5927\u5C0F: ${_VideoConverter.formatFileSize(outputSize)}`);
    if (compressionRatio > 0) {
      console.log(`\u{1F4C9} \u538B\u7F29\u6BD4\u4F8B: ${compressionRatio.toFixed(1)}%`);
    }
    this.createPreview(
      mediaInfo,
      targetFormat,
      originalSize,
      outputSize,
      compressionRatio,
      conversionTime,
      isCompress
    );
    console.log("\u{1F389} \u89C6\u9891\u8F6C\u6362\u6D41\u7A0B\u5168\u90E8\u5B8C\u6210!");
    return {
      media: outputPath
    };
  }
};
var ConversionError = class extends Error {
  constructor(message, cause) {
    super(message);
    this.cause = cause;
    this.name = "ConversionError";
  }
};

// tasks/cutopia/main.ts
async function main_default(params, context) {
  var _a;
  try {
    if (!params.mediaInfo.size) {
      try {
        const stats = await fs2.stat(params.mediaPath);
        params.mediaInfo.size = stats.size;
      } catch (error) {
        console.warn("\u65E0\u6CD5\u83B7\u53D6\u6587\u4EF6\u5927\u5C0F\uFF0C\u4F7F\u7528\u9ED8\u8BA4\u503C 0");
        params.mediaInfo.size = 0;
      }
    }
    const options = {
      customQuality: params.customQuality,
      customBitrate: params.customBitrate,
      preserveMetadata: params.preserveMetadata || false,
      hardwareAcceleration: params.hardwareAcceleration || "auto",
      preset: params.preset || "fast"
    };
    const converter = new VideoConverter(context, options);
    return await converter.convert(params);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    context.preview({
      type: "table",
      data: {
        columns: ["Error", "Details"],
        rows: [
          ["\u274C Conversion Failed", errorMessage],
          ["File", params.mediaPath || "Unknown"],
          ["Target Format", ((_a = params.targetFormat) == null ? void 0 : _a.value) || "Unknown"]
        ]
      }
    });
    throw new ConversionError(`Video conversion failed: ${errorMessage}`, error instanceof Error ? error : void 0);
  }
}
export {
  main_default as default
};
//# sourceMappingURL=main.js.map
