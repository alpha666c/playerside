import nextConfig from 'eslint-config-next'

const eslintConfig = [
  ...nextConfig,
  {
    rules: {
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
    },
  },
  {
    ignores: [
      '.next/**',
      'src/payload-types.ts',
      'src/payload-generated-schema.ts',
      'dist/**',
      'node_modules/**',
      'build/**',
    ],
  },
]

export default eslintConfig
