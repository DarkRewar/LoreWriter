import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useI18n } from '../i18n'

export interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
}

interface ConfirmState extends ConfirmOptions {
  resolve: (ok: boolean) => void
}

const ConfirmContext = createContext<(opts: ConfirmOptions) => Promise<boolean>>(() => Promise.resolve(false))

/**
 * Demande une confirmation in-app avant une action irréversible (suppression…).
 * Usage : `const confirm = useConfirm(); if (await confirm({ message: '…' })) { … }`
 */
export function useConfirm(): (opts: ConfirmOptions) => Promise<boolean> {
  return useContext(ConfirmContext)
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const [state, setState] = useState<ConfirmState | null>(null)

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setState({ ...opts, resolve })
      }),
    [],
  )

  const close = useCallback((ok: boolean) => {
    setState((s) => {
      s?.resolve(ok)
      return null
    })
  }, [])

  useEffect(() => {
    if (!state) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state, close])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close(false)
          }}
        >
          <div className="modal" role="alertdialog" aria-modal="true" aria-label={state.title ?? t('confirm.aria')}>
            <h2>{state.title ?? t('confirm.title')}</h2>
            <p className="muted" style={{ whiteSpace: 'pre-line' }}>
              {state.message}
            </p>
            <div className="btn-row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="btn" onClick={() => close(false)} autoFocus>
                {state.cancelLabel ?? t('confirm.cancel')}
              </button>
              <button type="button" className="btn btn-danger" onClick={() => close(true)}>
                {state.confirmLabel ?? t('confirm.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
