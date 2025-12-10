import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet
} from "react-native";

function maskChaveAcesso(value: string) {
  return value.replace(/\D/g, "").slice(0, 44);
}
function validateChaveAcesso(chave: string): boolean {
  return chave.replace(/\D/g, "").length === 44;
}

export default function NotaFiscalScreen() {
  const [chave, setChave] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  async function buscarNotaFiscal() {
    setError(null);
    setData(null);

    if (!validateChaveAcesso(chave)) {
      setError("Digite a chave de acesso completa (44 dígitos).");
      return;
    }

    setIsLoading(true);
    try {
      const cleaned = chave.replace(/\D/g, "");
      const response = await fetch(`https://api.receitaws.com.br/nfe/v1/${cleaned}`);
      const json = await response.json();

      if (json.status === "ERROR") {
        setError(json.message || "Nota não encontrada");
      } else {
        setData(json);
      }
    } catch (e: any) {
      setError("Falha na consulta: " + (e.message || e));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Consulta Nota Fiscal Eletrônica (NF-e)</Text>
      <TextInput
        style={styles.input}
        value={chave}
        onChangeText={(t) => setChave(maskChaveAcesso(t))}
        keyboardType="numeric"
        placeholder="Chave de acesso (44 dígitos)"
        maxLength={44}
        autoCapitalize="none"
      />
      <TouchableOpacity
        style={styles.button}
        onPress={buscarNotaFiscal}
        disabled={isLoading || chave.replace(/\D/g, "").length !== 44}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Buscar</Text>
        )}
      </TouchableOpacity>
      {error && <Text style={styles.errorMsg}>{error}</Text>}

      {data && (
        <View style={styles.resultCard}>
          <Text style={styles.label}>Emitente:</Text>
          <Text style={styles.value}>{data.emitente?.nome || data.emitente?.razao_social}</Text>
          <Text style={styles.value}>{data.emitente?.cnpj}</Text>

          <Text style={styles.label}>Destinatário:</Text>
          <Text style={styles.value}>{data.destinatario?.nome || data.destinatario?.razao_social}</Text>
          {data.destinatario?.cpf && (
            <Text style={styles.value}>{data.destinatario.cpf}</Text>
          )}

          <Text style={styles.label}>Produtos:</Text>
          {(data.produtos ?? data.itens)?.map?.((p: any, idx: number) => (
            <Text key={idx} style={styles.value}>
              {p.descricao || p.nome} - Qtde: {p.quantidade || p.qtd} - Valor: {p.valor || p.valor_total}
            </Text>
          ))}

          <Text style={styles.label}>Valor Total:</Text>
          <Text style={styles.value}>{data.valorTotal || data.valor_nota || data.total}</Text>

          <Text style={styles.label}>Data de Emissão:</Text>
          <Text style={styles.value}>{data.dataEmissao || data.emissao || data.data_emissao}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 19,
    backgroundColor: "#f5f9fe",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 19,
    color: "#3182ce",
    textAlign: "center"
  },
  input: {
    width: "100%",
    maxWidth: 330,
    borderWidth: 1,
    borderColor: "#b2c8e4",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  button: {
    backgroundColor: "#3182ce",
    borderRadius: 8,
    alignItems: "center",
    paddingVertical: 13,
    marginBottom: 15,
    width: "98%",
    maxWidth: 330,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  errorMsg: { color: "#d60000", fontWeight: "bold", marginTop: 12, fontSize: 15 },
  resultCard: {
    width: "98%",
    maxWidth: 370,
    backgroundColor: "#fff",
    borderRadius: 13,
    padding: 18,
    marginTop: 15,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.13,
    shadowRadius: 6,
  },
  label: { fontWeight: "bold", color: "#23578a", marginTop: 5 },
  value: { color: "#23292e", marginBottom: 2, fontSize: 15 },
});