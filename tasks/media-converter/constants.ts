export const VIDEO_FORMATS = [
    '.mp4', '.avi', '.mkv', '.mov', '.wmv', 
    '.flv', '.webm',
] as const;

export const FORMAT_CONFIGS = {
    mp4: { 
        video: 'libx264', 
        videoHW: 'h264_nvenc', 
        videoQSV: 'h264_qsv',  
        audio: 'aac', 
        container: 'mp4',
        pixelFormat: 'yuv420p'
    },
    avi: { 
        video: 'libx264', 
        videoHW: 'h264_nvenc',
        videoQSV: 'h264_qsv',
        audio: 'mp3', 
        container: 'avi',
        pixelFormat: 'yuv420p'
    },
    mkv: { 
        video: 'libx264', 
        videoHW: 'h264_nvenc',
        videoQSV: 'h264_qsv',
        audio: 'aac', 
        container: 'matroska',
        pixelFormat: 'yuv420p'
    },
    mov: { 
        video: 'libx264', 
        videoHW: 'h264_nvenc',
        videoQSV: 'h264_qsv',
        audio: 'aac', 
        container: 'mov',
        pixelFormat: 'yuv420p'
    },
    wmv: { 
        video: 'wmv2', 
        audio: 'wmav2', 
        container: 'asf',
        pixelFormat: 'yuv420p'
    },
    webm: { 
        video: 'libvpx-vp9', 
        audio: 'libopus', 
        container: 'webm',
        pixelFormat: 'yuv420p'
    },
    flv: { 
        video: 'libx264', 
        videoHW: 'h264_nvenc',
        videoQSV: 'h264_qsv',
        audio: 'aac', 
        container: 'flv',
        pixelFormat: 'yuv420p'
    }
} as const;

export const FFMPEG_PARAMS = {
    INPUT_OPTIMIZATION: {
        fflags: '+fastseek+genpts',
        probesize: '16M',      // 从32M降低到16M
        analyzeduration: '5M'  // 从10M降低到5M
    },
    THREAD_OPTIMIZATION: {
        maxThreads: 4,         // 限制最大线程数
        defaultThreads: 2      // 默认线程数
    },
    QUALITY_PRESETS: {
        fast: { crf: 28, nvenc_cq: 28, qsv_q: 28 },
        medium: { crf: 24, nvenc_cq: 24, qsv_q: 24 },
        high: { crf: 20, nvenc_cq: 20, qsv_q: 20 },
        lossless: { crf: 18, nvenc_cq: 18, qsv_q: 18 }
    },
    AUDIO_BITRATES: {
        low: '96k',
        medium: '128k',
        high: '192k',
        lossless: '320k'
    },
    PRESETS: {
        software: ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower', 'veryslow'],
        nvenc: ['fast', 'medium', 'slow'],
        qsv: ['veryfast', 'faster', 'fast', 'medium', 'slow']
    }
} as const;

export const CODEC_COMPATIBILITY = {
    // 视频编码兼容性
    video: {
        h264: ['mp4', 'avi', 'mkv', 'mov', 'flv'],
        h265: ['mp4', 'mkv', 'mov'],
        vp8: ['webm'],
        vp9: ['webm', 'mkv'],
        wmv2: ['wmv'],
        xvid: ['avi']
    },
    // 音频编码兼容性
    audio: {
        aac: ['mp4', 'mkv', 'mov', 'flv'],
        mp3: ['avi', 'mkv'],
        opus: ['webm', 'mkv'],
        vorbis: ['webm', 'mkv'],
        wmav2: ['wmv']
    }
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

export interface ConversionOptions {
    customQuality?: number;
    customBitrate?: string;
    preserveMetadata?: boolean;
    hardwareAcceleration?: boolean | 'nvidia' | 'intel' | 'auto'; // 扩展硬件加速选项
    preset?: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow';
    copyStreams?: boolean; // 直接复制流，最快的转换方式
    threads?: number; // 线程数
    maxThreads?: number;
}

