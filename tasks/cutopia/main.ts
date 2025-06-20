// ================================= 测试开始 ===============================
process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
    console.error('堆栈跟踪:', error.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的 Promise 拒绝:', reason);
    console.error('Promise:', promise);
    process.exit(1);
});

// 添加启动日志
console.log('🚀 程序开始启动...');
console.log('Node.js 版本:', process.version);
console.log('当前工作目录:', process.cwd());

try {
    console.log('📦 开始导入依赖...');
    
    // 分步导入来确定哪个包出问题
    console.log('导入 @ffmpeg-installer/ffmpeg...');
    const { path } = await import('@ffmpeg-installer/ffmpeg');
    console.log('✅ ffmpeg 路径:', path);
    
    // 如果你有其他导入，也分步添加
    // console.log('导入其他包...');
    // const otherPackage = await import('other-package');
    
    console.log('✅ 所有依赖导入成功');
    
    // 你的主要逻辑代码...
    console.log('🎯 开始执行主要逻辑...');
    
    // 在这里添加你的实际代码
    
    console.log('✅ 程序执行完成');
    
} catch (error) {
    console.error('❌ 程序执行出错:');
    console.error('错误信息:', error.message);
    console.error('错误类型:', error.constructor.name);
    console.error('堆栈跟踪:', error.stack);
    process.exit(1);
}

// ================================= 测试结束 ===============================


import type { Context } from "@oomol/types/oocana";
import { spawn } from "child_process";
import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg";
import path from "path"
import * as fs from 'node:fs/promises';

import { FORMAT_CONFIGS, ConversionOptions, VIDEO_FORMATS, BYTES_PER_GB, BYTES_PER_MB, QUALITY_THRESHOLDS } from "./constants"
import { VideoFormatOption } from "./inputRender"

type Outputs = {
    output: String
}

type Inputs = {
    mediaPath: string | null;
    isCompress: boolean;
    mediaInfo: { format_name: string; audioChannels: string; codeRate: string; codecs: string; colorProfile: string; duration: string; name: string; kind: string; size: string; quality: string; dimensions: string };
    [key: string]: any;
}

type MediaInfo = Inputs["mediaInfo"];

export default async function (
    params: Inputs,
    context: Context<Inputs, Outputs>
): Promise<Partial<Outputs> | undefined | void> {
    try {
        const options: ConversionOptions = {
            customQuality: params.customQuality,
            customBitrate: params.customBitrate,
            preserveMetadata: params.preserveMetadata,
            hardwareAcceleration: params.hardwareAcceleration,
            preset: params.preset
        };

        console.log('lalal', options)

        const converter = new VideoConverter(context, options);
        return await converter.convert(params);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

        context.preview({
            type: "table",
            data: {
                columns: ["Error", "Details"],
                rows: [
                    ["❌ Conversion Failed", errorMessage],
                    ["File", params.mediaPath || 'Unknown'],
                    ["Target Format", params.targetFormat?.value || 'Unknown']
                ]
            }
        });

        throw new ConversionError(`Video conversion failed: ${errorMessage}`, error instanceof Error ? error : undefined);
    }
};

class VideoConverter {
    private readonly context: Context<Inputs, Outputs>;
    private readonly options: ConversionOptions;

    constructor(context: Context<Inputs, Outputs>, options: ConversionOptions = {}) {
        this.context = context;
        this.options = {
            preserveMetadata: true,
            hardwareAcceleration: false,
            preset: 'medium',
            ...options
        };
    }

    private static validateInputs(params: Inputs): void {
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

        const supportedFormat = VIDEO_FORMATS.includes(targetFormat.value as any);
        if (!supportedFormat) {
            throw new Error(`Unsupported target format: ${targetFormat.value}`);
        }
    }

