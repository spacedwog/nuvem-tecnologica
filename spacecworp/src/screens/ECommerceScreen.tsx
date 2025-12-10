import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Alert,
  Modal,
  Pressable,
} from "react-native";

// Exemplo de produtos
const products = [
  {
    id: "1",
    nome: "Smartphone Android",
    descricao: "Celular Android, 128GB, 4GB RAM",
    preco: 1459.99,
    imagem: "https://cdn-icons-png.flaticon.com/512/1010/1010966.png",
  },
  {
    id: "2",
    nome: "Fone Bluetooth",
    descricao: "Áudio estéreo sem fio, bateria 12h",
    preco: 239.9,
    imagem: "https://cdn-icons-png.flaticon.com/512/686/686589.png",
  },
  {
    id: "3",
    nome: "Notebook Ultrafino",
    descricao: "Tela 14'', SSD 256GB, 8GB RAM",
    preco: 3599.0,
    imagem: "https://cdn-icons-png.flaticon.com/512/2922/2922193.png",
  },
];

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

export default function ECommerceScreen() {
  const [cart, setCart] = useState<{id: string; qtd: number}[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

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
    setModalVisible(false); // Fecha modal ao adicionar
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev
      .map((item) => item.id === productId ? {...item, qtd: item.qtd - 1} : item)
      .filter((item) => item.qtd > 0));
  }

  function clearCart() {
    setCart([]);
  }

  function handleCheckout() {
    Alert.alert("Pedido confirmado!", "Compra realizada com sucesso!");
    clearCart();
  }

  const cartItems = cart.map(({id, qtd}) => {
    const product = products.find((p) => p.id === id);
    return { ...product, qtd };
  });
  const total = cartItems.reduce((sum, item) => sum + (item?.preco || 0) * (item.qtd || 0), 0);

  function openModal(product: any) {
    setSelectedProduct(product);
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setSelectedProduct(null);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>E-Commerce</Text>
      <Text style={styles.subtitle}>Produtos</Text>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({item}) => (
          <TouchableOpacity
            onPress={() => openModal(item)}
            activeOpacity={0.87}
          >
            <View style={styles.productCard}>
              {item.imagem && (
                <Image
                  source={{ uri: item.imagem }}
                  style={styles.productImage}
                />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.productName}>{item.nome}</Text>
                <Text style={styles.productDesc}>{item.descricao}</Text>
                <Text style={styles.productPrice}>{formatBRL(item.preco)}</Text>
              </View>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => addToCart(item.id)}
              >
                <Text style={styles.buttonText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        style={{ width: "100%" }}
        showsVerticalScrollIndicator={false}
      />

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
                {item.nome} x {item.qtd} = {formatBRL(item.preco * item.qtd)}
              </Text>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeFromCart(item.id)}
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

      {/* ----------- Modal de produto ------------ */}
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalBack} onPress={closeModal}>
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
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    backgroundColor: "#f5f9fe",
    padding: 18,
    paddingBottom: 70,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 6,
    marginBottom: 14,
    color: "#3182ce",
    textAlign: "center"
  },
  subtitle: {
    fontSize: 18, fontWeight: "bold", marginTop: 14, marginBottom: 8, color: "#23578a"
  },
  productCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginBottom: 11,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.09,
    shadowRadius: 3,
    elevation: 2,
  },
  productImage: {
    width: 48, height: 48, marginRight: 15, resizeMode: "contain"
  },
  productName: { fontWeight: "bold", fontSize: 16, color: "#23292e" },
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
  cartCard: {
    width: "98%",
    maxWidth: 370,
    backgroundColor: "#fff",
    borderRadius: 13,
    padding: 18,
    marginTop: 7,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 5,
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
  totalLabel: { color: "#23578a", fontWeight: "bold", fontSize: 16, marginTop: 10, marginBottom: 7 },
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
  // MODAL
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
    width: "81%",
    maxWidth: 370,
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
});