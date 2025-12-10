import type { NextApiRequest, NextApiResponse } from 'next';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Confira se a environment variable foi definida corretamente
const firebaseKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!firebaseKey) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY não definida! O valor deve ser o JSON completo da chave de serviço do Firebase.');

// Inicialize o Firebase Admin apenas uma vez
const serviceAccount = JSON.parse(firebaseKey);

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
    // Coleção: "empresas"
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

    // Retorna apenas os campos principais
    const cleanList = empresas.map(e => ({
      nome: e.nome,
      fantasia: e.fantasia,
      cnpj: e.cnpj,
      email: e.email,
    }));

    res.status(200).json(cleanList);
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? 'Erro ao buscar empresas' });
  }
}