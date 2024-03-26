import { writable, type Readable, type Writable } from 'svelte/store';
// TODO: https://svelte-5-preview.vercel.app/status

/**
 * Valid types of notifications
 */
const validNotificationKinds = [
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
export type NotificationKind = (typeof validNotificationKinds)[number];
export type Notification = NotificationItem | undefined;

/**
 * Payload for notification UI
 */
export class NotificationItem {
    private static _notificationCount: number = 0;
    private _id: number;
    private _kind: NotificationKind;
    private _title: string;
    private _subtitle: string;
    private _timeoutMs: number;
    private _lowContrast: boolean;

    constructor(
        kind: NotificationKind,
        title: string,
        subtitle: string,
        timeoutMs: number = 1000,
        lowContrast: boolean = true,
    ) {
        this._id = NotificationItem._notificationCount++;
        this._kind = kind;
        this._title = title ? title : kindToTitle[kind];
        this._subtitle = subtitle;
        this._timeoutMs = timeoutMs;
        this._lowContrast = lowContrast;
    }

    public get id(): number {
        return this._id;
    }

    public get kind(): NotificationKind {
        return this._kind;
    }

    public get title(): string {
        return this._title;
    }

    public get subtitle(): string {
        return this._subtitle;
    }

    public get timeoutMs(): number {
        return this._timeoutMs;
    }

    public get lowContrast(): boolean {
        return this._lowContrast;
    }
}

/**
 * Manager for notifications.
 */
export class NotificationManager {
    private _notificationWritable: Writable<Notification>;
    private _notificationReadable: Readable<Notification>;

    constructor() {
        this._notificationWritable = writable(undefined);
        this._notificationReadable = { subscribe: this._notificationWritable.subscribe };
    }

    getNotification(): Readable<Notification> {
        return this._notificationReadable;
    }

    showNotification(notification: NotificationItem): void {
        this._notificationWritable.set(notification);
    }

    // This allows us to pass this method around as a callback while retaining 'this'
    hideNotification: () => void = () => {
        this._notificationWritable.set(undefined);
    };
}

/**Notification manager singleton. */
export const notificationManager: NotificationManager = new NotificationManager();
