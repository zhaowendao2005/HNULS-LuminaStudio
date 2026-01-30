import OpenAI from 'openai'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import config from './config.js'

/**
 * 测试 OpenAI Embedding API
 */
async function testEmbedding() {
  console.log('🚀 开始测试 OpenAI Embedding...\n')

  // 初始化 OpenAI 客户端
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    timeout: config.timeout,
    maxRetries: config.maxRetries,
  })

  console.log('📋 配置信息:')
  console.log(`  - Base URL: ${config.baseURL}`)
  console.log(`  - Model: ${config.embedding.model}`)
  console.log(`  - API Key: ${config.apiKey.substring(0, 10)}...`)
  console.log()

  // 从 source.txt 读取测试文本
  const sourceFile = join(process.cwd(), 'source.txt')
  let testTexts = []

  if (existsSync(sourceFile)) {
    console.log('📄 从 source.txt 读取文本...')
    const content = readFileSync(sourceFile, 'utf-8')
    // 按行分割，过滤空行
    testTexts = content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
    console.log(`  - 读取到 ${testTexts.length} 行文本`)
  } else {
    console.log('⚠️  未找到 source.txt，使用默认测试文本')
    testTexts = [
      'Hello, world!',
      '这是一个中文测试文本',
      'OpenAI embedding test',
    ]
  }
  console.log()

  try {
    console.log('📝 测试文本:')
    testTexts.forEach((text, i) => console.log(`  ${i + 1}. ${text}`))
    console.log()

    console.log('⏳ 正在请求 embedding...')
    const startTime = Date.now()

    // 调用 embedding API
    const response = await client.embeddings.create({
      model: config.embedding.model,
      input: testTexts,
      ...config.embedding,
    })

    const duration = Date.now() - startTime

    console.log('✅ 请求成功!\n')
    console.log('📊 结果统计:')
    console.log(`  - 耗时: ${duration}ms`)
    console.log(`  - 文本数量: ${response.data.length}`)
    console.log(`  - 向量维度: ${response.data[0].embedding.length}`)
    console.log(`  - Token 使用: ${response.usage.total_tokens}`)
    console.log()

    // 导出为文件
    const outputData = {
      timestamp: new Date().toISOString(),
      config: {
        model: config.embedding.model,
        baseURL: config.baseURL,
        dimensions: response.data[0].embedding.length,
      },
      usage: response.usage,
      duration_ms: duration,
      results: response.data.map((item, index) => ({
        index: index,
        text: testTexts[index],
        embedding: item.embedding,
      })),
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const filename = `embedding-result-${timestamp}.json`
    const filepath = join(process.cwd(), filename)

    writeFileSync(filepath, JSON.stringify(outputData, null, 2), 'utf-8')

    console.log(`💾 结果已导出到文件: ${filename}`)
    console.log('🎉 测试完成!')
  } catch (error) {
    console.error('❌ 测试失败:')
    console.error(`  错误类型: ${error.constructor.name}`)
    console.error(`  错误信息: ${error.message}`)

    if (error.status) {
      console.error(`  HTTP 状态码: ${error.status}`)
    }

    if (error.code) {
      console.error(`  错误代码: ${error.code}`)
    }

    process.exit(1)
  }
}

// 运行测试
testEmbedding()
