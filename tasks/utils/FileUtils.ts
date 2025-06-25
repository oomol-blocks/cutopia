import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { FORMAT_CONFIGS } from "./constants"

export class FileUtils {
    private static readonly BYTES_PER_GB = 1024 * 1024 * 1024;
    private static readonly BYTES_PER_MB = 1024 * 1024;

    static formatFileSize(bytes: number): string {
        if (bytes >= this.BYTES_PER_GB) {
            return `${(bytes / this.BYTES_PER_GB).toFixed(2)} GB`;
        }
        return `${(bytes / this.BYTES_PER_MB).toFixed(2)} MB`;
    }

    static async getFileSize(filePath: string): Promise<number> {
        try {
            const stats = await fs.stat(filePath);
            return stats.size;
        } catch {
            return 0;
        }
    }

    static generateOutputPath(inputPath: string, targetFormat: keyof typeof FORMAT_CONFIGS): string {
        const extension = FORMAT_CONFIGS[targetFormat].extension;
        return `${inputPath.replace(path.extname(inputPath), '')}-${Date.now()}${extension}`;
    }

    static generateOutputPathFromDir(
        inputPath: string, 
        outputDir: string, 
        targetFormat: keyof typeof FORMAT_CONFIGS
    ): string {
        const baseName = path.basename(inputPath, path.extname(inputPath));
        const extension = FORMAT_CONFIGS[targetFormat].extension;
        return path.join(outputDir, `${baseName}-${Date.now()}${extension}`);
    }
}
