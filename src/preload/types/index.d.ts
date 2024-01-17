import { API } from '../api.ts';

declare global {
    interface Window {
        api: API;
    }
}
