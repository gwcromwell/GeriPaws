import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { type StylePackId } from '@/constants/theme';

const STORAGE_KEY = 'geripaws.stylePack';
const DEFAULT_PACK: StylePackId = 'evening-walk';

function isStylePackId(value: string | null): value is StylePackId {
  return value === 'evening-walk' || value === 'good-days';
}

interface StylePackContextValue {
  packId: StylePackId;
  setPackId: (id: StylePackId) => void;
}

const StylePackContext = createContext<StylePackContextValue | null>(null);

export function StylePackProvider({ children }: { children: ReactNode }) {
  const [packId, setPackIdState] = useState<StylePackId>(DEFAULT_PACK);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (isStylePackId(saved)) setPackIdState(saved);
      })
      .catch(() => {});
  }, []);

  const value = useMemo<StylePackContextValue>(
    () => ({
      packId,
      setPackId: (id: StylePackId) => {
        setPackIdState(id);
        AsyncStorage.setItem(STORAGE_KEY, id).catch(() => {});
      },
    }),
    [packId]
  );

  return <StylePackContext.Provider value={value}>{children}</StylePackContext.Provider>;
}

export function useStylePack(): StylePackContextValue {
  const ctx = useContext(StylePackContext);
  if (!ctx) throw new Error('useStylePack must be used within a StylePackProvider');
  return ctx;
}

/** Like {@link useStylePack}, but falls back to the default pack instead of throwing when
 * rendered outside the provider (e.g. the pre-Supabase-configured setup screen). */
export function useStylePackOptional(): StylePackContextValue {
  const ctx = useContext(StylePackContext);
  return ctx ?? { packId: DEFAULT_PACK, setPackId: () => {} };
}
