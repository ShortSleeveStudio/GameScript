import { IpcMainEvent, ipcMain, safeStorage } from 'electron';
import { API_ENCRYPTION_DECRYPT, API_ENCRYPTION_ENCRYPT } from '../common/constants';
import {
    DecryptRequest,
    DecryptResponse,
    EncryptRequest,
    EncryptResponse,
} from '../preload/api-cryptography';

ipcMain.on(API_ENCRYPTION_ENCRYPT, (event: IpcMainEvent, payload: EncryptRequest): void => {
    const encrypted: Buffer = safeStorage.encryptString(payload.toEncrypt);
    const encryptedString: string = encrypted.toString('base64');
    event.returnValue = <EncryptResponse>{ encrypted: encryptedString };
});
ipcMain.on(API_ENCRYPTION_DECRYPT, (event: IpcMainEvent, payload: DecryptRequest): void => {
    const encrypted: Buffer = Buffer.from(payload.toDecrypt, 'base64');
    const decrypted: string = safeStorage.decryptString(encrypted);
    event.returnValue = <DecryptResponse>{ decrypted: decrypted };
});
