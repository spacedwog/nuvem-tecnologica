import { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';

// Importação flexível do qrcode-pix, cobre CommonJS/ESM, e exportações nomeadas ("QrCodePix")
const qrcodePix = require('qrcode-pix');

// Detecta exportação Pix corretamente em TODAS as formas possíveis, inclusive 'QrCodePix'
let PixClass: any = null;
if (typeof qrcodePix === "function") {
  PixClass = qrcodePix;
} else if ("Pix" in qrcodePix && typeof qrcodePix.Pix === "function") {
  PixClass = qrcodePix.Pix;
} else if ("default" in qrcodePix && typeof qrcodePix.default === "function") {
  PixClass = qrcodePix.default;
} else if ("default" in qrcodePix && "Pix" in qrcodePix.default && typeof qrcodePix.default.Pix === "function") {
  PixClass = qrcodePix.default.Pix;
} else if ("QrCodePix" in qrcodePix && typeof qrcodePix.QrCodePix === "function") {
  PixClass = qrcodePix.QrCodePix;
} else if ("default" in qrcodePix && "QrCodePix" in qrcodePix.default && typeof qrcodePix.default.QrCodePix === "function") {
  PixClass = qrcodePix.default.QrCodePix;
}

interface PixTransaction {
  id: string;
  amount: number;
  key: string;
  description?: string;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  qr: string;
  createdAt: Date;
  paidAt?: Date;
}

const transactions: PixTransaction[] = [];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      if (req.query.action === 'status' && req.query.id) {
        const tx = transactions.find(t => t.id === req.query.id);
        if (!tx) return res.status(404).json({ error: "Transação não encontrada" });
        return res.json(tx);
      }
      return res.status(400).json({ error: "Parâmetros necessários: action=status&id=xxx" });
    }

    if (req.method === 'POST') {
      const { action } = req.body;

      if (action === 'initiate') {
        const { amount, key, description } = req.body;
        if (!amount || !key)
          return res.status(400).json({ error: "amount e chave PIX obrigatórios" });

        const id = uuidv4();

        // Validação robusta
        if (!PixClass) {
          return res.status(500).json({
            error: "Biblioteca Pix não está disponível (export problem)",
            debug: { typeof: typeof qrcodePix, keys: Object.keys(qrcodePix), inner: qrcodePix }
          });
        }

        // Checa tipo da chave PIX (pode ser CPF, CNPJ, email, telefone, aleatória)
        // O Pix aceita: CPF/CNPJ numérico, telefone (br), e-mail, chave aleatória (uuid/hex)
        const pixKeyTrimmed = typeof key === "string" ? key.trim() : "";
        if (!pixKeyTrimmed || pixKeyTrimmed.length < 8) {
          return res.status(400).json({ error: "Chave PIX inválida ou muito curta." });
        }

        // Se CPF/CNPJ, reduz só a números. Se não, deixa como está.
        // Regra simples: se tudo número e comprimento típico de cpf/cnpj, limpa. Se contém @, etc, deixa.
        let parsedPixKey = pixKeyTrimmed;
        if (/^\d{11}$/.test(parsedPixKey) || /^\d{14}$/.test(parsedPixKey)) {
          parsedPixKey = parsedPixKey.replace(/\D/g, '');
        }

        let pixObj: any;
        try {
          pixObj = new PixClass({
            key: parsedPixKey,
            name: "EMPRESA LTDA",
            city: "SAO PAULO",
            amount: Number(amount),
            message: description ? String(description).substr(0, 25) : "",
            txid: id.replace(/-/g, '').slice(0, 35),
          });
          const qrPayload = typeof pixObj.payload === "function"
            ? pixObj.payload()
            : (typeof pixObj.getPayload === "function" ? pixObj.getPayload() : null);

          if (!qrPayload) {
            throw new Error("Função de geração do Pix payload não encontrada.");
          }

          const tx: PixTransaction = {
            id,
            amount,
            key: parsedPixKey,
            description,
            status: 'pending',
            qr: qrPayload,
            createdAt: new Date(),
          };
          transactions.push(tx);

          return res.json({
            id: tx.id,
            qr: tx.qr,
            status: tx.status,
            createdAt: tx.createdAt,
            amount: tx.amount,
            key: tx.key,
            description: tx.description,
          });
        } catch(err: any) {
          return res.status(500).json({
            error: "Erro ao gerar QR Pix",
            details: err?.message,
            debug: {
              key: parsedPixKey,
              amount,
              description,
              txid: id.replace(/-/g, '').slice(0, 35),
              pixObj: typeof pixObj !== 'undefined' ? pixObj : null
            }
          });
        }
      }

      if (action === 'confirm' && req.body.id) {
        const tx = transactions.find(t => t.id === req.body.id);
        if (!tx) return res.status(404).json({ error: "Transação não encontrada" });
        tx.status = 'completed';
        tx.paidAt = new Date();
        return res.json(tx);
      }

      return res.status(400).json({ error: "Ação POST inválida ou faltando parâmetros." });
    }

    return res.status(405).json({ error: "Método não suportado." });
  } catch (e: any) {
    res.status(500).json({ error: "Erro interno na API PIX", details: e?.stack || e?.message || String(e) });
  }
}