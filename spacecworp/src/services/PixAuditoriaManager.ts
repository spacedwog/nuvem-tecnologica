import { Empresa } from "../domain/Empresa";
import { PixAuditLogger } from "./PixAuditLogger";

export type PixAudit = {
  event: string;
  timestamp: string;
  valorPix?: string;
  descricao?: string;
  user?: string;
  pixId?: string;
  pixStatus?: string;
  qr?: string;
  status?: string;
  motivo?: string;
  resposta?: any;
};

export class PixAuditoriaManager {
  constructor(
    private setPixAuditLog: React.Dispatch<React.SetStateAction<PixAudit[]>>,
    private empresa: Empresa | null
  ) {}

  addPixAudit(event: string, details: Record<string, any> = {}) {
    const item: PixAudit = {
      event,
      timestamp: new Date().toISOString(),
      ...details,
      user: this.empresa?.dados?.fantasia || this.empresa?.cnpj || 'anônimo'
    };
    this.setPixAuditLog(prev => [...prev, item]);
    PixAuditLogger.log(event, details, this.empresa);
  }
}