import React from 'react'
import Link from 'next/link'

export const metadata = {
  title: 'Playerside — Team AI Control Center & Case Workspace',
  description: 'Internal case management, AI agent execution, and governance audit trail.',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ink text-paper font-sans flex flex-col md:flex-row">
      {/* Standalone Internal Workspace Navigation Sidebar */}
      <aside className="w-full md:w-64 bg-ink-2 border-r border-line p-5 flex flex-col justify-between shrink-0">
        <div>
          {/* Workspace Branding */}
          <div className="flex items-center gap-3 pb-6 border-b border-line mb-6">
            <div className="w-9 h-9 rounded-xl bg-coral flex items-center justify-center font-bold text-ink-2 text-lg shadow-md shadow-coral/20">
              P
            </div>
            <div>
              <div className="font-bold text-sm text-paper tracking-tight">Playerside OS</div>
              <div className="text-[11px] text-paper-dim font-mono">Team Control Room</div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 text-xs font-medium">
            <div className="text-[10px] uppercase font-mono tracking-widest text-paper-dim px-3 pb-2 font-bold">
              Command Center
            </div>

            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-coral/10 text-coral font-semibold border border-coral/20 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              Case Queue & AI Pipeline
            </Link>

            <Link
              href="/dashboard/operators"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-paper-dim hover:text-paper hover:bg-dusk transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Operator Directory
            </Link>

            <Link
              href="/admin"
              target="_blank"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-paper-dim hover:text-paper hover:bg-dusk transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 001.065-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Payload CMS Admin ↗
            </Link>
          </nav>
        </div>

        {/* User Footer */}
        <div className="pt-4 border-t border-line text-xs">
          <div className="flex items-center justify-between text-paper-dim">
            <span>Governance:</span>
            <span className="font-mono text-success font-bold">ACTIVE</span>
          </div>
          <Link href="/" className="mt-3 block text-center text-paper-dim hover:text-paper text-[11px]">
            ← Return to Public Site
          </Link>
        </div>
      </aside>

      {/* Main Workspace Content Area */}
      <main className="flex-1 bg-ink min-h-screen overflow-x-hidden">{children}</main>
    </div>
  )
}
