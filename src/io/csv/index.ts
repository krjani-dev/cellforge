// cellforge/io/csv — addon. Real implementation lands when CSV I/O ships.
// Heavy deps (PapaParse) live only in this addon's graph.

export const ADDON_VERSION = '0.0.1';

export function notImplemented(feature: string): never {
  throw new Error(`cellforge/io/csv: ${feature} is not implemented yet.`);
}
