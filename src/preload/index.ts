// import { electronAPI } from '@electron-toolkit/preload';
import { contextBridge } from 'electron';
import { api } from './api';

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
try {
    // contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
    // window.api = api;
} catch (error) {
    console.error(error);
}

// import { api } from './api';
// window.api = api;
