// cellforge/editors/date — addon. Rich date picker (react-day-picker upgrade
// over the browser-native <input type="date"> in core).

export const ADDON_VERSION = '0.0.1';

export function notImplemented(feature: string): never {
  throw new Error(`cellforge/editors/date: ${feature} is not implemented yet.`);
}
