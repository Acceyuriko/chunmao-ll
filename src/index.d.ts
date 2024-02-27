import type { WebContents } from 'electron';
/* eslint-disable @typescript-eslint/no-explicit-any */
export enum AtType {
  notAt = 0,
  atUser = 2,
}

/**
 *    {
        "uid": "u_s7ZDNPcleVEnYLK5HLu_9g",
        "qid": "",
        "uin": "314013284",
        "nick": "Vulcanus",
        "remark": "",
        "cardType": 0,
        "cardName": "非洲大酋长恩佐斯",
        "role": 4,
        "avatarPath": "C:\\Users\\Acceyuriko\\Documents\\Tencent Files\\2917938320\\nt_qq\\nt_data\\avatar\\user\\30\\s_30f07165cc9692998afb0d05a450134c",
        "shutUpTime": 0,
        "isDelete": false,
        "isSpecialConcerned": false,
        "isRobot": false
    },
 */
export type GroupMemberInfo = {
  avatarPath: string;
  cardName: string;
  cardType: number;
  isDelete: boolean;
  nick: string;
  qid: string;
  remark: string;
  role: number; // 群主:4, 管理员:3，群员:2
  shutUpTime: number; // 禁言时间，单位是什么暂时不清楚
  uid: string; // 加密的字符串
  uin: string; // QQ号
};

export type SelfInfo = {
  user_id: string;
  nickname: string;
};

export type User = {
  avatarUrl?: string;
  bio?: string; // 签名
  nickName: string;
  uid?: string; // 加密的字符串
  uin: string; // QQ号
};

export type Group = {
  uid: string; // 群号
  name: string;
  members?: GroupMemberInfo[];
};

export type Peer = {
  chatType: 'private' | 'group';
  name: string;
  uid: string; // qq号
};

export type TextMessageElement = {
  atType: AtType;
  atUid: string;
  content: string;
  atNtUid: string;
};

export type ReplyMessageElement = {
  senderUid: string; // 原消息发送者QQ号
  sourceMsgIsIncPic: boolean; // 原消息是否有图片
  sourceMsgText: string;
  replayMsgSeq: string; // 源消息的msgSeq，可以通过这个找到源消息的msgId
};

export type PicMessageElement = {
  sourcePath: string; // 图片本地路径
  picWidth: number;
  picHeight: number;
  fileSize: number;
  fileName: string;
  fileUuid: string;
  md5HexStr: string;
  original: boolean;
  picType: number;
  picSubType: number;
  fileUuid: string;
  fileSubId: string;
  thumbFileSize: number;
  summary: string;
};

export type PttMessageElement = {
  canConvert2Text: boolean;
  duration: number; // 秒数
  fileBizId: null;
  fileId: number; // 0
  fileName: string; // "e4d09c784d5a2abcb2f9980bdc7acfe6.amr"
  filePath: string; // "/Users/C5366155/Library/Containers/com.tencent.qq/Data/Library/Application Support/QQ/nt_qq_a6b15c9820595d25a56c1633ce19ad40/nt_data/Ptt/2023-11/Ori/e4d09c784d5a2abcb2f9980bdc7acfe6.amr"
  fileSize: string; // "4261"
  fileSubId: string; // "0"
  fileUuid: string; // "90j3z7rmRphDPrdVgP9udFBaYar#oK0TWZIV"
  formatType: string; // 1
  invalidState: number; // 0
  md5HexStr: string; // "e4d09c784d5a2abcb2f9980bdc7acfe6"
  playState: number; // 0
  progress: number; // 0
  text: string; // ""
  transferStatus: number; // 0
  translateStatus: number; // 0
  voiceChangeType: number; // 0
  voiceType: number; // 0
  waveAmplitudes: number[];
};

export type MessageElement = {
  raw: {
    msgId: string;
    msgSeq: string;
    senderUin: string;
    peerUin: string;
    elements: {
      elementType: number;
      elementId: string;
      replyElement?: ReplyMessageElement;
      textElement?: TextMessageElement;
      picElement?: PicMessageElement;
      pttElement?: PttMessageElement;
    }[];
  };

  peer: Peer;
  sender: {
    uid: string; // 一串加密的字符串
    memberName: string;
    nickname: string;
  };
};

export type SendMessage = {
  elementType: number;
  elementId: '';
  picElement?: PicMessageElement;
  pttElement?: PttMessageElement;
  textElement?: TextMessageElement;
};

export type PostDataAction =
  | 'send_private_msg'
  | 'send_group_msg'
  | 'get_group_list'
  | 'get_friend_list'
  | 'delete_msg'
  | 'get_login_info'
  | 'get_group_member_list'
  | 'get_group_member_info';

export type Config = {
  port: number;
  hosts: string[];
};

declare let chunmaoll: {
  log(data: any): void;
  send: (channel: string, ...args: any[]) => void;
  on: (channel: string, listener: (...args: any[]) => void) => void;
};

declare global {
  interface Window {
    chunmaoll: typeof chunmaoll;
    LiteLoader: any;
    webContents: WebContents & {
      __qqntim_original_object: any;
      _events: any;
    };
  }
}
