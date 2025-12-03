import React from 'react';
import VespaApp from './VespaApp';
import { useNavigation } from '@react-navigation/native';

// Type declaration for globalThis.__nav
declare global {
  // You can replace 'any' with the actual navigation type if desired
  var __nav: any;
}

export default function MainScreen({ route }: any) {
  const navigation = useNavigation();
  // Expõe globalmente para logout
  globalThis.__nav = navigation;
  return <VespaApp cnpj={route.params.cnpj} />;
}