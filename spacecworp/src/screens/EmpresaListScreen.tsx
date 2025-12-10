import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Pressable,
  Image,
  TextInput,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type EmpresaList = {
  login: string;
  id: number;
  avatar_url: string;
  description?: string;
  html_url: string;
  email?: string;
};

// Opções de filtro
type EmailFilter = "all" | "with" | "without";

export default function EmpresaListsScreen() {
  const [orgs, setOrgs] = useState<EmpresaList[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const [selectedOrg, setSelectedOrg] = useState<EmpresaList | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [emailFilter, setEmailFilter] = useState<EmailFilter>("all");

  const fetchOrgs = async (query: string) => {
    setLoading(true);
    setError(null);

    const endpoint = query
      ? `https://api.github.com/search/users?q=type:org+${encodeURIComponent(query)}`
      : 'https://api.github.com/organizations';

    try {
      const res = await fetch(endpoint);
      let data: any = [];

      if ((res.headers.get('content-type') || '').includes('application/json')) {
        data = await res.json();
      } else {
        try {
          data = JSON.parse(await res.text());
        } catch {
          data = [];
        }
      }

      if (endpoint.includes('/search/')) {
        if (Array.isArray(data.items)) {
          setOrgs(
            data.items.map((org: any) => ({
              login: org.login,
              id: org.id,
              avatar_url: org.avatar_url,
              html_url: org.html_url || `https://github.com/${org.login}`,
              description: '',
              email: undefined,
            }))
          );
        } else {
          setOrgs([]);
        }
      } else {
        if (Array.isArray(data)) {
          setOrgs(
            data.map((org: any) => ({
              login: org.login,
              id: org.id,
              avatar_url: org.avatar_url,
              html_url: org.html_url || org.url || `https://github.com/${org.login}`,
              description: '',
              email: undefined,
            }))
          );
        } else {
          setOrgs([]);
        }
      }
    } catch (err) {
      setError('Erro ao buscar organizações.');
      setOrgs([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrgs('');
  }, []);

  // Busca detalhes ao abrir modal
  const openModal = (org: EmpresaList) => {
    setSelectedOrg(org);
    setModalVisible(true);
    fetchOrgDetails(org.login);
  };

  const fetchOrgDetails = async (login: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`https://api.github.com/orgs/${login}`);
      const orgDetail = await res.json();
      setSelectedOrg(prev =>
        prev
          ? {
              ...prev,
              description: orgDetail.description || '',
              email: orgDetail.email || undefined,
            }
          : prev
      );
      // Preenche e-mail também na listagem se desejar (opcional)
      setOrgs(prev =>
        prev.map(org =>
          org.login === login
            ? { ...org, email: orgDetail.email || undefined }
            : org
        )
      );
    } catch {}
    setDetailLoading(false);
  };

  const closeModal = () => {
    setSelectedOrg(null);
    setModalVisible(false);
  };

  // Envio de e-mail usando link mailto: abre no aplicativo padrão do usuário
  const sendSaleEmail = (org: EmpresaList) => {
    if (!org.email) return;
    const subject = encodeURIComponent(`Proposta de Software para ${org.login}`);
    const body = encodeURIComponent(
      `Olá equipe ${org.login},\n\nGostaria de apresentar uma proposta de software que pode ajudar a sua organização. Podemos conversar?\n\nAtenciosamente,\n[Spacecworp Team]`
    );
    const mailto = `mailto:${org.email}?subject=${subject}&body=${body}`;
    if (Platform.OS === 'web') {
      window.open(mailto, '_blank');
    } else {
      Linking.openURL(mailto);
    }
  };

  // Filtro das empresas de acordo com o radio selecionado
  const orgsFiltered = orgs.filter(org => {
    if (emailFilter === "all") return true;
    if (emailFilter === "with") return !!org.email;
    if (emailFilter === "without") return !org.email;
    return true;
  });

  // Componente simples de radio button
  const RadioButton = ({
    value,
    label,
    selected,
    onPress,
  }: {
    value: EmailFilter;
    label: string;
    selected: boolean;
    onPress: (value: EmailFilter) => void;
  }) => (
    <TouchableOpacity
      style={styles.radioContainer}
      onPress={() => onPress(value)}
      activeOpacity={0.7}
    >
      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
      <Text style={styles.radioLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        <Ionicons name="business-outline" size={26} color="#3182ce" /> Organizações do GitHub
      </Text>
      <Text style={styles.subtitle}>Pesquise organizações e proponha venda de software</Text>
      <View style={styles.searchArea}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar organização por nome"
          style={styles.searchInput}
          onSubmitEditing={() => fetchOrgs(search.trim())}
          autoCorrect={false}
          autoCapitalize="none"
        />
        <Pressable onPress={() => fetchOrgs(search.trim())} style={styles.searchButton}>
          <Ionicons name="search" size={19} color="#fff" />
        </Pressable>
      </View>

      {/* Radio Buttons */}
      <View style={styles.radioGroup}>
        <RadioButton
          value="all"
          label="Todas"
          selected={emailFilter === "all"}
          onPress={setEmailFilter}
        />
        <RadioButton
          value="with"
          label="Somente com e-mail"
          selected={emailFilter === "with"}
          onPress={setEmailFilter}
        />
        <RadioButton
          value="without"
          label="Somente sem e-mail"
          selected={emailFilter === "without"}
          onPress={setEmailFilter}
        />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {loading ? (
        <ActivityIndicator size="large" color="#3182ce" style={{ marginTop: 24 }} />
      ) : (
        <ScrollView style={{ width: '100%' }} keyboardShouldPersistTaps="handled">
          {orgsFiltered.length === 0 ? (
            <Text style={styles.empty}>Nenhuma organização encontrada.</Text>
          ) : (
            orgsFiltered.map((org) => (
              <TouchableOpacity key={org.id} style={styles.card} onPress={() => openModal(org)}>
                <View style={styles.orgHeader}>
                  <View style={styles.avatarWrap}>
                    <Ionicons
                      name="logo-github"
                      size={34}
                      color="#333"
                      style={{ position: 'absolute', left: 7, top: 7, opacity: 0.17 }}
                    />
                    <Image source={{ uri: org.avatar_url }} style={styles.avatar} />
                  </View>
                  <View>
                    <Text style={styles.name}>{org.login}</Text>
                    <Text style={styles.id}>ID: {org.id}</Text>
                    <Text style={styles.link}>{org.html_url}</Text>
                    <Text
                      style={[
                        styles.emailInfo,
                        !org.email && { color: '#aaa', fontStyle: 'italic' },
                      ]}
                    >
                      {org.email ? org.email : 'E-mail não informado'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            {selectedOrg ? (
              <>
                <View style={{ alignItems: 'center' }}>
                  <Image source={{ uri: selectedOrg.avatar_url }} style={styles.modalAvatar} />
                </View>
                <Text style={styles.modalName}>{selectedOrg.login}</Text>
                <Text style={styles.modalId}>ID: {selectedOrg.id}</Text>
                {detailLoading ? (
                  <ActivityIndicator size="small" color="#3182ce" style={{ marginVertical: 10 }} />
                ) : (
                  <>
                    <Text style={styles.modalDesc}>
                      {selectedOrg.description || (
                        <Text style={{ fontStyle: 'italic', color: '#999' }}>Sem descrição</Text>
                      )}
                    </Text>
                    <Pressable
                      onPress={() => {
                        if (Platform.OS === 'web') {
                          window.open(selectedOrg.html_url, '_blank');
                        } else {
                          Linking.openURL(selectedOrg.html_url);
                        }
                      }}
                      style={styles.modalLinkBtn}
                    >
                      <Text style={styles.modalLink}>{selectedOrg.html_url}</Text>
                    </Pressable>
                    <Text style={styles.modalEmailTitle}>E-mail</Text>
                    <Text
                      selectable
                      style={[
                        styles.modalEmail,
                        !selectedOrg.email && { color: '#aaa', fontStyle: 'italic' },
                      ]}
                    >
                      {selectedOrg.email ? selectedOrg.email : 'E-mail não informado'}
                    </Text>
                    {selectedOrg.email ? (
                      <Pressable onPress={() => sendSaleEmail(selectedOrg)} style={styles.saleBtn}>
                        <Text style={styles.saleBtnText}>Enviar proposta de venda</Text>
                      </Pressable>
                    ) : null}
                  </>
                )}
                <Pressable onPress={closeModal} style={styles.modalCloseBtn}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Fechar</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafd',
    alignItems: 'center',
    padding: 18,
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#3182ce',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: { fontSize: 15, color: '#666', marginBottom: 15 },
  searchArea: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1.2,
    borderColor: '#e1eaf6',
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 40,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#3182ce',
    borderRadius: 9,
    marginLeft: 10,
    padding: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 9,
    marginTop: -2,
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    paddingVertical: 2,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#3182ce',
    marginRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  radioOuterSelected: {
    borderColor: '#226c99',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3182ce',
  },
  radioLabel: {
    fontSize: 14,
    color: '#23497a',
    marginRight: 3,
  },
  error: {
    width: '100%',
    color: '#c42c00',
    backgroundColor: '#fff1e9',
    borderRadius: 8,
    padding: 7,
    marginBottom: 5,
    textAlign: 'center',
    fontSize: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 11,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2eaf7',
  },
  orgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    marginRight: 13,
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: '#ededed',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
  },
  name: { fontSize: 17, fontWeight: 'bold', color: '#23497a' },
  id: { fontSize: 14, color: 'gray' },
  link: { fontSize: 14, color: '#1b60d0', textDecorationLine: 'underline' },
  desc: {
    marginTop: 4,
    fontSize: 15,
    color: '#444',
    fontStyle: 'italic',
  },
  emailInfo: {
    fontSize: 14,
    color: '#44a',
    marginTop: 3,
  },
  empty: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#998',
    marginVertical: 40,
    fontSize: 17,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(25,30,52,0.36)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 22,
    alignItems: 'center',
    minWidth: 270,
    shadowColor: '#222',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 7,
  },
  modalAvatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    marginBottom: 12,
    backgroundColor: '#f2f2f2',
  },
  modalName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#23497a',
    textAlign: 'center',
    marginVertical: 6,
  },
  modalId: { fontSize: 15, color: '#555', textAlign: 'center', marginBottom: 9 },
  modalDesc: { fontSize: 16, color: '#444', fontStyle: 'italic', textAlign: 'center', marginBottom: 5 },
  modalEmailTitle: { fontSize: 14, color: '#3182ce', fontWeight: 'bold', marginTop: 17 },
  modalEmail: { fontSize: 16, color: '#333', textAlign: 'center', marginTop: 1, marginBottom: 10 },
  modalLink: { color: '#226c99', fontWeight: '500', textAlign: 'center', fontSize: 16, textDecorationLine: 'underline' },
  modalLinkBtn: { marginBottom: 11 },
  modalCloseBtn: {
    backgroundColor: '#3182ce',
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: 8,
    marginTop: 8,
  },
  saleBtn: {
    backgroundColor: '#40c970',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 9,
    marginTop: 9,
    marginBottom: 2,
  },
  saleBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});