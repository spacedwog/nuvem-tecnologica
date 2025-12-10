import React, { useState } from 'react';
import { View, Dimensions } from 'react-native';
import MainScreen from './src/MainScreen';
import ConsultaCNPJScreen from './src/screens/ConsultaCNPJScreen';
import ECommerceScreen from './src/screens/ECommerceScreen';
import TabBar from './src/components/TabBar';
import { WebView } from 'react-native-webview';

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

  // Substitua pelo seu script de anúncio real (AdSense, AdX, ou outro)
  // Não use "ca-pub-xxxxxxxxxxxxxxxx" em produção: coloque sua key de ad client e ad slot!
  const htmlBanner = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>body{margin:0;padding:0;}</style>
      </head>
      <body>
        <!-- Exemplo genérico de ad banner HTML -->
        <div id="ad-container" style="width:100vw;height:90px;display:flex;align-items:center;justify-content:center;">
          <ins class="adsbygoogle"
            style="display:inline-block;width:320px;height:50px"
            data-ad-client="ca-pub-xxxxxxxxxxxxxxxx"
            data-ad-slot="xxxxxxxxxx"></ins>
        </div>
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>
        <script>
          (adsbygoogle = window.adsbygoogle || []).push({});
        </script>
      </body>
    </html>
  `;

  return (
    <>
      {CurrentScreen ? <CurrentScreen /> : null}
      <TabBar routes={routes} activeIndex={activeScreen} onNavigate={setActiveScreen} />
      <View style={{ width: Dimensions.get('window').width, height: 90 }}>
        <WebView
          originWhitelist={['*']}
          source={{ html: htmlBanner }}
          style={{ backgroundColor: 'transparent' }}
          scrollEnabled={false}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>
    </>
  );
}