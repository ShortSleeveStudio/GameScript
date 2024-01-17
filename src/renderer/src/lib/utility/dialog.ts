import type { DialogResult } from 'preload/api-dialog';

export function dialogResultReset(result: DialogResult): DialogResult {
    result.cancelled = false;
    result.baseName = '';
    result.path = '';
    result.fullPath = '';
    return result;
}
