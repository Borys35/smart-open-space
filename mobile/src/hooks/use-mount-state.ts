import { useCallback, useEffect, useRef } from "react";

export default function useMountedState() {
  const ref = useRef<boolean>(false);
  const isMounted = useCallback(() => ref.current, []);

  useEffect(() => {
    ref.current = true;

    return () => {
      ref.current = false;
    };
  }, []);

  return isMounted;
}
