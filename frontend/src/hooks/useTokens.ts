import { useMemo } from 'react';

/**
 * Theme colors as real values. Charts (Recharts) write colors into SVG
 * attributes, where CSS var() is not reliably resolved, so they read them from here.
 */
export function useTokens() {
  return useMemo(() => {
    const css = getComputedStyle(document.documentElement);
    const get = (name: string) => css.getPropertyValue(name).trim();
    return {
      ink: get('--ink'),
      cash: get('--cash'),
      stamp: get('--stamp'),
      pending: get('--pending'),
      info: get('--info'),
      rule: get('--rule'),
      ruleSoft: get('--rule-soft'),
      text: get('--graphite'),
      muted: get('--graphite-3'),
      sheet: get('--sheet'),
      font: get('--font'),
    };
  }, []);
}
