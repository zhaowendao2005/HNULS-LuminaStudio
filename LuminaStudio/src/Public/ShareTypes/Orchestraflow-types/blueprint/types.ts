/**
 * 这里只保留给旧 compiler 接口使用的最小 Blueprint 类型。
 * GenerateView 已不再消费 Blueprint DSL，本目录不再承担作者态协议职责。
 */
export interface OFBlueprintNode {
  id: string
  type: string
  title?: string
  description?: string
  [key: string]: unknown
}
