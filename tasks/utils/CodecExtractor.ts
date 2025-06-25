import { FFprobeStream } from "./constants";

export class CodecExtractor {
    /**
     * 从FFprobe流数据提取视频编解码器
     */
    static extractVideoCodecFromStream(videoStream: FFprobeStream): string | undefined {
        if (!videoStream?.codec_name) return undefined;
        return CodecExtractor.normalizeVideoCodec(videoStream.codec_name);
    }

    /**
     * 从FFprobe流数据提取音频编解码器
     */
    static extractAudioCodecFromStream(audioStream: FFprobeStream): string | undefined {
        if (!audioStream?.codec_name) return undefined;
        return CodecExtractor.normalizeAudioCodec(audioStream.codec_name);
    }

    /**
     * 标准化视频编解码器名称
     */
    static normalizeVideoCodec(codecName: string): string {
        const normalized = codecName.toLowerCase();
        
        if (normalized.includes('h264') || normalized === 'avc') return 'h264';
        if (normalized.includes('h265') || normalized === 'hevc') return 'h265';
        if (normalized === 'vp9') return 'vp9';
        if (normalized === 'vp8') return 'vp8';
        if (normalized.includes('wmv')) return 'wmv2';
        
        return normalized;
    }

    /**
     * 标准化音频编解码器名称
     */
    static normalizeAudioCodec(codecName: string): string {
        const normalized = codecName.toLowerCase();
        
        if (normalized === 'aac') return 'aac';
        if (normalized === 'mp3') return 'mp3';
        if (normalized === 'opus') return 'opus';
        if (normalized === 'vorbis') return 'vorbis';
        if (normalized.includes('wmav')) return 'wmav2';
        
        return normalized;
    }
}
