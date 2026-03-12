import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
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
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve('src/main/index.ts'),
          'utility/langchain-client': resolve('src/utility/langchain-client/entry.ts'),
          'utility/orchestraflow': resolve('src/utility/orchestraflow/entry.ts')
        }
      }
    }
  },
  preload: {
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
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@preload/types': resolve('src/preload/types'),
        '@shared': resolve('src/Public/ShareTypes'),
        '@Public': resolve('src/Public'),
        '@prompt': resolve('src/Public/Prompt')
      }
    },
    plugins: [vue()]
  }
})
