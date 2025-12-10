import type { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';

// Configuração Service Account com Delegação
const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY ?? '{}');
const USER_TO_IMPERSONATE = process.env.GOOGLE_IMPERSONATE_EMAIL;

const getPeopleService = () => {
  const auth = new google.auth.JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: [
      'https://www.googleapis.com/auth/contacts.readonly',
    ],
    subject: USER_TO_IMPERSONATE,
  });

  return google.people({ version: 'v1', auth });
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não suportado' });
  }

  try {
    const peopleService = getPeopleService();

    // Consulte os contatos (pessoas) do usuário delegado
    const response = await peopleService.people.connections.list({
      resourceName: 'people/me',
      pageSize: 20,
      personFields: 'names,emailAddresses,organizations',
    });

    // Mapeie para o formato que o frontend espera
    const empresas = (response.data.connections || []).map(person => ({
      nome: person.names?.[0]?.displayName ?? '',
      fantasia: person.organizations?.[0]?.name ?? '', // Fantasia via organização
      cnpj: '', // Não existe CNPJ na People API, deve ser customizado se quiser buscar em um campo custom
      email: person.emailAddresses?.[0]?.value ?? '',
    }));

    res.status(200).json(empresas);
  } catch (error: any) {
    res.status(500).json({
      error: error.message ?? 'Erro ao buscar empresas (API People)',
    });
  }
}