import React, { useState } from 'react';
import { View, Text, Button, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { setConnection, client } from '../lib/api';
import { connectWs, withWsToken } from '../lib/ws';

export default function QRPairScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [pending, setPending] = useState(false);

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Camera permission needed</Text>
        <Button title="Grant" onPress={requestPermission} />
      </View>
    );
  }

  const handle = async (data) => {
    if (scanned) return;
    setScanned(true);
    setPending(true);
    try {
      const parsed = JSON.parse(data.data || '{}');
      if (!parsed.baseUrl) throw new Error('Invalid QR');
      await client.healthAt(parsed.baseUrl, parsed.token || '');
      await setConnection(parsed.baseUrl, parsed.token || '');
      connectWs(
        withWsToken(parsed.wsUrl || parsed.baseUrl.replace(/^http/, 'ws') + '/ws', parsed.token || ''),
        parsed.wsSubscribe || null,
      );
      navigation.replace('Campaigns');
    } catch (err) {
      Alert.alert('Pair failed', err.message);
      setScanned(false);
    } finally {
      setPending(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <CameraView style={{ flex: 1 }} onBarcodeScanned={handle} />
      {pending ? <ActivityIndicator style={{ position: 'absolute', top: 24, alignSelf: 'center' }} /> : null}
    </View>
  );
}
