import { LogEntry } from '../domain/LogEntry';

const BASE_URL = "http://192.168.15.6:80";

export class ESP32Service {
  static async fetchStatus() {
    const res = await fetch(`${BASE_URL}/`);
    if (!res.ok) throw new Error("Resposta inválida do ESP32-CAM.");
    return await res.json();
  }
  static async sendCommand(cmd: string) {
    const res = await fetch(`${BASE_URL}/cmd?cmd=${encodeURIComponent(cmd)}`);
    if (!res.ok) throw new Error(await res.text());
    return await res.text();
  }
  static async fetchNotifications(): Promise<LogEntry[]> {
    const url = `${BASE_URL}/notify`;
    try {
      const resp = await fetch(url);
      if (!resp.ok) return [];
      const notifs = await resp.json();
      return (notifs || []).map((n: any) => new LogEntry(n.msg, n.type));
    } catch (e) {
      return [];
    }
  }
  static async sendCompanyDataToVespa(cnpjDados: any): Promise<void> {
    const resp = await fetch(`${BASE_URL}/empresa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cnpjDados),
    });
    if (!resp.ok) throw new Error(await resp.text());
  }
}