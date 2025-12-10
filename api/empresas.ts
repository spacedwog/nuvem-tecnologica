import type { NextApiRequest, NextApiResponse } from 'next';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// 1. Checagem de variável de ambiente com logs
const firebaseKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!firebaseKey) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY não definida!');
  throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY não definida! O valor deve ser o JSON completo da chave de serviço do Firebase.');
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(firebaseKey);
} catch (err) {
  console.error('Erro ao fazer parse do FIREBASE_SERVICE_ACCOUNT_KEY:', err);
  throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY está mal formatado. Verifique se é um JSON válido.');
}

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não suportado' });
  }

  try {
    const snapshot = await db.collection('empresas').get();
    const empresas = snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as {
        nome?: string;
        fantasia?: string;
        cnpj?: string;
        email?: string;
        [key: string]: any;
      }),
    }));

    const cleanList = empresas.map(e => ({
      nome: e.nome,
      fantasia: e.fantasia,
      cnpj: e.cnpj,
      email: e.email,
    }));

    res.status(200).json(cleanList);
  } catch (error: any) {
    console.error('Erro na API empresas:', error);
    res.status(500).json({ error: error.message ?? 'Erro ao buscar empresas' });
  }
}