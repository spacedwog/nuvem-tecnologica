export class LogEntry {
  time: string;
  msg: string;
  type?: string;
  constructor(msg: string, type?: string) {
    this.time = new Date().toLocaleTimeString();
    this.msg = msg;
    this.type = type;
  }
}