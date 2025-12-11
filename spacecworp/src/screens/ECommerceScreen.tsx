import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Alert,
  Modal,
  TextInput
} from "react-native";
import { Clipboard } from "react-native"; // <-- Usar Clipboard do próprio react-native.

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

// Modal Pix corrigido: COPIAR SEM FECHAR
function PixQRCodeModal({
  visible,
  onClose,
  pixQr
}: { visible: boolean; onClose: () => void; pixQr: string | null }) {
  const [copyStatus, setCopyStatus] = useState<string>("");

  async function handleCopyPix() {
    if (!pixQr) return;
    Clipboard.setString(pixQr); // <-- react-native Clipboard
    setCopyStatus("Copiado!");
    setTimeout(() => setCopyStatus(""), 1500);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBack}>
        <View style={styles.modalCard}>
          <Text style={{ fontWeight: "bold", fontSize: 18, color: "#3182ce", marginBottom: 6 }}>
            Pague com Pix
          </Text>
          <Text style={{ fontSize: 15, textAlign: "center", marginBottom: 11 }}>
            Escaneie o código Pix com seu banco ou copie o código abaixo.
          </Text>
          {pixQr ? (
            <>
              <Text
                selectable
                style={{
                  fontSize: 12,
                  marginBottom: 12,
                  backgroundColor: "#f4f4f4",
                  padding: 10,
                  borderRadius: 6,
                  minWidth: 240,
                  textAlign: "center"
                }}
              >
                {pixQr}
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: "#3182ce",
                  paddingVertical: 8,
                  paddingHorizontal: 22,
                  borderRadius: 8,
                  marginBottom: 5,
                  alignSelf: "center"
                }}
                onPress={handleCopyPix}
                activeOpacity={0.82}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>Copiar código Pix</Text>
              </TouchableOpacity>
              {copyStatus ? (
                <Text style={{ color: "#32a852", fontWeight: "bold", marginTop: 5 }}>{copyStatus}</Text>
              ) : null}
            </>
          ) : (
            <Text>Carregando QR Pix...</Text>
          )}
          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <Text style={{ fontWeight: "bold", color: "#3182ce", fontSize: 15 }}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function ECommerceScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<{id: string; qtd: number}[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Modal cadastro
  const [registerModalVisible, setRegisterModalVisible] = useState(false);
  const [formNome, setFormNome] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPreco, setFormPreco] = useState("");
  const [formImagem, setFormImagem] = useState("");

  // Modal exclusão
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any | null>(null);

  // Pix
  const [pixModal, setPixModal] = useState(false);
  const [pixQr, setPixQr] = useState<string | null>(null);

  function addToCart(productId: string) {
    setCart((prev) => {
      const found = prev.find((item) => item.id === productId);
      if (found) {
        return prev.map((item) =>
          item.id === productId ? {...item, qtd: item.qtd + 1} : item
        );
      } else {
        return [...prev, { id: productId, qtd: 1 }];
      }
    });
    setModalVisible(false);
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev
      .map((item) => item.id === productId ? {...item, qtd: item.qtd - 1} : item)
      .filter((item) => item.qtd > 0));
  }

  function clearCart() {
    setCart([]);
  }

  // Gera o Pix ao finalizar compra
  async function handleCheckoutPix() {
    try {
      const totalValue = cart.reduce((sum, item) => {
        const p = products.find(prod => prod.id === item.id);
        return sum + ((p?.preco ?? 0) * item.qtd);
      }, 0);
      const pixKey = "62904267000160"; // Troque para chave Pix real!
      const response = await fetch("https://nuvem-tecnologica.vercel.app/api/pix", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          action: 'initiate',
          amount: totalValue,
          key: pixKey,
          nome_fantasia: "E-Commerce",
          cidade: "SAO PAULO",
          description: "Pedido E-Commerce",
        }),
      });
      const data = await response.json();
      if (data.qr) {
        setPixQr(data.qr);
        setPixModal(true);
      } else {
        Alert.alert("Erro ao gerar Pix", data.error || "Erro desconhecido");
      }
    } catch (err: any) {
      Alert.alert("Falha ao gerar Pix", err?.message || "Erro desconhecido");
    }
  }

  function handleCheckout() {
    handleCheckoutPix();
  }

  function openModal(product: any) {
    setSelectedProduct(product);
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setSelectedProduct(null);
  }

  function openRegisterModal() {
    setRegisterModalVisible(true);
  }

  function closeRegisterModal() {
    setRegisterModalVisible(false);
    setFormNome(""); setFormDesc(""); setFormPreco(""); setFormImagem("");
  }

  function handleAddProduct() {
    if (!formNome.trim() || !formPreco.trim()) {
      Alert.alert("Campos obrigatórios", "Preencha nome e preço do produto.");
      return;
    }
    const nextId = String(Number(products[products.length-1]?.id || 0) + 1);
    setProducts(prev => [
      ...prev,
      {
        id: nextId,
        nome: formNome,
        descricao: formDesc,
        preco: Number(formPreco),
        imagem: formImagem || undefined,
      }
    ]);
    closeRegisterModal();
  }

  function openDeleteModal(product: any) {
    setProductToDelete(product);
    setDeleteModalVisible(true);
  }

  function closeDeleteModal() {
    setDeleteModalVisible(false);
    setProductToDelete(null);
  }

  function handleDeleteProduct() {
    if (productToDelete) {
      setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
      setCart(prev => prev.filter(c => c.id !== productToDelete.id));
    }
    closeDeleteModal();
    if(selectedProduct?.id === productToDelete?.id) closeModal();
  }

  const cartItems = cart.map(({id, qtd}) => {
    const product = products.find((p) => p.id === id);
    return { ...product, qtd };
  });
  const total = cartItems.reduce((sum, item) => sum + (item?.preco || 0) * (item.qtd || 0), 0);

  const ListHeader = () => (
    <View style={styles.headerWrapper}>
      <Text style={styles.title}>E-Commerce</Text>
      <TouchableOpacity
        style={styles.cadastroButton}
        onPress={openRegisterModal}
      >
        <Text style={styles.cadastroButtonText}>Cadastrar Produto</Text>
      </TouchableOpacity>
      <Text style={styles.subtitle}>Produtos</Text>
    </View>
  );

  const ListFooter = () => (
    <View style={styles.footerContainer}>
      <Text style={styles.subtitle}>Carrinho</Text>
      {cartItems.length === 0 ? (
        <Text style={styles.emptyCart}>Seu carrinho está vazio.</Text>
      ) : (
        <View style={styles.cartCard}>
          {cartItems.map((item) => (
            <View
              key={item.id}
              style={styles.cartItem}
            >
              <Text style={styles.cartItemText}>
                {item.nome} x {item.qtd} = {formatBRL((item.preco ?? 0) * item.qtd)}
              </Text>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => item.id && removeFromCart(item.id)}
              >
                <Text style={{ color: "#fff" }}>Remover</Text>
              </TouchableOpacity>
            </View>
          ))}
          <Text style={styles.totalLabel}>Total: {formatBRL(total)}</Text>
          <TouchableOpacity
            style={styles.checkoutButton}
            onPress={handleCheckout}
          >
            <Text style={{color:"#fff", fontWeight:"bold"}}>Finalizar Compra</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.clearCartButton}
            onPress={clearCart}
          >
            <Text style={{color:"#3182ce", fontWeight:"bold"}}>Limpar Carrinho</Text>
          </TouchableOpacity>
        </View>
      )}
      <PixQRCodeModal visible={pixModal} onClose={() => setPixModal(false)} pixQr={pixQr} />
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        renderItem={({item}) => (
          <View style={{alignItems: "center"}}>
            <TouchableOpacity
              onPress={() => openModal(item)}
              activeOpacity={0.87}
            >
              <View style={styles.productCard}>
                {item.imagem ? (
                  <Image
                    source={{ uri: item.imagem }}
                    style={styles.productImage}
                  />
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{item.nome}</Text>
                  <Text style={styles.productDesc}>{item.descricao}</Text>
                  <Text style={styles.productPrice}>{formatBRL(item.preco)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => openDeleteModal(item)}
                >
                  <Text style={{color:"#fff",fontWeight:"bold"}}>Excluir</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => addToCart(item.id)}
                >
                  <Text style={styles.buttonText}>Adicionar</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 70, alignItems: "center" }}
        ListEmptyComponent={
          <Text style={{textAlign:"center", color:"#aaa", marginTop:14}}>
            Nenhum produto cadastrado.
          </Text>
        }
      />

      {/* Modal de Detalhe de Produto */}
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent
        onRequestClose={closeModal}
      >
        <View style={styles.modalBack}>
          <View style={styles.modalCard}>
            {selectedProduct?.imagem && (
              <Image
                source={{ uri: selectedProduct.imagem }}
                style={styles.modalImage}
              />
            )}
            <Text style={styles.modalName}>
              {selectedProduct?.nome}
            </Text>
            <Text style={styles.modalDesc}>
              {selectedProduct?.descricao}
            </Text>
            <Text style={styles.modalPrice}>
              {formatBRL(selectedProduct?.preco || 0)}
            </Text>
            <TouchableOpacity
              style={styles.modalAddButton}
              onPress={() => addToCart(selectedProduct.id)}
            >
              <Text style={styles.buttonText}>Adicionar ao Carrinho</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={closeModal}
            >
              <Text style={{color:"#3182ce", fontWeight:"bold"}}>Fechar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalDeleteButton}
              onPress={() => {
                closeModal();
                openDeleteModal(selectedProduct);
              }}
            >
              <Text style={{color:"#d60000", fontWeight:"bold"}}>Excluir Produto</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Cadastro de Produto */}
      <Modal
        visible={registerModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeRegisterModal}
      >
        <View style={styles.modalBack}>
          <View style={styles.cadastroCard}>
            <Text style={styles.cadastroTitulo}>Cadastrar Produto</Text>
            <View style={styles.centerFields}>
              <TextInput
                style={styles.input}
                placeholder="Nome *"
                value={formNome}
                onChangeText={setFormNome}
              />
              <TextInput
                style={styles.input}
                placeholder="Descrição"
                value={formDesc}
                onChangeText={setFormDesc}
              />
              <TextInput
                style={styles.input}
                placeholder="Preço *"
                value={formPreco}
                onChangeText={setFormPreco}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="URL da Imagem"
                value={formImagem}
                onChangeText={setFormImagem}
              />
              <TouchableOpacity
                style={styles.modalAddButton}
                onPress={handleAddProduct}
              >
                <Text style={styles.buttonText}>Adicionar Produto</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={closeRegisterModal}
              >
                <Text style={{color:"#3182ce", fontWeight:"bold"}}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Exclusão de Produto */}
      <Modal
        visible={deleteModalVisible}
        animationType="fade"
        transparent
        onRequestClose={closeDeleteModal}
      >
        <View style={styles.modalBack}>
          <View style={[styles.cadastroCard, {maxWidth: 310}]}>
            <View style={styles.centerFields}>
              <Text style={{
                color:"#d60000",
                fontWeight: "bold",
                fontSize: 18,
                marginBottom: 16,
                alignSelf: "center",
              }}>
                Excluir Produto
              </Text>
              <Text style={{fontSize:16, textAlign:'center', marginBottom:18}}>
                Tem certeza que deseja excluir o produto{' '}
                <Text style={{color:"#d60000",fontWeight:'bold'}}>
                  {productToDelete?.nome}
                </Text>
                ?
              </Text>
              <TouchableOpacity
                style={styles.modalDeleteButton}
                onPress={handleDeleteProduct}
              >
                <Text style={{color:"#fff", fontWeight:"bold"}}>Excluir</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={closeDeleteModal}
              >
                <Text style={{color:"#3182ce", fontWeight:"bold"}}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default ECommerceScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f9fe",
    padding: 19,
  },
  headerWrapper: {
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 8,
    paddingTop: 70,
    backgroundColor: "#f5f9fe",
    width: "100%",
  },
  footerContainer: {
    alignItems: "center",
    width: "100%",
  },
  centerFields: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 19, color: "#3182ce", textAlign: "center" },
  cadastroButton: {
    backgroundColor: "#23578a",
    borderRadius: 9,
    paddingHorizontal: 13,
    paddingVertical: 8,
    alignSelf: "center",
    marginBottom: 16,
  },
  cadastroButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  subtitle: {
    fontSize: 18, fontWeight: "bold", marginTop: 6, marginBottom: 8, color: "#23578a", textAlign: "center"
  },
  productCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginBottom: 11,
    width: 330,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.09,
    shadowRadius: 3,
    elevation: 2,
    alignSelf: "center"
  },
  productImage: {
    width: 48, height: 48, marginRight: 15, resizeMode: "contain"
  },
  productName: { fontWeight: "bold", fontSize: 16, color: "#23292e", textAlign: "left" },
  productDesc: { color: "#5a6d8a", fontSize: 14, marginBottom: 7, flexWrap: "wrap" },
  productPrice: { fontWeight: "bold", color: "#3182ce", marginBottom: 5 },
  addButton: {
    backgroundColor: "#3182ce",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  deleteButton: {
    backgroundColor: "#d60000",
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginLeft: 5,
    justifyContent: "center",
    alignItems: "center"
  },
  cartCard: {
    width: 330,
    backgroundColor: "#fff",
    borderRadius: 13,
    padding: 18,
    marginTop: 7,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 5,
    alignSelf: "center",
  },
  cartItem: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8
  },
  cartItemText: { color: "#23292e", fontSize: 15 },
  removeButton: {
    backgroundColor: "#d60000",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 8,
  },
  totalLabel: { color: "#23578a", fontWeight: "bold", fontSize: 16, marginTop: 10, marginBottom: 7, textAlign: "center" },
  checkoutButton: {
    backgroundColor: "#3182ce",
    paddingVertical: 12,
    borderRadius: 9,
    alignItems: "center",
    marginBottom: 8,
  },
  clearCartButton: {
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 7,
    marginBottom: 5,
  },
  emptyCart: {
    color: "#5a6d8a",
    fontStyle: "italic",
    marginTop: 10,
    marginBottom: 10,
    fontSize: 16,
    textAlign: "center"
  },
  input: {
    width: "90%",
    maxWidth: 320,
    borderWidth: 1,
    borderColor: "#b2c8e4",
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 17,
    marginBottom: 10,
    backgroundColor: "#fff",
    textAlign: "center"
  },
  modalBack: {
    flex: 1,
    backgroundColor: "rgba(30,47,72,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 17,
    padding: 28,
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    width: 330,
    maxWidth: "90%",
  },
  modalImage: {
    width: 90,
    height: 90,
    resizeMode: "contain",
    marginBottom: 18,
  },
  modalName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#23292e",
    marginBottom: 4,
    textAlign: "center",
  },
  modalDesc: {
    color: "#5a6d8a",
    fontSize: 16,
    marginBottom: 13,
    textAlign: "center",
  },
  modalPrice: {
    fontWeight: "bold",
    color: "#3182ce",
    fontSize: 18,
    marginBottom: 15,
    textAlign: "center",
  },
  modalAddButton: {
    backgroundColor: "#3182ce",
    borderRadius: 9,
    paddingHorizontal: 19,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 7,
    width: "100%",
  },
  modalCloseButton: {
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 7,
    width: "100%",
    marginTop: 4,
  },
  modalDeleteButton: {
    backgroundColor: "#d60000",
    borderRadius: 7,
    paddingVertical: 10,
    alignItems: "center",
    width: "100%",
    marginTop: 7,
    marginBottom: 6,
  },
  cadastroCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 25,
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    width: 330,
    maxWidth: "90%",
    justifyContent: "center",
  },
  cadastroTitulo: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#3182ce",
    marginBottom: 12,
    textAlign: "center",
  },
});