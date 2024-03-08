import { ipcRenderer } from 'electron';
import { Routine } from '../common/common-schema';
import { ProgrammingLanguageId } from '../common/common-types';
import { API_TRANSPILE_VALIDATE } from '../common/constants';

export interface TranspileValidateRequest {
    routine: Routine;
    language: ProgrammingLanguageId;
}
export interface TranspileValidateResponse {
    isValid: boolean;
    message: string;
}

export interface TranspileApi {
    validate(request: TranspileValidateRequest): Promise<TranspileValidateResponse>;
}

export const transpileApi: TranspileApi = {
    validate: async (request: TranspileValidateRequest) => {
        return await ipcRenderer.invoke(API_TRANSPILE_VALIDATE, request);
    },
};
