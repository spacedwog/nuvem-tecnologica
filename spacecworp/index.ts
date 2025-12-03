import { registerRootComponent } from 'expo';

import App from './App';

// O registerRootComponent garante que App será inicializado corretamente no Expo ou nativo
registerRootComponent(App);