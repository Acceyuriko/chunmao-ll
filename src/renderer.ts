import { IPC_CHANNELS } from './constants';

const onLoad = () => {
  window.chunmaoll.log('renderer::onLoad');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  window.chunmaoll.on(IPC_CHANNELS.NTCALL, (_, channel: string, ...data: any) => {
    window.chunmaoll.send(channel, ...data);
  });
};

onLoad();

const onSettingWindowCreated = async () => {};

export { onSettingWindowCreated };
