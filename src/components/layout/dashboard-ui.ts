/**
 * Shared dashboard styling aligned with Quotes (/dashboard/jobs/quotes).
 * Use these tokens for page chrome, toolbars, and table actions.
 */
export const dashboardUi = {
  pageWrap: 'p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto',
  sectionGap: 'mb-6',
  title: 'text-2xl sm:text-3xl font-bold text-gray-900',
  description: 'text-sm sm:text-base text-gray-600 mt-1',
  /** Search + primary action row (matches Quotes kanban toolbar) */
  toolbarRow: 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
  searchInputWrap: 'relative w-full sm:max-w-md',
  /** Primary actions: solid blue (New quote, Add job, etc.) */
  primaryButton:
    'bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200 min-h-[44px] px-6',
  /** Pipeline / filter tabs container */
  tabsList:
    'flex h-auto w-full flex-wrap justify-start gap-1.5 rounded-xl border border-slate-200 bg-slate-100/90 p-1.5 shadow-inner',
  /** Same chrome as tabsList, for grid layouts (e.g. Timesheets hub tabs) */
  tabsListGrid:
    'grid w-full gap-1.5 rounded-xl border border-slate-200 bg-slate-100/90 p-1.5 shadow-inner',
  /** Table column headers */
  tableHead: 'h-9 py-2 px-3 text-xs font-semibold',
  /** Row action buttons (Quotes table Approve / Cancel pattern) */
  rowBtnPrimary:
    'min-h-9 min-w-[108px] px-4 text-sm font-semibold rounded-lg shadow-sm border border-primary/20 bg-primary text-primary-foreground ring-1 ring-primary/30 hover:bg-primary/92 hover:shadow-md hover:ring-primary/40 active:translate-y-px active:shadow-sm',
  rowBtnNeutral:
    'min-h-9 min-w-[108px] px-4 text-sm font-semibold rounded-lg shadow-sm border border-slate-300 bg-white text-slate-900 ring-1 ring-slate-200/80 hover:bg-slate-50 hover:shadow-md active:translate-y-px',
  rowBtnMuted:
    'min-h-9 min-w-[108px] px-4 text-sm font-semibold rounded-lg shadow-sm border border-slate-300 bg-slate-100 text-slate-900 ring-1 ring-slate-200/80 hover:bg-slate-200/80 hover:shadow-md active:translate-y-px',
  rowBtnDanger:
    'min-h-9 min-w-[108px] px-4 text-sm font-semibold rounded-lg shadow-sm border border-destructive/30 bg-destructive text-destructive-foreground ring-1 ring-destructive/25 hover:bg-destructive/92 hover:shadow-md active:translate-y-px',
} as const
