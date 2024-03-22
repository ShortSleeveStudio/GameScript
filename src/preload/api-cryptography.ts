import { ipcRenderer } from 'electron';
import { API_ENCRYPTION_DECRYPT, API_ENCRYPTION_ENCRYPT } from '../common/constants';

export interface EncryptRequest {
    toEncrypt: string;
}
export interface EncryptResponse {
    encrypted: string;
}
export interface DecryptRequest {
    toDecrypt: string;
}
export interface DecryptResponse {
    decrypted: string;
}

export interface CryptographyApi {
    encrypt(request: EncryptRequest): EncryptResponse;
    decrypt(request: DecryptRequest): DecryptResponse;
}

export const cryptographyApi: CryptographyApi = {
    encrypt: (request: EncryptRequest) => {
        return ipcRenderer.sendSync(API_ENCRYPTION_ENCRYPT, request);
    },
    decrypt: (request: DecryptRequest) => {
        return ipcRenderer.sendSync(API_ENCRYPTION_DECRYPT, request);
    },
};
