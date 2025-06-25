import { IMediaInfo, FFMPEG_PARAMS } from "./constants";

export class QualityAnalyzer {
    static analyzeQualityFromMediaInfo(mediaInfo: IMediaInfo): 'ultra' | 'high' | 'medium' | 'low' {
        const { dimensions, bitrateMbps } = mediaInfo;
        if (!dimensions || !bitrateMbps) return 'low';

        const { width, height } = dimensions;

        // 4K
        if (width >= 3840 && height >= 2160) {
            if (bitrateMbps >= 25) return 'ultra';
            if (bitrateMbps >= 15) return 'high';
            return 'medium';
        }

        // 2K
        if (width >= 2560 && height >= 1440) {
            return bitrateMbps >= 10 ? 'high' : 'medium';
        }

        // 1080p
        if (width >= 1920 && height >= 1080) {
            if (bitrateMbps >= 8) return 'high';
            if (bitrateMbps >= 4) return 'medium';
            return 'low';
        }

        // 720p
        if (width >= 1280 && height >= 720) {
            return bitrateMbps >= 5 ? 'medium' : 'low';
        }

        return 'low';
    }

    static getQualityPreset(mediaInfo: IMediaInfo): { crf: number; nvenc_cq: number; qsv_q: number } {
        const quality = this.analyzeQualityFromMediaInfo(mediaInfo);
        
        switch (quality) {
            case 'ultra':
            case 'high':
                return FFMPEG_PARAMS.QUALITY_PRESETS.medium;
            case 'medium':
                return FFMPEG_PARAMS.QUALITY_PRESETS.fast;
            case 'low':
            default:
                return FFMPEG_PARAMS.QUALITY_PRESETS.medium;
        }
    }
}
