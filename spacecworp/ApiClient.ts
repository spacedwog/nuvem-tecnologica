// Cliente HTTP para ESP32-CAM (vespa)
const BASE_URL = "http://192.168.15.2:80"; // STM32-CAM endereço local Wi-Fi STA

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

// ATUALIZADO: Retorna todos os dados da pesquisa da API DuckDuckGo em formato bruto
export async function sendDuckSearch(query: string | number | boolean) {
  const response = await fetch(`${BASE_URL}/duck?q=${encodeURIComponent(query)}`);
  try {
    const dados = await response.json();
    return dados; // Retorna o JSON completo!
  }
  catch(e){
    throw new Error("Erro ao buscar na API Duck Go: " + e);
  }
}