import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'src/utility/orchestraflow/**/*.test.ts',
      'src/Public/ShareTypes/Orchestraflow-types/**/*.test.ts',
      'src/renderer/src/stores/orchestraflow/**/*.test.ts'
    ]
  },
  resolve: {
    alias: {
      '@main': resolve('src/main'),
      '@preload': resolve('src/preload'),
      '@preload/types': resolve('src/preload/types'),
      '@utility': resolve('src/utility'),
      '@shared': resolve('src/Public/ShareTypes'),
      '@Public': resolve('src/Public'),
      '@prompt': resolve('src/Public/Prompt')
    }
  }
})
