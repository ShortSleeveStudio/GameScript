import { IpcRendererEvent, ipcRenderer } from 'electron';
import { API_SYSTEM_ON_ERROR } from '../common/constants';

export interface SystemApi {
    onErrorRegister(callback: (event: IpcRendererEvent, error: string) => void): void;
    onErrorUnregister(callback: (event: IpcRendererEvent, error: string) => void): void;
}

export const systemApi: SystemApi = {
    onErrorRegister: function (callback: (event: IpcRendererEvent, error: string) => void): void {
        ipcRenderer.addListener(API_SYSTEM_ON_ERROR, callback);
    },
    onErrorUnregister: function (callback: (event: IpcRendererEvent, error: string) => void): void {
        ipcRenderer.removeListener(API_SYSTEM_ON_ERROR, callback);
    },
};
