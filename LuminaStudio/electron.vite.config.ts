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
      // 这里强制走 IPv4，并交给系统分配可用端口，
      // 避免 Windows 本机的 excluded port range / 权限限制导致固定端口直接 EACCES。
      host: '127.0.0.1',
      port: 0
    },
    plugins: [vue()]
  }
})
