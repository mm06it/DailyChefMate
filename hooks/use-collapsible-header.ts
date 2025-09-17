import { useState, useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';

interface CollapsibleHeaderState {
  progress: number;
  setProgress: (value: number) => void;
}

export const [CollapsibleHeaderProvider, useCollapsibleHeader] = createContextHook<CollapsibleHeaderState>(() => {
  const [progress, setProgressState] = useState<number>(0);

  const setProgress = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    setProgressState(clamped);
  }, []);

  return { progress, setProgress };
});