import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, Alert, ActivityIndicator } from 'react-native';
import { client } from '../lib/api';

export default function PlanSelectScreen({ route, navigation }) {
  const { id } = route.params;
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await client.generatePlan(id);
        setPlans(res.plans || []);
      } finally {
        setLoading(false);
      }
    };
    load().catch((e) => Alert.alert('Error', e.message));
  }, []);

  const approve = async (planName) => {
    try {
      setApproving(planName);
      await client.approvePlan(id, planName);
      Alert.alert('Plan approved', planName, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err) {
      Alert.alert('Approval failed', err.message);
    } finally {
      setApproving('');
    }
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '600' }}>Select a Plan</Text>
      {loading ? (
        <View style={{ marginTop: 16 }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8, color: '#555' }}>Generating plans. Azure responses can take a little while.</Text>
        </View>
      ) : null}
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
            <Button title={approving === item.name ? 'Approving...' : 'Approve'} onPress={() => approve(item.name)} />
          </View>
        )}
      />
    </View>
  );
}
