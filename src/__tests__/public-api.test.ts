/**
 * Public-API surface tests. Every entry in package.json `exports` must be reachable
 * from this file via the path that maps onto its source. Renaming or removing an
 * exported name without updating this test breaks the build — that's the point.
 *
 * The imports here use *relative* paths because vitest runs against `src/`, not
 * the published package. The relative path mirrors the public subpath: e.g.,
 * `cellforge/io/xlsx` (consumer view) ↔ `../io/xlsx` (test view).
 */
import { describe, expect, it } from 'vitest';

import * as core from '../index';
import * as ioXlsx from '../io/xlsx';
import * as ioCsv from '../io/csv';
import * as ioPdf from '../io/pdf';
import * as migrationWebix from '../migration/webix';
import * as editorsDate from '../editors/date';
import * as localesFr from '../locales/fr';

describe('public API surface', () => {
  describe('cellforge (core)', () => {
    it('exports Spreadsheet component', () => {
      expect(core.Spreadsheet).toBeTypeOf('function');
    });
  });

  describe('cellforge/io/xlsx (addon)', () => {
    it('exposes ADDON_VERSION + notImplemented', () => {
      expect(ioXlsx.ADDON_VERSION).toBeTypeOf('string');
      expect(ioXlsx.notImplemented).toBeTypeOf('function');
    });
    it('notImplemented throws with the addon name in the message', () => {
      expect(() => ioXlsx.notImplemented('test')).toThrow(/cellforge\/io\/xlsx/);
    });
  });

  describe('cellforge/io/csv (addon)', () => {
    it('exposes ADDON_VERSION + notImplemented', () => {
      expect(ioCsv.ADDON_VERSION).toBeTypeOf('string');
      expect(ioCsv.notImplemented).toBeTypeOf('function');
    });
    it('notImplemented throws with the addon name in the message', () => {
      expect(() => ioCsv.notImplemented('test')).toThrow(/cellforge\/io\/csv/);
    });
  });

  describe('cellforge/io/pdf (addon)', () => {
    it('exposes ADDON_VERSION + notImplemented', () => {
      expect(ioPdf.ADDON_VERSION).toBeTypeOf('string');
      expect(ioPdf.notImplemented).toBeTypeOf('function');
    });
    it('notImplemented throws with the addon name in the message', () => {
      expect(() => ioPdf.notImplemented('test')).toThrow(/cellforge\/io\/pdf/);
    });
  });

  describe('cellforge/migration/webix (addon)', () => {
    it('exposes ADDON_VERSION + notImplemented', () => {
      expect(migrationWebix.ADDON_VERSION).toBeTypeOf('string');
      expect(migrationWebix.notImplemented).toBeTypeOf('function');
    });
    it('notImplemented throws with the addon name in the message', () => {
      expect(() => migrationWebix.notImplemented('test')).toThrow(/cellforge\/migration\/webix/);
    });
  });

  describe('cellforge/editors/date (addon)', () => {
    it('exposes ADDON_VERSION + notImplemented', () => {
      expect(editorsDate.ADDON_VERSION).toBeTypeOf('string');
      expect(editorsDate.notImplemented).toBeTypeOf('function');
    });
    it('notImplemented throws with the addon name in the message', () => {
      expect(() => editorsDate.notImplemented('test')).toThrow(/cellforge\/editors\/date/);
    });
  });

  describe('cellforge/locales/fr (addon)', () => {
    it('exposes locale tag and messages map', () => {
      expect(localesFr.locale).toBe('fr');
      expect(localesFr.messages).toBeTypeOf('object');
      expect(localesFr.default.locale).toBe('fr');
    });
  });
});
