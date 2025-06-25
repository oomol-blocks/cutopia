
import type { Context } from "@oomol/types/oocana";
import { BaseVideoConverter, BaseInputs, BaseOutputs, ConversionError } from "../utils/BaseVideoConverter";
import { ConversionOptions } from "../utils/constants";

export type WMVInputs = BaseInputs;
export type WMVOutputs = BaseOutputs;

export default async function (
    params: WMVInputs,
    context: Context<WMVInputs, WMVOutputs>
): Promise<Partial<WMVOutputs> | undefined | void> {

    try {
        const converter = new WMVConverter(context);
        return await converter.convert(params);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        throw new ConversionError(`WMV conversion failed: ${errorMessage}`, error instanceof Error ? error : undefined);
    }
};


export class WMVConverter extends BaseVideoConverter<WMVInputs, WMVOutputs> {
    protected readonly targetFormat = 'wmv' as const;

    constructor(context: Context<WMVInputs, WMVOutputs>, options: ConversionOptions = {}) {
        super(context, options);
    }
}
