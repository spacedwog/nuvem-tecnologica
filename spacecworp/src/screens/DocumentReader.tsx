import React, { useState } from "react";
import { View, Text, Button, Alert, Modal, ScrollView } from "react-native";
import DocumentPicker from "react-native-document-picker";
import RNFS from "react-native-fs";

type Props = {
  visible: boolean;
  onClose: () => void;
  onTextRead?: (text: string) => void;
};

export default function DocumentReaderModal({ visible, onClose, onTextRead }: Props) {
  const [text, setText] = useState<string>("");

  async function pickDocument() {
    try {
      const res = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.plainText, DocumentPicker.types.pdf], // adicione outros tipos aqui se quiser
      });
      if (res.type === "text/plain" && res.uri) {
        // Para TXT: lê o arquivo
        const txt = await RNFS.readFile(res.uri, "utf8");
        setText(txt);
        onTextRead?.(txt);
      } else if (res.type === "application/pdf" && res.uri) {
        // Para PDF: (requer integração extra para ler texto, como pdf-lib/pdfjs, aqui omitido por simplicidade)
        setText("Para PDFs, utilize uma biblioteca extra para renderizar/leitura de texto.");
      }
    } catch (e: any) {
      if (!DocumentPicker.isCancel(e)) Alert.alert("Erro ao importar", e.message);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: "#0007", justifyContent: "center" }}>
        <View style={{ backgroundColor: "#fff", margin: 25, padding: 20, borderRadius: 10 }}>
          <Text style={{ fontWeight: "bold", fontSize: 16, marginBottom: 10 }}>Leitura de Documento</Text>
          <Button title="Escolher Documento" onPress={pickDocument} />
          <ScrollView style={{ maxHeight: 300, marginTop: 16 }}>
            <Text style={{ fontSize: 15, color: "#222" }}>{text}</Text>
          </ScrollView>
          <Button title="Fechar" onPress={onClose} color="#3182ce" />
        </View>
      </View>
    </Modal>
  );
}