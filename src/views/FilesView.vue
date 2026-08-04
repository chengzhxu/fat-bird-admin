<script setup lang="ts">
import { h, onMounted, ref } from 'vue'
import { NCard, NDataTable, NTag, type DataTableColumns } from 'naive-ui'
import { request } from '../api/client'
import { usePreferencesStore } from '../stores/preferences'
import type { PageData } from '../types/api'

interface FileRecord {
  ID: number
  OriginalName: string
  MimeType: string
  SizeBytes: number
  FileRole: number
  Status: number
  CreatedAt: string
}

const fileStatus: Record<number, string> = { 0: '待上传', 1: '正常', 2: '待删除', 3: '已删除', 4: '处理失败' }
const preferences = usePreferencesStore()
const rows = ref<FileRecord[]>([])
const columns: DataTableColumns<FileRecord> = [
  { title: 'ID', key: 'ID' },
  { title: '文件名', key: 'OriginalName' },
  { title: 'MIME', key: 'MimeType' },
  { title: '大小', key: 'SizeBytes', render: (row) => `${(row.SizeBytes / 1024).toFixed(1)} KB` },
  { title: '用途', key: 'FileRole', render: () => '帖子图片' },
  { title: '状态', key: 'Status', render: (row) => h(NTag, { type: row.Status === 1 ? 'success' : 'default', bordered: false }, { default: () => fileStatus[row.Status] ?? '未知状态' }) },
  { title: '创建时间', key: 'CreatedAt', render: (row) => new Date(row.CreatedAt).toLocaleString() },
]

onMounted(async () => {
  rows.value = (await request<PageData<FileRecord>>('/files')).list
})
</script>

<template>
  <section>
    <h1>文件管理</h1>
    <p class="page-description">统一查看帖子图片的上传和清理状态。</p>
    <NCard><NDataTable :columns="columns" :data="rows" :size="preferences.tableSize" /></NCard>
  </section>
</template>
