import { FORMAT_CONFIGS, FFMPEG_PARAMS, IMediaInfo } from "./constants";
import { QualityAnalyzer } from "./QualityAnalyzer";
import { CodecCompatibilityChecker } from "./CodecCompatibilityChecker";

export interface FFmpegArgsBuilderOptions {
    preserveMetadata: boolean;
    copyStreams: boolean;
    threads: number;
    preset: string;
    customQuality?: number;
    customBitrate?: string;
}

export class FFmpegArgsBuilder {
    constructor(
        private targetFormat: keyof typeof FORMAT_CONFIGS,
        private options: FFmpegArgsBuilderOptions
    ) {}

    buildArgs(mediaInfo: IMediaInfo, outputPath: string): string[] {
        const args: string[] = [];

        // 输入优化参数
        this.addInputOptimizationArgs(args);
        
        // 输入文件
        args.push('-i', mediaInfo.path!);

        // 编解码器参数
        this.addCodecArgs(args, mediaInfo);

        // 线程数
        args.push('-threads', this.options.threads.toString());

        // 元数据
        if (this.options.preserveMetadata) {
            args.push('-map_metadata', '0');
        }

        // 输出优化和格式参数
        this.addOutputOptimizationArgs(args, outputPath);

        console.log("👀 FFmpeg参数:", args.join(' '));
        return args;
    }

    private addInputOptimizationArgs(args: string[]): void {
        args.push(
            '-fflags', FFMPEG_PARAMS.INPUT_OPTIMIZATION.fflags,
            '-probesize', FFMPEG_PARAMS.INPUT_OPTIMIZATION.probesize,
            '-analyzeduration', FFMPEG_PARAMS.INPUT_OPTIMIZATION.analyzeduration
        );
    }

    private addCodecArgs(args: string[], mediaInfo: IMediaInfo): void {
        const formatConfig = FORMAT_CONFIGS[this.targetFormat];
        const streamCompatibility = CodecCompatibilityChecker.checkStreamCompatibility(mediaInfo, this.targetFormat);
        const canCopyAll = CodecCompatibilityChecker.canCopyAllStreams(mediaInfo, this.targetFormat, this.options.copyStreams);

        if (canCopyAll) {
            console.log("🚀 使用完全流复制模式");
            args.push('-c', 'copy');
        } else {
            this.addVideoCodecArgs(args, formatConfig, streamCompatibility.videoCompatible, mediaInfo);
            this.addAudioCodecArgs(args, formatConfig, streamCompatibility.audioCompatible);
        }
    }

    private addVideoCodecArgs(
        args: string[],
        formatConfig: typeof FORMAT_CONFIGS[keyof typeof FORMAT_CONFIGS],
        videoCompatible: boolean,
        mediaInfo: IMediaInfo
    ): void {
        if (videoCompatible) {
            console.log("视频流复制模式");
            args.push('-c:v', 'copy');
        } else {
            console.log("视频重新编码");
            const videoCodecName = formatConfig.video;
            args.push('-c:v', videoCodecName);
            this.addVideoQualityArgs(args, videoCodecName, mediaInfo);
        }
    }

    private addAudioCodecArgs(
        args: string[],
        formatConfig: typeof FORMAT_CONFIGS[keyof typeof FORMAT_CONFIGS],
        audioCompatible: boolean
    ): void {
        if (audioCompatible) {
            console.log("音频流复制模式");
            args.push('-c:a', 'copy');
        } else {
            console.log("音频重新编码");
            args.push('-c:a', formatConfig.audio);
            const audioBitrate = this.options.customBitrate || FFMPEG_PARAMS.AUDIO_BITRATES.medium;
            args.push('-b:a', audioBitrate);
        }
    }

    private addVideoQualityArgs(
        args: string[],
        videoCodecName: string,
        mediaInfo: IMediaInfo
    ): void {
        const qualityPreset = QualityAnalyzer.getQualityPreset(mediaInfo);
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
            args.push('-preset', this.options.preset);
        }
    }

    private addOutputOptimizationArgs(args: string[], outputPath: string): void {
        const formatConfig = FORMAT_CONFIGS[this.targetFormat];
        args.push(
            '-movflags', '+faststart',
            '-pix_fmt', formatConfig.pixelFormat || 'yuv420p',
            '-y', outputPath
        );
    }
}
