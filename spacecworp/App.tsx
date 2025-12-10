import React, { useState } from 'react';
import MainScreen from './src/MainScreen'; // conteúdo atual do App.tsx exportado
import ConsultaCNPJScreen from './src/screens/ConsultaCNPJScreen'; // tela de empresas
import NotaFiscalScreen from './src/screens/ECommerceScreen'; // tela de ecommerce
import TabBar from './src/components/TabBar'; // barra de navegação

export default function App() {
  const routes = [
    { key: 'home', title: 'Home' },
    { key: 'empresas', title: 'Empresas' },
    { key: 'ECommerce', title: 'ECommerce' },
  ];
  const [activeScreen, setActiveScreen] = useState(0);

  // Alterna telas conforme o índice ativo
  let CurrentScreen;
  if (activeScreen === 0) CurrentScreen = MainScreen;
  else if (activeScreen === 1) CurrentScreen = ConsultaCNPJScreen;
  else if (activeScreen === 2) CurrentScreen = ECommerceScreen;

  return (
    <>
      {CurrentScreen ? <CurrentScreen /> : null}
      <TabBar routes={routes} activeIndex={activeScreen} onNavigate={setActiveScreen} />
    </>
  );
}