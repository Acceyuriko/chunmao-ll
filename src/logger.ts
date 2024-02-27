// import dayjs from 'dayjs';
import fs from 'fs';

const buffer: string[] = [];
let writing = false;

const write = () => {
  if (buffer.length === 0) {
    writing = false;
    return;
  }
  writing = true;
  const item = buffer.shift()!;
  fs.promises
    .writeFile('C://Users/Acceyuriko/Documents/chunmao-ll/log.txt', item, { flag: 'a', encoding: 'utf-8' })
    .then(() => {
      write();
    });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const info = (...messages: any[]) => {
  // const time = dayjs().format('YYYY-MM-DD HH:mm:ss.SSS');
  // return console.info(`<chunmaoll ${time}> [info] `, ...messages);
  buffer.push(messages.join(' ') + '\n');
  if (!writing) {
    write();
  }
};
