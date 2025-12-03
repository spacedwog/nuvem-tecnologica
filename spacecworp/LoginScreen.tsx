import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Animated, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from './VespaApp';

// Ajuste a URL para sua API real.
const API_ENDPOINT = 'https://seu-backend.com/api/login-cnpj';
const CNPJ_PERMITIDO = "62.904.267/0001-60";

type LoginScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Login'>;
};

function maskCNPJ(text: string): string {
  let v = text.replace(/\D/g, '');
  v = v.slice(0, 14);
  v = v.replace(/^(\d{2})(\d)/, "$1.$2");
  v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
  v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
  v = v.replace(/(\d{4})(\d)/, "$1-$2");
  return v;
}

function validateCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/[^\d]+/g, '');
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  let digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += +numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  if (resultado !== +digitos.charAt(0)) return false;
  tamanho += 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += +numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  return resultado === +digitos.charAt(1);
}

async function autenticaCNPJ(cnpj: string): Promise<boolean> {
  // Simula requisição real
  // Troque por chamada real:
  // const resp = await fetch(API_ENDPOINT, { method: 'POST', body: JSON.stringify({cnpj}) });
  // const json = await resp.json();
  // return json.autorizado === true;
  return new Promise(resolve => setTimeout(() => resolve(cnpj === CNPJ_PERMITIDO), 700));
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [cnpj, setCnpj] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  function handleChangeCNPJ(text: string) {
    setErrorMsg(null);
    setSuccessMsg(null);
    setCnpj(maskCNPJ(text));
  }

  async function loginCNPJ() {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);
    fadeAnim.setValue(0);

    if (!validateCNPJ(cnpj)) {
      setErrorMsg('CNPJ inválido');
      setIsLoading(false);
      return;
    }

    try {
      const autorizado = await autenticaCNPJ(cnpj);
      setIsLoading(false);
      if (!autorizado) {
        setErrorMsg('CNPJ não autorizado.');
        return;
      }
      setSuccessMsg('Login realizado com sucesso!');
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        navigation.replace('Main', { cnpj });
      }, 900);
    } catch (e: any) {
      setErrorMsg('Erro de conexão.');
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.loginBg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.loginCard}>
        <MaterialIcons name="business" size={38} color="#3182ce" style={{marginBottom: 13}} />
        <Text style={styles.loginTitle}>Login - Empresa</Text>
        <Text style={styles.loginSubtitle}>Acesso restrito via CNPJ</Text>
        <View style={styles.inputArea}>
          <Ionicons name="key-outline" size={22} color="#5072b7" style={{ marginRight: 7 }} />
          <TextInput
            style={styles.inputCnpj}
            value={cnpj}
            keyboardType="numeric"
            placeholder="CNPJ (XX.XXX.XXX/XXXX-XX)"
            onChangeText={handleChangeCNPJ}
            maxLength={18}
            editable={!isLoading}
            returnKeyType="done"
            autoCapitalize="none"
          />
        </View>
        <TouchableOpacity
          style={styles.buttonEntrar}
          activeOpacity={0.7}
          onPress={loginCNPJ}
          disabled={isLoading || cnpj.length < 18}
        >
          {isLoading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={{color:"#fff", fontWeight:"bold", fontSize:17}}>Entrar</Text>}
        </TouchableOpacity>
        {errorMsg && <Text style={styles.errorMsg}>{errorMsg}</Text>}
        {successMsg && <Animated.Text style={[styles.successMsg,{opacity:fadeAnim}]}>{successMsg}</Animated.Text>}
        <View style={{marginTop:16}}>
          <Text style={{color:'#999'}}>CNPJ autorizado: {CNPJ_PERMITIDO}</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loginBg: {flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#eaf1fb'},
  loginCard: {
    width:'92%', maxWidth:400,
    backgroundColor:'#fff',
    borderRadius:18, padding:24,
    shadowColor:'#000', shadowOffset:{width:0,height:8},
    shadowOpacity:0.23, shadowRadius:14, elevation:14,
    alignItems:'center'
  },
  loginTitle: {fontSize:24, fontWeight:'bold', color:'#3182ce', marginBottom:3},
  loginSubtitle: {fontSize:14, color:'#666', marginBottom:17},
  inputArea: {flexDirection:'row', alignItems:'center', width:'100%', backgroundColor:'#f5f7fc', borderRadius:10,marginBottom:11,borderWidth:1, borderColor:'#cde3fa', paddingHorizontal:9},
  inputCnpj: {flex:1, fontSize:17, paddingVertical:11, color:'#23292e'},
  buttonEntrar: {width:'100%', backgroundColor:'#3182ce', borderRadius:10, alignItems:'center', paddingVertical:15, marginTop:7, elevation:2},
  errorMsg: {color:'#d60000', fontWeight:'bold', marginTop:14},
  successMsg: {color:'#328d3f', fontWeight:'bold', marginTop:14, fontSize:17},
});