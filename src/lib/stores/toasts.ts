import { writable, type Readable, type Writable } from 'svelte/store';

/**
 * Valid types of toasts
 */
const validToastKinds = [
    'error',
    'info',
    'info-square',
    'success',
    'warning',
    'warning-alt',
] as const;
const kindToTitle = {
    error: 'Error',
    info: 'Info',
    'info-square': 'Info',
    success: 'Success',
    warning: 'Warning',
    'warning-alt': 'Warning',
} as const;
export type ToastKind = (typeof validToastKinds)[number];

/**
 * Payload for toast UI
 */
export class ToastItem {
    private static _toastCount: number = 0;
    private _id: number;
    private _kind: ToastKind;
    private _title: string;
    private _subtitle: string;
    private _caption: string;
    private _details: string | undefined;

    constructor(kind: ToastKind, subtitle: string);
    constructor(kind: ToastKind, subtitle: string, details: string);
    constructor(
        kind: ToastKind,
        subtitle: string,
        details?: string,
        title?: string,
        caption?: string,
    ) {
        this._id = ToastItem._toastCount++;
        this._kind = kind;
        this._title = title ? title : kindToTitle[kind];
        this._subtitle = subtitle;
        this._details = details;
        this._caption = caption ? caption : new Date().toLocaleString();
    }

    public get id(): number {
        return this._id;
    }

    public get kind(): ToastKind {
        return this._kind;
    }

    public get title(): string {
        return this._title;
    }

    public get subtitle(): string {
        return this._subtitle;
    }

    public get caption(): string {
        return this._caption;
    }

    public get details(): string | undefined {
        return this._details;
    }

    // this is the only way to capture this
    public close = (e: Event) => {
        e.preventDefault();
        toastsWritable.update((value: ToastItem[]) => {
            const index: number = value.findIndex((item: ToastItem) => item.id === this.id);
            if (index !== -1) {
                // Remove this item
                value.splice(index, 1);
            }
            return value;
        });
    };
}

// Internal writable store
const toastsWritable: Writable<ToastItem[]> = writable(<ToastItem[]>[]);

/**
 * Show a toast
 * @param toast The toast to show
 */
export function showToast(toast: ToastItem) {
    toastsWritable.update((value: ToastItem[]) => {
        value.unshift(toast);
        return value;
    });
}

/**
 * Store for all current toasts.
 */
export const toasts: Readable<ToastItem[]> = {
    subscribe: toastsWritable.subscribe,
};
