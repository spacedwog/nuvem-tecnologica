import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não suportado' });
  }
  const { email, orgName } = req.body;

  if (!email || !orgName) {
    return res.status(400).json({ error: 'E-mail e nome da organização são obrigatórios.' });
  }

  // Configure seu remetente SMTP:
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? '465'),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,   // Example: "suaconta@gmail.com"
      pass: process.env.SMTP_PASS,   // App password
    },
  });

  // Compose a message
  const mailOptions = {
    from: `"Venda Software" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Proposta de Software para ${orgName}`,
    text: `Olá equipe ${orgName},

Gostaríamos de apresentar nossa proposta de software que pode auxiliar nos processos da sua organização!

Entre em contato para saber mais.

Atenciosamente,
Sua empresa`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'E-mail enviado com sucesso!' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao enviar e-mail.' });
  }
}