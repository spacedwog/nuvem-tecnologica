const ZOWE_API = "https://seu-backend.com/api/zowe"; // Seu backend que fala com o Zowe CLI

export class ZoweService {
  static async conectar(username: string, password: string, host: string, port: string) {
    const res = await fetch(`${ZOWE_API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, host, port }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  static async listarDatasets(token: string) {
    const res = await fetch(`${ZOWE_API}/datasets`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
}