    private static parseDimensions(dimensions: string): { width: number; height: number } {
        const [width, height] = dimensions.split('x').map(Number);
        if (isNaN(width) || isNaN(height)) {
            throw new Error(`Invalid dimensions format: ${dimensions}`);
        }
        return { width, height };
    }

    private static formatFileSize(bytes: number): string {
        if (bytes >= BYTES_PER_GB) {
            return `${(bytes / BYTES_PER_GB).toFixed(2)} GB`;
        }
        return `${(bytes / BYTES_PER_MB).toFixed(2)} MB`;
    }

    private static async getFileSize(filePath: string): Promise<number> {
        try {
            const stats = await fs.stat(filePath);
            return stats.size;
        } catch {
            return 0;
        }
    }

    private static async pathExists(path: string) {
        try {
            await fs.stat(path);
            return true;
        } catch {
            return false;
        }
    }

    private static generateOutputPath(inputPath: string, targetFormat: string): string {
        const inputExt = path.extname(inputPath);
        const basePath = inputPath.replace(inputExt, '');

        let outputPath = `${basePath}.${targetFormat}`;
        let counter = 1;

        while (VideoConverter.pathExists(outputPath)) {
            outputPath = `${basePath}_${counter}.${targetFormat}`;
            counter++;
        }

        return outputPath;
    }

    private getQualityPreset(quality: string): { crf: number; targetWidth?: number; targetHeight?: number } {
        const { UHD, QHD, FHD, HD } = QUALITY_THRESHOLDS;

        if (quality.includes('4K')) {
            return { crf: 28, targetWidth: 1920, targetHeight: 1080 };
        }

        if (quality.includes('2K')) {
            return { crf: 26, targetWidth: 1920, targetHeight: 1080 };
        }

        if (quality.includes('1080p')) {
            return { crf: 28 };
        }

        if (quality.includes('720p')) {
            return { crf: 24 };
        }

        return { crf: 24 };
    }

    private buildFFmpegArgs(params: Inputs, outputPath: string): string[] {
        const { mediaPath, mediaInfo, targetFormat, isCompress } = params;
        const args: string[] = ['-i', mediaPath!];

        // Hardware acceleration support
        if (this.options.hardwareAcceleration) {
            args.unshift('-hwaccel', 'auto');
        }

        // Get format configuration
        const formatConfig = FORMAT_CONFIGS[targetFormat.value.toLowerCase() as keyof typeof FORMAT_CONFIGS];
        if (!formatConfig) {
            throw new Error(`Unsupported format: ${targetFormat.value}`);
        }

        // Set codecs
        args.push('-c:v', formatConfig.video, '-c:a', formatConfig.audio);

        // Compression and quality settings
        if (isCompress) {
            const { width, height } = VideoConverter.parseDimensions(mediaInfo.dimensions);
            const qualityPreset = this.getQualityPreset(mediaInfo.quality);

            // Scaling settings
            if (qualityPreset.targetWidth && qualityPreset.targetHeight) {
                if (width > qualityPreset.targetWidth || height > qualityPreset.targetHeight) {
                    args.push('-vf',
                        `scale=${qualityPreset.targetWidth}:${qualityPreset.targetHeight}:force_original_aspect_ratio=decrease:force_divisible_by=2`
                    );
                }
            }

            // CRF quality setting
            const crf = this.options.customQuality || qualityPreset.crf;
            args.push('-crf', crf.toString());

            // Audio bitrate
            const audioBitrate = this.options.customBitrate || '128k';
            args.push('-b:a', audioBitrate);
        } else {
            // High quality setting
            const crf = this.options.customQuality || 18;
            args.push('-crf', crf.toString());
        }

        // Preset setting
        args.push('-preset', this.options.preset!);

        // Metadata handling
        if (this.options.preserveMetadata) {
            args.push('-map_metadata', '0');
        } else {
            args.push('-map_metadata', '-1');
        }

        // Optimization settings
        args.push(
            '-movflags', '+faststart',  // Optimize for streaming
            '-pix_fmt', 'yuv420p'      // Ensure compatibility
        );

        // Output file
        args.push('-y', outputPath);

        return args;
    }

