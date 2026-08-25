import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';

import { useIsDesktop } from '@/hooks/use-responsive';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: number;
  style?: StyleProp<ViewStyle>;
}

export default function ResponsiveContainer({ children, maxWidth = 640, style }: ResponsiveContainerProps) {
  const isDesktop = useIsDesktop();

  return (
    <View style={[isDesktop ? { width: '100%', maxWidth, alignSelf: 'center' } : undefined, style]}>
      {children}
    </View>
  );
}
