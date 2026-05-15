import type { Ref } from 'react';

// Returns the first index i in a sorted array where arr[i] > target.
// Used by header strips to locate the first visible column/row from a scroll offset.
export function bisectRight(arr: number[], target: number): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid]! <= target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function mergeRefs<T>(...refs: Ref<T>[]): (node: T | null) => void {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        (ref as { current: T | null }).current = node;
      }
    }
  };
}
