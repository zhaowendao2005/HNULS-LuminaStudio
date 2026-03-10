/**
 * Model Config Service 内部类型定义
 */

export interface ModelProviderRow {
  id: string
  name: string
  protocol: string
  api_mode: string | null
  enabled: number
  base_url: string
  api_key: string
  default_headers: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ModelConfigRow {
  id: string
  provider_id: string
  display_name: string
  group_name: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface AppSettingRow {
  key: string
  value: string
  updated_at: string
}
