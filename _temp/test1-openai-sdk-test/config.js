/**
 * OpenAI SDK 配置文件
 * 根据实际情况修改以下配置
 */
export default {
  // API Key（必填）
  apiKey: 'sk-dcl9PHYqcLbfFmSxB2B80548Ac444538A974Fa2dAc4d730f',

  // API Base URL（可选，默认为 OpenAI 官方地址）
  // 如果使用兼容 OpenAI 的第三方服务，修改此项
  baseURL: 'https://kfcv50.link/v1',

  // Embedding 模型配置
  embedding: {
    // 模型名称
    // - text-embedding-3-small: 默认 1536 维，可调整范围未公开
    // - text-embedding-3-large: 默认 3072 维，可调整范围未公开
    // - text-embedding-ada-002: 固定 1536 维（不支持 dimensions 参数）
    model: 'text-embedding-3-large',
    
    // 其他可选参数
    // dimensions: 512,  // 输出维度（可选，仅 text-embedding-3-* 模型支持）
    //                   // 降低维度可以节省存储和计算成本
    //                   // 例如：512, 768, 1024, 1536
    
    // encoding_format: 'float',  // 编码格式：'float' 或 'base64'
  },

  // 请求超时设置（毫秒）
  timeout: 60000,

  // 最大重试次数
  maxRetries: 2,
}
