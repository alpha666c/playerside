'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import React, { useRef } from 'react'

import { useReducedMotion } from '@/hooks/useReducedMotion'

// Register lazily — ScrollTrigger.register reads window.matchMedia at module
// scope, which jsdom (vitest) doesn't implement; the browser path is unchanged.
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  gsap.registerPlugin(ScrollTrigger)
}

const STEPS = [
  {
    n: '01',
    title: 'Fund with real cash',
    body: 'We open live accounts and deposit real money — never demo credits, never a sponsored balance.',
  },
  {
    n: '02',
    title: 'Measure the withdrawal',
    body: 'Clock it in real time: request, approval, funds landed. The stopwatch starts the second we click.',
  },
  {
    n: '03',
    title: 'Decode the fine print',
    body: 'Every wagering rule, cap, and expiry is read from the actual terms and spelled out exactly as written.',
  },
  {
    n: '04',
    title: 'Stamp the evidence',
    body: 'Findings are logged to the private evidence store and sealed. Nothing reaches a score without a chain.',
  },
]

/**
 * "The Protocol" — a pinned, scroll-scrubbed walkthrough of how a review is
 * made. The viewport pins while the four steps advance in time with the
 * scroll position (scrub), and the coral→evidence rail fills as the user
 * moves through the process.
 *
 * Phase B: the section now reads as a mission console — a mono header strip
 * ("THE PROTOCOL // SCRUB_SEQ_04"), per-step mono readouts (STEP 0n/04),
 * corner-bracket framing, and a live SYNC percentage readout tied to the
 * scrub progress.
 *
 * Desktop-only pinning (mobile keeps a plain stacked section — pinning on a
 * small viewport reads as jank, and the content is still fully there).
 * `prefers-reduced-motion` collapses everything to the static stacked
 * section; nothing animates, nothing is removed.
 */
export const ProtocolScrub: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const pctRef = useRef<HTMLSpanElement>(null)
  const reducedMotion = useReducedMotion()

  useGSAP(
    () => {
      if (reducedMotion) return
      if (!window.matchMedia('(min-width: 768px)').matches) return

      const section = sectionRef.current
      const rail = railRef.current
      const pct = pctRef.current
      if (!section || !rail) return

      const steps = gsap.utils.toArray<HTMLElement>('.protocol-step', section)
      if (steps.length === 0) return

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=240%',
          pin: true,
          scrub: 0.6,
          // Keep the SYNC readout honest — update it as the scrub advances.
          onUpdate: (self) => {
            if (pct) pct.textContent = String(Math.round(self.progress * 100)).padStart(3, '0')
          },
        },
      })

      // Each step takes an equal slice of the timeline; scrub ties progress
      // to scroll position so the sequence breathes with the user's pace.
      tl.fromTo(
        steps,
        { autoAlpha: 0, x: 64 },
        { autoAlpha: 1, x: 0, duration: 1, stagger: 1, ease: 'power2.out' },
        0,
      )

      // The rail fills across the whole sequence.
      tl.fromTo(rail, { scaleY: 0 }, { scaleY: 1, duration: steps.length, ease: 'none' }, 0)
    },
    { scope: sectionRef },
  )

  return (
    <section
      className="relative overflow-hidden border-b border-line bg-ink py-16 md:py-0"
      ref={sectionRef}
    >
      {/* Mono console strip */}
      <div className="hud-frame mx-auto flex max-w-6xl justify-between px-4 pt-4 sm:px-6 lg:px-8">
        <span className="hud-rule">
          <span>The Protocol</span>
          <span className="hud-chip">scrub_seq_04</span>
        </span>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-paper-dim/50 md:block">
          sync <span ref={pctRef} className="text-evidence">—</span>
        </span>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col px-4 sm:px-6 md:min-h-screen md:flex-row md:items-center md:gap-14 lg:px-8">
        {/* Rail */}
        <div className="mb-10 flex items-center gap-6 md:mb-0 md:w-44 md:flex-col md:items-center md:gap-4">
          <div className="relative h-40 w-px overflow-hidden bg-dusk-2 md:h-72">
            <div
              className="absolute inset-0 origin-top bg-gradient-to-b from-coral to-evidence"
              ref={railRef}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="flex-1 space-y-12 md:space-y-0">
          {STEPS.map((step, i) => (
            <div
              className="protocol-step flex items-start gap-5 md:min-h-[25vh] md:items-center"
              key={step.n}
            >
              <span className="bg-gradient-to-br from-coral to-evidence bg-clip-text font-mono text-4xl font-black text-transparent md:text-6xl">
                {step.n}
              </span>
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper-dim/60">
                  step {step.n}/04
                </span>
                <h3 className="t-h3 mt-1 text-paper md:text-2xl">{step.title}</h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-paper-dim md:text-base">
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
