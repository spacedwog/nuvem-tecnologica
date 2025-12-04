import express from 'express';
import cors from 'cors';
import pixRoutes from './pix/routes';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/pix', pixRoutes);

app.get('/', (_, res) => res.send("API PIX OK"));
const PORT = process.env.PORT || 4444;
app.listen(PORT, () => {
  console.log(`Servidor PIX rodando na porta ${PORT}`);
});