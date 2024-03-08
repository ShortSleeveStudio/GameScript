import { TranspileValidateRequest, TranspileValidateResponse } from '../../preload/api-transpile';

export interface Transpiler {
    validate(request: TranspileValidateRequest): TranspileValidateResponse;
}
