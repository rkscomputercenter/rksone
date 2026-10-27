import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

/** What the Android side reports about the update download (AppUpdatePlugin.java). */
export interface UpdateStatus {
  state: 'idle' | 'downloading' | 'ready' | 'error';
  version?: string | null;
  received: number;
  total: number;
  error?: string | null;
}

interface AppUpdatePlugin {
  /** Where the download stands; also finds a file finished in an earlier session. */
  status(): Promise<UpdateStatus>;
  /** Starts downloading in the background. Does nothing if this version is already downloading or ready. */
  download(options: { url: string; version: string }): Promise<UpdateStatus>;
  /** Opens Android's installer. If installs aren't allowed yet it opens that settings screen and says so. */
  install(): Promise<{ started: boolean; needsPermission: boolean }>;
  canInstall(): Promise<{ allowed: boolean }>;
  addListener(event: 'progress' | 'ready' | 'failed', handler: (s: UpdateStatus) => void): Promise<PluginListenerHandle>;
}

/** Only exists inside the Android app from 1.0.44; calls throw elsewhere (the caller falls back to the browser). */
export const AppUpdate = registerPlugin<AppUpdatePlugin>('AppUpdate');
