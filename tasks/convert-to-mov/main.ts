
import type { Context } from "@oomol/types/oocana";
import { BaseVideoConverter, BaseInputs, BaseOutputs, ConversionError } from "../utils/BaseVideoConverter";
import { ConversionOptions } from "../utils/constants";

export type MOVInputs = BaseInputs;
export type MOVOutputs = BaseOutputs;

export default async function (
    params: MOVInputs,
    context: Context<MOVInputs, MOVOutputs>
): Promise<Partial<MOVOutputs> | undefined | void> {

    try {
        const converter = new MOVConverter(context);
        return await converter.convert(params);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        throw new ConversionError(`MOV conversion failed: ${errorMessage}`, error instanceof Error ? error : undefined);
    }
};


export class MOVConverter extends BaseVideoConverter<MOVInputs, MOVOutputs> {
    protected readonly targetFormat = 'mov' as const;

    constructor(context: Context<MOVInputs, MOVOutputs>, options: ConversionOptions = {}) {
        super(context, options);
    }
}
