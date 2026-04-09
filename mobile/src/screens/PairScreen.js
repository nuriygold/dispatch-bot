import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, ActivityIndicator } from 'react-native';
import { loadConnection, setConnection, client } from '../lib/api';
import { connectWs, withWsToken } from '../lib/ws';

export default function PairScreen({ navigation }) {
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [pending, setPending] = useState(false);

  React.useEffect(() => {
    loadConnection()
      .then((saved) => {
        if (saved.baseUrl) setUrl(saved.baseUrl);
        if (saved.token) setToken(saved.token);
      })
      .catch(() => {});
  }, []);

  const pair = async () => {
    if (pending) return;
    setPending(true);
    try {
      const trimmedUrl = url.trim().replace(/\/$/, '');
      const trimmedToken = token.trim();
      await client.healthAt(trimmedUrl, trimmedToken);
      await setConnection(trimmedUrl, trimmedToken);
      const wsUrl = withWsToken(trimmedUrl.replace(/^http/, 'ws') + '/ws', trimmedToken);
      connectWs(wsUrl, null);
      navigation.replace('Campaigns');
    } catch (err) {
      Alert.alert('Pairing failed', err.message);
    } finally {
      setPending(false);
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
        autoCorrect={false}
        style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
      />
      <TextInput
        placeholder="API token (optional)"
        value={token}
        onChangeText={setToken}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
      />
      <Button title="Pair" onPress={pair} />
      {pending ? <ActivityIndicator /> : null}
      <Button title="Scan QR" onPress={() => navigation.navigate('QRPair')} />
    </View>
  );
}
