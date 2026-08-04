<script setup lang="ts">
import { h, onMounted, ref } from 'vue'
import { NButton, NCard, NDataTable, NInput, NSpace, NTag, useDialog, useMessage, type DataTableColumns } from 'naive-ui'
import { request } from '../api/client'
import { usePreferencesStore } from '../stores/preferences'
import type { PageData, UserRecord } from '../types/api'

const message = useMessage()
const dialog = useDialog()
const preferences = usePreferencesStore()
const loading = ref(false)
const keyword = ref('')
const rows = ref<UserRecord[]>([])

const columns: DataTableColumns<UserRecord> = [
  { title: '用户名', key: 'username' },
  { title: '昵称', key: 'nickname' },
  { title: '邮箱', key: 'email' },
  {
    title: '状态',
    key: 'status',
    render: (row) => h(NTag, { type: row.status === 1 ? 'success' : 'error' }, { default: () => (row.status === 1 ? '正常' : '禁用') }),
  },
  {
    title: '操作',
    key: 'actions',
    render: (row) =>
      h(NSpace, null, {
        default: () => [
          h(NButton, { size: 'small', onClick: () => changeStatus(row) }, { default: () => (row.status === 1 ? '禁用' : '启用') }),
          h(NButton, { size: 'small', type: 'warning', onClick: () => confirmReset(row) }, { default: () => '重置密码' }),
        ],
      }),
  },
]

async function load(): Promise<void> {
  loading.value = true
  try {
    const data = await request<PageData<UserRecord>>(`/users?keyword=${encodeURIComponent(keyword.value)}`)
    rows.value = data.list
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载失败')
  } finally {
    loading.value = false
  }
}

async function changeStatus(row: UserRecord): Promise<void> {
  await request(`/users/${row.id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status: row.status === 1 ? 0 : 1, reason: '后台管理员操作' }),
  })
  message.success('状态已更新')
  await load()
}

function confirmReset(row: UserRecord): void {
  dialog.warning({
    title: '重置用户密码',
    content: `确认重置 ${row.username} 的密码？该用户所有会话会立即失效，并必须在下次登录时修改密码。`,
    positiveText: '确认重置',
    negativeText: '取消',
    onPositiveClick: async () => {
      await request(`/users/${row.id}/password-reset`, { method: 'POST' })
      message.success('密码已重置，账号已进入强制改密状态')
      await load()
    },
  })
}

onMounted(load)
</script>

<template>
  <section>
    <h1>用户管理</h1>
    <NCard>
      <NSpace class="toolbar">
        <NInput v-model:value="keyword" placeholder="用户名、昵称或邮箱" clearable @keyup.enter="load" />
        <NButton type="primary" @click="load">查询</NButton>
      </NSpace>
      <NDataTable :columns="columns" :data="rows" :loading="loading" :size="preferences.tableSize" :row-key="(row: UserRecord) => row.id" />
    </NCard>
  </section>
</template>
