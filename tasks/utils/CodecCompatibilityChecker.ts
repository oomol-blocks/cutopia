import { FORMAT_CONFIGS, CODEC_COMPATIBILITY, IMediaInfo } from "./constants";

export interface StreamCompatibilityResult {
    videoCompatible: boolean;
    audioCompatible: boolean;
    videoCodec: string | null;
    audioCodec: string | null;
}

export class CodecCompatibilityChecker {
    static checkStreamCompatibility(
        mediaInfo: IMediaInfo, 
        targetFormat: keyof typeof FORMAT_CONFIGS
    ): StreamCompatibilityResult {
        const targetConfig = FORMAT_CONFIGS[targetFormat];

        if (!targetConfig) {
            return {
                videoCompatible: false,
                audioCompatible: false,
                videoCodec: null,
                audioCodec: null
            };
        }

        const videoCodec = mediaInfo.videoCodec || null;
        const audioCodec = mediaInfo.audioCodec || null;

        if (!videoCodec || !audioCodec) {
            return {
                videoCompatible: false,
                audioCompatible: false,
                videoCodec,
                audioCodec
            };
        }

        const videoCompatible = this.isCodecCompatible(videoCodec, targetFormat, 'video');
        const audioCompatible = this.isCodecCompatible(audioCodec, targetFormat, 'audio');

        return {
            videoCompatible,
            audioCompatible,
            videoCodec,
            audioCodec
        };
    }

    static isCodecCompatible(
        codec: string, 
        targetFormat: keyof typeof FORMAT_CONFIGS, 
        type: 'video' | 'audio'
    ): boolean {
        const compatibility = CODEC_COMPATIBILITY[type];
        const codecFormats = compatibility[codec as keyof typeof compatibility] as string;
        return codecFormats ? codecFormats.includes(targetFormat) : false;
    }

    static canCopyAllStreams(
        mediaInfo: IMediaInfo, 
        targetFormat: keyof typeof FORMAT_CONFIGS,
        enableCopyStreams: boolean = true
    ): boolean {
        if (!enableCopyStreams) return false;

        const { videoCompatible, audioCompatible } = this.checkStreamCompatibility(mediaInfo, targetFormat);
        return videoCompatible && audioCompatible;
    }
}
