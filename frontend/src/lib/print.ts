/**
 * Print just the element marked with `print-target` (see index.css), for
 * printable sheets and take-home notes on pages that hold more than the sheet.
 */
export function printSection(): void {
  document.body.classList.add('print-section-only')
  const done = () => {
    document.body.classList.remove('print-section-only')
    window.removeEventListener('afterprint', done)
  }
  window.addEventListener('afterprint', done)
  window.print()
}
