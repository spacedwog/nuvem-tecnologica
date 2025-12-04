import { VercelRequest, VercelResponse } from '@vercel/node'
import { v4 as uuidv4 } from 'uuid'
import { Pix } from 'qrcode-pix'

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

const transactions: PixTransaction[] = []

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    // GET /api/pix?action=status&id=xxx
    if (req.query.action === 'status' && req.query.id) {
      const tx = transactions.find(t => t.id === req.query.id)
      if (!tx) return res.status(404).json({ error: "Transação não encontrada" })
      return res.json(tx)
    }
    return res.status(400).json({ error: "Parâmetros necessários: action=status&id=xxx" })
  }

  if (req.method === 'POST') {
    const { action } = req.body

    // POST /api/pix { action: 'initiate', ... }
    if (action === 'initiate') {
      const { amount, key, description } = req.body
      if (!amount || !key) return res.status(400).json({ error: "amount e chave PIX obrigatórios" })
      const id = uuidv4()

      // Gera um BR Code PIX válido usando o CNPJ (sem máscara/pontuação)
      // Exemplos para city e name: personalize conforme deseja
      const pix = Pix({
        key: key.replace(/\D/g, ''), // Deve ser apenas digitos do CNPJ!
        name: "EMPRESA LTDA",         // Nome do recebedor (até 25 caracteres)
        city: "SAO PAULO",            // Cidade (até 15 caracteres, caixa alta, sem acentos)
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

    // POST /api/pix { action: 'confirm', id }
    if (action === 'confirm' && req.body.id) {
      const tx = transactions.find(t => t.id === req.body.id)
      if (!tx) return res.status(404).json({ error: "Transação não encontrada" })
      tx.status = 'completed'
      tx.paidAt = new Date()
      return res.json(tx)
    }

    return res.status(400).json({ error: "Ação POST inválida ou faltando parâmetros." })
  }

  // Other HTTP methods
  return res.status(405).json({ error: "Método não suportado." })
}