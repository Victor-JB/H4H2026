import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const CAP_SIZE = 160;

export default function LandingScreen() {
  const router = useRouter();
  const capOffset = useSharedValue(400);

  useEffect(() => {
    capOffset.value = withTiming(0, {
      duration: 1500,
      easing: Easing.out(Easing.cubic),
    });
  }, [capOffset]);

  const capAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: capOffset.value }],
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Navision</Text>

      <View style={styles.capContainer}>
        <Animated.View style={[styles.capWrapper, capAnimatedStyle]}>
          <Image
            source={require('@/assets/images/cap.png')}
            style={styles.cap}
            contentFit="contain"
          />
        </Animated.View>
      </View>

      <Pressable
        style={styles.bottomBar}
        onPress={() => router.push('/(tabs)/Vision')}
        accessibilityRole="button"
        accessibilityLabel="Go to Vision"
      >
        <View style={styles.bottomLine} />
        <Text style={styles.chevron}>{'>'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 48,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: '600',
    color: '#11181C',
    letterSpacing: -0.5,
  },
  capContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  capWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cap: {
    width: CAP_SIZE,
    height: CAP_SIZE,
  },
  bottomBar: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  bottomLine: {
    width: '100%',
    height: 2,
    backgroundColor: '#11181C',
    borderRadius: 1,
  },
  chevron: {
    fontSize: 28,
    fontWeight: '300',
    color: '#11181C',
  },
});
