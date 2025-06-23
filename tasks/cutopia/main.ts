import type { Context } from "@oomol/types/oocana";
import * as fs from "node:fs/promises"

import { ConversionOptions } from "./constants"
import { VideoConverter, ConversionError} from "./converter"

export type Outputs = {
    media: string
}

export type Inputs = {
    mediaPath: string | null;
    isCompress: boolean;
    mediaInfo: { 
        format_name: string; 
        audioChannels: string; 
        codeRate: string; 
        codecs: string; 
        colorProfile: string; 
        duration: string; 
        name: string; 
        kind: string; 
        size: string | number;  // 支持字符串或数字
        quality: string; 
        dimensions: string;
        // 新增编码信息
        videoCodec?: string;
        audioCodec?: string;
        containerFormat?: string;
    };
    [key: string]: any;
}

export default async function (
    params: Inputs,
    context: Context<Inputs, Outputs>
): Promise<Partial<Outputs> | undefined | void> {
    try {

        if (!params.mediaInfo.size) {
            try {
                const stats = await fs.stat(params.mediaPath!);
                params.mediaInfo.size = stats.size;
            } catch (error) {
                console.warn("无法获取文件大小，使用默认值 0");
                params.mediaInfo.size = 0;
            }
        }

        const options: ConversionOptions = {
            customQuality: params.customQuality,
            customBitrate: params.customBitrate,
            preserveMetadata: params.preserveMetadata || false,
            hardwareAcceleration: params.hardwareAcceleration || 'auto',
            preset: params.preset || "fast"
        };

        const converter = new VideoConverter(context, options);
        return await converter.convert(params);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

        context.preview({
            type: "table",
            data: {
                columns: ["Error", "Details"],
                rows: [
                    ["❌ Conversion Failed", errorMessage],
                    ["File", params.mediaPath || 'Unknown'],
                    ["Target Format", params.targetFormat?.value || 'Unknown']
                ]
            }
        });

        throw new ConversionError(`Video conversion failed: ${errorMessage}`, error instanceof Error ? error : undefined);
    }
};
