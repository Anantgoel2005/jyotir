"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { Sparkles } from "lucide-react"

interface ToastCtx {
  show: (msg: string) => void
}

const ToastContext = createContext<ToastCtx>({ show: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ msg: string; id: number } | null>(null)

  const show = useCallback((msg: string) => {
    const id = Date.now()
    setToast({ msg, id })
    setTimeout(() => setToast(prev => prev?.id === id ? null : prev), 2500)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 toast-enter">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-amber-500/10 border border-amber-400/20 backdrop-blur-md text-xs text-amber-300 shadow-lg shadow-amber-500/5">
            <Sparkles className="w-3 h-3" />
            {toast.msg}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}
