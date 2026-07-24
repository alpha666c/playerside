import { describe, expect, it, vi } from 'vitest'
import { loadCaseContext } from '@/lib/reviewChat/loadCaseContext'

describe('loadCaseContext security & allowlists', () => {
  it('excludes sensitive fields accountProfile and internalNotes unconditionally for all roles', async () => {
    const mockDoc = {
      id: 1,
      caseNumber: '#PS-2026-001',
      operatorName: 'Test Casino',
      operatorUrl: 'https://testcasino.example',
      casinoType: 'traditional',
      licenseJurisdiction: 'MGA',
      licenseNumber: 'MGA/B2C/123/2020',
      parentCompany: 'Test Group Ltd',
      evidenceRegister: [],
      assignedReviewer: 1,
      internalNotes: 'SECRET INTERNAL NOTES',
      accountProfile: { passwordHash: 'secret' },
    }

    const mockPayload = {
      findByID: vi.fn().mockResolvedValue(mockDoc),
    }

    const mockReq = { payload: mockPayload } as any

    const roles = ['desk-research', 'desk-researcher', 'score-analyst', 'editorial', 'editorial-writer', 'integrity-check', 'integrity-checker', 'monitor']

    for (const role of roles) {
      const res = await loadCaseContext(1, role as any, mockReq)
      expect(res.context).not.toHaveProperty('internalNotes')
      expect(res.context).not.toHaveProperty('accountProfile')
    }
  })

  it('loads allowlisted fields for desk-researcher role', async () => {
    const mockDoc = {
      id: 1,
      caseNumber: '#PS-2026-001',
      operatorName: 'Test Casino',
      operatorUrl: 'https://testcasino.example',
      casinoType: 'traditional',
      licenseJurisdiction: 'MGA',
      licenseNumber: 'MGA/B2C/123/2020',
      parentCompany: 'Test Group Ltd',
      evidenceRegister: [{ label: 'License' }],
      assignedReviewer: 1,
      computedScores: { overall: 8 },
    }

    const mockPayload = {
      findByID: vi.fn().mockResolvedValue(mockDoc),
    }

    const mockReq = { payload: mockPayload } as any

    const res = await loadCaseContext(1, 'desk-researcher', mockReq)
    expect(res.context).toHaveProperty('caseNumber', '#PS-2026-001')
    expect(res.context).toHaveProperty('operatorName', 'Test Casino')
    expect(res.context).toHaveProperty('licenseNumber', 'MGA/B2C/123/2020')
    expect(res.context).not.toHaveProperty('computedScores')
  })
})
