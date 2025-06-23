
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


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
    // NVIDIA硬件加速
    videoQSV: "h264_qsv",
    // Intel硬件加速
    audio: "aac",
    container: "mp4"
  },
  avi: {
    video: "libx264",
    videoHW: "h264_nvenc",
    videoQSV: "h264_qsv",
    audio: "mp3",
    container: "avi"
  },
  mkv: {
    video: "libx264",
    videoHW: "h264_nvenc",
    videoQSV: "h264_qsv",
    audio: "aac",
    container: "matroska"
  },
  mov: {
    video: "libx264",
    videoHW: "h264_nvenc",
    videoQSV: "h264_qsv",
    audio: "aac",
    container: "mov"
  },
  wmv: { video: "wmv2", audio: "wmav2", container: "asf" },
  webm: { video: "libvpx-vp9", audio: "libopus", container: "webm" },
  flv: {
    video: "libx264",
    videoHW: "h264_nvenc",
    videoQSV: "h264_qsv",
    audio: "aac",
    container: "flv"
  }
};
var BYTES_PER_GB = 1e9;
var BYTES_PER_MB = 1e6;
var QUALITY_THRESHOLDS = {
  UHD: { width: 3840, height: 2160, bitrate: 15, highBitrate: 10 },
  QHD: { width: 2560, height: 1440, bitrate: 8 },
  FHD: { width: 1920, height: 1080, bitrate: 5, mediumBitrate: 2 },
  HD: { width: 1280, height: 720, bitrate: 2 }
};

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
      threads: 0,
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
  static generateOutputPath(inputPath, targetFormat) {
    return `${inputPath.replace(path.extname(inputPath), "")}-${Date.now()}${targetFormat}`;
  }
  getQualityPreset(quality) {
    const { UHD, QHD, FHD, HD } = QUALITY_THRESHOLDS;
    if (quality.includes("4K")) {
      return { crf: 28, targetWidth: 1920, targetHeight: 1080 };
    }
    if (quality.includes("2K")) {
      return { crf: 26, targetWidth: 1920, targetHeight: 1080 };
    }
    if (quality.includes("1080p")) {
      return { crf: 28 };
    }
    if (quality.includes("720p")) {
      return { crf: 24 };
    }
    return { crf: 24 };
  }
  canCopyStreams(inputFormat, outputFormat) {
    const compatibleFormats = [".mp4", ".mov"];
    return compatibleFormats.includes(inputFormat) && compatibleFormats.includes(outputFormat);
  }
  buildFFmpegArgs(params, outputPath) {
    const { mediaPath, mediaInfo, targetFormat, isCompress } = params;
    const args = [];
    args.push(
      "-fflags",
      "+fastseek+genpts",
      "-probesize",
      "32M",
      "-analyzeduration",
      "10M"
    );
    args.push("-i", mediaPath);
    const kind = targetFormat.value.substring(1);
    const formatConfig = FORMAT_CONFIGS[kind.toLowerCase()];
    if (!formatConfig) {
      throw new Error(`Unsupported format: ${targetFormat.value}`);
    }
    if (this.options.copyStreams && !isCompress && this.canCopyStreams(path.extname(mediaPath), targetFormat.value)) {
      console.log("\u{1F680} \u4F7F\u7528\u6D41\u590D\u5236\u6A21\u5F0F\uFF0C\u901F\u5EA6\u6700\u5FEB");
      args.push("-c", "copy");
    } else {
      let videoCodec = formatConfig.video;
      args.push("-c:v", videoCodec);
      if (!isCompress) {
        args.push("-c:a", "copy");
      } else {
        args.push("-c:a", formatConfig.audio);
      }
      if (isCompress) {
        const { width, height } = _VideoConverter.parseDimensions(mediaInfo.dimensions);
        const qualityPreset = this.getQualityPreset(mediaInfo.quality);
        if (qualityPreset.targetWidth && qualityPreset.targetHeight) {
          if (width > qualityPreset.targetWidth || height > qualityPreset.targetHeight) {
            args.push(
              "-vf",
              `scale=${qualityPreset.targetWidth}:${qualityPreset.targetHeight}:force_original_aspect_ratio=decrease:force_divisible_by=2`
            );
          }
        }
        const crf = this.options.customQuality || qualityPreset.crf;
        if (videoCodec.includes("nvenc")) {
          args.push("-crf", crf.toString());
        } else if (videoCodec.includes("qsv")) {
          args.push("-q", crf.toString());
        } else {
          args.push("-crf", crf.toString());
        }
        if (!args.includes("-c:a") || !args[args.indexOf("-c:a") + 1].includes("copy")) {
          const audioBitrate = this.options.customBitrate || "128k";
          args.push("-b:a", audioBitrate);
        }
      } else {
        const crf = this.options.customQuality || 18;
        if (videoCodec.includes("nvenc")) {
          args.push("-crf", crf.toString());
        } else if (videoCodec.includes("qsv")) {
          args.push("-q", crf.toString());
        } else {
          args.push("-crf", crf.toString());
        }
      }
    }
    if (this.options.threads !== void 0) {
      args.push("-threads", this.options.threads.toString());
    }
    if (this.options.preserveMetadata) {
      args.push("-map_metadata", "0");
    } else {
      args.push("-map_metadata", "-1");
    }
    args.push(
      "-movflags",
      "+faststart",
      // 优化streaming
      "-pix_fmt",
      "yuv420p",
      // 兼容性
      "-y",
      outputPath
      // 覆盖输出文件
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
    console.log("\u{1F4CB} \u9A8C\u8BC1\u8F93\u5165\u53C2\u6570...");
    _VideoConverter.validateInputs(params);
    console.log("\u2705 \u53C2\u6570\u9A8C\u8BC1\u901A\u8FC7");
    const { mediaPath, mediaInfo, targetFormat, isCompress } = params;
    console.log("\u{1F4C2} \u8F93\u5165\u6587\u4EF6\u4FE1\u606F:");
    console.log(`   \u6587\u4EF6\u8DEF\u5F84: ${mediaPath}`);
    console.log(`   \u6587\u4EF6\u540D: ${mediaInfo.name}`);
    console.log(`   \u683C\u5F0F: ${mediaInfo.kind.toUpperCase()}`);
    console.log(`   \u5206\u8FA8\u7387: ${mediaInfo.dimensions}`);
    console.log(`   \u8D28\u91CF: ${mediaInfo.quality}`);
    console.log(`   \u76EE\u6807\u683C\u5F0F: ${targetFormat.value.toUpperCase()}`);
    console.log(`   \u538B\u7F29\u6A21\u5F0F: ${isCompress ? "\u662F" : "\u5426"}`);
    console.log("\u{1F4C1} \u751F\u6210\u8F93\u51FA\u6587\u4EF6\u8DEF\u5F84...");
    const outputPath = _VideoConverter.generateOutputPath(mediaPath, targetFormat.value);
    console.log(`\u2705 \u8F93\u51FA\u8DEF\u5F84: ${outputPath}`);
    console.log("\u{1F4CF} \u83B7\u53D6\u539F\u59CB\u6587\u4EF6\u5927\u5C0F...");
    const originalSize = await _VideoConverter.getFileSize(mediaPath);
    console.log(`\u2705 \u539F\u59CB\u6587\u4EF6\u5927\u5C0F: ${_VideoConverter.formatFileSize(originalSize)}`);
    console.log("\u2699\uFE0F \u6784\u5EFA\u8F6C\u6362\u53C2\u6570...");
    const ffmpegArgs = this.buildFFmpegArgs(params, outputPath);
    console.log("\u2705 \u8F6C\u6362\u53C2\u6570\u6784\u5EFA\u5B8C\u6210");
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
    console.log("\u{1F4CB} \u751F\u6210\u8F6C\u6362\u62A5\u544A...");
    this.createPreview(
      mediaInfo,
      targetFormat,
      originalSize,
      outputSize,
      compressionRatio,
      conversionTime,
      isCompress
    );
    console.log("\u2705 \u8F6C\u6362\u62A5\u544A\u751F\u6210\u5B8C\u6210");
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
    const options = {
      customQuality: params.customQuality,
      customBitrate: params.customBitrate,
      preserveMetadata: params.preserveMetadata || false,
      hardwareAcceleration: params.hardwareAcceleration || "auto",
      preset: params.preset || "fast"
    };
    console.log("input: ", params.targetFormat);
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
