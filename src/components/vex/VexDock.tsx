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
  const { profile, activeQuest, offers, streak, onboarding, loading, error, actions, ui } = gamification
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

  // Loading only blanks the dock while we have nothing to show — a background
  // refresh (e.g. the post-mission streak re-pull) never makes the dock flash.
  if (loading && !profile) return null
  if (error && !profile) return null // fail soft — the page never breaks for Vex

  const showOnboarding = Boolean(onboarding) && !activeQuest && !collapsed
  const showOffering = !activeQuest && !onboarding && offers.length > 0 && !collapsed
  const showMission = activeQuest && !collapsed

  return (
    <>
      {ui.toast ? <BadgeToast title={ui.toast.title} xp={ui.toast.xp} /> : null}

      <div
        ref={dockRef}
        className="fixed bottom-4 right-4 z-[80] flex w-[min(92vw,360px)] flex-col items-end gap-3"
      >
        {/* Collapsed chip / expanded panel */}
        {open || showOnboarding || showOffering || showMission ? (
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
            ) : showOnboarding && onboarding ? (
              /* Phase 4 (F4.1): first mission surfaced for fresh scouts. */
              <div className="rounded-[var(--radius)] border border-gold/50 bg-dusk/95 p-4 shadow-2xl shadow-black/40 backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-[2px] text-gold">
                    Recommended first mission
                  </span>
                  <button
                    type="button"
                    onClick={actions.dismissOnboarding}
                    aria-label="Not now"
                    className="rounded p-1 text-paper-dim transition-colors hover:text-paper"
                  >
                    ✕
                  </button>
                </div>
                <p className="mt-2 text-[15px] font-semibold leading-snug text-paper">
                  {onboarding.mission.title}
                </p>
                <p className="mt-1.5 line-clamp-3 text-[12.5px] leading-relaxed text-paper-dim">
                  {onboarding.mission.brief}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => actions.startQuest(onboarding.mission.id)}
                    className="rounded-full bg-gold px-4 py-1.5 text-[12px] font-medium text-ink transition-transform hover:scale-[1.03] active:scale-[0.98]"
                  >
                    Start here — {onboarding.mission.rewardXp} XP
                  </button>
                  <button
                    type="button"
                    onClick={actions.dismissOnboarding}
                    className="rounded-full border border-line px-3 py-1.5 text-[11.5px] text-paper-dim transition-colors hover:border-evidence hover:text-paper"
                  >
                    Not now
                  </button>
                </div>
              </div>
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
                    {streak ? (
                      <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5 font-mono text-[10.5px]">
                        <span className="text-paper-dim">
                          {streak.current > 0
                            ? `🔥 ${streak.current}-day recon streak`
                            : 'No streak yet — a mission today starts one'}
                        </span>
                        {streak.freezesAvailable > 0 ? (
                          <span className="text-evidence">{streak.freezesAvailable} Focus Freeze</span>
                        ) : null}
                      </div>
                    ) : null}
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
