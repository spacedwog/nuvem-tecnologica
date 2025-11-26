// Cliente HTTP para ESP32-CAM (vespa)
const BASE_URL = "http://192.168.15.3:80"; // STM32-CAM endereço local Wi-Fi STA

export async function fetchStatus() {
  try {
    const res = await fetch(`${BASE_URL}/`);
    return await res.json();
  } catch (e) {
    throw new Error("Não foi possível conectar ao ESP32-CAM.");
  }
}

export async function sendCommand(cmd: string) {
  try {
    const res = await fetch(`${BASE_URL}/cmd?cmd=${cmd}`);
    if (!res.ok) throw new Error(await res.text());
    return await res.text();
  } catch (e: any) {
    throw new Error(e.message || "Falha ao enviar comando.");
  }
}