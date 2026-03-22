import React, { createContext, useContext, useRef } from 'react';
import { ScrollView } from 'react-native';

type ScrollRefMap = Record<string, React.RefObject<ScrollView | null>>;

const ScrollRefContext = createContext<{
  refs: React.MutableRefObject<ScrollRefMap>;
  register: (name: string, ref: React.RefObject<ScrollView | null>) => void;
  scrollToTop: (name: string) => void;
} | null>(null);

export function ScrollRefProvider({ children }: { children: React.ReactNode }) {
  const refs = useRef<ScrollRefMap>({});

  const register = (name: string, ref: React.RefObject<ScrollView | null>) => {
    refs.current[name] = ref;
  };

  const scrollToTop = (name: string) => {
    refs.current[name]?.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <ScrollRefContext.Provider value={{ refs, register, scrollToTop }}>
      {children}
    </ScrollRefContext.Provider>
  );
}

export function useScrollRef() {
  const ctx = useContext(ScrollRefContext);
  if (!ctx) throw new Error('useScrollRef must be used within ScrollRefProvider');
  return ctx;
}
