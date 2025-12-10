import type { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';

// Variáveis de ambiente
const SERVICE_ACCOUNT_ENV = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
const IMPERSONATE_EMAIL = process.env.GOOGLE_IMPERSONATE_EMAIL;

// Função auxiliar para parse do JSON da Conta de Serviço
function parseServiceAccount() {
  if (!SERVICE_ACCOUNT_ENV) return null;
  try {
    // Remove quebras de linha problemáticas, se necessário
    return JSON.parse(SERVICE_ACCOUNT_ENV);
  } catch (e) {
    return null;
  }
}

// Inicializa o serviço da People API autenticado
function getPeopleService(serviceAccount: any) {
  if (!serviceAccount || !IMPERSONATE_EMAIL) return null;

  const auth = new google.auth.JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: [
      'https://www.googleapis.com/auth/contacts.readonly'
    ],
    subject: IMPERSONATE_EMAIL
  });

  return google.people({ version: 'v1', auth });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não suportado.' });
  }

  const serviceAccount = parseServiceAccount();

  if (!serviceAccount) {
    return res.status(500).json({ error: 'Service account JSON inválido ou não definido. Configure a variável GOOGLE_SERVICE_ACCOUNT_KEY.' });
  }
  if (!IMPERSONATE_EMAIL) {
    return res.status(500).json({ error: 'Email para delegação não definido. Configure a variável GOOGLE_IMPERSONATE_EMAIL.' });
  }

  const peopleService = getPeopleService(serviceAccount);
  if (!peopleService) {
    return res.status(500).json({ error: 'Falha ao inicializar People API. Verifique suas configurações.' });
  }

  try {
    // Consulta os contatos. Ajuste o pageSize conforme sua necessidade
    const response = await peopleService.people.connections.list({
      resourceName: 'people/me',
      pageSize: 50,
      personFields: 'names,emailAddresses,organizations',
    });

    // Normaliza para array esperado pelo frontend
    const empresas = Array.isArray(response.data.connections)
      ? response.data.connections.map(person => ({
          nome: person.names?.[0]?.displayName ?? '',
          fantasia: person.organizations?.[0]?.name ?? '',
          cnpj: '', // CNPJ não existe diretamente na API, personalizado se quiser
          email: person.emailAddresses?.[0]?.value ?? '',
        }))
      : [];

    res.status(200).json(empresas);
  } catch (error: any) {
    res.status(500).json({
      error: error.message ?? 'Erro ao consultar Google People API.',
      empresas: [],
    });
  }
}