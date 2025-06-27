import * as fs from "fs/promises";

export class Helper {
    static formatTime(milliseconds: number): string {
        if (milliseconds < 1000) {
            return `${milliseconds} 毫秒`;
        } else if (milliseconds < 60000) {
            return `${(milliseconds / 1000).toFixed(2)} 秒`;
        } else {
            const minutes = Math.floor(milliseconds / 60000);
            const seconds = ((milliseconds % 60000) / 1000).toFixed(2);
            return `${minutes} 分 ${seconds} 秒`;
        }
    }

    static async validateFile(filePath: string, errorMessage: string): Promise<void> {
        try {
            await fs.access(filePath);
        } catch (error) {
            throw new Error(`${errorMessage}: ${filePath}`);
        }
    }
}