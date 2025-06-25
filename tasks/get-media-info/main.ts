import type { Context } from "@oomol/types/oocana";

import { VIDEO_FORMATS, IMediaInfo } from "../utils/constants"
import { MediaAnalyzer } from "./MediaAnalyzer"

type Inputs = {
    mediaPath: string;
};

type Outputs = {
    mediaInfo: IMediaInfo
};

export default async function (
    params: Inputs,
    context: Context<Inputs, Outputs>
): Promise<Partial<Outputs> | undefined | void> {
    try {
        const { mediaPath } = params;

        if (!mediaPath || typeof mediaPath !== 'string') {
            throw new Error('Invalid media path provided');
        }

        const mediaData = await MediaAnalyzer.getMediaData(mediaPath);
        const mediaInfo = MediaAnalyzer.analyzeMedia(mediaData, mediaPath);

        const formatToCheck = `.${mediaInfo.containerFormat}`;
        if (!VIDEO_FORMATS.includes(formatToCheck as (typeof VIDEO_FORMATS)[number])) {
            throw new Error(`Unsupported video format: ${formatToCheck}`);
        }
        return { mediaInfo };
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
