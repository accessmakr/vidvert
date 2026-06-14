/**
 * DataSaverToggle.jsx
 * GAP 6 — Data-saver mode toggle UI.
 *
 * Shown in the header alongside the VidVert logo.
 * Small, unobtrusive, but clearly visible.
 * When active, shows a green indicator so user knows it is on.
 *
 * Usage in App.jsx header:
 *   <DataSaverToggle dataSaver={dataSaver} onToggle={toggleDataSaver} />
 */

export default function DataSaverToggle({ dataSaver, onToggle }) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={dataSaver}
      aria-label={dataSaver ? 'Data saver on — tap to disable' : 'Data saver off — tap to enable'}
      className={`
        flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs
        font-medium transition-all
        ${dataSaver
          ? 'border-green-700 bg-green-950/50 text-green-400'
          : 'border-zinc-800 bg-zinc-900 text-zinc-600 hover:text-zinc-400 hover:border-zinc-700'}
      `}
    >
      <span aria-hidden="true">{dataSaver ? '📶' : '📶'}</span>
      <span>{dataSaver ? 'Data Saver: ON' : 'Data Saver'}</span>
    </button>
  );
}