    /**
     * Execute FFmpeg conversion
     */
    private executeFFmpeg(args: string[]): Promise<{ stdout: string; stderr: string }> {
        return new Promise((resolve, reject) => {
            const ffmpeg = spawn(ffmpegPath, args);

            let stdout = '';
            let stderr = '';

            ffmpeg.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            ffmpeg.stderr.on('data', (data) => {
                stderr += data.toString();
                // Can parse progress info here
                this.parseProgress(data.toString());
            });

            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    resolve({ stdout, stderr });
                } else {
                    reject(new Error(`FFmpeg failed with exit code ${code}\nError: ${stderr}`));
                }
            });

            ffmpeg.on('error', (error) => {
                reject(new Error(`FFmpeg process error: ${error.message}`));
            });
        });
    }

    /**
     * Parse progress information
     */
    private parseProgress(data: string): void {
        const timeMatch = data.match(/time=(\d+:\d+:\d+\.\d+)/);
        if (timeMatch) {
            this.context.reportProgress((parseInt(timeMatch[1], 10) / 100) * 100);
        }
    }

    /**
     * Create preview of the current task
     */
    private createPreview(
        mediaInfo: MediaInfo,
        targetFormat: VideoFormatOption,
        originalSize: number,
        outputSize: number,
        compressionRatio: number,
        conversionTime: number,
        isCompress: boolean
    ): void {
        const compressionInfo = isCompress && compressionRatio > 0
            ? ` (compressed ${compressionRatio.toFixed(1)}%)`
            : '';

        const previewRows = [
            ["Status", "✅ Conversion Successful"],
            ["Original File", `${mediaInfo.name} (${mediaInfo.kind.toUpperCase()})`],
            ["Target Format", targetFormat.value.toUpperCase()],
            ["Original Size", VideoConverter.formatFileSize(originalSize)],
            ["Output Size", VideoConverter.formatFileSize(outputSize) + compressionInfo],
            ["Conversion Time", `${(conversionTime / 1000).toFixed(1)}s`],
            ...(compressionRatio > 0 ? [["Compression Ratio", `${compressionRatio.toFixed(1)}%`]] : []),
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
    async convert(params: Inputs): Promise<Partial<Outputs>> {
        // Validate parameters
        // VideoConverter.validateInputs(params);

        const { mediaPath, mediaInfo, targetFormat, isCompress } = params;

        console.log(mediaInfo, mediaPath, targetFormat, isCompress)

        // // Generate output path
        // const outputPath = VideoConverter.generateOutputPath(mediaPath!, targetFormat.value);

        // // Get original file size
        // const originalSize = await VideoConverter.getFileSize(mediaPath!);

        // // Build FFmpeg arguments
        // const ffmpegArgs = this.buildFFmpegArgs(params, outputPath);

        // // Record start time
        // const startTime = Date.now();

        // // Execute conversion
        // await this.executeFFmpeg(ffmpegArgs);

        // Calculate conversion time
        // const conversionTime = Date.now() - startTime;

        // Get output file size
        // const outputSize = await VideoConverter.getFileSize(outputPath);
        // const compressionRatio = originalSize > 0 ? ((originalSize - outputSize) / originalSize * 100) : 0;

        // Create preview
        // this.createPreview(
        //     mediaInfo,
        //     targetFormat,
        //     originalSize,
        //     outputSize,
        //     compressionRatio,
        //     conversionTime,
        //     isCompress
        // );

        return {
            output: "outputPath",
            // originalSize,
            // outputSize,
            // compressionRatio: Math.round(compressionRatio * 100) / 100,
            // conversionTime
        };
    }
}

class ConversionError extends Error {
    constructor(message: string, public readonly cause?: Error) {
        super(message);
        this.name = 'ConversionError';
    }
}
