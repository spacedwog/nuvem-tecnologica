import React, { useState } from 'react';
import MainScreen from './src/MainScreen';
import ConsultaCNPJScreen from './src/screens/ConsultaCNPJScreen';
import ECommerceScreen from './src/screens/ECommerceScreen';
import TabBar from './src/components/TabBar';

// Importação de Banner do Expo AdMob
import { AdMobBanner } from 'expo-ads-admob';

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

  // Use este ID de teste para banners. Troque para o real para produção
  const adUnitID = __DEV__ 
    ? "ca-app-pub-3940256099942544/6300978111" 
    : "ca-app-pub-xxxxxxxxxxxxxxxx/nnnnnnnnnn"; // substitua pelo seu real

  return (
    <>
      {CurrentScreen ? <CurrentScreen /> : null}
      <TabBar routes={routes} activeIndex={activeScreen} onNavigate={setActiveScreen} />
      <AdMobBanner
        bannerSize="smartBannerPortrait"
        adUnitID={adUnitID}
        servePersonalizedAds // true = anúncios personalizados
        onDidFailToReceiveAdWithError={err => console.warn(err)}
      />
    </>
  );
}