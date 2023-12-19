/**
 * TODO: this is copied from Tauri code
 * https://github.com/tauri-apps/plugins-workspace/issues/835
 */
export interface FileResponse {
    base64Data?: string;
    duration?: number;
    height?: number;
    width?: number;
    mimeType?: string;
    modifiedAt?: number;
    name?: string;
    path: string;
    size: number;
}
