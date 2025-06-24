import type { Context } from "@oomol/types/oocana";
import { spawn } from "child_process";
import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg";
import path from "path"
import * as fs from 'node:fs/promises';

import { FORMAT_CONFIGS, ConversionOptions, VIDEO_FORMATS, BYTES_PER_GB, BYTES_PER_MB, FFMPEG_PARAMS, CODEC_COMPATIBILITY } from "./constants"
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
            threads: Math.min(options.maxThreads || FFMPEG_PARAMS.THREAD_OPTIMIZATION.maxThreads, 4),
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

    private static getFileSizeFromMediaInfo(mediaInfo: MediaInfo): number {
        if (typeof mediaInfo.size === 'number') {
            return mediaInfo.size;
        }
        if (typeof mediaInfo.size === 'string') {
            // 解析文件大小字符串，如 "1.5 GB", "500 MB"
            const sizeMatch = mediaInfo.size.match(/^([\d.]+)\s*(GB|MB|KB|B)$/i);
            if (sizeMatch) {
                const value = parseFloat(sizeMatch[1]);
                const unit = sizeMatch[2].toUpperCase();
                switch (unit) {
                    case 'GB': return Math.floor(value * BYTES_PER_GB);
                    case 'MB': return Math.floor(value * BYTES_PER_MB);
                    case 'KB': return Math.floor(value * 1000);
                    case 'B': return Math.floor(value);
                    default: return 0;
                }
            }
        }
        return 0;
    }

    private static generateOutputPath(inputPath: string, targetFormat: string): string {
        return `${inputPath.replace(path.extname(inputPath), '')}-${Date.now()}${targetFormat}`;
    }

    private static generateOutputPathFromDir(inputPath: string, outputDir: string, targetExtension: string): string {
        const baseName = path.basename(inputPath, path.extname(inputPath));
        return path.join(outputDir, `${baseName}-${Date.now()}${targetExtension}`);
    }

    private getQualityPreset(quality: string, isCompress: boolean): { crf: number; nvenc_cq: number; qsv_q: number } {
        if (!isCompress) {
            return FFMPEG_PARAMS.QUALITY_PRESETS.lossless;
        }

        if (quality.includes('4K') || quality.includes('UHD')) {
            return FFMPEG_PARAMS.QUALITY_PRESETS.medium;
        }

        if (quality.includes('2K') || quality.includes('QHD')) {
            return FFMPEG_PARAMS.QUALITY_PRESETS.medium;
        }

        if (quality.includes('1080p') || quality.includes('FHD')) {
            return FFMPEG_PARAMS.QUALITY_PRESETS.fast;
        }

        if (quality.includes('720p') || quality.includes('HD')) {
            return FFMPEG_PARAMS.QUALITY_PRESETS.fast;
        }

        return FFMPEG_PARAMS.QUALITY_PRESETS.medium;
    }

    private canCopyAllStreams(mediaInfo: MediaInfo, targetFormat: string): boolean {
        if (!this.options.copyStreams) return false;

        const { videoCompatible, audioCompatible } = this.checkStreamCompatibility(mediaInfo, targetFormat);

        console.log(`🔍 完全流复制检查:`);
        console.log(`   视频兼容: ${videoCompatible ? '✅' : '❌'}`);
        console.log(`   音频兼容: ${audioCompatible ? '✅' : '❌'}`);
        console.log(`   可完全复制: ${videoCompatible && audioCompatible ? '✅' : '❌'}`);

        return videoCompatible && audioCompatible;
    }

    private checkStreamCompatibility(mediaInfo: MediaInfo, targetFormat: string): {
        videoCompatible: boolean;
        audioCompatible: boolean;
        videoCodec: string | null;
        audioCodec: string | null;
    } {
        const targetFormatKey = targetFormat.substring(1);
        const targetConfig = FORMAT_CONFIGS[targetFormatKey.toLowerCase() as keyof typeof FORMAT_CONFIGS];

        if (!targetConfig) {
            return {
                videoCompatible: false,
                audioCompatible: false,
                videoCodec: null,
                audioCodec: null
            };
        }

        // 提取编码格式
        const videoCodec = this.extractVideoCodec(mediaInfo);
        const audioCodec = this.extractAudioCodec(mediaInfo);

        // 如果无法确定编码格式，不使用流复制
        if (!videoCodec || !audioCodec) {
            return {
                videoCompatible: false,
                audioCompatible: false,
                videoCodec,
                audioCodec
            };
        }

        // 检查编码兼容性
        const videoCompatible = this.isCodecCompatible(videoCodec, targetFormatKey, 'video');
        const audioCompatible = this.isCodecCompatible(audioCodec, targetFormatKey, 'audio');

        return {
            videoCompatible,
            audioCompatible,
            videoCodec,
            audioCodec
        };
    }

    private addVideoCodecArgs(
        args: string[],
        formatConfig: any,
        videoCompatible: boolean,
        isCompress: boolean,
        mediaInfo: MediaInfo
    ): void {
        if (videoCompatible && !isCompress) {
            console.log("🎥 视频流复制模式");
            args.push('-c:v', 'copy');
        } else {
            console.log("🎥 视频重新编码");
            const videoCodecName = formatConfig.video;
            args.push('-c:v', videoCodecName);

            // 添加视频质量参数
            this.addVideoQualityArgs(args, videoCodecName, isCompress, mediaInfo);
        }
    }

    private addAudioCodecArgs(
        args: string[],
        formatConfig: any,
        audioCompatible: boolean,
        isCompress: boolean
    ): void {
        if (audioCompatible && !isCompress) {
            console.log("🎵 音频流复制模式");
            args.push('-c:a', 'copy');
        } else {
            console.log("🎵 音频重新编码");
            args.push('-c:a', formatConfig.audio);

            // 添加音频比特率
            const audioBitrate = this.options.customBitrate || FFMPEG_PARAMS.AUDIO_BITRATES.medium;
            args.push('-b:a', audioBitrate);
        }
    }

    private addVideoQualityArgs(
        args: string[],
        videoCodecName: string,
        isCompress: boolean,
        mediaInfo: MediaInfo
    ): void {
        const qualityPreset = this.getQualityPreset(mediaInfo.quality, isCompress);

        if (isCompress) {
            // 分辨率缩放
            const { width, height } = VideoConverter.parseDimensions(mediaInfo.dimensions);
            if (width > 1920 || height > 1080) {
                args.push('-vf',
                    'scale=1920:1080:force_original_aspect_ratio=decrease:force_divisible_by=2'
                );
            }
        }

        // 质量设置
        const customQuality = this.options.customQuality;
        let qualityValue: number;

        if (videoCodecName.includes('nvenc')) {
            qualityValue = customQuality || qualityPreset.nvenc_cq;
            args.push('-cq', qualityValue.toString());
            args.push('-preset', 'fast');
        } else if (videoCodecName.includes('qsv')) {
            qualityValue = customQuality || qualityPreset.qsv_q;
            args.push('-q', qualityValue.toString());
            args.push('-preset', 'fast');
        } else {
            qualityValue = customQuality || qualityPreset.crf;
            args.push('-crf', qualityValue.toString());
            args.push('-preset', this.options.preset!);
        }
    }

    private extractVideoCodec(mediaInfo: MediaInfo): string | null {
        // 优先从 videoCodec 字段获取
        if (mediaInfo.videoCodec) {
            return mediaInfo.videoCodec.toLowerCase();
        }

        // 从 codecs 字段解析
        if (mediaInfo.codecs) {
            const codecs = mediaInfo.codecs.toLowerCase();
            if (codecs.includes('h264') || codecs.includes('avc')) return 'h264';
            if (codecs.includes('h265') || codecs.includes('hevc')) return 'h265';
            if (codecs.includes('vp9')) return 'vp9';
            if (codecs.includes('vp8')) return 'vp8';
            if (codecs.includes('wmv')) return 'wmv2';
        }

        // 从容器格式推断
        const containerFormat = mediaInfo.containerFormat || mediaInfo.kind;
        if (containerFormat) {
            const format = containerFormat.toLowerCase();
            if (format === 'webm') return 'vp9'; // webm 通常使用 vp9
            if (format === 'wmv') return 'wmv2';
        }

        return null;
    }

    private extractAudioCodec(mediaInfo: MediaInfo): string | null {
        // 优先从 audioCodec 字段获取
        if (mediaInfo.audioCodec) {
            return mediaInfo.audioCodec.toLowerCase();
        }

        // 从 codecs 字段解析
        if (mediaInfo.codecs) {
            const codecs = mediaInfo.codecs.toLowerCase();
            if (codecs.includes('aac')) return 'aac';
            if (codecs.includes('mp3')) return 'mp3';
            if (codecs.includes('opus')) return 'opus';
            if (codecs.includes('vorbis')) return 'vorbis';
            if (codecs.includes('wmav2')) return 'wmav2';
        }

        // 从容器格式推断
        const containerFormat = mediaInfo.containerFormat || mediaInfo.kind;
        if (containerFormat) {
            const format = containerFormat.toLowerCase();
            if (format === 'webm') return 'opus'; // webm 通常使用 opus
            if (format === 'wmv') return 'wmav2';
        }

        return null;
    }

    private isCodecCompatible(codec: string, targetFormat: string, type: 'video' | 'audio'): boolean {
        const compatibility = CODEC_COMPATIBILITY[type];
        const codecFormats = compatibility[codec as keyof typeof compatibility] as string;
        return codecFormats ? codecFormats.includes(targetFormat) : false;
    }

    private buildFFmpegArgs(params: Inputs, outputPath: string): string[] {
        const { mediaPath, mediaInfo, targetFormat, isCompress } = params;
        const args: string[] = [];

        // TODO：硬件加速
        // 输入设置
        args.push(
            '-fflags', FFMPEG_PARAMS.INPUT_OPTIMIZATION.fflags,
            '-probesize', FFMPEG_PARAMS.INPUT_OPTIMIZATION.probesize,
            '-analyzeduration', FFMPEG_PARAMS.INPUT_OPTIMIZATION.analyzeduration
        );

        args.push('-i', mediaPath!);

        const targetFormatKey = targetFormat!.value.substring(1);
        const formatConfig = FORMAT_CONFIGS[targetFormatKey.toLowerCase() as keyof typeof FORMAT_CONFIGS];

        if (!formatConfig) {
            throw new Error(`Unsupported format: ${targetFormat.value}`);
        }

        // 检查流兼容性，判断是否可以直接复制流
        const streamCompatibility = this.checkStreamCompatibility(mediaInfo, targetFormat!.value);
        const { videoCompatible, audioCompatible, videoCodec, audioCodec } = streamCompatibility;

        if (this.canCopyAllStreams(mediaInfo, targetFormat!.value) && !isCompress) {
            console.log("🚀 使用完全流复制模式");
            args.push('-c', 'copy');
        } else {
            // 分别处理视频和音频编码
            this.addVideoCodecArgs(args, formatConfig, videoCompatible, isCompress, mediaInfo);
            this.addAudioCodecArgs(args, formatConfig, audioCompatible, isCompress);
        }

        // 线程设置
        const maxThreads = this.options.threads || FFMPEG_PARAMS.THREAD_OPTIMIZATION.defaultThreads;
        args.push('-threads', maxThreads.toString());

        // 元数据处理
        if (this.options.preserveMetadata) {
            args.push('-map_metadata', '0');
        }

        // 输出设置
        args.push(
            '-movflags', '+faststart',
            '-pix_fmt', formatConfig.pixelFormat || 'yuv420p',
            '-y', outputPath
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
                console.log(`📏 视频时长: ${this.totalDuration.toFixed(2)}秒`);
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
        inputPath: string,
        outputPath: string,
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
            ["Original File", inputPath],
            ["Target File", outputPath],
            ["Original Size", VideoConverter.formatFileSize(originalSize)],
            ["Output Size", VideoConverter.formatFileSize(outputSize) + compressionInfo],
            ["Conversion Time", `${(conversionTime / 1000).toFixed(1)}s`],
            ...(compressionRatio > 0 ? [["Compression Ratio", `${compressionRatio.toFixed(1)}%`]] : []),
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

        VideoConverter.validateInputs(params);
        console.log("✅ 参数验证通过");

        const { mediaPath, mediaInfo, targetFormat, isCompress, outputDir } = params;

        // 获取文件大小（优先从 mediaInfo，然后从文件系统）
        let originalSize = VideoConverter.getFileSizeFromMediaInfo(mediaInfo);
        if (originalSize === 0) {
            originalSize = await VideoConverter.getFileSize(mediaPath!);
            // 更新 mediaInfo 中的 size
            mediaInfo.size = originalSize;
        }

        console.log("📂 输入文件信息:");
        console.log(`   文件路径: ${mediaPath}`);
        console.log(`   文件大小: ${VideoConverter.formatFileSize(originalSize)}`);
        console.log(`   目标格式: ${targetFormat!.value.toUpperCase()}`);
        console.log(`   压缩模式: ${isCompress ? '是' : '否'}`);

        let outputPath = ""
        if (!outputDir) {
            outputPath = VideoConverter.generateOutputPath(mediaPath, targetFormat.value);
            console.warn(`✅ 输出路径未指定，将使用默认路径: ${outputPath}`);
        } else {
            outputPath = VideoConverter.generateOutputPathFromDir(mediaPath, outputDir, targetFormat.value)
            console.log(`✅ 输出路径: ${outputPath}`);
        }

        const ffmpegArgs = this.buildFFmpegArgs(params, outputPath);

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
        const outputSize = await VideoConverter.getFileSize(outputPath);
        const compressionRatio = originalSize > 0 ? ((originalSize - outputSize) / originalSize * 100) : 0;

        console.log(`✅ 输出文件大小: ${VideoConverter.formatFileSize(outputSize)}`);
        if (compressionRatio > 0) {
            console.log(`📉 压缩比例: ${compressionRatio.toFixed(1)}%`);
        }

        // 创建预览
        this.createPreview(
            mediaPath,
            outputPath,
            originalSize,
            outputSize,
            compressionRatio,
            conversionTime,
            isCompress
        );

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
