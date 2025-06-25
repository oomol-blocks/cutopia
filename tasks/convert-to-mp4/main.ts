
import type { Context } from "@oomol/types/oocana";
import { BaseVideoConverter, BaseInputs, BaseOutputs, ConversionError } from "../utils/BaseVideoConverter";
import { ConversionOptions } from "../utils/constants";

export type MP4Inputs = BaseInputs;
export type MP4Outputs = BaseOutputs;

export default async function (
    params: MP4Inputs,
    context: Context<MP4Inputs, MP4Outputs>
): Promise<Partial<MP4Outputs> | undefined | void> {

    try {
        const converter = new MP4Converter(context);
        return await converter.convert(params);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        throw new ConversionError(`MP4 conversion failed: ${errorMessage}`, error instanceof Error ? error : undefined);
    }
};


export class MP4Converter extends BaseVideoConverter<MP4Inputs, MP4Outputs> {
    protected readonly targetFormat = 'mp4' as const;

    constructor(context: Context<MP4Inputs, MP4Outputs>, options: ConversionOptions = {}) {
        super(context, options);
    }
}
