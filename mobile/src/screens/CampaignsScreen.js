import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, TextInput, Alert } from 'react-native';
import { client } from '../lib/api';

export default function CampaignsScreen({ navigation }) {
  const [campaigns, setCampaigns] = useState([]);
  const [title, setTitle] = useState('');

  const load = async () => {
    const data = await client.listCampaigns();
    setCampaigns(data);
  };

  useEffect(() => {
    load().catch((e) => Alert.alert('Error', e.message));
  }, []);

  const create = async () => {
    if (!title) return;
    await client.createCampaign({ title });
    setTitle('');
    load();
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Campaigns</Text>
      <FlatList
        data={campaigns}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 8 }}>
            <Text style={{ fontWeight: '500' }}>{item.title}</Text>
            <Button title="Open" onPress={() => navigation.navigate('CampaignDetail', { id: item.id })} />
          </View>
        )}
      />
      <Text style={{ marginTop: 16 }}>New Campaign</Text>
      <TextInput
        placeholder="Title"
        value={title}
        onChangeText={setTitle}
        style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
      />
      <Button title="Create" onPress={create} />
    </View>
  );
}
