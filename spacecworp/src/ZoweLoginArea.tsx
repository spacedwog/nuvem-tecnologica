import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, Text, ActivityIndicator } from "react-native";
import { ZoweService } from "./services/ZoweService";

export default function ZoweLoginArea({
  onConnect,
}: { onConnect: (token: string) => void }) {
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setLoading(true);
    setError(null);
    try {
      const { token } = await ZoweService.conectar(user, pass, host, port);
      onConnect(token);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ marginVertical: 20 }}>
      <Text>Zowe Explorer</Text>
      <TextInput placeholder="Host" value={host} onChangeText={setHost} />
      <TextInput placeholder="Porta" value={port} onChangeText={setPort} />
      <TextInput placeholder="Usuário" value={user} onChangeText={setUser} />
      <TextInput placeholder="Senha" value={pass} onChangeText={setPass} secureTextEntry />

      <TouchableOpacity onPress={handleConnect} disabled={loading}>
        {loading ? <ActivityIndicator /> : <Text>Conectar ao Zowe</Text>}
      </TouchableOpacity>
      {error && <Text style={{ color: "red" }}>{error}</Text>}
    </View>
  );
}