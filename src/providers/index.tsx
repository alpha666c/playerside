import React from 'react'

import { HeaderThemeProvider } from './HeaderTheme'
import { MotionProvider } from './Motion'
import { ThemeProvider } from './Theme'

export const Providers: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  return (
    <ThemeProvider>
      <HeaderThemeProvider>
        <MotionProvider>{children}</MotionProvider>
      </HeaderThemeProvider>
    </ThemeProvider>
  )
}
