import { path as ffprobePath } from "@ffprobe-installer/ffprobe";
import { spawn } from "child_process";
import path from "path";

import { FFprobeData, IMediaInfo } from "../utils/constants"
import { CodecExtractor } from "../utils/CodecExtractor";


export class MediaAnalyzer {
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

    static analyzeMedia(mediaData: FFprobeData, mediaPath: string): IMediaInfo {
        const { streams, format } = mediaData;

        const videoStream = streams.find(s => s.codec_type === 'video');
        const audioStream = streams.find(s => s.codec_type === 'audio');

        // 容器、size 信息
        const containerFormat = path.extname(mediaPath).toLowerCase().substring(1);
        const size = format.size ? parseInt(format.size) : 0;

        // 视频信息
        const width = videoStream?.width || 0;
        const height = videoStream?.height || 0;
        const dimensions = { width, height };

        // 编解码器信息
        const videoCodec = CodecExtractor.extractVideoCodecFromStream(videoStream);
        const audioCodec = CodecExtractor.extractAudioCodecFromStream(audioStream);

        // 比特率
        const bitrateMbps = videoStream.bit_rate ? parseInt(videoStream.bit_rate) / (1024 * 1024) : 0;

        return {
            path: mediaPath,
            dimensions,
            size,
            containerFormat,
            videoCodec,
            audioCodec,
            bitrateMbps
        };
    }
}
