import { v4 as uuidv4 } from 'uuid';

export interface PixTransaction {
  id: string;
  amount: number;
  key: string;
  description?: string;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  qr: string;
  createdAt: Date;
  paidAt?: Date;
}

export class PixService {
  private transactions: PixTransaction[] = [];

  generatePixQr(amount: number, key: string, description?: string): PixTransaction {
    const id = uuidv4();
    // Gera QR Code (no mundo real use lib como qrcode ou API do banco)
    const qr = `PIX|${key}|${amount}|${description ?? ''}|${id}`; // Simulação!
    const tx: PixTransaction = {
      id,
      amount,
      key,
      description,
      status: 'pending',
      qr,
      createdAt: new Date(),
    };
    this.transactions.push(tx);
    return tx;
  }

  getPixStatus(id: string): PixTransaction | undefined {
    return this.transactions.find(t => t.id === id);
  }

  confirmPixPayment(id: string): PixTransaction | undefined {
    const tx = this.getPixStatus(id);
    if (!tx) return undefined;
    tx.status = 'completed';
    tx.paidAt = new Date();
    return tx;
  }
}