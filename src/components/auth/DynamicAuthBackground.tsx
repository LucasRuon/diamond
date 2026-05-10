import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Animated, Easing, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../theme';

type Particle = {
  x: number;
  y: number;
  size: number;
  alpha: number;
  driftX: number;
  driftY: number;
};

const createParticles = () => {
  let seed = 42;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  return Array.from({ length: 42 }, (): Particle => ({
    x: random(),
    y: random(),
    size: random() * 2 + 1,
    driftX: (random() - 0.5) * 34,
    driftY: (random() - 0.5) * 34,
    alpha: random() * 0.45 + 0.2,
  }));
};

const PARTICLES = createParticles();
const MAX_CONNECTIONS = 36;

export function DynamicAuthBackground({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const scale = useRef(new Animated.Value(1)).current;
  const imageShift = useRef(new Animated.Value(0)).current;
  const particleDrift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const imageScaleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.14,
          duration: 14000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.06,
          duration: 14000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const imagePanAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(imageShift, {
          toValue: 1,
          duration: 18000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(imageShift, {
          toValue: 0,
          duration: 18000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const particleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(particleDrift, {
          toValue: 1,
          duration: 9000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(particleDrift, {
          toValue: 0,
          duration: 9000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    scale.setValue(1.06);
    imageScaleAnimation.start();
    imagePanAnimation.start();
    particleAnimation.start();

    return () => {
      imageScaleAnimation.stop();
      imagePanAnimation.stop();
      particleAnimation.stop();
    };
  }, [imageShift, particleDrift, scale]);

  const particles = useMemo(
    () =>
      PARTICLES.map((particle) => ({
        ...particle,
        left: particle.x * width,
        top: particle.y * height,
      })),
    [height, width]
  );

  const connections = useMemo(() => {
    const lines: Array<{
      key: string;
      left: number;
      top: number;
      length: number;
      angle: string;
      opacity: number;
    }> = [];

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[j].left - particles[i].left;
        const dy = particles[j].top - particles[i].top;
        const distance = Math.hypot(dx, dy);

        if (distance < 130) {
          lines.push({
            key: `${i}-${j}`,
            left: particles[i].left + dx / 2 - distance / 2,
            top: particles[i].top + dy / 2,
            length: distance,
            angle: `${Math.atan2(dy, dx)}rad`,
            opacity: 0.1 * (1 - distance / 130),
          });
        }

        if (lines.length >= MAX_CONNECTIONS) return lines;
      }
    }

    return lines;
  }, [particles]);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require('../../../assets/bg-diamond.webp')}
        style={[
          styles.image,
          {
            transform: [
              { scale },
              {
                translateX: imageShift.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [-width * 0.025, width * 0.025, -width * 0.01],
                }),
              },
              {
                translateY: imageShift.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [-height * 0.018, height * 0.018, -height * 0.01],
                }),
              },
            ],
          },
        ]}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['rgba(10, 10, 10, 0.80)', 'rgba(10, 10, 10, 0.95)']}
        style={styles.overlay}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.particles,
          {
            transform: [
              {
                translateX: particleDrift.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [-8, 10, -6],
                }),
              },
              {
                translateY: particleDrift.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [6, -10, 5],
                }),
              },
            ],
          },
        ]}
      >
        {connections.map((line) => (
          <Animated.View
            key={line.key}
            style={[
              styles.connection,
              {
                left: line.left,
                top: line.top,
                width: line.length,
                opacity: particleDrift.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [line.opacity, line.opacity * 1.8, line.opacity],
                }),
                transform: [{ rotateZ: line.angle }],
              },
            ]}
          />
        ))}

        {particles.map((particle, index) => (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                left: particle.left,
                top: particle.top,
                width: particle.size,
                height: particle.size,
                borderRadius: particle.size / 2,
                opacity: particleDrift.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [particle.alpha, Math.min(particle.alpha + 0.22, 0.85), particle.alpha],
                }),
                transform: [
                  {
                    translateX: particleDrift.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, particle.driftX],
                    }),
                  },
                  {
                    translateY: particleDrift.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, particle.driftY],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </Animated.View>
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.dxBg,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  particles: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  particle: {
    position: 'absolute',
    backgroundColor: theme.colors.dxTeal,
  },
  connection: {
    position: 'absolute',
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.dxTeal,
  },
  content: {
    flex: 1,
    zIndex: 2,
  },
});
