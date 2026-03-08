import { useSyncExternalStore } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { subscribe, getSnapshot } from '@/stores/snapshot';

export default function VisionScreen() {
  const snapshotUri = useSyncExternalStore(subscribe, getSnapshot);
  const { width } = useWindowDimensions();
  const imgWidth = width - 48;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Last Captured Frame</Text>

      <View style={[styles.frame, { width: imgWidth, height: imgWidth * 0.75 }]}>
        {snapshotUri ? (
          <Image
            source={{ uri: snapshotUri }}
            style={styles.image}
            contentFit="cover"
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderTitle}>No snapshot yet</Text>
            <Text style={styles.placeholderSub}>Trigger a voice command to capture</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060F1E',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 20,
  },
  title: {
    color: '#F0F4FF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  frame: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1A3464',
    backgroundColor: 'rgba(13, 31, 60, 0.85)',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderTitle: {
    color: '#3D5880',
    fontSize: 16,
    fontWeight: '600',
  },
  placeholderSub: {
    color: '#1A3464',
    fontSize: 12,
  },
});
