import './styles.css';

export interface SpreadsheetProps {
  /** Reserved for the workbook prop landing in a later phase. */
  className?: string;
}

/**
 * Stub component. Real implementation lands incrementally as features ship.
 */
export function Spreadsheet({ className }: SpreadsheetProps) {
  return (
    <div
      role="grid"
      aria-label="Spreadsheet"
      className={['cellforge-root', className].filter(Boolean).join(' ')}
      data-testid="cellforge-spreadsheet"
    >
      <div className="cellforge-empty-state">cellforge — pre-alpha scaffold</div>
    </div>
  );
}
