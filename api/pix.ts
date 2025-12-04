import { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';

const qrcodePix = require('qrcode-pix');

// Detecta exportação Pix corretamente: QrCodePix para v5.0.0
let PixClass: any = null;
if (typeof qrcodePix === "function") {
  PixClass = qrcodePix;
} else if ("QrCodePix" in qrcodePix && typeof qrcodePix.QrCodePix === "function") {
  PixClass = qrcodePix.QrCodePix;
} else if ("default" in qrcodePix && "QrCodePix" in qrcodePix.default && typeof qrcodePix.default.QrCodePix === "function") {
  PixClass = qrcodePix.default.QrCodePix;
} else {
  // fallback: função principal
  PixClass = qrcodePix;
}

interface PixTransaction {
  id: string;
  amount: number;
  key: string;
  description?: string;
  nome_fantasia?: string;
  cidade?: string;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  qr: string;
  createdAt: Date;
  paidAt?: Date;
}

const transactions: PixTransaction[] = [];

function validatePixConfig(pixConfig: any) {
  if (!pixConfig.key || typeof pixConfig.key !== 'string' || pixConfig.key.length < 8) {
    return "Chave PIX inválida ou muito curta.";
  }
  if (!pixConfig.name || typeof pixConfig.name !== 'string' || pixConfig.name.length < 1) {
    return "Razão social/nome obrigatória.";
  }
  if (!pixConfig.city || typeof pixConfig.city !== 'string' || pixConfig.city.length < 1) {
    return "Cidade obrigatória.";
  }
  if (!pixConfig.txid || typeof pixConfig.txid !== 'string' || pixConfig.txid.length < 1) {
    return "TXID obrigatório.";
  }
  if (!pixConfig.amount || (typeof pixConfig.amount !== 'string' && typeof pixConfig.amount !== 'number') || Number(pixConfig.amount) <= 0) {
    return "Valor PIX inválido.";
  }
  return null;
}

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
        const { amount, key, description, nome_fantasia, cidade } = req.body;
        if (!amount || !key)
          return res.status(400).json({ error: "amount e chave PIX obrigatórios" });

        const id = uuidv4();

        if (!PixClass) {
          return res.status(500).json({
            error: "Biblioteca Pix não está disponível (export problem)",
            debug: { typeof: typeof qrcodePix, keys: Object.keys(qrcodePix), inner: qrcodePix }
          });
        }

        const pixKeyTrimmed = typeof key === "string" ? key.trim() : "";
        if (!pixKeyTrimmed || pixKeyTrimmed.length < 8) {
          return res.status(400).json({ error: "Chave PIX inválida ou muito curta." });
        }

        let parsedPixKey = pixKeyTrimmed;
        if (/^\d{11}$/.test(parsedPixKey) || /^\d{14}$/.test(parsedPixKey)) {
          parsedPixKey = parsedPixKey.replace(/\D/g, '');
        }

        // Monta configuração SEM keyType!
        const pixConfig: any = {
          key: parsedPixKey,
          name: String(nome_fantasia || "EMPRESA LTDA").substring(0, 30),
          city: String(cidade || "SAO PAULO").substring(0, 15),
          amount: Number(amount),
          message: description ? String(description).substr(0, 25) : "",
          txid: id.replace(/-/g, '').slice(0, 35),
        };

        const errorMsg = validatePixConfig(pixConfig);
        if (errorMsg) {
          return res.status(400).json({ error: errorMsg, pixConfig });
        }

        let pixObj: any;
        try {
          pixObj = PixClass(pixConfig); // Não use 'new'!
          if (!pixObj) {
            throw new Error("PixClass não retornou objeto válido. Config utilizado: " + JSON.stringify(pixConfig));
          }

          const qrPayload = typeof pixObj.payload === "function"
            ? pixObj.payload()
            : (typeof pixObj.getPayload === "function" ? pixObj.getPayload() : null);

          if (!qrPayload) {
            throw new Error("Função de geração do Pix payload não encontrada ou retornou valor inválido.");
          }

          const tx: PixTransaction = {
            id,
            amount: Number(amount),
            key: parsedPixKey,
            description,
            nome_fantasia: pixConfig.name,
            cidade: pixConfig.city,
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
            nome_fantasia: tx.nome_fantasia,
            cidade: tx.cidade,
          });
        } catch (err: any) {
          return res.status(500).json({
            error: "Erro ao gerar QR Pix",
            details: err?.message,
            debug: {
              key: parsedPixKey,
              amount,
              description,
              nome_fantasia,
              cidade,
              txid: id.replace(/-/g, '').slice(0, 35),
              pixObj: typeof pixObj !== 'undefined' ? pixObj : null,
              pixConfig
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