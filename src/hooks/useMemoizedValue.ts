import { useMemo } from 'react';

export function useMemoizedValue<T>(value: T, deps: any[]): T {
  return useMemo(() => value, deps);
}
