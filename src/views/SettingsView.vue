<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NButton, NCard, NInput, NSpace, useMessage } from 'naive-ui'
import { request } from '../api/client'

interface SettingRecord { ID: number; Key: string; Value: unknown; LogoURL: string; Status: number }
const message = useMessage()
const settings = ref<SettingRecord[]>([])
const values = ref<Record<string, string>>({})
const logoUrl = ref('')

async function load(): Promise<void> {
  settings.value = (await request<{ list: SettingRecord[] }>('/settings')).list
  values.value = Object.fromEntries(settings.value.map((item) => [item.Key, JSON.stringify(item.Value)]))
  logoUrl.value = settings.value.find((item) => item.Key === 'site.title')?.LogoURL ?? ''
}

async function save(key: string): Promise<void> {
  let value: unknown
  try {
    value = JSON.parse(values.value[key] ?? 'null')
  } catch {
    message.error('请输入合法 JSON 值')
    return
  }
  await request(`/settings/${encodeURIComponent(key)}`, { method: 'PUT', body: JSON.stringify({ value }) })
  message.success('设置已保存')
}

async function saveLogo(): Promise<void> {
  await request('/settings/site.logo', { method: 'PUT', body: JSON.stringify({ value: logoUrl.value }) })
  message.success('网站 Logo 已保存')
}

onMounted(load)
</script>

<template>
  <section>
    <h1>网站设置</h1>
    <NCard>
      <div class="setting-row">
        <strong>site.logo</strong>
        <NInput v-model:value="logoUrl" placeholder="https://cdn.example.com/logo.webp" />
        <NButton @click="saveLogo">保存</NButton>
      </div>
      <div v-for="item in settings" :key="item.Key" class="setting-row">
        <strong>{{ item.Key }}</strong>
        <NInput v-model:value="values[item.Key]" />
        <NButton @click="save(item.Key)">保存</NButton>
      </div>
    </NCard>
  </section>
</template>
