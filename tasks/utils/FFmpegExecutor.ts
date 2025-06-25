import { spawn } from "child_process";
import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg";
import type { Context } from "@oomol/types/oocana";

export class FFmpegExecutor {
    private totalDuration: number = 0;

    constructor(private context?: Context<any, any>) {}
    async execute(args: string[]): Promise<{ stdout: string; stderr: string }> {
        return new Promise((resolve, reject) => {
            const ffmpeg = spawn(ffmpegPath, args);

            let stdout = '';
            let stderr = '';

            ffmpeg.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            ffmpeg.stderr.on('data', (data) => {
                const dataStr = data.toString();
                stderr += dataStr;
                this.parseDurationFromFFmpegOutput(dataStr);
                this.parseProgress(dataStr);
            });

            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    resolve({ stdout, stderr });
                } else {
                    reject(new Error(`FFmpeg failed with exit code ${code}\nError: ${stderr}`));
                }
            });

            ffmpeg.on('error', (error) => {
                reject(new Error(`FFmpeg process error: ${error.message}`));
            });
        });
    }

    private parseDurationFromFFmpegOutput(data: string): void {
        if (this.totalDuration <= 0) {
            this.totalDuration = FFmpegExecutor.getDurationInSeconds(data);
            if (this.totalDuration) console.log(`⌚️ 视频总时长: ${this.totalDuration.toFixed(2)}秒`);
        }
    }

    private parseProgress(data: string): void {
        if (this.totalDuration > 0 && this.context) {
            const currentTimeInSeconds = FFmpegExecutor.getDurationInSeconds(data);
            const progress = Math.min((currentTimeInSeconds / this.totalDuration) * 100, 100);
            this.context.reportProgress(progress);
        }
    }

    private static getDurationInSeconds(data: string): number {
        const durationMatch = data.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
        let duration = 0;
        if (durationMatch) {
            const hours = parseInt(durationMatch[1], 10);
            const minutes = parseInt(durationMatch[2], 10);
            const seconds = parseFloat(durationMatch[3]);

            duration = hours * 3600 + minutes * 60 + seconds;
        }

        return duration;
    }
}
