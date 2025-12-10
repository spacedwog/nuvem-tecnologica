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

type ReceitaWsData = {
  status?: string;
  nome?: string;
  fantasia?: string;
  cnpj?: string;
  telefone?: string;
  email?: string;
  atividade_principal?: Array<{ code: string; text: string }>;
  uf?: string;
  municipio?: string;
  bairro?: string;
  logradouro?: string;
  numero?: string;
  cep?: string;
  aberta?: string;
};

type EmailFilter = "all" | "with" | "without";

// Token pessoal do GitHub
const token = "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";

export default function EmpresaListsScreen() {
  const [orgs, setOrgs] = useState<EmpresaList[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const [selectedOrg, setSelectedOrg] = useState<EmpresaList | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [receitaData, setReceitaData] = useState<ReceitaWsData | null>(null);
  const [receitaLoading, setReceitaLoading] = useState(false);

  const [emailFilter, setEmailFilter] = useState<EmailFilter>("all");

  // Busca inicial ao montar
  useEffect(() => {
    fetchOrgs('');
  }, []);

  const fetchOrgDetailsBatch = async (orgsBatch: EmpresaList[]) => {
    const updates = await Promise.all(
      orgsBatch.map(async org => {
        try {
          const res = await fetch(`https://api.github.com/orgs/${org.login}`, {
            headers: token ? { Authorization: `token ${token}` } : {},
          });
          if (res.status !== 200) return org;
          const orgDetail = await res.json();
          return {
            ...org,
            description: orgDetail.description || '',
            email: orgDetail.email || undefined,
          };
        } catch {
          return org;
        }
      })
    );
    return updates;
  };

  const fetchOrgs = async (query: string) => {
    setLoading(true);
    setError(null);

    const endpoint = query
      ? `https://api.github.com/search/users?q=type:org+${encodeURIComponent(query)}`
      : 'https://api.github.com/organizations';

    try {
      const res = await fetch(endpoint, {
        headers: token ? { Authorization: `token ${token}` } : {},
      });
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

      // Tratamento detalhado de erros da API
      if (res.status !== 200) {
        let msg = 'Erro desconhecido.';
        if (data && data.message) {
          if (data.message.toLowerCase().includes('rate limit')) {
            msg = "Limite de requisições atingido. Aguarde a liberação do limite!";
          } else if (data.message.toLowerCase().includes('bad credentials')) {
            msg = "Token inválido ou expirado. Troque a chave ou use um token pessoal do GitHub.";
          } else {
            msg = data.message;
          }
        } else {
          msg = `Erro HTTP ${res.status}: ${res.statusText}`;
        }
        setError(msg);
        setOrgs([]);
        setLoading(false);
        return;
      }

      let orgList: EmpresaList[] = [];
      if (endpoint.includes('/search/')) {
        if (Array.isArray(data.items)) {
          orgList = data.items.map((org: any) => ({
            login: org.login,
            id: org.id,
            avatar_url: org.avatar_url,
            html_url: org.html_url || `https://github.com/${org.login}`,
            description: '',
            email: undefined,
          }));
        }
      } else {
        if (Array.isArray(data)) {
          orgList = data.map((org: any) => ({
            login: org.login,
            id: org.id,
            avatar_url: org.avatar_url,
            html_url: org.html_url || org.url || `https://github.com/${org.login}`,
            description: '',
            email: undefined,
          }));
        }
      }

      if (orgList.length) {
        const withDetails = await fetchOrgDetailsBatch(orgList);
        setOrgs(withDetails);
      } else {
        setOrgs([]);
      }
    } catch (err) {
      setError('Erro ao buscar organizações. Verifique sua conexão ou tente novamente.');
      setOrgs([]);
    }
    setLoading(false);
  };

  const fetchReceitaWS = async (userNameOrCNPJ: string) => {
    setReceitaLoading(true);
    setReceitaData(null);

    let cnpjQuery = userNameOrCNPJ.replace(/[^\d]/g, '');
    // Se for um CNPJ válido faz a consulta, caso contrário tenta buscar pelo usuário (login como nome fantasia)
    if (cnpjQuery.length === 14) {
      try {
        const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cnpjQuery}`, {
          headers: { Accept: 'application/json' },
        });
        const data = await response.json();
        setReceitaData(data);
      } catch (err) {
        setReceitaData({ status: 'error', nome: '', cnpj: cnpjQuery });
      }
    } else {
      // Opção extra: procurar pela razão social usando login
      try {
        const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${userNameOrCNPJ}`, {
          headers: { Accept: 'application/json' },
        });
        const data = await response.json();
        setReceitaData(data);
      } catch (err) {
        setReceitaData({ status: 'error', nome: userNameOrCNPJ });
      }
    }
    setReceitaLoading(false);
  };

  const openModal = (org: EmpresaList) => {
    setSelectedOrg(org);
    setModalVisible(true);
    fetchReceitaWS(org.login);
  };

  const closeModal = () => {
    setSelectedOrg(null);
    setReceitaData(null);
    setModalVisible(false);
  };

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

  const orgsFiltered = orgs.filter(org => {
    if (emailFilter === "all") return true;
    if (emailFilter === "with") return !!org.email;
    if (emailFilter === "without") return !org.email;
    return true;
  });

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
        <Ionicons name="business-outline" size={26} color="#3182ce" /> Empresas
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

      <View style={styles.radioGroup}>
        <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <RadioButton
            value="all"
            label="Todas"
            selected={emailFilter === "all"}
            onPress={setEmailFilter}
          />
          <View style={{ flexDirection: 'row', marginTop: 5 }}>
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
        </View>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {loading ? (
        <ActivityIndicator size="large" color="#3182ce" style={{ marginTop: 24 }} />
      ) : (
        <ScrollView style={{ width: '100%' }} keyboardShouldPersistTaps="handled">
          {orgsFiltered.length === 0 ? (
            <Text style={styles.empty}>
              Nenhuma organização encontrada.
              {(emailFilter === "with" || emailFilter === "without") && "\nPoucas organizações públicas informam e-mail no GitHub."}
            </Text>
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

                {/* Bloco da ReceitaWS */}
                <View style={{ width: '100%', marginTop: 12 }}>
                  <Text style={{ fontWeight: 'bold', color: '#3182ce', fontSize: 17, marginBottom: 5 }}>
                    Dados da ReceitaWS
                  </Text>
                  {receitaLoading ? (
                    <ActivityIndicator size="small" color="#3182ce" style={{ marginVertical: 8 }} />
                  ) : receitaData && receitaData.status === 'ERROR' ? (
                    <Text style={{ color: '#c42c00' }}>Erro ao buscar dados na ReceitaWS.</Text>
                  ) : receitaData && receitaData.nome ? (
                    <>
                      <Text>Razão social: <Text style={{ fontWeight: 'bold' }}>{receitaData.nome}</Text></Text>
                      {receitaData.cnpj && <Text>CNPJ: {receitaData.cnpj}</Text>}
                      {receitaData.fantasia && <Text>Nome fantasia: {receitaData.fantasia}</Text>}
                      {receitaData.email && <Text>Email ReceitaWS: {receitaData.email}</Text>}
                      {receitaData.telefone && <Text>Telefone: {receitaData.telefone}</Text>}
                      {receitaData.atividade_principal && receitaData.atividade_principal.length > 0 && (
                        <Text>
                          Atividade principal: {receitaData.atividade_principal[0].text}
                        </Text>
                      )}
                      {receitaData.uf && receitaData.municipio && (
                        <Text>Localização: {receitaData.municipio} - {receitaData.uf}</Text>
                      )}
                      {receitaData.logradouro && (
                        <Text>
                          Endereço:{' '}
                          {receitaData.logradouro}, {receitaData.numero} - {receitaData.bairro}, {receitaData.cep}
                        </Text>
                      )}
                      {receitaData.aberta && <Text>Data de abertura: {receitaData.aberta}</Text>}
                    </>
                  ) : (
                    <Text>Nenhum dado retornado da ReceitaWS.</Text>
                  )}
                </View>

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
    alignItems: 'flex-start',
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