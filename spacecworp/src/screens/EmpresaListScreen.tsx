// ...
async function fetchEmpresas() {
  setLoading(true);
  // Agora, usa sua rota que integra com a People API!
  const res = await fetch('https://nuvem-tecnologica.vercel.app/api/empresas');
  const data = await res.json();
  setEmpresas(data);
  setLoading(false);
}
// ...