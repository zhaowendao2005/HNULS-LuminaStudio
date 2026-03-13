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
    server: {
      // 这里强制走 IPv4，并避开当前 Windows 的 excluded port range（5118-5217）。
      // 原来的 5173 落在系统保留区间里，会直接报 listen EACCES。
      host: '127.0.0.1',
      port: 13000
    },
    plugins: [vue()]
  }
})
