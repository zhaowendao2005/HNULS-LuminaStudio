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
        '@utility': resolve('src/utility')
      }
    }
  },
  preload: {
    resolve: {
      alias: {
        '@main': resolve('src/main'),
        '@preload': resolve('src/preload'),
        '@preload/types': resolve('src/preload/types'),
        '@utility': resolve('src/utility')
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@preload/types': resolve('src/preload/types')
      }
    },
    plugins: [vue()]
  }
})
