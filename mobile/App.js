import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PairScreen from './src/screens/PairScreen';
import CampaignsScreen from './src/screens/CampaignsScreen';
import CampaignDetailScreen from './src/screens/CampaignDetailScreen';
import PlanSelectScreen from './src/screens/PlanSelectScreen';
import TaskScreen from './src/screens/TaskScreen';
import QRPairScreen from './src/screens/QRPairScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
      <Stack.Screen name="Pair" component={PairScreen} />
      <Stack.Screen name="QRPair" component={QRPairScreen} />
      <Stack.Screen name="Campaigns" component={CampaignsScreen} />
        <Stack.Screen name="CampaignDetail" component={CampaignDetailScreen} />
        <Stack.Screen name="PlanSelect" component={PlanSelectScreen} />
        <Stack.Screen name="Task" component={TaskScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
