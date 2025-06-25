export const VIDEO_FORMATS = [
    '.mp4', '.avi', '.mkv', '.mov', '.wmv', 
    '.flv', '.webm',
] as const;

// 每种格式的配置
export const FORMAT_CONFIGS = {
    mp4: {
        extension: '.mp4',
        video: 'libx264',
        audio: 'aac',
        pixelFormat: 'yuv420p',
        container: 'mp4'
    },
    mov: {
        extension: '.mov',
        video: 'libx264',
        audio: 'aac',
        pixelFormat: 'yuv420p',
        container: 'mov'
    },
    avi: {
        extension: '.avi',
        video: 'libx264',
        audio: 'aac',
        pixelFormat: 'yuv420p',
        container: 'avi'
    },
    mkv: {
        extension: '.mkv',
        video: 'libx264',
        audio: 'aac',
        pixelFormat: 'yuv420p',
        container: 'matroska'
    },
    webm: {
        extension: '.webm',
        video: 'libvpx-vp9',
        audio: 'libopus',
        pixelFormat: 'yuv420p',
        container: 'webm'
    },
    wmv: {
        extension: '.wmv',
        video: 'wmv2',
        audio: 'wmav2',
        pixelFormat: 'yuv420p',
        container: 'asf'
    },
    flv: {
        extension: '.flv',
        video: 'libx264',
        audio: 'aac',
        pixelFormat: 'yuv420p',
        container: 'flv'
    }
} as const;

export const FFMPEG_PARAMS = {
    QUALITY_PRESETS: {
        lossless: { crf: 0, nvenc_cq: 0, qsv_q: 1 },
        high: { crf: 18, nvenc_cq: 19, qsv_q: 20 },
        medium: { crf: 23, nvenc_cq: 23, qsv_q: 25 },
        fast: { crf: 28, nvenc_cq: 28, qsv_q: 30 },
        low: { crf: 35, nvenc_cq: 35, qsv_q: 35 }
    },
    AUDIO_BITRATES: {
        high: '320k',
        medium: '192k',
        low: '128k'
    },
    INPUT_OPTIMIZATION: {
        fflags: '+genpts+igndts',
        probesize: '50M',
        analyzeduration: '100M'
    },
    THREAD_OPTIMIZATION: {
        defaultThreads: 2,
        maxThreads: 8
    }
} as const;

// 编码器兼容性映射
export const CODEC_COMPATIBILITY = {
    video: {
        h264: 'mp4,mov,avi,mkv,flv',
        h265: 'mp4,mov,mkv',
        hevc: 'mp4,mov,mkv',
        vp9: 'webm,mkv',
        vp8: 'webm,mkv',
        wmv2: 'wmv,asf'
    },
    audio: {
        aac: 'mp4,mov,avi,mkv,flv',
        mp3: 'avi,mkv',
        opus: 'webm,mkv',
        vorbis: 'webm,mkv',
        wmav2: 'wmv,asf'
    }
} as const;

export interface ConversionOptions {
    customQuality?: number;
    customBitrate?: string;
    preserveMetadata?: boolean;
    hardwareAcceleration?: 'auto' | 'nvidia' | 'intel' | 'amd' | 'none';
    preset?: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow';
    copyStreams?: boolean;
    threads?: number;
    maxThreads?: number;
}

export interface IMediaInfo {
    path: string;                    // 输入文件路径
    dimensions: {
        width: number;
        height: number;
    }                                // 视频尺寸
    size: number;                    // 文件大小
    containerFormat: string;         // 容器格式
    videoCodec?: string;             // 视频编解码器
    audioCodec?: string;             // 音频编解码器
    bitrateMbps?: number;            // 比特率（以兆比特每秒为单位）
}

// FFprobe interfaces
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
