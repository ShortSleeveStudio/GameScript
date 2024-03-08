import { IpcMainInvokeEvent, ipcMain } from 'electron';
import { PROGRAMMING_LANGUAGE_CS } from '../common/common-types';
import { API_TRANSPILE_VALIDATE } from '../common/constants';
import { TranspileValidateRequest, TranspileValidateResponse } from '../preload/api-transpile';
import { transpilerCSharp } from './transpile/transpile-csharp';

ipcMain.handle(
    API_TRANSPILE_VALIDATE,
    async (
        _event: IpcMainInvokeEvent,
        payload: TranspileValidateRequest,
    ): Promise<TranspileValidateResponse> => {
        switch (payload.language) {
            case PROGRAMMING_LANGUAGE_CS.id:
                return transpilerCSharp.validate(payload);
            default:
                throw new Error(`Unsupported programming language: ${payload.language}`);
        }
    },
);
