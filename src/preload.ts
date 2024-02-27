import { contextBridge, ipcRenderer } from 'electron';

import { IPC_CHANNELS } from './constants';

contextBridge.exposeInMainWorld('chunmaoll', {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  log: (message: any) => {
    ipcRenderer.send(IPC_CHANNELS.LOG, message);
  },
  send: (channel: string, ...args: unknown[]) => {
    ipcRenderer.send(channel, ...args);
  },
  on: (channel: string, listener: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, listener);
  },
});
