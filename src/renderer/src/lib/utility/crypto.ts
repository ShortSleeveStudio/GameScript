import type { DbConnectionConfig } from '@common/common-db-types';
import { dbConnectionConfig } from '@lib/stores/settings/settings';
import { get } from 'svelte/store';

export function decrypt(str: string): string {
    if (str) {
        return window.api.cryptography.decrypt({
            toDecrypt: str,
        }).decrypted;
    }
    return str;
}

export function encrypt(str: string): string {
    if (str) {
        return window.api.cryptography.encrypt({
            toEncrypt: str,
        }).encrypted;
    }
    return str;
}

export function getDecryptedDbConfig(): DbConnectionConfig {
    const dbConfig: DbConnectionConfig = { ...get(dbConnectionConfig) };
    dbConfig.pgPassword = decrypt(dbConfig.pgPassword);
    return dbConfig;
}
