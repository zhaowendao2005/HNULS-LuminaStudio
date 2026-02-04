/**
 * Model Config Service 内部类型定义
 * 
 * 注意：跨进程类型定义在 @preload/types 中
 */

/**
 * 数据库中的 model_providers 表行
 */
export interface ModelProviderRow {
  id: string
  name: string
  protocol: string
  enabled: number
  base_url: string
  api_key: string
  default_headers: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

/**
 * 数据库中的 model_configs 表行
 */
export interface ModelConfigRow {
  id: string
  provider_id: string
  display_name: string
  group_name: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

/**
 * 数据库中的 app_settings 表行
 */
export interface AppSettingRow {
  key: string
  value: string
  updated_at: string
}
