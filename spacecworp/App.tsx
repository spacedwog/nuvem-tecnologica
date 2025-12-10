import React, { useState } from 'react';
import MainScreen from './src/MainScreen';
import ConsultaCNPJScreen from './src/screens/ConsultaCNPJScreen';
import ECommerceScreen from './src/screens/ECommerceScreen';
import TabBar from './src/components/TabBar';

// Uso correto: apenas BannerAd do react-native-google-mobile-ads
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

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

  // Teste ou substitua pelo seu ID banner real em produção
  const adUnitID = __DEV__ 
    ? TestIds.BANNER // <-- use TestIds.BANNER para desenvolvimento
    : 'ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy';

  return (
    <>
      {CurrentScreen ? <CurrentScreen /> : null}
      <TabBar routes={routes} activeIndex={activeScreen} onNavigate={setActiveScreen} />
      
      {/* Banner AdMob correto para react-native-google-mobile-ads */}
      <BannerAd
        unitId={adUnitID}
        size={BannerAdSize.ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
      />
    </>
  );
}