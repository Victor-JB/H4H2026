import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  Ellipse,
  LinearGradient as SVGLinearGradient,
  Rect,
  Stop,
} from 'react-native-svg';

const CAP_SIZE = 160;

export default function LandingScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const capOffset   = useSharedValue(400);
  const titleOffset = useSharedValue(60);
  const titleScale  = useSharedValue(0.88);
  const fadeIn      = useSharedValue(0);

  useEffect(() => {
    capOffset.value = withTiming(0, { duration: 1500, easing: Easing.out(Easing.cubic) });
    fadeIn.value    = withDelay(500, withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) }));
  }, [capOffset, fadeIn]);

  useEffect(() => {
    titleOffset.value = withTiming(0,   { duration: 700, easing: Easing.out(Easing.cubic) });
    titleScale.value  = withTiming(1,   { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [titleOffset, titleScale]);

  const capAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: capOffset.value }],
  }));

  const titleAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: titleOffset.value }, { scale: titleScale.value }],
    opacity: Math.max(0, 1 - titleOffset.value / 60),
  }));

  const fadeStyle = useAnimatedStyle(() => ({ opacity: fadeIn.value }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── SVG Gradient Background ── */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <SVGLinearGradient id="bg" x1="0.35" y1="0" x2="0.65" y2="1">
            <Stop offset="0"    stopColor="#0E2160" stopOpacity="1" />
            <Stop offset="0.55" stopColor="#071430" stopOpacity="1" />
            <Stop offset="1"    stopColor="#030810" stopOpacity="1" />
          </SVGLinearGradient>
          <SVGLinearGradient id="capGlow" x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0" stopColor="#FFD166" stopOpacity="0.22" />
            <Stop offset="1" stopColor="#FFD166" stopOpacity="0"    />
          </SVGLinearGradient>
        </Defs>

        {/* Base gradient */}
        <Rect x={0} y={0} width={width} height={height} fill="url(#bg)" />

        {/* Decorative ambient blobs */}
        <Ellipse cx={width * 0.88} cy={height * 0.10} rx={170} ry={120} fill="#1D4ED8" fillOpacity={0.13} />
        <Ellipse cx={width * 0.08} cy={height * 0.90} rx={130} ry={100} fill="#1D6FE8" fillOpacity={0.09} />

        {/* Golden glow behind cap */}
        <Ellipse cx={width * 0.5}  cy={height * 0.48} rx={200} ry={210} fill="url(#capGlow)" />
      </Svg>

      {/* ── Header / Brand ── */}
      <Animated.View style={[styles.header, titleAnimStyle]}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>✦  AI-Powered Assistive Tech</Text>
        </View>
        <Text style={styles.title}>BlindSpot</Text>
        <Text style={styles.tagline}>Affordable Eyes</Text>
      </Animated.View>

      {/* ── Cap / Logo ── */}
      <View style={styles.capContainer}>
        {/* Glow rings */}
        <View style={styles.ringOuter} />
        <View style={styles.ringInner} />

        <Animated.View style={[styles.capWrapper, capAnimStyle]}>
          <Image
            source={require('@/assets/images/cap.png')}
            style={styles.cap}
            contentFit="contain"
          />
        </Animated.View>
      </View>

      {/* ── Bottom Section ── */}
      <Animated.View style={[styles.bottomSection, fadeStyle]}>
        {/* Feature pills */}
        <View style={styles.pillRow}>
          {['Real-Time', 'Object Detection', 'Audio Alerts'].map((f) => (
            <View key={f} style={styles.pill}>
              <Text style={styles.pillText}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.btnGroup}>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
            onPress={() => router.push('/(tabs)/demo')}
            accessibilityRole="button"
            accessibilityLabel="Go to ESP32 Camera Demo"
          >
            <Text style={styles.primaryBtnText}>ESP32 Camera Demo</Text>
          </Pressable>

          <Pressable
            style={styles.ghostBtn}
            onPress={() => router.push('/(tabs)/Vision')}
            accessibilityRole="button"
            accessibilityLabel="Go to Vision"
          >
            <View style={styles.ghostDivider} />
            <Text style={styles.ghostChevron}>›</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060F1E',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 88,
    paddingBottom: 48,
    paddingHorizontal: 24,
  },

  // ── Header ──────────────────────────────
  header: {
    alignItems: 'center',
    zIndex: 2,
  },
  badge: {
    backgroundColor: 'rgba(255, 209, 102, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 209, 102, 0.28)',
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 16,
  },
  badgeText: {
    color: '#FFD166',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 54,
    fontWeight: '800',
    color: '#F0F4FF',
    letterSpacing: -2,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 16,
    color: '#7A96BE',
    marginTop: 8,
    letterSpacing: 0.2,
    textAlign: 'center',
    fontWeight: '400',
  },

  // ── Cap ─────────────────────────────────
  capContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 220,
    position: 'relative',
  },
  ringOuter: {
    position: 'absolute',
    width: 248,
    height: 248,
    borderRadius: 124,
    borderWidth: 1,
    borderColor: 'rgba(255, 209, 102, 0.12)',
  },
  ringInner: {
    position: 'absolute',
    width: 194,
    height: 194,
    borderRadius: 97,
    backgroundColor: 'rgba(255, 209, 102, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 209, 102, 0.20)',
  },
  capWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cap: {
    width: CAP_SIZE,
    height: CAP_SIZE,
  },

  // ── Bottom Section ───────────────────────
  bottomSection: {
    width: '100%',
    gap: 20,
  },
  pillRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  pill: {
    backgroundColor: 'rgba(29, 111, 232, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(29, 111, 232, 0.32)',
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pillText: {
    color: '#7AB8FF',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  btnGroup: {
    width: '100%',
    gap: 14,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#FFD166',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#FFD166',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 18,
    elevation: 10,
  },
  primaryBtnPressed: {
    backgroundColor: '#E6B84E',
    shadowOpacity: 0.15,
  },
  primaryBtnText: {
    color: '#060F1E',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  ghostBtn: {
    width: '100%',
    alignItems: 'center',
    gap: 10,
  },
  ghostDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(122, 150, 190, 0.22)',
    borderRadius: 1,
  },
  ghostChevron: {
    fontSize: 34,
    fontWeight: '200',
    color: '#3D5880',
    lineHeight: 34,
  },
});
