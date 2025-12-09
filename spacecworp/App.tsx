import React, { useState } from 'react';
import MainScreen from './src/MainScreen'; // Este arquivo deve conter TODO o conteúdo atual do seu App.tsx, exportando MainScreen
import EmpresaListScreen from './src/screens/EmpresaListScreen'; // tela de lista de empresas (crie este arquivo conforme instruído antes)
import TabBar from './src/components/TabBar'; // barra de navegação (crie este arquivo conforme instruído antes)

export default function App() {
  const routes = [
    { key: 'home', title: 'Home' },
    { key: 'empresas', title: 'Empresas' }
  ];
  const [activeScreen, setActiveScreen] = useState(0);

  // Alterna entre MainScreen (APP original) e a tela de empresas cadastradas
  let CurrentScreen = activeScreen === 0 ? MainScreen : EmpresaListScreen;

  return (
    <>
      <CurrentScreen />
      <TabBar routes={routes} activeIndex={activeScreen} onNavigate={setActiveScreen} />
    </>
  );
}