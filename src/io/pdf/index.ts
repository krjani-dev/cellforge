// cellforge/io/pdf — addon. Real implementation lands when PDF export ships.
// Heavy deps (jsPDF, html2canvas) live only in this addon's graph.

export const ADDON_VERSION = '0.0.1';

export function notImplemented(feature: string): never {
  throw new Error(`cellforge/io/pdf: ${feature} is not implemented yet.`);
}
