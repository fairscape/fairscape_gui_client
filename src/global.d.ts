import type { FairscapeApi } from './shared/types';

declare global {
  interface Window {
    fairscape: FairscapeApi;
  }
}

export {};
