import { OpenDialogOptions, OpenDialogReturnValue, ipcRenderer } from 'electron';
// import path from 'path';
import { API_FS_DIALOG_OPEN } from '../common/constants.js';

interface API {
    fs: FileSystem;
}

interface FileSystem {
    // APP_DATA_DIRECTORY: string;
    showOpenDialog(): Promise<OpenDialogReturnValue>;
}

// Custom APIs for renderer
// const APP_DATA_DIRECTORY: string = path.join(
//     app.getPath('appData'),
//     'studio.shortsleeve.gamescript',
// );

export const api = <API>{
    fs: {
        // APP_DATA_DIRECTORY: APP_DATA_DIRECTORY,
        showOpenDialog: async () => {
            return await ipcRenderer.invoke(API_FS_DIALOG_OPEN, <OpenDialogOptions>{
                title: 'Select a Database File',
                // defaultPath: APP_DATA_DIRECTORY,
                buttonLabel: 'Open Database',
                filters: [{ extensions: ['.db'] }],
                properties: ['openFile'],
            });
        },
    },
};
