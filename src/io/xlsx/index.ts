// cellforge/io/xlsx — addon. Real implementation lands when XLSX I/O ships.
// Heavy deps (ExcelJS) are imported only in this file's transitive graph,
// never from cellforge core.

export const ADDON_VERSION = '0.0.1';

export function notImplemented(feature: string): never {
  throw new Error(`cellforge/io/xlsx: ${feature} is not implemented yet.`);
}
