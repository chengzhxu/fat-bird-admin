<script setup lang="ts">
import { h, onMounted, ref } from 'vue'
import { NButton, NCard, NDataTable, NInput, NSpace, NTag, useMessage, type DataTableColumns } from 'naive-ui'
import { request } from '../api/client'
import { usePreferencesStore } from '../stores/preferences'
import type { PageData } from '../types/api'

interface CommentRecord {
  id: string
  postId: string
  postTitle: string
  userId: string
  depth: number
  content: string
  status: number
  createdAt: string
}

const message = useMessage()
const preferences = usePreferencesStore()
const keyword = ref('')
const rows = ref<CommentRecord[]>([])
const columns: DataTableColumns<CommentRecord> = [
  { title: '帖子标题', key: 'postTitle', minWidth: 220, ellipsis: { tooltip: true } },
  { title: '层级', key: 'depth' },
  { title: '评论', key: 'content', ellipsis: { tooltip: true } },
  { title: '状态', key: 'status', render: (row) => h(NTag, { type: row.status === 1 ? 'success' : 'warning' }, { default: () => (row.status === 1 ? '正常' : '隐藏') }) },
  {
    title: '操作',
    key: 'actions',
    render: (row) => h(NButton, { size: 'small', onClick: () => toggle(row) }, { default: () => (row.status === 1 ? '下架' : '恢复') }),
  },
]

async function load(): Promise<void> {
  rows.value = (await request<PageData<CommentRecord>>(`/comments?keyword=${encodeURIComponent(keyword.value)}`)).list
}

async function toggle(row: CommentRecord): Promise<void> {
  await request(`/comments/${row.id}/status`, { method: 'PUT', body: JSON.stringify({ status: row.status === 1 ? 0 : 1, reason: '后台内容治理' }) })
  message.success('评论状态已更新')
  await load()
}

onMounted(load)
</script>

<template>
  <section>
    <h1>评论管理</h1>
    <NCard>
      <NSpace class="toolbar"><NInput v-model:value="keyword" placeholder="搜索评论内容" @keyup.enter="load" /><NButton @click="load">查询</NButton></NSpace>
      <NDataTable :columns="columns" :data="rows" :size="preferences.tableSize" />
    </NCard>
  </section>
</template>
