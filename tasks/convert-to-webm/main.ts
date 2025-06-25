
import type { Context } from "@oomol/types/oocana";
import { BaseVideoConverter, BaseInputs, BaseOutputs, ConversionError } from "../utils/BaseVideoConverter";
import { ConversionOptions } from "../utils/constants";

export type WebMInputs = BaseInputs;
export type WebMOutputs = BaseOutputs;

export default async function (
    params: WebMInputs,
    context: Context<WebMInputs, WebMOutputs>
): Promise<Partial<WebMOutputs> | undefined | void> {

    try {
        const converter = new WebMConverter(context);
        return await converter.convert(params);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        throw new ConversionError(`WebM conversion failed: ${errorMessage}`, error instanceof Error ? error : undefined);
    }
};


export class WebMConverter extends BaseVideoConverter<WebMInputs, WebMOutputs> {
    protected readonly targetFormat = 'webm' as const;

    constructor(context: Context<WebMInputs, WebMOutputs>, options: ConversionOptions = {}) {
        super(context, options);
    }
}
