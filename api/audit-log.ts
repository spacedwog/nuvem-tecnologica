import { VercelRequest, VercelResponse } from '@vercel/node';

// Estrutura de evento esperado
interface PixAuditEvent {
  event: string;
  details?: any;
  timestamp: string;
  user: string;
}

// Armazena eventos apenas em memória (reset a cada deploy)
const auditLog: PixAuditEvent[] = [];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Aceita apenas POST e GET (listagem simples)
  if (req.method === 'POST') {
    const { event, details, timestamp, user } = req.body || {};
    if (!event || !timestamp || !user) {
      return res.status(400).json({ error: "Campos obrigatórios: event, timestamp, user" });
    }
    auditLog.push({
      event: String(event),
      details,
      timestamp: String(timestamp),
      user: String(user)
    });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'GET') {
    // Pode informar ?limit=10
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
    return res.status(200).json(auditLog.slice(-limit).reverse());
  }

  return res.status(405).json({ error: 'Método não suportado.' });
}