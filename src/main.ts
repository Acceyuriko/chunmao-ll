// 运行在 Electron 主进程 下的插件入口
import axios from 'axios';
import crypto from 'crypto';
import { ipcMain } from 'electron';
import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import util from 'util';

import { GroupMemberInfo, MessageElement, SendMessage } from '.';
import { IMAGE_PATH, IPC_CHANNELS } from './constants';
import { info } from './logger';

class Adapter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pendingCallbacks: Record<string, (params: any) => void> = {};
  groupMemberCache: Record<string, GroupMemberInfo[]> = {};

  constructor(public window: Window) {
    this.start();
  }

  async getMemberInfo(groupId: string, qq: string): Promise<GroupMemberInfo | undefined> {
    if (!this.groupMemberCache[groupId]) {
      await this.getGroupMemberList(parseInt(groupId));
    }
    return this.groupMemberCache[groupId].find((m) => m.uin === qq);
  }

  async derializeMessage(text: string, groupId: string): Promise<SendMessage[]> {
    const result: SendMessage[] = [];
    let remain = text;
    for (;;) {
      if (remain.length === 0) {
        break;
      }
      const index = remain.indexOf('[CQ:');
      if (index === -1) {
        result.push({
          elementType: 1,
          elementId: '',
          textElement: {
            content: remain,
            atType: 0,
            atUid: '',
            atNtUid: '',
          },
        });
        remain = '';
        break;
      }
      if (index === 0) {
        let match = remain.match(/\[CQ:at,qq=(.+?)\]/);
        if (match) {
          const info = await this.getMemberInfo(groupId, match[1]);
          if (info) {
            result.push({
              elementType: 1,
              elementId: '',
              textElement: {
                content: `@${info.cardName}`,
                atType: 2,
                atUid: info.uin,
                atNtUid: info.uid,
              },
            });
          }
          remain = remain.replace(match[0], '');
          continue;
        }
        match = remain.match(/\[CQ:image,file=(.*?)\]/);
        if (match) {
          const file = path.join(IMAGE_PATH, match[1]);
          const type = await this.ntCall('ns-FsApi', 'getFileType', [file]);
          const md5 = await this.ntCall('ns-FsApi', 'getFileMd5', [file]);
          const fileName = `${md5}.${type.ext}`;
          const filePath = await this.ntCall('ns-ntApi', 'nodeIKernelMsgService/getRichMediaFilePathForGuild', [
            {
              path_info: {
                md5HexStr: md5,
                fileName: fileName,
                elementType: 2,
                elementSubType: 0,
                thumbSize: 0,
                needCreate: true,
                downloadType: 1,
                file_uuid: '',
              },
            },
          ]);
          await this.ntCall('ns-FsApi', 'copyFile', [{ fromPath: file, toPath: filePath }]);
          const imageSize = await this.ntCall('ns-FsApi', 'getImageSizeFromPath', [file]);
          const fileSize = await this.ntCall('ns-FsApi', 'getFileSize', [file]);
          result.push({
            elementType: 2,
            elementId: '',
            picElement: {
              md5HexStr: md5,
              fileSize: fileSize,
              picWidth: imageSize.width,
              picHeight: imageSize.height,
              fileName: fileName,
              sourcePath: filePath,
              original: true,
              picType: 1001,
              picSubType: 0,
              fileUuid: '',
              fileSubId: '',
              thumbFileSize: 0,
              summary: '',
            },
          });

          remain = remain.replace(match[0], '');
          continue;
        }
        remain = remain.replace(/\[CQ:.*?\]/, '');
        continue;
      }
      result.push({
        elementType: 1,
        elementId: '',
        textElement: {
          content: remain.slice(0, index),
          atType: 0,
          atUid: '',
          atNtUid: '',
        },
      });
      remain = remain.slice(index);
    }

    return result;
  }

  patchSend() {
    const window = this.window;
    const original_send =
      (window.webContents.__qqntim_original_object && window.webContents.__qqntim_original_object.send) ||
      window.webContents.send;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patched_send = (channel: string, ...args: any) => {
      if (!/^ns-LoggerApi/.test(args?.[0]?.eventName)) {
        const cmd = args?.[1]?.[0];
        if (cmd?.cmdName === 'nodeIKernelMsgListener/onRecvMsg') {
          info('onRecvMsg', util.inspect(cmd.payload));
          (cmd.payload.msgList as MessageElement['raw'][]).forEach((msg) => {
            this.request({
              post_type: 'message',
              user_id: Number.parseInt(msg.senderUin),
              message_id: msg.msgId,
              group_id: Number.parseInt(msg.peerUin),
              raw_message: msg.elements
                .map((element) => {
                  if (element.textElement) {
                    if (element.textElement.atType === 2) {
                      return `[CQ:at,qq=${element.textElement.atUid}]`;
                    }
                    return element.textElement.content;
                  }
                  if (element.picElement) {
                    fs.exists(element.picElement.sourcePath, (exists) => {
                      if (!exists) {
                        this.ntCall('ns-ntApi', 'nodeIKernelMsgService/downloadRichMedia', [
                          {
                            getReq: {
                              msgId: msg.msgId,
                              chatType: msg.chatType,
                              peerUid: msg.peerUin,
                              elementId: element.elementId,
                              thumbSize: 0,
                              downloadType: 1,
                              filePath: element.picElement?.sourcePath,
                            },
                          },
                          undefined,
                        ]).catch((e) => {
                          info(`failed to download media ${element.picElement?.sourcePath}, ${e.message}`);
                        });
                      }
                    });
                    return `[CQ:image,file=${element.picElement.sourcePath}]`;
                  }
                  return '';
                })
                .join(''),
              sub_type: 'normal',
            }).catch((e) => {
              info('onRecvMsg::request error', e);
            });
          });
        }
        info('webContents.send', channel, util.inspect(args));
      }

      if (args?.[0]?.callbackId) {
        const id = args[0].callbackId;
        if (id in this.pendingCallbacks) {
          info('run pendingCallbacks', channel, util.inspect(args));
          this.pendingCallbacks[id](args[1]);
          delete this.pendingCallbacks[id];
        }
      }
      return original_send.call(window.webContents, channel, ...args);
    };

    if (window.webContents.__qqntim_original_object) {
      window.webContents.__qqntim_original_object.send = patched_send;
    } else {
      window.webContents.send = patched_send;
    }
  }

  patchIpcMessage() {
    const window = this.window;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ipc_message = (...args: any) => {
      const [, , name, ...others] = args;

      if (!/^ns-LoggerApi/.test(others?.[0]?.[0]?.eventName)) {
        info('ipc_message', name, util.inspect(others));
      }
    };
    const ipc_message_proxy =
      window.webContents._events['-ipc-message']?.[0] || window.webContents._events['-ipc-message'];

    const proxyEvents = new Proxy(ipc_message_proxy, {
      // 拦截函数调用
      apply(target, thisArg, argumentsList) {
        ipc_message(...argumentsList);
        return target.apply(thisArg, argumentsList);
      },
    });
    if (window.webContents._events['-ipc-message'][0]) {
      window.webContents._events['-ipc-message'][0] = proxyEvents;
    } else {
      window.webContents._events['-ipc-message'] = proxyEvents;
    }

    window.webContents.on('ipc-message-sync', (event, channel) => {
      if (channel === IPC_CHANNELS.BOOT) {
        event.returnValue = {
          enabled: true,
          webContentsId: window.webContents.id.toString(),
        };
      }
    });
  }

  start() {
    this.patchSend();
    this.patchIpcMessage();

    const app = express();
    app.use(express.urlencoded({ extended: true, limit: '500mb' }));
    app.use(express.json());

    app.post('/send_group_msg', async (req: Request, res: Response) => {
      const body = req.body as { group_id: number; message: string };
      info('chunmao::send_group_msg body', body);

      try {
        await this.ntCall('ns-ntApi', 'nodeIKernelMsgService/sendMsg', [
          {
            msgId: '0',
            peer: { chatType: 2, peerUid: body.group_id.toString(), guildId: '' },
            msgElements: await this.derializeMessage(body.message, body.group_id.toString()),
            msgAttributeInfos: new Map(),
          },
          null,
        ]);
        res.status(200).send({});
      } catch (e) {
        res.status(500).send(e);
      }
    });

    app.post('/get_group_member_list', async (req: Request, res: Response) => {
      const body = req.body as { group_id: number };
      info('chunmao::get_group_member_list body', JSON.stringify(body));

      try {
        res.status(200).send(await this.getGroupMemberList(body.group_id));
      } catch (e) {
        res.status(500).send(e);
      }
    });

    app.listen(5700, '0.0.0.0', () => {
      info(`chunmaoll 已启动，监听端口 5700`);
    });
  }

  async getGroupMemberList(groupId: number): Promise<GroupMemberInfo[]> {
    const sceneId = await this.ntCall('ns-ntApi', 'nodeIKernelGroupService/createMemberListScene', [
      {
        groupCode: groupId.toString(),
        scene: 'groupMemberList_MainWindow',
      },
    ]);
    const { result } = await this.ntCall('ns-ntApi', 'nodeIKernelGroupService/getNextMemberList', [
      {
        sceneId,
        num: 9999,
      },
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const values: GroupMemberInfo[] = Array.from(result.infos.values());
    this.groupMemberCache[groupId.toString()] = values;
    return values;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ntCall(eventName: string, cmdName: string, args: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Promise<any>((resolve) => {
      const uuid = crypto.randomUUID();
      this.pendingCallbacks[uuid] = resolve;

      this.window.webContents.send(
        IPC_CHANNELS.NTCALL,
        `IPC_UP_${this.window.webContents.id}`,
        {
          type: 'request',
          callbackId: uuid,
          eventName: `${eventName}-${this.window.webContents.id}`,
        },
        [cmdName, ...args],
      );
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  request(data: any) {
    return axios.post('http://127.0.0.1:6624/notify', data);
  }
}

const onLoad = () => {
  info('main::onLoad');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ipcMain.on(IPC_CHANNELS.LOG, (_, arg: any) => {
    info(arg);
  });
};

onLoad();

// 创建窗口时触发
const onBrowserWindowCreated = (window: Window) => {
  if (window.webContents.id !== 2) {
    return;
  }
  new Adapter(window);
};

export { onBrowserWindowCreated };
