import React, { useEffect, useState } from "react";
import { Button, View, Text, ActivityIndicator, Alert, Linking, Platform } from "react-native";

const GITHUB_CLIENT_ID = "Ov23liorKatPx6WmfqD9";
const GITHUB_CLIENT_SECRET = "ed8720d12c089ef07a3432b337b35dfdb3d645e1";
const REDIRECT_URI = Platform.OS === "ios" ? "seuapp://oauth-callback" : "http://localhost:3000/oauth-callback";

export default function GithubMarketplace() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [marketplaceApps, setMarketplaceApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 1 - GitHub OAuth URL
  function githubOAuthUrl() {
    const scope = "read:user read:org read:marketplace";
    return `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  }

  // 2 - Abrir navegador para login
  function handleLogin() {
    Linking.openURL(githubOAuthUrl());
  }

  // 3 - Capturar callback e trocar o code por access_token (requer backend para segurança)
  // Para testes: simula obtenção do token por backend.
  async function handleOAuthCallback(url: string) {
    const code = url.split('code=')[1];
    if (!code) return;
    setLoading(true);
    try {
      const tokenResp = await fetch('https://SEU_BACKEND.com/oauth/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, client_id: GITHUB_CLIENT_ID, client_secret: GITHUB_CLIENT_SECRET, redirect_uri: REDIRECT_URI })
      });
      const { access_token } = await tokenResp.json();
      setAccessToken(access_token);
      Alert.alert("Sucesso", "Login com GitHub realizado!");
    } catch (e: any) {
      Alert.alert("Erro", "Falha na autenticação: " + e.message);
    }
    setLoading(false);
  }

  // 4 - Buscar Apps do Marketplace do usuário
  async function getMarketplaceInfo(token: string) {
    setLoading(true);
    try {
      const resp = await fetch("https://api.github.com/user/marketplace_purchases", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await resp.json();
      setMarketplaceApps(Array.isArray(json) ? json : []);
    } catch {
      Alert.alert("Erro", "Falha ao consultar Marketplace.");
    }
    setLoading(false);
  }

  useEffect(() => {
    // Detectar callback OAuth
    const handleDeepLink = (event: { url: string }) => {
      if (event.url.includes("code=")) handleOAuthCallback(event.url);
    };
    Linking.addEventListener('url', handleDeepLink);
    return () => Linking.removeEventListener('url', handleDeepLink);
  }, []);

  useEffect(() => {
    if (accessToken) getMarketplaceInfo(accessToken);
  }, [accessToken]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      {!accessToken ? (
        <Button title="Login via GitHub" onPress={handleLogin} />
      ) : loading ? (
        <ActivityIndicator />
      ) : (
        <View>
          <Text style={{ fontWeight: "bold", fontSize: 18, marginBottom: 10 }}>Marketplace Apps</Text>
          {marketplaceApps.length === 0 ? (
            <Text>Nenhum app adquirido no Marketplace.</Text>
          ) : (
            marketplaceApps.map((app, i) => (
              <Text key={i} style={{ marginBottom: 5 }}>{app.marketplace_listing?.name || "App desconhecido"}</Text>
            ))
          )}
        </View>
      )}
    </View>
  );
}