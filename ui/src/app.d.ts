// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }

  // VSCode webview API
  interface VsCodeApi {
    postMessage(message: unknown): void;
    getState(): unknown;
    setState(state: unknown): void;
  }

  function acquireVsCodeApi(): VsCodeApi;

  interface Window {
    vscode?: VsCodeApi;
  }
}

export {};
