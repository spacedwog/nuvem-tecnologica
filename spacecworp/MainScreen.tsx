import React from 'react';
import { View } from 'react-native';
// Importe componentes, styles e lógicas do seu App.tsx original aqui.
// Exemplo (simplificado):
import VespaApp from './VespaApp'; // renomeie seu App original para VespaApp.tsx

type Props = {
  route: { params: { cnpj: string } };
};

export default function MainScreen({ route }: Props) {
  // Você pode passar o CNPJ se quiser personalizar a tela
  return <VespaApp cnpj={route.params.cnpj} />;
}