export type Tone = 'blue' | 'green' | 'slate' | 'red' | 'amber'

/** Clases para chips e íconos de color, con variante oscura. */
export const toneChip: Record<Tone, string> = {
  blue: 'bg-brand-50 text-brand dark:bg-brand/20 dark:text-blue-300',
  green: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  red: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
}
