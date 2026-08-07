'use client'

import { useEffect, useRef, useState } from 'react'

import type { UseGamification } from '@/hooks/useGamification'
import { BadgeToast } from './BadgeToast'
import { MissionHUD } from './MissionHUD'
import { QuestCard } from './QuestCard'
import { XpBar } from './XpBar'

type VexDockProps = {
  gamification: UseGamification
}

/**
 * Vex Dock — bottom-right, above content, never blocks reading flow.
 * States: collapsed → offering (QuestCard) → in-mission (MissionHUD) → toast.
 * RG micro-link always in the footer; 18+ chip in the header region.
 * Esc closes; focus ring on interactive elements; reduced-motion collapses to static.
 */
export const VexDock: React.FC<VexDockProps> = ({ gamification }) => {
  const { profile, activeQuest, offers, loading, error, actions, ui } = gamification
  const [collapsed, setCollapsed] = useState(true)
  const dockRef = useRef<HTMLDivElement>(null)

  const open = ui.dockOpen && !collapsed

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCollapsed(true)
        ui.setDockOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ui])

  // Focus trap (lightweight): keep Tab within the dock while open.
  useEffect(() => {
    if (!open) return
    const dock = dockRef.current
    if (!dock) return
    const focusables = dock.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])')
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    first?.focus()
    const onTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }
    dock.addEventListener('keydown', onTab)
    return () => dock.removeEventListener('keydown', onTab)
  }, [open])

  if (loading) return null
  if (error && !profile) return null // fail soft — the page never breaks for Vex

  const showOffering = !activeQuest && offers.length > 0 && !collapsed
  const showMission = activeQuest && !collapsed

  return (
    <>
      {ui.toast ? <BadgeToast title={ui.toast.title} xp={ui.toast.xp} /> : null}

      <div
        ref={dockRef}
        className="fixed bottom-4 right-4 z-[80] flex w-[min(92vw,360px)] flex-col items-end gap-3"
      >
        {/* Collapsed chip / expanded panel */}
        {open || showOffering || showMission ? (
          <div className="w-full">
            {showMission ? (
              <MissionHUD
                activeQuest={activeQuest}
                onSubmit={actions.submitEvidence}
                onClose={() => {
                  setCollapsed(true)
                  ui.setDockOpen(false)
                }}
              />
            ) : showOffering ? (
              <QuestCard quest={offers[0]} onStart={actions.startQuest} onDismiss={actions.dismissOffer} />
            ) : (
              <div className="rounded-[var(--radius)] border border-line bg-dusk/95 p-4 shadow-2xl shadow-black/40 backdrop-blur">
                {profile ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-[2px] text-evidence">
                        Scout dossier
                      </span>
                      <span className="rounded-full border border-gold/40 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[1px] text-gold">
                        18+
                      </span>
                    </div>
                    <XpBar totalXp={profile.totalXp} level={profile.level} rankTitle={profile.rankTitle} />
                  </>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        {/* Dock button */}
        <button
          type="button"
          onClick={() => {
            setCollapsed((c) => !c)
            ui.setDockOpen(!collapsed)
          }}
          aria-expanded={!collapsed}
          aria-label="Vex mission dock"
          className="group flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-dusk shadow-xl shadow-black/50 transition-transform hover:scale-105 active:scale-95"
        >
          <span className="text-xl" aria-hidden>
            🧭
          </span>
          {!collapsed ? null : (              <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping motion-reduce:animate-none rounded-full bg-coral opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-coral" />
            </span>
          )}
        </button>

        {/* RG micro-link — always present in the dock footer */}
        <a
          href="https://www.gambleaware.org"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded px-2 py-1 font-mono text-[10px] uppercase tracking-[1.5px] text-paper-dim/70 transition-colors hover:text-paper"
        >
          Responsible gambling ↗
        </a>
      </div>
    </>
  )
}
