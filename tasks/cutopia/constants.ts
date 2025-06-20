export const VIDEO_FORMATS = [
    '.mp4', '.avi', '.mkv', '.mov', '.wmv', 
    '.flv', '.webm',
] as const;

export const FORMAT_CONFIGS = {
    mp4: { video: 'libx264', audio: 'aac', container: 'mp4' },
    avi: { video: 'libx264', audio: 'mp3', container: 'avi' },
    mkv: { video: 'libx264', audio: 'aac', container: 'matroska' },
    mov: { video: 'libx264', audio: 'aac', container: 'mov' },
    wmv: { video: 'wmv2', audio: 'wmav2', container: 'asf' },
    webm: { video: 'libvpx-vp9', audio: 'libopus', container: 'webm' },
    flv: { video: 'libx264', audio: 'aac', container: 'flv' }
} as const;

export const HARDWARE_ACCELERATION = {
    nvidia: { decoder: 'h264_cuvid', encoder: 'h264_nvenc' },
    intel: { decoder: 'h264_qsv', encoder: 'h264_qsv' },
    amd: { decoder: 'h264_amf', encoder: 'h264_amf' }
} as const;

export const BYTES_PER_GB = 1_000_000_000;
export const BYTES_PER_MB = 1_000_000;
export const KBPS_PER_MBPS = 1000;

export const QUALITY_THRESHOLDS = {
    UHD: { width: 3840, height: 2160, bitrate: 15, highBitrate: 10 },
    QHD: { width: 2560, height: 1440, bitrate: 8 },
    FHD: { width: 1920, height: 1080, bitrate: 5, mediumBitrate: 2 },
    HD: { width: 1280, height: 720, bitrate: 2 }
} as const;

export const COLOR_MAPPINGS = {
    bt709: '1',
    bt2020: '9',
    smpte170m: '6',
    bt470bg: '5'
} as const;

export const CODEC_MAPPINGS = {
    video: {
        h264: 'H.264',
        hevc: 'H.265',
        h265: 'H.265',
        vp9: 'VP9',
        vp8: 'VP8',
        av1: 'AV1'
    },
    audio: {
        aac: 'MPEG-4 AAC',
        mp3: 'MPEG-1 Layer 3',
        ac3: 'Dolby Digital',
        opus: 'Opus',
        vorbis: 'Vorbis'
    }
} as const;

export interface ConversionOptions {
    customQuality?: number; // CRF值，0-51范围
    customBitrate?: string; // 自定义音频比特率
    preserveMetadata?: boolean; // 是否保留元数据
    hardwareAcceleration?: boolean; // 是否使用硬件加速
    preset?: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow';
}
