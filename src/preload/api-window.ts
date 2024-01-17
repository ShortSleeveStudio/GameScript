import { ipcRenderer } from 'electron';
import {
    API_WINDOW_CLOSE,
    API_WINDOW_IS_MAXIMIZED,
    API_WINDOW_MAXIMIZE,
    API_WINDOW_MINIMIZE,
    API_WINDOW_ON_RESIZE,
    API_WINDOW_UNMAXIMIZE,
} from '../common/constants';

export interface WindowApi {
    close(): Promise<void>;
    minimize(): Promise<void>;
    maximize(): Promise<void>;
    unmaximize(): Promise<void>;
    isMaximized(): Promise<boolean>;
    onResizeRegister(callback: () => void): void;
    onResizeUnregister(callback: () => void): void;
}

export const windowApi: WindowApi = {
    close: async () => {
        await ipcRenderer.invoke(API_WINDOW_CLOSE);
    },
    minimize: async function (): Promise<void> {
        await ipcRenderer.invoke(API_WINDOW_MINIMIZE);
    },
    maximize: async function (): Promise<void> {
        await ipcRenderer.invoke(API_WINDOW_MAXIMIZE);
    },
    unmaximize: async function (): Promise<void> {
        await ipcRenderer.invoke(API_WINDOW_UNMAXIMIZE);
    },
    isMaximized: async function (): Promise<boolean> {
        return await ipcRenderer.invoke(API_WINDOW_IS_MAXIMIZED);
    },
    onResizeRegister: function (callback: () => void): void {
        ipcRenderer.addListener(API_WINDOW_ON_RESIZE, callback);
    },
    onResizeUnregister: function (callback: () => void): void {
        ipcRenderer.removeListener(API_WINDOW_ON_RESIZE, callback);
    },
};
