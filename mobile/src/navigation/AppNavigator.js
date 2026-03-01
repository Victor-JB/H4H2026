/**
 * AppNavigator.js
 * 
 * Main navigation structure for the app.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LiveVisionScreen from '../screens/LiveVisionScreen';
import DemoScreen from '../screens/DemoScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Demo"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#000',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="Demo" 
        component={DemoScreen}
        options={{ title: 'ESP32 Camera Demo' }}
      />
      <Stack.Screen 
        name="LiveVision" 
        component={LiveVisionScreen}
        options={{ title: 'Live Vision' }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Stack.Navigator>
  );
}

