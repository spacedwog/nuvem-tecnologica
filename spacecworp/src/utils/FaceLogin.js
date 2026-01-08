import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Camera } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';

export default function FaceLogin({ onSuccess }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const onFacesDetected = ({ faces }) => {
    if (faces.length > 0 && !faceDetected) {
      setIsLoading(true);
      setFaceDetected(true);
      setTimeout(() => { // Simulação do reconhecimento — aqui entraria chamada real (API/facial compare)
        setIsLoading(false);
        onSuccess();  // Chama callback para "fazer login"
      }, 1200);
    }
  };

  if (hasPermission === null) return <View />;
  if (hasPermission === false) return <Text>Permissão da câmera negada.</Text>;

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        type={Camera.Constants.Type.front}
        ref={cameraRef}
        onFacesDetected={faceDetected ? undefined : onFacesDetected}
        faceDetectorSettings={{
          mode: FaceDetector.FaceDetectorMode.fast,
          detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
          runClassifications: FaceDetector.FaceDetectorClassifications.none,
        }}
      />
      <View style={styles.overlay}>
        <Text style={styles.text}>
          {isLoading ? 'Reconhecendo...' : 'Olhe para a câmera para login'}
        </Text>
        {isLoading && <ActivityIndicator style={{ marginTop: 10 }} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  camera: { width: 320, height: 400, borderRadius: 12, overflow: 'hidden' },
  overlay: {
    position: 'absolute', bottom: 20, left: 0, right: 0, alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)', padding: 16, borderRadius: 12,
  },
  text: { color: '#fff', fontSize: 17, fontWeight: 'bold', textAlign: 'center' },
});