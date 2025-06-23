import type { Context } from "@oomol/types/oocana";
import { spawn } from "child_process";
import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg";
import path from "path"
import * as fs from 'node:fs/promises';

import { FORMAT_CONFIGS, ConversionOptions, VIDEO_FORMATS, BYTES_PER_GB, BYTES_PER_MB, QUALITY_THRESHOLDS } from "./constants"
import { VideoFormatOption } from "./inputRender"
import { Outputs, Inputs } from "./main"

type MediaInfo = Inputs["mediaInfo"];

export class VideoConverter {
    private readonly context: Context<Inputs, Outputs>;
    private readonly options: ConversionOptions;
    private totalDuration: number = 0;

    constructor(context: Context<Inputs, Outputs>, options: ConversionOptions = {}) {
        this.context = context;
        this.options = {
            preserveMetadata: true,
            hardwareAcceleration: 'auto',
            preset: 'fast',
            copyStreams: true,
            threads: 0,
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

    private static generateOutputPath(inputPath: string, targetFormat: string): string {
        return `${inputPath.replace(path.extname(inputPath), '')}-${Date.now()}${targetFormat}`;
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

    private canCopyStreams(inputFormat: string, outputFormat: string): boolean {
        const compatibleFormats = ['.mp4', '.mov'];
        return compatibleFormats.includes(inputFormat) && 
               compatibleFormats.includes(outputFormat);
    }

    private buildFFmpegArgs(params: Inputs, outputPath: string): string[] {
        const { mediaPath, mediaInfo, targetFormat, isCompress } = params;
        const args: string[] = [];

        // 1. 输入优化
        args.push(
            '-fflags', '+fastseek+genpts',
            '-probesize', '32M',
            '-analyzeduration', '10M'
        );

        // 2. 硬件加速设置（在输入之前）
        // if (this.options.hardwareAcceleration && Boolean(this.options.hardwareAcceleration) !== false) {
        //     if (this.options.hardwareAcceleration === 'nvidia') {
        //         args.push('-hwaccel', 'cuda', '-hwaccel_output_format', 'cuda');
        //     } else if (this.options.hardwareAcceleration === 'intel') {
        //         args.push('-hwaccel', 'qsv');
        //     } else {
        //         args.push('-hwaccel', 'auto');
        //     }
        // }

        args.push('-i', mediaPath!);

        const kind = targetFormat.value.substring(1);
        const formatConfig = FORMAT_CONFIGS[kind.toLowerCase() as keyof typeof FORMAT_CONFIGS];
        
        if (!formatConfig) {
            throw new Error(`Unsupported format: ${targetFormat.value}`);
        }

        // 3. 检查是否可以直接复制流（最快）
        if (this.options.copyStreams && !isCompress && 
            this.canCopyStreams(path.extname(mediaPath!), targetFormat.value)) {
            console.log("🚀 使用流复制模式，速度最快");
            args.push('-c', 'copy');
        } else {
            // 4. 选择编码器（硬件优先）
            let videoCodec = formatConfig.video;
            
            // if (this.options.hardwareAcceleration && Boolean(this.options.hardwareAcceleration) !== false) {
            //     if (this.options.hardwareAcceleration === 'nvidia' && formatConfig.videoHW) {
            //         videoCodec = formatConfig.videoHW;
            //         console.log("🚀 使用NVIDIA硬件加速");
            //     } else if (this.options.hardwareAcceleration === 'intel' && formatConfig.videoQSV) {
            //         videoCodec = formatConfig.videoQSV;
            //         console.log("🚀 使用Intel硬件加速");
            //     } else if (formatConfig.videoHW) {
            //         videoCodec = formatConfig.videoHW; // 默认尝试NVIDIA
            //         console.log("🚀 尝试使用硬件加速");
            //     }
            // }

            args.push('-c:v', videoCodec);

            // 5. 音频处理（优先复制）
            if (!isCompress) {
                args.push('-c:a', 'copy'); // 不压缩时直接复制音频
            } else {
                args.push('-c:a', formatConfig.audio);
            }

            // 6. 质量和压缩设置
            if (isCompress) {
                const { width, height } = VideoConverter.parseDimensions(mediaInfo.dimensions);
                const qualityPreset = this.getQualityPreset(mediaInfo.quality);

                // 缩放设置
                if (qualityPreset.targetWidth && qualityPreset.targetHeight) {
                    if (width > qualityPreset.targetWidth || height > qualityPreset.targetHeight) {
                        args.push('-vf',
                            `scale=${qualityPreset.targetWidth}:${qualityPreset.targetHeight}:force_original_aspect_ratio=decrease:force_divisible_by=2`
                        );
                    }
                }

                // 质量设置（硬件编码器使用不同参数）
                const crf = this.options.customQuality || qualityPreset.crf;
                if (videoCodec.includes('nvenc')) {
                    args.push('-crf', crf.toString()); // 更新到最行版---NVIDIA使用CQ
                } else if (videoCodec.includes('qsv')) {
                    args.push('-q', crf.toString()); // Intel QSV使用q
                } else {
                    args.push('-crf', crf.toString()); // 软件编码使用CRF
                }

                // 音频比特率
                if (!args.includes('-c:a') || !args[args.indexOf('-c:a') + 1].includes('copy')) {
                    const audioBitrate = this.options.customBitrate || '128k';
                    args.push('-b:a', audioBitrate);
                }
            } else {
                // 高质量设置
                const crf = this.options.customQuality || 18;
                if (videoCodec.includes('nvenc')) {
                    args.push('-crf', crf.toString());
                } else if (videoCodec.includes('qsv')) {
                    args.push('-q', crf.toString());
                } else {
                    args.push('-crf', crf.toString());
                }
            }

            // 7. 预设设置（硬件编码器使用不同预设）
        //     if (videoCodec.includes('nvenc')) {
        //         args.push('-preset', 'fast'); // NVIDIA预设
        //     } else if (videoCodec.includes('qsv')) {
        //         args.push('-preset', 'fast'); // Intel预设
        //     } else {
        //         args.push('-preset', this.options.preset!); // 软件编码预设
        //     }
        }

        // 8. 线程优化
        if (this.options.threads !== undefined) {
            args.push('-threads', this.options.threads.toString());
        }

        // 9. 元数据处理
        if (this.options.preserveMetadata) {
            args.push('-map_metadata', '0');
        } else {
            args.push('-map_metadata', '-1');
        }

        // 10. 输出优化
        args.push(
            '-movflags', '+faststart', // 优化streaming
            '-pix_fmt', 'yuv420p',     // 兼容性
            '-y', outputPath            // 覆盖输出文件
        );

        console.log("🔧 FFmpeg参数:", args.join(' '));
        return args;
    }

    private parseDurationFromFFmpegOutput(data: string): void {
        if (this.totalDuration <= 0) {
            const durationMatch = data.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
            if (durationMatch) {
                const hours = parseInt(durationMatch[1], 10);
                const minutes = parseInt(durationMatch[2], 10);
                const seconds = parseFloat(durationMatch[3]);
                
                this.totalDuration = hours * 3600 + minutes * 60 + seconds;
                console.log(`📏 从FFmpeg输出解析到视频时长: ${this.totalDuration.toFixed(2)}秒`);
            }
        }
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
                const dataStr = data.toString();
                stderr += dataStr;
                this.parseDurationFromFFmpegOutput(dataStr);
                this.parseProgress(dataStr);
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
        const timeMatch = data.match(/time=(\d+):(\d+):(\d+\.\d+)/);
        if (timeMatch && this.totalDuration > 0) {
            const hours = parseInt(timeMatch[1], 10);
            const minutes = parseInt(timeMatch[2], 10);
            const seconds = parseFloat(timeMatch[3]);

            const currentTimeInSeconds = hours * 3600 + minutes * 60 + seconds;
            const progress = Math.min((currentTimeInSeconds / this.totalDuration) * 100, 100);

            this.context.reportProgress(progress);
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
            ["Target Format", targetFormat.value.toLowerCase()],
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
    async convert(params) {
        console.log("🎬 开始视频转换流程...");

        // 验证输入参数
        console.log("📋 验证输入参数...");
        VideoConverter.validateInputs(params);
        console.log("✅ 参数验证通过");

        const { mediaPath, mediaInfo, targetFormat, isCompress } = params;

        console.log("📂 输入文件信息:");
        console.log(`   文件路径: ${mediaPath}`);
        console.log(`   文件名: ${mediaInfo.name}`);
        console.log(`   格式: ${mediaInfo.kind.toUpperCase()}`);
        console.log(`   分辨率: ${mediaInfo.dimensions}`);
        console.log(`   质量: ${mediaInfo.quality}`);
        console.log(`   目标格式: ${targetFormat.value.toUpperCase()}`);
        console.log(`   压缩模式: ${isCompress ? '是' : '否'}`);

        // 生成输出路径
        console.log("📁 生成输出文件路径...");
        const outputPath = VideoConverter.generateOutputPath(mediaPath, targetFormat.value);
        console.log(`✅ 输出路径: ${outputPath}`);

        // 获取原始文件大小
        console.log("📏 获取原始文件大小...");
        const originalSize = await VideoConverter.getFileSize(mediaPath);
        console.log(`✅ 原始文件大小: ${VideoConverter.formatFileSize(originalSize)}`);

        // 构建FFmpeg参数
        console.log("⚙️ 构建转换参数...");
        const ffmpegArgs = this.buildFFmpegArgs(params, outputPath);
        console.log("✅ 转换参数构建完成");

        // 开始转换
        console.log("🚀 开始执行视频转换...");
        const startTime = Date.now();

        try {
            await this.executeFFmpeg(ffmpegArgs);
            console.log("✅ 视频转换成功完成!");
        } catch (error) {
            console.error("❌ 视频转换失败:", error.message);
            throw error;
        }

        // 计算转换时间
        const conversionTime = Date.now() - startTime;
        console.log(`⏱️ 转换耗时: ${(conversionTime / 1000).toFixed(1)}秒`);

        // 获取输出文件大小
        console.log("📊 获取输出文件信息...");
        const outputSize = await VideoConverter.getFileSize(outputPath);
        const compressionRatio = originalSize > 0 ? ((originalSize - outputSize) / originalSize * 100) : 0;

        console.log(`✅ 输出文件大小: ${VideoConverter.formatFileSize(outputSize)}`);
        if (compressionRatio > 0) {
            console.log(`📉 压缩比例: ${compressionRatio.toFixed(1)}%`);
        }

        // 创建预览
        console.log("📋 生成转换报告...");
        this.createPreview(
            mediaInfo,
            targetFormat,
            originalSize,
            outputSize,
            compressionRatio,
            conversionTime,
            isCompress
        );
        console.log("✅ 转换报告生成完成");
        console.log("🎉 视频转换流程全部完成!");
        return {
            media: outputPath
        };
    }
}

export class ConversionError extends Error {
    constructor(message: string, public readonly cause?: Error) {
        super(message);
        this.name = 'ConversionError';
    }
}