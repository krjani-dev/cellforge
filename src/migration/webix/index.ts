// cellforge/migration/webix — addon. One-way Webix-format JSON reader.
// Translation only; no heavy deps.

export const ADDON_VERSION = '0.0.1';

export function notImplemented(feature: string): never {
  throw new Error(`cellforge/migration/webix: ${feature} is not implemented yet.`);
}
