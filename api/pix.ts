import { VercelRequest, VercelResponse } from '@vercel/node'
import { v4 as uuidv4 } from 'uuid'

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

export default function handler(req: VercelRequest, res: VercelResponse) {
  // GET /api/pix/status?id=xxx
  if (req.method === 'GET') {
    if (req.query.status && req.query.id) {
      const tx = transactions.find(t => t.id === req.query.id)
      if (!tx) return res.status(404).json({ error: "Transação não encontrada" })
      return res.json(tx)
    }
    return res.status(404).json({ error: "Endpoint inválido" })
  }
  // POST /api/pix/initiate
  if (req.method === 'POST' && req.body?.action === 'initiate') {
    const { amount, key, description } = req.body
    if (!amount || !key) return res.status(400).json({ error: "amount e chave PIX obrigatórios" })
    const id = uuidv4()
    const qr = `PIX|${key}|${amount}|${description ?? ''}|${id}`
    const tx: PixTransaction = {
      id,
      amount,
      key,
      description,
      status: 'pending',
      qr,
      createdAt: new Date(),
    }
    transactions.push(tx)
    return res.json({
      id: tx.id,
      qr: tx.qr,
      status: tx.status,
      createdAt: tx.createdAt,
      amount: tx.amount,
      key: tx.key,
      description: tx.description,
    })
  }
  // POST /api/pix/confirm
  if (req.method === 'POST' && req.body?.action === 'confirm' && req.body?.id) {
    const tx = transactions.find(t => t.id === req.body.id)
    if (!tx) return res.status(404).json({ error: "Transação não encontrada" })
    tx.status = 'completed'
    tx.paidAt = new Date()
    return res.json(tx)
  }
  return res.status(404).json({ error: "Endpoint inválido" })
}