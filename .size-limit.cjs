// Per-chunk gzipped budgets. Failing any of these fails CI.
// Budgets locked in the project's planning notes; raising any of them is a deliberate decision,
// not a silent bump.
module.exports = [
  {
    name: 'cellforge (default core)',
    path: 'dist/index.js',
    limit: '220 KB',
    gzip: true,
  },
  {
    name: 'cellforge/io/xlsx',
    path: 'dist/io/xlsx.js',
    limit: '180 KB',
    gzip: true,
  },
  {
    name: 'cellforge/io/csv',
    path: 'dist/io/csv.js',
    limit: '30 KB',
    gzip: true,
  },
  {
    name: 'cellforge/io/pdf',
    path: 'dist/io/pdf.js',
    limit: '150 KB',
    gzip: true,
  },
  {
    name: 'cellforge/migration/webix',
    path: 'dist/migration/webix.js',
    limit: '30 KB',
    gzip: true,
  },
  {
    name: 'cellforge/editors/date',
    path: 'dist/editors/date.js',
    limit: '30 KB',
    gzip: true,
  },
  {
    name: 'cellforge/locales/fr',
    path: 'dist/locales/fr.js',
    limit: '5 KB',
    gzip: true,
  },
];
