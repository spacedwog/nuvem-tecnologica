const PIX_API = "https://nuvem-tecnologica.vercel.app/api/pix";

export class PixService {
  static async criarPix(
    amount: number,
    key: string,
    description: string,
    nome_fantasia: string,
    cidade: string
  ) {
    const keySemMascara = key.replace(/\D/g, '');
    const res = await fetch(PIX_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "initiate",
        amount,
        key: keySemMascara,
        description,
        nome_fantasia,
        cidade,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  static async statusPix(id: string) {
    const res = await fetch(`${PIX_API}?action=status&id=${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  static async confirmarPix(id: string) {
    const res = await fetch(PIX_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm", id }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
}