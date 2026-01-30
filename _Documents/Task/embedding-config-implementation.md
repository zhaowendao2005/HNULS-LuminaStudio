# 嵌入配置功能实施总结

## 实施日期
2026-01-24

## 功能概述
为知识库设置页面添加嵌入配置功能，允许用户选择嵌入模型和配置嵌入维度。

## 实施内容

### 1. 类型定义扩展
**文件**: `KnowledgeDatabase-src/src/preload/types/knowledge-config.types.ts`

新增类型：
```typescript
export interface EmbeddingConfig {
  providerId?: string // 模型提供商 ID
  modelId?: string // 模型 ID
  dimensions?: number // 嵌入维度（可选）
}
```

扩展 `KnowledgeGlobalConfig`：
```typescript
export interface KnowledgeGlobalConfig {
  chunking: Required<ChunkingConfig>
  embedding?: EmbeddingConfig // 新增
}
```

### 2. 组件重构
**原文件**: `EmbeddingSection.vue` (单文件组件)
**新结构**: `EmbeddingSection/` (目录组件组)

```
EmbeddingSection/
├── index.vue                # 主组件（配置界面）
├── ModelSelectDialog.vue    # 模型选择对话框
├── types.ts                 # 局部类型定义
└── README.md               # 组件文档
```

### 3. 主要功能

#### 3.1 嵌入模型选择
- 从已配置的模型提供商中选择
- 模型选择对话框（从下到上浮出动画）
- 支持搜索和按标签筛选
- 按提供商分组展示

#### 3.2 嵌入维度配置
- 可选输入（留空使用模型默认值）
- 自动验证（必须为正整数）
- 实时保存

#### 3.3 配置管理
- 实时检测配置变化
- 支持保存和重置
- 配置持久化到 `KnowledgeConfig.json`

### 4. 数据流

```
用户操作
  ↓
EmbeddingSection (本地状态)
  ↓
knowledgeConfigStore.updateGlobalConfig()
  ↓
KnowledgeConfigDataSource
  ↓
IPC (window.api.knowledgeConfig)
  ↓
KnowledgeConfigService
  ↓
KnowledgeConfig.json
```

### 5. 配置存储格式

```json
{
  "version": "1.0.0",
  "global": {
    "chunking": {
      "mode": "recursive",
      "maxChars": 1000
    },
    "embedding": {
      "providerId": "provider-1234567890",
      "modelId": "text-embedding-3-small",
      "dimensions": 1536
    }
  },
  "documents": {}
}
```

## 技术实现

### 依赖的 Stores
- `useKnowledgeConfigStore`: 知识库配置管理
- `useUserModelConfigStore`: 模型配置管理

### 使用的 API
- `window.api.knowledgeConfig.getConfig()`
- `window.api.knowledgeConfig.updateGlobalConfig()`

### 后端支持
- `KnowledgeConfigService`: 已支持读写嵌入配置
- 无需修改 IPC Handler（类型已兼容）

## 定位类规范

遵循项目定位类规范，所有组件根容器都包含定位类：
- `kb-embedding-section`: 主容器
- `kb-embedding-model-dialog`: 模型选择对话框
- `kb-embedding-header`: 标题区域
- `kb-embedding-content`: 内容区域
- `kb-embedding-model-select`: 模型选择按钮
- `kb-embedding-dimension`: 维度输入
- `kb-embedding-actions`: 操作按钮区域

## 遵循的规范

### 1. 目录结构规范
- ✅ 组件改为目录组件组（`index.vue` + 子组件）
- ✅ 局部类型放在组件目录内（`types.ts`）
- ✅ 添加组件文档（`README.md`）

### 2. 类型系统规范
- ✅ 跨进程类型定义在 `@preload/types`
- ✅ 局部类型定义在组件目录内
- ✅ 类型按业务域组织

### 3. 状态管理规范
- ✅ 使用 Pinia Store 作为单一事实来源
- ✅ 通过 Datasource 适配数据来源
- ✅ 本地状态仅用于 UI 交互

### 4. 组件开发规范
- ✅ 使用 Tailwind CSS（直接在标签内）
- ✅ 每个组件根容器包含定位类
- ✅ 定位类无样式意义，仅用于定位

## 测试建议

### 功能测试
1. 打开知识库设置页面
2. 点击"嵌入配置"标签
3. 点击"选择嵌入模型"按钮
4. 在对话框中选择模型
5. 输入嵌入维度（可选）
6. 点击"保存配置"
7. 验证配置是否保存到 `KnowledgeConfig.json`

### 边界测试
1. 未配置模型提供商时的提示
2. 维度输入非法值的验证
3. 配置变化检测的准确性
4. 重置功能的正确性

## 未来扩展

1. **模型能力检测**: 根据模型 ID 自动识别是否支持嵌入功能
2. **默认维度推荐**: 根据选中的模型自动填充推荐的维度值
3. **批量配置**: 支持为多个知识库批量配置相同的嵌入模型
4. **配置预设**: 保存常用的嵌入配置为预设，快速应用
5. **模型测试**: 提供测试按钮，验证模型配置是否正确

## 注意事项

1. **前置条件**: 使用前需要在"用户设置 > 模型管理"中配置模型提供商
2. **模型筛选**: 目前显示所有已配置的模型，未来可以根据模型能力进行筛选
3. **维度验证**: 维度必须为正整数，否则会被清空
4. **配置持久化**: 配置自动保存到知识库的配置文件中

## 相关文件

### 新增文件
- `KnowledgeDatabase-src/src/renderer/src/views/MainWindow/MainContent/views/KnowledgeView/KnowledgeDetail/SettingsView/EmbeddingSection/index.vue`
- `KnowledgeDatabase-src/src/renderer/src/views/MainWindow/MainContent/views/KnowledgeView/KnowledgeDetail/SettingsView/EmbeddingSection/ModelSelectDialog.vue`
- `KnowledgeDatabase-src/src/renderer/src/views/MainWindow/MainContent/views/KnowledgeView/KnowledgeDetail/SettingsView/EmbeddingSection/types.ts`
- `KnowledgeDatabase-src/src/renderer/src/views/MainWindow/MainContent/views/KnowledgeView/KnowledgeDetail/SettingsView/EmbeddingSection/README.md`

### 修改文件
- `KnowledgeDatabase-src/src/preload/types/knowledge-config.types.ts` (扩展类型定义)
- `KnowledgeDatabase-src/src/renderer/src/views/MainWindow/MainContent/views/KnowledgeView/KnowledgeDetail/SettingsView/index.vue` (更新导入路径)

### 删除文件
- `KnowledgeDatabase-src/src/renderer/src/views/MainWindow/MainContent/views/KnowledgeView/KnowledgeDetail/SettingsView/EmbeddingSection.vue` (旧单文件组件)

## 实施状态
✅ 完成

## 验证清单
- [x] 类型定义扩展
- [x] 组件重构为目录组件组
- [x] 主组件实现
- [x] 模型选择对话框实现
- [x] 导入路径更新
- [x] 组件文档编写
- [x] 遵循项目规范
- [ ] 功能测试（待用户验证）
- [ ] 边界测试（待用户验证）
