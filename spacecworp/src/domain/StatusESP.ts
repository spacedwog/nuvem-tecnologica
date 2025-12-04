export class StatusESP {
  wifi_mode?: string;
  ssid?: string;
  ip?: string;
  mac?: string;
  status_hw?: string;
  constructor(data: any) {
    this.wifi_mode = data.wifi_mode;
    this.ssid = data.ssid;
    this.ip = data.ip;
    this.mac = data.mac;
    this.status_hw = data.status_hw;
  }
}