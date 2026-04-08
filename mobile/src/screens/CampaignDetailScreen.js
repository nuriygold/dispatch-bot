import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, Alert, TouchableOpacity } from 'react-native';
import { client } from '../lib/api';
import { connectWs, onMessage, withWsToken } from '../lib/ws';

export default function CampaignDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [campaign, setCampaign] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [paused, setPaused] = useState(false);
  const [steps, setSteps] = useState({});
  const [spend, setSpend] = useState(0);
  const [budget, setBudget] = useState(null);

  const load = async () => {
    const c = await client.getCampaign(id);
    const t = await client.listTasks(id);
    const p = await client.getProgress(id);
    setCampaign(c);
    setPaused(c.status === 'paused');
    setTasks(t);
    setSteps(p.steps || {});
    setSpend(p.spend_cents || 0);
    setBudget(p.cost_budget_cents || null);
  };

  useEffect(() => {
    load().catch((e) => Alert.alert('Error', e.message));
    const wsUrl = withWsToken(client.baseUrl.replace(/^http/, 'ws') + '/ws', client.token);
    connectWs(wsUrl, { type: 'subscribe', campaignId: id });
    const off = onMessage((msg) => {
      if (msg.type === 'task_completed' || msg.type === 'task_started' || msg.type === 'task_progress') {
        load().catch(() => {});
      }
      if (msg.type === 'campaign_paused') setPaused(true);
      if (msg.type === 'campaign_resumed') setPaused(false);
      if (msg.type === 'task_progress') {
        setSteps((prev) => {
          const arr = prev[msg.taskId] || [];
          return {
            ...prev,
            [msg.taskId]: [...arr.slice(-19), msg],
          };
        });
      }
      if (msg.type === 'campaign_progress') {
        setSpend(msg.spend_cents || 0);
        setBudget(msg.cost_budget_cents || null);
      }
    });
    return () => off();
  }, []);

  const togglePause = async () => {
    if (paused) await client.resumeCampaign(id);
    else await client.pauseCampaign(id);
    setPaused(!paused);
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>{campaign?.title}</Text>
      <Button title="Generate Plan" onPress={() => navigation.navigate('PlanSelect', { id })} />
      <Button title="Submit Task" onPress={() => navigation.navigate('Task', { id })} />
      <Button title="Switch Plan" onPress={() => navigation.navigate('PlanSelect', { id })} />
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 }}>
        <Text>Status: {paused ? 'paused' : campaign?.status}</Text>
        <Button title={paused ? 'Resume' : 'Pause'} onPress={togglePause} />
      </View>
      <Text style={{ marginTop: 4 }}>
        Spend: {(spend / 100).toFixed(2)} / {budget ? (budget / 100).toFixed(2) : '—'} USD
      </Text>
      <Text style={{ marginTop: 12, fontWeight: '600' }}>Tasks</Text>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 6 }}>
            <Text>{item.title}</Text>
            <Text style={{ color: '#555' }}>{item.status}</Text>
            {!!item.output && (
              <Text style={{ color: '#444', marginTop: 4 }} numberOfLines={3}>
                {item.output}
              </Text>
            )}
            {item.status === 'running' && (
              <TouchableOpacity
                style={{ marginTop: 4, padding: 6, backgroundColor: '#eee', borderRadius: 6 }}
                onPress={async () => {
                  await client.cancelTask(item.id);
                  load().catch(() => {});
                }}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
            )}
            {steps[item.id] && steps[item.id].length > 0 && (
              <View style={{ marginTop: 4, padding: 6, backgroundColor: '#f8f8f8', borderRadius: 6 }}>
                {steps[item.id].slice(-3).map((s) => (
                  <Text key={`${s.step}-${s.ts}`} style={{ fontSize: 12, color: '#444' }}>
                    [{s.status}] {s.tool} {s.snippet ? `- ${s.snippet.slice(0, 60)}` : ''}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}
