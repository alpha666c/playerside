import React from 'react'
import Link from 'next/link'

export const metadata = {
  title: 'Playerside — Team AI Control Center & Case Workspace',
  description: 'Internal case management, AI agent execution, and governance audit trail.',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col md:flex-row">
      {/* Standalone Internal Workspace Navigation Sidebar */}
      <aside className="w-full md:w-64 bg-zinc-900/90 border-r border-zinc-800/80 p-5 flex flex-col justify-between shrink-0">
        <div>
          {/* Workspace Branding */}
          <div className="flex items-center gap-3 pb-6 border-b border-zinc-800/80 mb-6">
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center font-bold text-zinc-950 text-lg shadow-md shadow-amber-500/20">
              P
            </div>
            <div>
              <div className="font-bold text-sm text-white tracking-tight">Playerside OS</div>
              <div className="text-[11px] text-zinc-400 font-mono">Team Control Room</div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 text-xs font-medium">
            <div className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 px-3 pb-2 font-bold">
              Command Center
            </div>

            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              Case Queue & AI Pipeline
            </Link>

            <Link
              href="/dashboard/operators"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Operator Directory
            </Link>

            <Link
              href="/admin"
              target="_blank"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Payload CMS Admin ↗
            </Link>
          </nav>
        </div>

        {/* User Footer */}
        <div className="pt-4 border-t border-zinc-800/80 text-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span>Governance:</span>
            <span className="font-mono text-emerald-400 font-bold">ACTIVE</span>
          </div>
          <Link href="/" className="mt-3 block text-center text-zinc-500 hover:text-zinc-300 text-[11px]">
            ← Return to Public Site
          </Link>
        </div>
      </aside>

      {/* Main Workspace Content Area */}
      <main className="flex-1 bg-zinc-950 min-h-screen overflow-x-hidden">{children}</main>
    </div>
  )
}
