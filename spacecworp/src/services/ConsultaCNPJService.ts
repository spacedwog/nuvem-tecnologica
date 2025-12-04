export class ConsultaCNPJService {
  static async consulta(cnpj: string) {
    const cnpjLimpo = cnpj.replace(/[^\d]+/g, '');
    if (cnpjLimpo.length !== 14) throw new Error("CNPJ inválido.");
    const url = `https://www.receitaws.com.br/v1/cnpj/${cnpjLimpo}`;
    const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!resp.ok) throw new Error("Erro ao consultar CNPJ na ReceitaWS.");
    const json = await resp.json();
    if (json.status === 'ERROR') throw new Error(json.message);
    return json;
  }
}