import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { client } from '../lib/api';

export default function TaskScreen({ route, navigation }) {
  const { id } = route.params;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const submit = async () => {
    try {
      await client.createTask(id, { title, description });
      Alert.alert('Task submitted');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: '600' }}>New Task</Text>
      <TextInput
        placeholder="Title"
        value={title}
        onChangeText={setTitle}
        style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
      />
      <TextInput
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        style={{ borderWidth: 1, padding: 10, borderRadius: 8, height: 120 }}
        multiline
      />
      <Button title="Submit" onPress={submit} />
    </View>
  );
}
