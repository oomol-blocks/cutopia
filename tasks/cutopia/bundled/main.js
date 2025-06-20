
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


// tasks/cutopia/main.ts
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
  mp4: { video: "libx264", audio: "aac", container: "mp4" },
  avi: { video: "libx264", audio: "mp3", container: "avi" },
  mkv: { video: "libx264", audio: "aac", container: "matroska" },
  mov: { video: "libx264", audio: "aac", container: "mov" },
  wmv: { video: "wmv2", audio: "wmav2", container: "asf" },
  webm: { video: "libvpx-vp9", audio: "libopus", container: "webm" },
  flv: { video: "libx264", audio: "aac", container: "flv" }
};
var BYTES_PER_GB = 1e9;
var BYTES_PER_MB = 1e6;
var QUALITY_THRESHOLDS = {
  UHD: { width: 3840, height: 2160, bitrate: 15, highBitrate: 10 },
  QHD: { width: 2560, height: 1440, bitrate: 8 },
  FHD: { width: 1920, height: 1080, bitrate: 5, mediumBitrate: 2 },
  HD: { width: 1280, height: 720, bitrate: 2 }
};

// tasks/cutopia/main.ts
process.on("uncaughtException", (error) => {
  console.error("\u672A\u6355\u83B7\u7684\u5F02\u5E38:", error);
  console.error("\u5806\u6808\u8DDF\u8E2A:", error.stack);
  process.exit(1);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("\u672A\u5904\u7406\u7684 Promise \u62D2\u7EDD:", reason);
  console.error("Promise:", promise);
  process.exit(1);
});
console.log("\u{1F680} \u7A0B\u5E8F\u5F00\u59CB\u542F\u52A8...");
console.log("Node.js \u7248\u672C:", process.version);
console.log("\u5F53\u524D\u5DE5\u4F5C\u76EE\u5F55:", process.cwd());
try {
  console.log("\u{1F4E6} \u5F00\u59CB\u5BFC\u5165\u4F9D\u8D56...");
  console.log("\u5BFC\u5165 @ffmpeg-installer/ffmpeg...");
  const { path: path2 } = await import("@ffmpeg-installer/ffmpeg");
  console.log("\u2705 ffmpeg \u8DEF\u5F84:", path2);
  console.log("\u2705 \u6240\u6709\u4F9D\u8D56\u5BFC\u5165\u6210\u529F");
  console.log("\u{1F3AF} \u5F00\u59CB\u6267\u884C\u4E3B\u8981\u903B\u8F91...");
  console.log("\u2705 \u7A0B\u5E8F\u6267\u884C\u5B8C\u6210");
} catch (error) {
  console.error("\u274C \u7A0B\u5E8F\u6267\u884C\u51FA\u9519:");
  console.error("\u9519\u8BEF\u4FE1\u606F:", error.message);
  console.error("\u9519\u8BEF\u7C7B\u578B:", error.constructor.name);
  console.error("\u5806\u6808\u8DDF\u8E2A:", error.stack);
  process.exit(1);
}
async function main_default(params, context) {
  var _a;
  try {
    const options = {
      customQuality: params.customQuality,
      customBitrate: params.customBitrate,
      preserveMetadata: params.preserveMetadata,
      hardwareAcceleration: params.hardwareAcceleration,
      preset: params.preset
    };
    console.log("lalal", options);
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
var VideoConverter = class _VideoConverter {
  constructor(context, options = {}) {
    this.context = context;
    this.options = {
      preserveMetadata: true,
      hardwareAcceleration: false,
      preset: "medium",
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
  static async pathExists(path2) {
    try {
      await fs.stat(path2);
      return true;
    } catch {
      return false;
    }
  }
  static generateOutputPath(inputPath, targetFormat) {
    const inputExt = path.extname(inputPath);
    const basePath = inputPath.replace(inputExt, "");
    let outputPath = `${basePath}.${targetFormat}`;
    let counter = 1;
    while (_VideoConverter.pathExists(outputPath)) {
      outputPath = `${basePath}_${counter}.${targetFormat}`;
      counter++;
    }
    return outputPath;
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
  buildFFmpegArgs(params, outputPath) {
    const { mediaPath, mediaInfo, targetFormat, isCompress } = params;
    const args = ["-i", mediaPath];
    if (this.options.hardwareAcceleration) {
      args.unshift("-hwaccel", "auto");
    }
    const formatConfig = FORMAT_CONFIGS[targetFormat.value.toLowerCase()];
    if (!formatConfig) {
      throw new Error(`Unsupported format: ${targetFormat.value}`);
    }
    args.push("-c:v", formatConfig.video, "-c:a", formatConfig.audio);
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
      args.push("-crf", crf.toString());
      const audioBitrate = this.options.customBitrate || "128k";
      args.push("-b:a", audioBitrate);
    } else {
      const crf = this.options.customQuality || 18;
      args.push("-crf", crf.toString());
    }
    args.push("-preset", this.options.preset);
    if (this.options.preserveMetadata) {
      args.push("-map_metadata", "0");
    } else {
      args.push("-map_metadata", "-1");
    }
    args.push(
      "-movflags",
      "+faststart",
      // Optimize for streaming
      "-pix_fmt",
      "yuv420p"
      // Ensure compatibility
    );
    args.push("-y", outputPath);
    return args;
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
        stderr += data.toString();
        this.parseProgress(data.toString());
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
    const timeMatch = data.match(/time=(\d+:\d+:\d+\.\d+)/);
    if (timeMatch) {
      this.context.reportProgress(parseInt(timeMatch[1], 10) / 100 * 100);
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
      ["Target Format", targetFormat.value.toUpperCase()],
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
    const { mediaPath, mediaInfo, targetFormat, isCompress } = params;
    console.log(mediaInfo, mediaPath, targetFormat, isCompress);
    return {
      output: "outputPath"
      // originalSize,
      // outputSize,
      // compressionRatio: Math.round(compressionRatio * 100) / 100,
      // conversionTime
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
export {
  main_default as default
};
//# sourceMappingURL=main.js.map
