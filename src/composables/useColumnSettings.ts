import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { DataTableColumn, DataTableColumns } from 'naive-ui'

export type ColumnFixed = 'left' | 'right' | false

export const ACTIONS_COLUMN_KEY = 'actions'

export interface ColumnSettingItem {
  key: string
  title: string
  visible: boolean
  fixed: ColumnFixed
  order: number
}

interface StoredColumnSetting {
  key: string
  visible: boolean
  fixed: ColumnFixed
  order: number
}

function isActionsColumn(key: string): boolean {
  return key === ACTIONS_COLUMN_KEY
}

function normalizeSettings(items: ColumnSettingItem[]): ColumnSettingItem[] {
  const actionsIndex = items.findIndex((item) => isActionsColumn(item.key))
  const normalized = items.map((item) =>
    isActionsColumn(item.key) ? { ...item, fixed: 'right' as ColumnFixed } : item,
  )
  if (actionsIndex < 0) {
    return normalized.map((item, order) => ({ ...item, order }))
  }
  const actions = normalized.splice(actionsIndex, 1)[0]
  if (!actions) {
    return normalized.map((item, order) => ({ ...item, order }))
  }
  normalized.push(actions)
  return normalized.map((item, order) => ({ ...item, order }))
}

function columnKey<T>(column: DataTableColumn<T>, index: number): string {
  if ('key' in column && column.key != null) return String(column.key)
  if ('type' in column && column.type) return `type:${column.type}`
  return `col:${index}`
}

function columnTitle<T>(column: DataTableColumn<T>, key: string): string {
  if ('title' in column && typeof column.title === 'string') return column.title
  if ('type' in column && column.type === 'selection') return '勾选列'
  return key
}

export function useColumnSettings<T>(
  storageKey: string,
  sourceColumns: Ref<DataTableColumns<T>> | ComputedRef<DataTableColumns<T>>,
) {
  const settings = ref<ColumnSettingItem[]>([])

  function loadDefaults(): ColumnSettingItem[] {
    return normalizeSettings(
      sourceColumns.value.map((column, index) => {
        const key = columnKey(column, index)
        const fixed = isActionsColumn(key)
          ? 'right'
          : (('fixed' in column ? column.fixed : false) as ColumnFixed)
        return {
          key,
          title: columnTitle(column, key),
          visible: true,
          fixed: fixed === 'left' || fixed === 'right' ? fixed : false,
          order: index,
        }
      }),
    )
  }

  function restore(): void {
    const defaults = loadDefaults()
    try {
      const raw = localStorage.getItem(`fat-bird-admin.columns.${storageKey}`)
      if (!raw) {
        settings.value = defaults
        return
      }
      const stored = JSON.parse(raw) as StoredColumnSetting[]
      const byKey = new Map(stored.map((item) => [item.key, item]))
      settings.value = normalizeSettings(
        defaults
          .map((item) => {
            const hit = byKey.get(item.key)
            if (!hit) return item
            return {
              ...item,
              visible: hit.visible,
              fixed: isActionsColumn(item.key) ? 'right' : hit.fixed,
              order: typeof hit.order === 'number' ? hit.order : item.order,
            }
          })
          .sort((a, b) => a.order - b.order),
      )
    } catch {
      settings.value = defaults
    }
  }

  function persist(): void {
    localStorage.setItem(
      `fat-bird-admin.columns.${storageKey}`,
      JSON.stringify(
        settings.value.map(({ key, visible, fixed, order }) => ({ key, visible, fixed, order })),
      ),
    )
  }

  function reset(): void {
    settings.value = loadDefaults()
    persist()
  }

  function setVisible(key: string, visible: boolean): void {
    const item = settings.value.find((entry) => entry.key === key)
    if (!item) return
    item.visible = visible
    persist()
  }

  function setFixed(key: string, fixed: ColumnFixed): void {
    const item = settings.value.find((entry) => entry.key === key)
    if (!item) return
    item.fixed = isActionsColumn(key) ? 'right' : fixed
    persist()
  }

  function move(key: string, direction: -1 | 1): void {
    if (isActionsColumn(key)) return
    const index = settings.value.findIndex((entry) => entry.key === key)
    const target = index + direction
    if (index < 0 || target < 0 || target >= settings.value.length) return
    const actionsIndex = settings.value.findIndex((entry) => isActionsColumn(entry.key))
    if (actionsIndex >= 0 && target >= actionsIndex) return
    const copy = [...settings.value]
    const current = copy[index]
    if (!current) return
    copy.splice(index, 1)
    copy.splice(target, 0, current)
    settings.value = normalizeSettings(copy)
    persist()
  }

  const columns = computed<DataTableColumns<T>>(() => {
    const source = sourceColumns.value
    const sourceMap = new Map(source.map((column, index) => [columnKey(column, index), column]))
    return normalizeSettings(settings.value)
      .filter((item) => item.visible)
      .map((item) => {
        const column = sourceMap.get(item.key)
        if (!column) return null
        const fixed = isActionsColumn(item.key) ? 'right' : item.fixed || undefined
        return {
          ...column,
          fixed,
        } as DataTableColumn<T>
      })
      .filter(Boolean) as DataTableColumns<T>
  })

  restore()

  return {
    settings,
    columns,
    restore,
    reset,
    setVisible,
    setFixed,
    move,
  }
}
