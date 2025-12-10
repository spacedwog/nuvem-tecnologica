import React, { useState } from 'react';
import { View, Dimensions } from 'react-native';
import MainScreen from './src/MainScreen';
import ConsultaCNPJScreen from './src/screens/ConsultaCNPJScreen';
import ECommerceScreen from './src/screens/ECommerceScreen';
import TabBar from './src/components/TabBar';

export default function App() {
  const routes = [
    { key: 'home', title: 'Home' },
    { key: 'empresas', title: 'Empresas' },
    { key: 'ECommerce', title: 'ECommerce' },
  ];
  const [activeScreen, setActiveScreen] = useState(0);

  let CurrentScreen;
  if (activeScreen === 0) CurrentScreen = MainScreen;
  else if (activeScreen === 1) CurrentScreen = ConsultaCNPJScreen;
  else if (activeScreen === 2) CurrentScreen = ECommerceScreen;

  return (
    <>
      {/* Tela principal */}
      {CurrentScreen ? <CurrentScreen /> : null}
      <TabBar routes={routes} activeIndex={activeScreen} onNavigate={setActiveScreen} />
    </>
  );
}