
import type { Context } from "@oomol/types/oocana";
import { BaseVideoConverter, BaseInputs, BaseOutputs, ConversionError } from "../utils/BaseVideoConverter";
import { ConversionOptions } from "../utils/constants";

export type MKVInputs = BaseInputs;
export type MKVOutputs = BaseOutputs;

export default async function (
    params: MKVInputs,
    context: Context<MKVInputs, MKVOutputs>
): Promise<Partial<MKVOutputs> | undefined | void> {

    try {
        const converter = new MKVConverter(context);
        return await converter.convert(params);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        throw new ConversionError(`MKV conversion failed: ${errorMessage}`, error instanceof Error ? error : undefined);
    }
};


export class MKVConverter extends BaseVideoConverter<MKVInputs, MKVOutputs> {
    protected readonly targetFormat = 'mkv' as const;

    constructor(context: Context<MKVInputs, MKVOutputs>, options: ConversionOptions = {}) {
        super(context, options);
    }
}
