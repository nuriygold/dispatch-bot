import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, Alert } from 'react-native';
import { client } from '../lib/api';

export default function PlanSelectScreen({ route, navigation }) {
  const { id } = route.params;
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    const load = async () => {
      const res = await client.generatePlan(id);
      setPlans(res.plans || []);
    };
    load().catch((e) => Alert.alert('Error', e.message));
  }, []);

  const approve = async (planName) => {
    await client.approvePlan(id, planName);
    Alert.alert('Plan approved', planName, [{ text: 'OK', onPress: () => navigation.goBack() }]);
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '600' }}>Select a Plan</Text>
      <FlatList
        data={plans}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 10 }}>
            <Text style={{ fontWeight: '600' }}>{item.name}</Text>
            <Text>{item.tasks?.length || 0} tasks</Text>
            {item.tasks?.slice(0, 3).map((t) => (
              <Text key={t.id || t.title} style={{ color: '#555' }}>
                - {t.title}
              </Text>
            ))}
            <Button title="Approve" onPress={() => approve(item.name)} />
          </View>
        )}
      />
    </View>
  );
}
