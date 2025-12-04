module.exports = (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.status(200).end('Olá, mundo! Este é o index.js rodando no Vercel 🚀');
};