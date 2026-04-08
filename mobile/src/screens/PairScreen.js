import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { loadBaseUrl, setBaseUrl, client } from '../lib/api';
import { connectWs } from '../lib/ws';

export default function PairScreen({ navigation }) {
  const [url, setUrl] = useState('');

  React.useEffect(() => {
    loadBaseUrl()
      .then((saved) => {
        if (saved) setUrl(saved);
      })
      .catch(() => {});
  }, []);

  const pair = async () => {
    try {
      await setBaseUrl(url);
      const wsUrl = url.replace(/^http/, 'ws') + '/ws';
      connectWs(wsUrl);
      await client.health();
      navigation.replace('Campaigns');
    } catch (err) {
      Alert.alert('Pairing failed', err.message);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Pair to Orchestrator</Text>
      <TextInput
        placeholder="http://localhost:3000"
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
      />
      <Button title="Pair" onPress={pair} />
      <Button title="Scan QR" onPress={() => navigation.navigate('QRPair')} />
    </View>
  );
}
