import { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';

const qrcodePix = require('qrcode-pix');

// Detecta exportação Pix corretamente
const PixClass =
  qrcodePix.Pix ? qrcodePix.Pix :
  (qrcodePix.default && qrcodePix.default.Pix ? qrcodePix.default.Pix : null);

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

        if (!PixClass) {
          return res.status(500).json({ error: "Biblioteca Pix não está disponível (export problem)" });
        }

        // Gera BRCode Pix
        const pix = new PixClass({
          key: key.replace(/\D/g, ''),
          name: "EMPRESA LTDA",
          city: "SAO PAULO",
          amount: Number(amount),
          message: description ? String(description).substr(0, 25) : "",
          txid: id.replace(/-/g, '').slice(0, 35),
        });
        const qrPayload = pix.payload();

        const tx: PixTransaction = {
          id,
          amount,
          key,
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