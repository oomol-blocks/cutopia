import type { Context } from "@oomol/types/oocana";
import { spawn } from "child_process";
import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg";
import path from "path";
import * as fs from 'node:fs/promises';

import {
    FORMAT_CONFIGS,
    ConversionOptions,
    FFMPEG_PARAMS,
    CODEC_COMPATIBILITY,
    IMediaInfo,
} from "./constants";
import { FFmpegExecutor } from "./FFmpegExecutor";
import { FFmpegArgsBuilder } from "./FFmpegArgsBuilder";
import { FileUtils } from "./FileUtils";

export interface BaseInputs {
    outputDir?: string;
    mediaInfo: IMediaInfo;
}

export interface BaseOutputs {
    mediaPath: string;
}

export abstract class BaseVideoConverter<TInputs extends BaseInputs, TOutputs extends BaseOutputs> {
    protected readonly context: Context<TInputs, TOutputs>;
    protected readonly options: ConversionOptions;
    protected abstract readonly targetFormat: keyof typeof FORMAT_CONFIGS;

    private ffmpegArgsBuilder: FFmpegArgsBuilder;
    private ffmpegExecutor: FFmpegExecutor;

    constructor(context: Context<TInputs, TOutputs>, options: ConversionOptions = {}) {
        this.context = context;
        this.options = {
            preserveMetadata: true,
            hardwareAcceleration: 'auto',
            preset: 'fast',
            copyStreams: true,
            threads: Math.min(options.maxThreads || FFMPEG_PARAMS.THREAD_OPTIMIZATION.maxThreads, 4),
            ...options
        };

        this.ffmpegExecutor = new FFmpegExecutor(this.context);
    }

    protected validateInputs(params: TInputs): void {
        const { mediaInfo } = params;

        if (!mediaInfo) {
            throw new Error("Media Info is required");
        }

        if (!mediaInfo.size || mediaInfo.size <= 0) {
            throw new Error('MediaInfo size is missing');
        }

        if (!mediaInfo.path) {
            throw new Error("Media path is required");
        }

        if (!mediaInfo.dimensions) {
            throw new Error("Media dimensions is required");
        }
    }

    protected initializeArgsBuilder(): void {
        this.ffmpegArgsBuilder = new FFmpegArgsBuilder(this.targetFormat, {
            preserveMetadata: this.options.preserveMetadata!,
            copyStreams: this.options.copyStreams!,
            threads: this.options.threads!,
            preset: this.options.preset!,
            customQuality: this.options.customQuality,
            customBitrate: this.options.customBitrate
        });
    }

    async convert(params: TInputs): Promise<TOutputs> {
        console.log(`🎬 开始转换到 ${this.targetFormat.toUpperCase()} 格式...`);

        this.validateInputs(params);
        console.log("✅ 参数验证通过");

        const { mediaInfo, outputDir } = params;
        const originalSize = mediaInfo.size;

        console.log("📂 输入文件信息:");
        console.log(`   文件路径: ${mediaInfo.path}`);
        console.log(`   文件大小: ${FileUtils.formatFileSize(originalSize)}`);
        console.log(`   目标格式: ${this.targetFormat.toUpperCase()}`);

        // 生成输出路径
        let outputPath: string;
        if (!outputDir) {
            outputPath = FileUtils.generateOutputPath(mediaInfo.path, this.targetFormat);
            console.warn(`✅ 输出路径未指定，将使用默认路径: ${outputPath}`);
        } else {
            outputPath = FileUtils.generateOutputPathFromDir(mediaInfo.path, outputDir, this.targetFormat);
            console.log(`✅ 输出路径: ${outputPath}`);
        }

        // 初始化参数构建器并构建FFmpeg参数
        this.initializeArgsBuilder();
        const ffmpegArgs = this.ffmpegArgsBuilder.buildArgs(mediaInfo, outputPath);

        console.log("🚀 开始执行视频转换...");
        const startTime = Date.now();

        try {
            await this.ffmpegExecutor.execute(ffmpegArgs);
            console.log("✅ 视频转换成功完成!");
        } catch (error) {
            console.error("❌ 视频转换失败:", error.message);
            throw error;
        }

        const conversionTime = Date.now() - startTime;
        const outputSize = await FileUtils.getFileSize(outputPath);

        console.log(`⏰ 转换时长：${formatTime(conversionTime)}. 输出文件大小：${FileUtils.formatFileSize(outputSize)}`);
        console.log(`🎉 转换到 ${this.targetFormat.toUpperCase()} 格式完成!`);
        return {
            mediaPath: outputPath
        } as TOutputs;
    }
}

function formatTime(milliseconds) {
    if (milliseconds < 1000) {
        return `${milliseconds} 毫秒`;
    } else if (milliseconds < 60000) {
        return `${(milliseconds / 1000).toFixed(2)} 秒`;
    } else {
        const minutes = Math.floor(milliseconds / 60000);
        const seconds = ((milliseconds % 60000) / 1000).toFixed(2);
        return `${minutes} 分 ${seconds} 秒`;
    }
}

export class ConversionError extends Error {
    constructor(message: string, public readonly cause?: Error) {
        super(message);
        this.name = 'ConversionError';
    }
}
