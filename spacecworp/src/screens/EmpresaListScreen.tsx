import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Tipos de empresa
type EmpresaCadastrada = {
  nome: string;
  fantasia?: string;
  email: string;
  cnpj: string;
};

export default function EmpresaListScreen() {
  const [empresas, setEmpresas] = useState<EmpresaCadastrada[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulação: troque por chamada real a API de empresas se houver
    async function fetchEmpresas() {
      setLoading(true);
      // Buscar empresas usando seu backend ou serviço local
      const res = await fetch('https://nuvem-tecnologica.vercel.app/api/empresas');
      const data = await res.json();

      // Caso não tenha API, use mock local:
      // const data = [
      //   { nome: 'Empresa X', email: 'vendas@empresax.com', cnpj: '00.000.000/0001-92', fantasia: 'EmpX' },
      //   { nome: 'Empresa Y', email: 'contato@empresay.com', cnpj: '22.222.222/0001-55', fantasia: 'EmpY' }
      // ];
      setEmpresas(data);
      setLoading(false);
    }
    fetchEmpresas();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        <Ionicons name="business-outline" size={26} color="#3182ce" /> Empresas cadastradas
      </Text>
      <Text style={styles.subtitle}>E-mails para contato e vendas</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#3182ce" style={{ marginTop: 26 }} />
      ) : (
        <ScrollView style={{ width: '100%' }}>
          {empresas.length === 0 && <Text style={styles.empty}>Nenhuma empresa cadastrada.</Text>}
          {empresas.map((empresa, idx) => (
            <View key={empresa.cnpj || idx} style={styles.card}>
              <Text style={styles.name}>{empresa.nome} {empresa.fantasia ? <Text style={styles.fantasia}>({empresa.fantasia})</Text> : null}</Text>
              <Text style={styles.cnpj}><Text style={styles.label}>CNPJ: </Text> {empresa.cnpj}</Text>
              <Text style={styles.email}><Text style={styles.label}>E-mail: </Text><Text selectable>{empresa.email}</Text></Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafd', alignItems: 'center', padding: 18, justifyContent: 'flex-start' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#3182ce', marginBottom: 7, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#555', marginBottom: 18 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 11,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2eaf7'
  },
  name: { fontSize: 17, fontWeight: 'bold', color: '#23497a' },
  fantasia: { fontSize: 16, color: '#226c99', fontWeight: 'bold' },
  cnpj: { fontSize: 14, color: 'gray', marginBottom: 4 },
  email: { fontSize: 15, color: '#312', fontWeight: 'bold' },
  label: { color: '#3182ce', fontWeight: 'bold' },
  empty: { textAlign: 'center', fontStyle: 'italic', color: '#998', marginVertical: 40, fontSize: 17 }
});