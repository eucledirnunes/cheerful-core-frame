import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

// In-memory cache to avoid refetching profile on every send
const nameCache = new Map<string, string | null>();

const capitalize = (s: string) =>
  s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

const extractFirstName = (full: string | null | undefined): string | null => {
  if (!full) return null;
  const trimmed = full.trim();
  if (!trimmed) return null;
  const first = trimmed.split(/\s+/)[0];
  return first ? capitalize(first) : null;
};

export const useCurrentOperatorName = () => {
  const { user } = useAuth();
  const [operatorName, setOperatorName] = useState<string | null>(() => {
    if (!user) return null;
    return nameCache.get(user.id) ?? null;
  });

  useEffect(() => {
    if (!user) {
      setOperatorName(null);
      return;
    }

    // Use cache when available
    if (nameCache.has(user.id)) {
      setOperatorName(nameCache.get(user.id) ?? null);
      return;
    }

    let cancelled = false;

    const resolve = async () => {
      // 1. Try profiles.full_name
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle();

      let name = extractFirstName(data?.full_name);

      // 2. Fallback to user_metadata.full_name
      if (!name) {
        const metaName = (user.user_metadata as any)?.full_name as string | undefined;
        name = extractFirstName(metaName);
      }

      // 3. Fallback to email prefix
      if (!name && user.email) {
        const prefix = user.email.split('@')[0];
        name = extractFirstName(prefix);
      }

      nameCache.set(user.id, name);
      if (!cancelled) setOperatorName(name);
    };

    resolve();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { operatorName };
};
