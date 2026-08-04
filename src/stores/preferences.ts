import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

export type ThemeMode = 'light' | 'dark'
export type LayoutMode = 'side' | 'top'
export type TableSize = 'small' | 'medium' | 'large'

interface StoredPreferences {
  theme: ThemeMode
  layout: LayoutMode
  tableSize: TableSize
  showBreadcrumb: boolean
  showTabs: boolean
}

const storageKey = 'fat-bird-admin-preferences'
const defaults: StoredPreferences = {
  theme: 'light',
  layout: 'side',
  tableSize: 'medium',
  showBreadcrumb: true,
  showTabs: true,
}

// readPreferences safely restores non-sensitive display preferences.
function readPreferences(): StoredPreferences {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(storageKey) ?? '{}') }
  } catch {
    return defaults
  }
}

export const usePreferencesStore = defineStore('preferences', () => {
  const initial = readPreferences()
  const theme = ref<ThemeMode>(initial.theme)
  const layout = ref<LayoutMode>(initial.layout)
  const tableSize = ref<TableSize>(initial.tableSize)
  const showBreadcrumb = ref(initial.showBreadcrumb)
  const showTabs = ref(initial.showTabs)
  const isDark = computed(() => theme.value === 'dark')

  watch([theme, layout, tableSize, showBreadcrumb, showTabs], () => {
    localStorage.setItem(storageKey, JSON.stringify({
      theme: theme.value,
      layout: layout.value,
      tableSize: tableSize.value,
      showBreadcrumb: showBreadcrumb.value,
      showTabs: showTabs.value,
    }))
  })

  // reset restores the framework display defaults.
  function reset(): void {
    theme.value = defaults.theme
    layout.value = defaults.layout
    tableSize.value = defaults.tableSize
    showBreadcrumb.value = defaults.showBreadcrumb
    showTabs.value = defaults.showTabs
  }

  return { theme, layout, tableSize, showBreadcrumb, showTabs, isDark, reset }
})
