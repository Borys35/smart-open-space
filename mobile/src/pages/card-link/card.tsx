import { getCardColor } from "@/lib/nfc";
import {
  Canvas,
  Circle,
  DashPathEffect,
  Group,
  LinearGradient,
  Mask,
  RoundedRect,
  useClock,
  vec,
} from "@shopify/react-native-skia";
import { useEffect } from "react";
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaFrame } from "react-native-safe-area-context";

interface CardProps {
  state: "scanning" | "ready";
  serial?: string;
}

const MARGIN = 40;
const DASH_STROKE_WIDTH = 6;

export function Card({ state, serial }: CardProps) {
  const { width: screenWidth } = useSafeAreaFrame();

  const cardWidth = screenWidth;
  const cardHeight = (1 / 1.333) * cardWidth;

  const canvasStyle = {
    width: cardWidth,
    height: cardHeight,
  };

  const clock = useClock();
  const phase = useDerivedValue(() => (clock.get() * 1) / 60);

  const progress = useSharedValue(state === "scanning" ? 0 : 1);
  const bob = useSharedValue(state === "scanning" ? 0 : 1);

  const dashRectOpacity = useDerivedValue(() => 1 - progress.get());
  const cardOpacity = progress;

  const cardTransform = useDerivedValue(() => {
    // When bob goes from 0 -> 1 (with an overshoot to ~1.1):
    // Scale goes from 0.95 -> 1.0 (popping up to ~1.02 before settling)
    const scale = 0.95 + 0.05 * bob.get();

    // TranslateY goes from 20 -> 0 (popping up to ~-4 before settling)
    const translateY = 20 * (1 - bob.get());

    return [{ translateY }, { scale }];
  });

  const cardMaskRadius = useDerivedValue(() => cardHeight * progress.get());
  const cardMaskEndPoint = useDerivedValue(() => ({
    x: cardWidth / 2,
    y: cardMaskRadius.get() * (1 - progress.get()),
  }));

  const cardCenterOrigin = {
    x: cardWidth / 2,
    y: cardHeight / 2,
  };

  const cardColor = getCardColor(serial);

  useEffect(() => {
    if (state === "scanning") {
      progress.set(0);
      bob.set(0);
    } else {
      progress.set(withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }));
      bob.set(
        withSpring(1, {
          mass: 1,
          damping: 12,
          stiffness: 140,
        }),
      );
    }
  }, [progress, bob, state]);

  return (
    <Canvas style={canvasStyle}>
      <Group origin={cardCenterOrigin} transform={cardTransform}>
        <RoundedRect
          x={MARGIN}
          y={MARGIN}
          width={cardWidth - MARGIN * 2}
          height={cardHeight - MARGIN * 2}
          r={32}
          color="#E7E7E7"
          strokeCap="round"
          strokeWidth={DASH_STROKE_WIDTH}
          style="stroke"
          opacity={dashRectOpacity}
        >
          <DashPathEffect intervals={[16, 16]} phase={phase} />
        </RoundedRect>
        <Mask
          mode="luminance"
          mask={
            <Circle cx={cardWidth / 2} cy={cardHeight} r={cardMaskRadius} color="white">
              <LinearGradient
                start={vec(cardWidth / 2, 0)}
                end={cardMaskEndPoint}
                colors={["black", "white"]}
              />
            </Circle>
          }
        >
          <RoundedRect
            x={MARGIN - DASH_STROKE_WIDTH / 2}
            y={MARGIN - DASH_STROKE_WIDTH / 2}
            width={cardWidth - MARGIN * 2 + DASH_STROKE_WIDTH}
            height={cardHeight - MARGIN * 2 + DASH_STROKE_WIDTH}
            color={cardColor}
            r={32}
            opacity={cardOpacity}
          />
        </Mask>
      </Group>
    </Canvas>
  );
}
