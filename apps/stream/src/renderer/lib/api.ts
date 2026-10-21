import type { TMopscordApi } from '../../shared/types';

declare global {
  interface Window {
    mopscord: TMopscordApi;
  }
}

// everything that needs the operating system goes through the preload bridge
export const api = window.mopscord;
