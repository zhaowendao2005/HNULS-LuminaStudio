# Electron 前端架构与开发规范 (Draft)

## 1. 目录结构概览 (Directory Structure)

本项目前端代码位于 `src` 目录下。为了维护大规模应用的整洁性，**顶级目录下严禁存放散乱文件**，必须使用文件夹进行归档。

```text
src/
├── components/       # [公共组件] 全局通用的 UI 组件
│   ├── BaseButton/   # 每个组件一个文件夹
│   │   └── index.vue
│   └── ...
├── composables/      # [组合式函数] 复杂的业务逻辑复用
│   ├── fileSystem/   # 按业务域分目录
│   └── window/
├── stores/           # [状态管理] Pinia Store，单一事实来源
│   ├── project/      # 按业务域分目录，包含 store/data/mock/types
│   └── editor/
├── views/            # [页面视图] 页面级组件，结构与 DOM 树对齐
│   ├── MainWindow/   # 对应一个窗口或主页面
│   │   ├── TopBar/
│   │   ├── SideBar/
│   │   └── index.vue
│   └── ...
├── service/          # [服务层] 封装服务与纯函数工具
│   ├── downloader/   # 可能持有底层状态的服务
│   └── parser/       # 纯函数计算服务
├── types/            # [公共类型] 全局类型定义 (Vue 与其他端 交互契约)
│   ├── file/         # 按业务域分类
│   └── setting/
├── App.vue
└── main.ts

```

---

## 2. 类型系统设计 (Type System)

类型定义分为 **全局公共类型** 和 **局部私有类型**，遵循“就近原则”与“契约原则”。

### 2.1 全局类型 (`src/types`)

* **用途**：存放跨业务域使用的类型，特别是 **Vue 前端与 Rust 后端交互的 DTO (Data Transfer Object)**。
* **结构**：按业务域分目录。
* **示例**：
* `src/types/filesystem/index.ts`: 定义文件节点结构，供 View 渲染和 Rust 接口返回。



### 2.2 局部类型

* **用途**：仅在特定模块内部使用的逻辑类型（如 UI 状态枚举、组件 Props 定义）。
* **位置**：存放在各自的 `stores/domain/types.ts` 或组件目录内。
* **原则**：如果一个类型被多个解耦的业务域引用，请将其提升至 `src/types`。

---

## 3. 视图层设计 (Views)

`src/views` 下的目录结构应严格映射 **UI 布局 (DOM 结构)**。这有助于开发者通过观察界面快速定位代码。

**示例结构：**

```text
views/
└── EditorWindow/          # 对应主编辑器窗口
    ├── index.vue          # 布局入口 (Grid/Flex 容器)
    ├── TopBar/            # 顶部栏区域
    │   └── index.vue
    ├── LeftPanel/         # 左侧面板区域
    │   ├── index.vue
    │   └── FileTree/      # 左侧面板内的子模块
    │       └── index.vue
    └── MainContent/       # 主内容区域
        └── index.vue

```

---

## 4. 状态管理与数据源 (Stores & Datasource)

这是本架构的核心部分。每个业务域的状态管理必须保证**单一事实来源 (Single Source of Truth)**，并实现**开发/生产环境的数据源解耦**。

### 4.1 目录结构

一个业务域（如 `User`）在 `stores` 下应包含以下四个文件：

```text
stores/
└── user/
    ├── user.store.ts       # Pinia Store 定义 (State, Getters, Actions)
    ├── user.datasource.ts  # 数据源适配器 (决定调用 Mock 还是 Rust)
    ├── user.types.ts       # Store 内部私有类型
    └── user.mock.ts        # 模拟数据生成器

```

### 4.2 数据源解耦模式 (Datasource Pattern)

在 `datasource.ts` 中，我们通过检测环境来切换数据来源。这使得我们在没有 Rust 后端的情况下也能在浏览器中通过 `vite` 调试前端逻辑。

**`user.datasource.ts` 示例模板：**

```typescript
import * as mock from './user.mock';
// 假设有一个封装好的 Tauri 调用工具
import { invokeTauri } from '@/service/tauri'; 

// 判断是否在 Tauri 环境中运行
const isTauri = !!(window as any).__TAURI__;

export const UserDataSource = {
  // 获取用户信息
  async getUserProfile(id: string) {
    if (isTauri) {
      // 生产环境/Tauri环境：调用 Rust 命令
      return await invokeTauri('get_user_profile', { id });
    } else {
      // 开发环境/纯Web环境：调用 Mock 数据
      console.debug('[Dev Mode] Using Mock Data for getUserProfile');
      return mock.mockUserProfile(id);
    }
  }
};

```

---

## 5. 组合式函数 (Composables)

`src/composables` 用于存放业务逻辑的封装。

* **小型逻辑**：如果逻辑简单且仅与当前组件 UI 强相关，直接写在 `.vue` 文件中。
* **复杂/共享逻辑**：如果涉及页面切换、生命周期管理、或者被多个组件复用（如“当前选中的文件管理”、“窗口缩放监听”），则在 `composables` 下建立业务目录。

---

## 6. 服务层 (Service)

`src/service` 存放封装好的、可复用的功能模块。

* **纯函数类**：如数据格式化、复杂的数学计算。
* **有状态的底层服务**：某些服务可能需要持有私有状态，但不适合放入 Pinia（因为它们更像是工具而非业务数据）。
* *例子*：`DownloaderService`。它可能内部维护一个连接池或下载进度的 `Map`，对外暴露 `start()`, `pause()`, `onProgress()`。虽然 Pinia 可以存储进度，但具体的 Socket 连接管理应由 Service 处理。



---

## 7. 工程配置规范 (Configuration)

### 7.1 路径别名 (Path Alias)

为了避免相对路径地狱（`../../`），并解决 `types` 命名冲突，需在 `vite.config.ts` 中配置别名。

**⚠️ 注意**：不要使用 `@types` 作为别名，这会与 `node_modules/@types` 冲突。建议使用 `@/types`。

**`vite.config.ts` 配置参考：**

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),           // 根目录别名
      '@/types': resolve(__dirname, 'src/types'), // 显式指定类型目录
      '@/stores': resolve(__dirname, 'src/stores'),
      '@/components': resolve(__dirname, 'src/components'),
      // 其他常用目录...
    }
  }
});

```

**`tsconfig.json` 同步配置：**

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/types/*": ["src/types/*"]
    }
  }
}

```

---

### 总结

这套架构的核心目标是：**让前端开发者在不依赖 Ipc 后端就绪的情况下，能够高效、独立地完成 UI 和业务逻辑的开发与测试。**