/**
 * 基础类型定义
 */

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface ErrorInfo {
  code: string
  message: string
  stack?: string
}
