# Assets 目录说明

## 目录结构

```
assets/
├── videos/          # 视频文件
│   └── background.mp4
├── images/          # 图片文件
│   ├── logo.png
│   └── icons/
├── fonts/           # 字体文件
│   └── custom-font.woff2
├── main.css         # 主样式文件
└── README.md        # 本文档
```

## 视频资源使用

### 1. 放置位置
将视频文件放在 `src/renderer/src/assets/videos/` 目录下。

### 2. 在 Vue 组件中引用

#### 方式一：直接导入（推荐）
```vue
<script setup lang="ts">
import backgroundVideo from '@renderer/assets/videos/background.mp4'
</script>

<template>
  <video autoplay loop muted playsinline class="absolute inset-0 w-full h-full object-cover">
    <source :src="backgroundVideo" type="video/mp4">
  </video>
</template>
```

#### 方式二：使用 URL 导入
```vue
<script setup lang="ts">
import backgroundVideoUrl from '@renderer/assets/videos/background.mp4?url'
</script>

<template>
  <video :src="backgroundVideoUrl" autoplay loop muted playsinline />
</template>
```

#### 方式三：动态导入
```vue
<script setup lang="ts">
const videoUrl = new URL('../assets/videos/background.mp4', import.meta.url).href
</script>

<template>
  <video :src="videoUrl" autoplay loop muted playsinline />
</template>
```

## 视频背景示例

### 全屏背景视频
```vue
<template>
  <div class="relative w-full h-full overflow-hidden">
    <!-- 视频背景 -->
    <video 
      autoplay 
      loop 
      muted 
      playsinline
      class="absolute inset-0 w-full h-full object-cover -z-10"
    >
      <source :src="backgroundVideo" type="video/mp4">
    </video>
    
    <!-- 遮罩层（可选） -->
    <div class="absolute inset-0 bg-black/30 -z-5"></div>
    
    <!-- 内容 -->
    <div class="relative z-10">
      <!-- 你的内容 -->
    </div>
  </div>
</template>

<script setup lang="ts">
import backgroundVideo from '@renderer/assets/videos/background.mp4'
</script>
```

### 欢迎页背景视频
```vue
<template>
  <div class="fixed inset-0 bg-white z-50 flex items-center justify-center overflow-hidden">
    <!-- 背景视频 -->
    <video 
      autoplay 
      loop 
      muted 
      playsinline
      class="absolute inset-0 w-full h-full object-cover opacity-20"
    >
      <source :src="welcomeVideo" type="video/mp4">
    </video>
    
    <!-- 内容 -->
    <div class="relative z-10">
      <h1>Welcome to Lumina</h1>
    </div>
  </div>
</template>
```

## 视频优化建议

### 1. 文件格式
- **推荐格式**：MP4 (H.264 编码)
- **备选格式**：WebM (VP9 编码)
- 提供多种格式以确保兼容性

### 2. 文件大小
- 背景视频应尽量压缩，建议 < 5MB
- 使用工具如 HandBrake 或 FFmpeg 压缩

### 3. 视频属性
- **autoplay**：自动播放
- **loop**：循环播放
- **muted**：静音（必须，否则 autoplay 可能失败）
- **playsinline**：在移动设备上内联播放

### 4. 性能优化
```vue
<video 
  autoplay 
  loop 
  muted 
  playsinline
  preload="auto"
  class="absolute inset-0 w-full h-full object-cover"
  @loadeddata="onVideoLoaded"
>
  <source :src="videoUrl" type="video/mp4">
  <source :src="videoUrlWebm" type="video/webm">
</video>
```

## 其他资源类型

### 图片
```vue
<script setup lang="ts">
import logo from '@renderer/assets/images/logo.png'
</script>

<template>
  <img :src="logo" alt="Logo" />
</template>
```

### SVG
```vue
<script setup lang="ts">
import icon from '@renderer/assets/images/icon.svg'
</script>

<template>
  <img :src="icon" alt="Icon" />
</template>
```

### 字体
在 CSS 中引用：
```css
@font-face {
  font-family: 'CustomFont';
  src: url('@renderer/assets/fonts/custom-font.woff2') format('woff2');
}
```

## 注意事项

1. **路径别名**：使用 `@renderer` 别名引用资源
2. **构建优化**：Vite 会自动处理资源的哈希和优化
3. **大文件**：超过 4KB 的文件会被复制到 dist 目录
4. **小文件**：小于 4KB 的文件会被内联为 base64
5. **视频不会被内联**：始终作为独立文件处理

## Vite 资源处理

Vite 支持以下导入方式：
- 默认导入：`import asset from './asset.ext'` - 返回处理后的 URL
- URL 导入：`import asset from './asset.ext?url'` - 强制返回 URL
- Raw 导入：`import asset from './asset.ext?raw'` - 返回文件内容字符串
- Worker 导入：`import Worker from './worker.js?worker'` - 作为 Web Worker

## 参考链接

- [Vite 静态资源处理](https://vitejs.dev/guide/assets.html)
- [Electron Vite 文档](https://electron-vite.org/)
