export const VIDEO_FORMATS = [
    '.mp4', '.avi', '.mkv', '.mov', '.wmv', 
    '.flv', '.webm',
] as const;

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

// Define FFprobe return data type interfaces
export interface FFprobeStream {
    index: number;
    codec_name: string;
    codec_long_name: string;
    profile?: string;
    codec_type: 'video' | 'audio' | 'subtitle' | 'data';
    codec_tag_string: string;
    codec_tag: string;
    width?: number;
    height?: number;
    r_frame_rate?: string;
    avg_frame_rate?: string;
    time_base: string;
    start_pts: number;
    start_time: string;
    duration_ts?: number;
    duration?: string;
    bit_rate?: string;
    sample_rate?: string;
    channels?: number;
    channel_layout?: string;
    sample_fmt?: string;
    pix_fmt?: string;
    level?: number;
    color_range?: string;
    color_space?: string;
    [key: string]: any;
}

export interface FFprobeFormat {
    filename: string;
    nb_streams: number;
    nb_programs: number;
    format_name: string;
    format_long_name: string;
    start_time: string;
    duration: string;
    size: string;
    bit_rate: string;
    probe_score: number;
    tags?: { [key: string]: string };
}

export interface FFprobeData {
    streams: FFprobeStream[];
    format: FFprobeFormat;
}