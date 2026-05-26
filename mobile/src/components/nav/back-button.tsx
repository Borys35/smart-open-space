import { Ionicons } from "@expo/vector-icons";
import { Button } from "@ssobkowski/rnui";
import { useRouter } from "expo-router";

interface BackButtonProps {
  onPress?: () => void;
  children?: React.ReactNode;
}

export function BackButton({ onPress, children }: BackButtonProps) {
  const router = useRouter();

  const handlePress = onPress ?? router.back;

  return (
    <Button hitSlop={16} onPress={handlePress}>
      {children ?? <Ionicons color="#909096" name="chevron-back" size={26} />}
    </Button>
  );
}
