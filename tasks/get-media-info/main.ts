//#region generated meta
type Inputs = {
    mediaPath: string;
};
type Outputs = {
    mediaPath: string;
    mediaInfo: { format_name: string; audioChannels: string; codeRate: string; codecs: string; colorProfile: string; duration: string; name: string; kind: string; size: string; quality: string; dimensions: string };
};
//#endregion

type MediaInfo = Outputs["mediaInfo"];

import type { Context } from "@oomol/types/oocana";
import { path as ffprobePath } from "@ffprobe-installer/ffprobe";
import { spawn } from "child_process";
import path from "path";
import { VIDEO_FORMATS, BYTES_PER_GB, BYTES_PER_MB, KBPS_PER_MBPS, QUALITY_THRESHOLDS, COLOR_MAPPINGS, CODEC_MAPPINGS, FFprobeStream, FFprobeData } from "./constants"


export default async function (
    params: Inputs,
    context: Context<Inputs, Outputs>
): Promise<Partial<Outputs> | undefined | void> {
    try {
        const { mediaPath } = params;

        // Validate input
        if (!mediaPath || typeof mediaPath !== 'string') {
            throw new Error('Invalid media path provided');
        }

        const mediaData = await MediaAnalyzer.getMediaData(mediaPath);
        const mediaInfo = MediaAnalyzer.analyzeMedia(mediaData, mediaPath);

        if (!VIDEO_FORMATS.includes(`.${mediaInfo.kind}` as (typeof VIDEO_FORMATS)[number])) {
            throw new Error(`Unsupported video format: .${mediaInfo.kind}`);
        }

        // Create preview table
        const previewRows = [
            ["File Name", mediaInfo.name],
            ["Kind", mediaInfo.kind],
            ["Size", mediaInfo.size],
            ["Dimensions", mediaInfo.dimensions],
            ...(mediaInfo.duration ? [["Duration", mediaInfo.duration]] : []),
            ["Quality", mediaInfo.quality],
            ...(mediaInfo.codecs ? [["Codecs", mediaInfo.codecs]] : []),
            ...(mediaInfo.colorProfile ? [["Color Profile", mediaInfo.colorProfile]] : []),
            ...(mediaInfo.codeRate ? [["Code Rate", mediaInfo.codeRate]] : []),
            ...(mediaInfo.audioChannels ? [["Audio Channels", mediaInfo.audioChannels]] : [])
        ];

        context.preview({
            type: "table",
            data: {
                columns: ["Property", "Value"],
                rows: previewRows
            }
        });

        return {
            mediaPath,
            mediaInfo
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

        context.preview({
            type: "table",
            data: {
                columns: ["Error", "Details"],
                rows: [["Media Analysis Failed", errorMessage]]
            }
        });

        throw new Error(`Media analysis failed: ${errorMessage}`);
    }
};

class MediaAnalyzer {
    private static formatFileSize(bytes: number): string {
        if (bytes >= BYTES_PER_GB) {
            return `${(bytes / BYTES_PER_GB).toFixed(2)} GB`;
        }
        return `${(bytes / BYTES_PER_MB).toFixed(2)} MB`;
    }

    private static formatDuration(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        const formatTime = (time: number) => time.toString().padStart(2, '0');

        return hours > 0
            ? `${hours}:${formatTime(minutes)}:${formatTime(secs)}`
            : `${minutes}:${formatTime(secs)}`;
    }

    private static getCodecName(codecName: string, type: 'video' | 'audio'): string {
        const mappings = CODEC_MAPPINGS[type];
        return mappings[codecName as keyof typeof mappings] || codecName.toUpperCase();
    }

    private static analyzeQuality(stream: FFprobeStream): string {
        const { width = 0, height = 0, bit_rate } = stream;
        const bitrateMbps = bit_rate ? parseInt(bit_rate) / BYTES_PER_MB : 0;

        const { UHD, QHD, FHD, HD } = QUALITY_THRESHOLDS;

        if (width >= UHD.width && height >= UHD.height) {
            if (bitrateMbps >= UHD.bitrate) return "Ultra High (4K 60fps)";
            if (bitrateMbps >= UHD.highBitrate) return "Very High (4K)";
            return "High (4K Low Bitrate)";
        }

        if (width >= QHD.width && height >= QHD.height) {
            return bitrateMbps >= QHD.bitrate ? "Very High (2K)" : "High (2K)";
        }

        if (width >= FHD.width && height >= FHD.height) {
            if (bitrateMbps >= FHD.bitrate) return "High (1080p)";
            if (bitrateMbps >= FHD.mediumBitrate) return "Medium (1080p)";
            return "Low (1080p Low Bitrate)";
        }

        if (width >= HD.width && height >= HD.height) {
            return bitrateMbps >= HD.bitrate ? "Medium (720p)" : "Low (720p)";
        }

        return "Low (SD)";
    }

    private static getColorProfile(stream: FFprobeStream): string {
        const { color_primaries, color_trc, color_space, height = 0 } = stream;

        const mapColorValue = (value?: string) => {
            if (!value) return '1';
            return COLOR_MAPPINGS[value as keyof typeof COLOR_MAPPINGS] || '1';
        };

        const primaries = mapColorValue(color_primaries);
        const transfer = mapColorValue(color_trc);
        const matrix = mapColorValue(color_space);

        const profileType = height >= 2160 ? 'UHD' : height >= 720 ? 'HD' : 'SD';
        return `${profileType}(${primaries}-${transfer}-${matrix})`;
    }

    private static formatBitrate(videoBitrate: number, audioBitrate: number): string {
        const videoMbps = (videoBitrate / BYTES_PER_MB).toFixed(2);
        const audioKbps = (audioBitrate / KBPS_PER_MBPS).toFixed(0);
        return `${videoMbps} Mbps (Video) + ${audioKbps} kbps (Audio)`;
    }

    private static formatAudioChannels(stream: FFprobeStream): string {
        const { channels, channel_layout } = stream;
        if (!channels) return "Unknown";

        const channelInfo = `${channels} channels`;
        return channel_layout ? `${channelInfo} (${channel_layout})` : channelInfo;
    }

    static async getMediaData(mediaPath: string): Promise<FFprobeData> {
        return new Promise((resolve, reject) => {
            const ffprobe = spawn(ffprobePath, [
                '-v', 'quiet',
                '-print_format', 'json',
                '-show_format',
                '-show_streams',
                mediaPath
            ]);

            let stdout = '';
            let stderr = '';

            ffprobe.stdout.on('data', (data) => stdout += data);
            ffprobe.stderr.on('data', (data) => stderr += data);

            ffprobe.on('close', (code) => {
                if (code === 0) {
                    try {
                        const data = JSON.parse(stdout) as FFprobeData;
                        resolve(data);
                    } catch (parseError) {
                        reject(new Error(`Failed to parse ffprobe output: ${parseError}`));
                    }
                } else {
                    reject(new Error(`ffprobe failed with code ${code}: ${stderr}`));
                }
            });

            ffprobe.on('error', (error) => {
                reject(new Error(`ffprobe process error: ${error.message}`));
            });
        });
    }

    static analyzeMedia(mediaData: FFprobeData, mediaPath: string): MediaInfo {
        const { streams, format } = mediaData;

        const videoStream = streams.find(s => s.codec_type === 'video');
        const audioStream = streams.find(s => s.codec_type === 'audio');

        // Basic file info
        const name = path.basename(mediaPath);
        const kind = path.extname(mediaPath).toLowerCase().substring(1);
        const size = format.size ? this.formatFileSize(parseInt(format.size)) : "Unknown";
        const duration = format.duration ? this.formatDuration(parseFloat(format.duration)) : undefined;

        // Video info
        const dimensions = videoStream ? `${videoStream.width}x${videoStream.height}` : "";
        const quality = videoStream ? this.analyzeQuality(videoStream) : "Unknown";
        const colorProfile = videoStream ? this.getColorProfile(videoStream) : undefined;

        // Codec info
        const videoCodec = videoStream ? this.getCodecName(videoStream.codec_name, 'video') : '';
        const audioCodec = audioStream ? this.getCodecName(audioStream.codec_name, 'audio') : '';
        const codecs = [audioCodec, videoCodec].filter(Boolean).join(', ') || undefined;

        // Bitrate info
        const videoBitrate = videoStream?.bit_rate ? parseInt(videoStream.bit_rate) : 0;
        const audioBitrate = audioStream?.bit_rate ? parseInt(audioStream.bit_rate) : 0;
        const codeRate = (videoBitrate || audioBitrate) ?
            this.formatBitrate(videoBitrate, audioBitrate) : undefined;

        // Audio info
        const audioChannels = audioStream ? this.formatAudioChannels(audioStream) : undefined;

        return {
            name,
            kind,
            size,
            quality,
            dimensions,
            format_name: format.format_name,
            duration,
            codecs,
            colorProfile,
            codeRate,
            audioChannels
        };
    }
}
