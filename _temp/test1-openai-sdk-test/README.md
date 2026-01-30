# OpenAI Embedding 测试项目

简单的 Node.js 项目，用于测试 OpenAI SDK 的 embedding 功能。

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置

编辑 `config.js` 文件，填写你的配置：

```javascript
export default {
  apiKey: 'your-api-key-here',  // 必填：你的 API Key
  baseURL: 'https://api.openai.com/v1',  // 可选：API 地址
  embedding: {
    model: 'text-embedding-3-small',  // 模型名称
  },
}
```

### 3. 准备测试文本

编辑 `source.txt` 文件，每行一个文本：

```
Hello, world!
这是一个中文测试文本
OpenAI embedding test
```

如果不存在 `source.txt`，会使用默认测试文本。

### 4. 运行测试

```bash
npm test
```

或直接运行：

```bash
node index.js
```

## 配置说明

### 支持的 Embedding 模型

- `text-embedding-3-small` - 最新小型模型（推荐）
- `text-embedding-3-large` - 最新大型模型
- `text-embedding-ada-002` - 旧版模型

### 自定义 Base URL

如果使用兼容 OpenAI 的第三方服务（如 Azure OpenAI、本地部署等），修改 `baseURL`：

```javascript
baseURL: 'https://your-custom-endpoint.com/v1'
```

## 输出示例

```
🚀 开始测试 OpenAI Embedding...

📋 配置信息:
  - Base URL: https://api.openai.com/v1
  - Model: text-embedding-3-small
  - API Key: sk-proj-xx...

📝 测试文本:
  1. Hello, world!
  2. 这是一个中文测试文本
  3. OpenAI embedding test

⏳ 正在请求 embedding...
✅ 请求成功!

📊 结果统计:
  - 耗时: 1234ms
  - 文本数量: 3
  - 向量维度: 1536
  - Token 使用: 15

🔢 第一个向量示例（前 10 维）:
  [0.123456, -0.234567, 0.345678, ...]

🎉 测试完成!
```

## 故障排查

### API Key 错误
确保 `config.js` 中的 `apiKey` 正确且有效。

### 网络错误
检查 `baseURL` 是否正确，网络是否可访问。

### 模型不存在
确认使用的模型名称在你的 API 账户中可用。
