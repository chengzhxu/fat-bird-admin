<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { NConfigProvider, NDialogProvider, NMessageProvider, darkTheme, zhCN, dateZhCN } from 'naive-ui'
import { usePreferencesStore } from './stores/preferences'

const preferences = usePreferencesStore()
const theme = computed(() => preferences.isDark ? darkTheme : null)

watchEffect(() => {
  document.documentElement.classList.toggle('dark', preferences.isDark)
})
</script>

<template>
  <NConfigProvider :locale="zhCN" :date-locale="dateZhCN" :theme="theme">
    <NDialogProvider>
      <NMessageProvider>
        <RouterView />
      </NMessageProvider>
    </NDialogProvider>
  </NConfigProvider>
</template>
