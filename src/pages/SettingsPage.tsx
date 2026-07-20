import { useRef, useState } from 'react'
import { useProgress } from '../hooks/useProgress.ts'
import { clearProgress } from '../lib/progress-db.ts'

export function SettingsPage() {
  const { exportData, importData } = useProgress()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleExport = async () => {
    const json = await exportData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `xenoblade-progress-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage('Progress and playthrough state exported.')
  }

  const handleImport = async (file: File) => {
    try {
      const text = await file.text()
      const count = await importData(text)
      setMessage(`Imported ${count} checklist entries (and playthrough state if present). Reloading…`)
      window.setTimeout(() => window.location.reload(), 600)
    } catch {
      setMessage('Import failed. Invalid file.')
    }
  }

  const handleClear = async () => {
    if (
      confirm(
        'Delete all checklist progress and playthrough state? This cannot be undone.',
      )
    ) {
      await clearProgress()
      window.location.reload()
    }
  }

  return (
    <div className="settings-page">
      <h2>Settings</h2>

      <section className="settings-section">
        <h3>Backup</h3>
        <p>
          Checklist progress and Playthrough settings are stored locally in this
          browser. Export includes both.
        </p>
        <div className="settings-actions">
          <button className="btn-primary" onClick={handleExport}>
            Export
          </button>
          <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
            Import
          </button>
          <button className="btn-danger" onClick={handleClear}>
            Clear all
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleImport(file)
          }}
        />
      </section>

      <section className="settings-section">
        <h3>Data source</h3>
        <p>
          Game data from the{' '}
          <a
            href="https://xenoblade.fandom.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Xenoblade Wiki
          </a>{' '}
          (CC BY-SA 3.0).
        </p>
      </section>

      {message && <p className="settings-message">{message}</p>}
    </div>
  )
}
