import express from 'express';
import { PixService } from './PixService';
const router = express.Router();
const pix = new PixService();

router.post('/initiate', (req, res) => {
  const { amount, key, description } = req.body;
  if (!amount || !key) return res.status(400).json({ error: "amount e chave PIX obrigatórios" });
  const tx = pix.generatePixQr(amount, key, description);
  res.json({
    id: tx.id,
    qr: tx.qr,
    status: tx.status,
    createdAt: tx.createdAt,
    amount: tx.amount,
    key: tx.key,
    description: tx.description,
  });
});
// Consulta status da transação
router.get('/status/:id', (req, res) => {
  const tx = pix.getPixStatus(req.params.id);
  if (!tx) return res.status(404).json({ error: "Transação não encontrada" });
  res.json(tx);
});
// Simular pagamento (em produção, seria webhook ATM/banco)
router.post('/confirm/:id', (req, res) => {
  const tx = pix.confirmPixPayment(req.params.id);
  if (!tx) return res.status(404).json({ error: "Transação não encontrada" });
  res.json(tx);
});

export default router;