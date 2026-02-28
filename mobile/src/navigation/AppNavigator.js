/**
 * AppNavigator.js
 *
 * Defines the root stack navigator for the application.
 *
 * Screens:
 *   - LiveVision  : Default screen displaying the ESP32 stream and AI overlays.
 *   - Settings    : Configuration screen for hotspot credentials and ESP32 IP.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LiveVisionScreen from '../screens/LiveVisionScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="LiveVision"
      screenOptions={{
        headerStyle: { backgroundColor: '#000000' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold', fontSize: 20 },
        headerBackTitleVisible: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="LiveVision"
        component={LiveVisionScreen}
        options={{ title: 'H4H Vision — Live' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Stack.Navigator>
  );
}
