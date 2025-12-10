import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";

function maskCNPJ(value: string) {
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .slice(0, 18);
}

function validateCNPJ(cnpj: string): boolean {
  return cnpj.replace(/\D/g, "").length === 14;
}

export default function ConsultaCNPJScreen() {
  const [cnpj, setCnpj] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  async function buscarCNPJ() {
    setError(null);
    setData(null);

    if (!validateCNPJ(cnpj)) {
      setError("Digite um CNPJ válido (14 dígitos).");
      return;
    }

    setIsLoading(true);
    try {
      const cleaned = cnpj.replace(/\D/g, "");
      const res = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cleaned}`);
      const json = await res.json();

      if (json.status === "ERROR") {
        setError(json.message || "CNPJ não encontrado");
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
      <Text style={styles.title}>Consulta CNPJ</Text>
      <TextInput
        style={styles.input}
        value={cnpj}
        onChangeText={(t) => setCnpj(maskCNPJ(t))}
        keyboardType="numeric"
        placeholder="CNPJ (XX.XXX.XXX/XXXX-XX)"
        maxLength={18}
        autoCapitalize="none"
      />
      <TouchableOpacity
        style={styles.button}
        onPress={buscarCNPJ}
        disabled={isLoading || cnpj.replace(/\D/g, "").length !== 14}
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
          <Text style={styles.label}>Razão Social:</Text>
          <Text style={styles.value}>{data.nome}</Text>
          <Text style={styles.label}>Nome Fantasia:</Text>
          <Text style={styles.value}>{data.fantasia || "-"}</Text>
          <Text style={styles.label}>Situação:</Text>
          <Text style={styles.value}>{data.situacao || "-"}</Text>
          <Text style={styles.label}>Tipo:</Text>
          <Text style={styles.value}>{data.tipo || "-"}</Text>
          <Text style={styles.label}>Abertura:</Text>
          <Text style={styles.value}>{data.abertura || "-"}</Text>
          <Text style={styles.label}>Natureza Jurídica:</Text>
          <Text style={styles.value}>{data.natureza_juridica || "-"}</Text>
          <Text style={styles.label}>Capital Social:</Text>
          <Text style={styles.value}>{data.capital_social || "-"}</Text>
          <Text style={styles.label}>Endereço:</Text>
          <Text style={styles.value}>
            {data.logradouro} {data.numero} {data.complemento}
          </Text>
          <Text style={styles.label}>Município:</Text>
          <Text style={styles.value}>{data.municipio} - {data.uf}</Text>
          <Text style={styles.label}>CEP:</Text>
          <Text style={styles.value}>{data.cep}</Text>
          <Text style={styles.label}>Telefone:</Text>
          <Text style={styles.value}>{data.telefone || "-"}</Text>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{data.email || "-"}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    flex: 1,
    justifyContent: "center", // <--- CENTRALIZA VERTICALMENTE
    alignItems: "center",
    padding: 19,
    backgroundColor: "#f5f9fe",
  },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 19, color: "#3182ce", textAlign: "center" },
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