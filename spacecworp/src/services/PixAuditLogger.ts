import { Empresa } from "../domain/Empresa";

const AUDIT_LOG_API = "https://nuvem-tecnologica.vercel.app/api/audit-log";

export class PixAuditLogger {
  static async log(event: string, details: Record<string, any> = {}, empresa: Empresa | null = null) {
    await fetch(AUDIT_LOG_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        details,
        timestamp: new Date().toISOString(),
        user: empresa?.dados?.fantasia || empresa?.cnpj || 'anônimo'
      }),
    });
  }
}