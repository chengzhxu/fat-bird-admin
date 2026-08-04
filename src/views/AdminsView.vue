<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue'
import { NButton, NCard, NDataTable, NForm, NFormItem, NInput, NModal, NSelect, NSpace, NSwitch, NTag, useMessage, type DataTableColumns } from 'naive-ui'
import { request } from '../api/client'
import { usePreferencesStore } from '../stores/preferences'
import type { AdminRecord, PageData, RoleRecord } from '../types/api'

const message = useMessage()
const preferences = usePreferencesStore()
const rows = ref<AdminRecord[]>([])
const roles = ref<RoleRecord[]>([])
const loading = ref(false)
const submitting = ref(false)
const showCreate = ref(false)
const form = reactive({ username: '', nickname: '', password: '', roleIds: [] as string[], active: true })

const columns: DataTableColumns<AdminRecord> = [
  { title: '用户名', key: 'username' },
  { title: '昵称', key: 'nickname' },
  {
    title: '角色',
    key: 'roleNames',
    render: (row) => h(NSpace, { size: 4 }, {
      default: () => row.isSuperAdmin
        ? [h(NTag, { type: 'warning', bordered: false, size: 'small' }, { default: () => '全部权限' })]
        : row.roleNames.map((name) => h(NTag, { bordered: false, size: 'small' }, { default: () => name })),
    }),
  },
  { title: '状态', key: 'status', render: (row) => h(NTag, { type: row.status === 1 ? 'success' : 'error', bordered: false }, { default: () => (row.status === 1 ? '正常' : '禁用') }) },
  { title: '账号类型', key: 'isSuperAdmin', render: (row) => h(NTag, { type: row.isSuperAdmin ? 'warning' : 'info', bordered: false }, { default: () => (row.isSuperAdmin ? '超级管理员' : '管理员') }) },
  { title: '密码状态', key: 'mustChangePassword', render: (row) => h(NTag, { type: row.mustChangePassword ? 'warning' : 'success', bordered: false }, { default: () => (row.mustChangePassword ? '待修改' : '正常') }) },
  { title: '创建时间', key: 'createdAt', render: (row) => new Date(row.createdAt).toLocaleString() },
]

// load fetches administrators and selectable active roles together.
async function load(): Promise<void> {
  loading.value = true
  try {
    const [adminData, roleData] = await Promise.all([
      request<PageData<AdminRecord>>('/admins'),
      request<{ list: Array<Pick<RoleRecord, 'id' | 'name' | 'code'>> }>('/role-options'),
    ])
    rows.value = adminData.list
    roles.value = roleData.list.map((role) => ({ ...role, description: '', status: 1, permissionIds: [], menuIds: [] }))
  } finally {
    loading.value = false
  }
}

// createAdmin submits the selected role assignments with the new account.
async function createAdmin(): Promise<void> {
  if (!form.roleIds.length) {
    message.warning('请至少选择一个角色')
    return
  }
  submitting.value = true
  try {
    const result = await request<{ usedDefaultPassword: boolean; mustChangePassword: boolean }>('/admins', {
      method: 'POST',
      body: JSON.stringify({
        username: form.username,
        nickname: form.nickname,
        password: form.password || undefined,
        roleIds: form.roleIds,
        status: form.active ? 1 : 0,
      }),
    })
    message.success(result.usedDefaultPassword ? '管理员已创建，并使用系统初始密码' : '管理员已创建')
    showCreate.value = false
    Object.assign(form, { username: '', nickname: '', password: '', roleIds: [], active: true })
    await load()
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<template>
  <section>
    <NSpace justify="space-between" align="center">
      <div><h1>管理员管理</h1><p class="page-description">维护后台账号、角色和初始密码状态。</p></div>
      <NButton type="primary" @click="showCreate = true">创建管理员</NButton>
    </NSpace>
    <NCard>
      <NDataTable :columns="columns" :data="rows" :loading="loading" :size="preferences.tableSize" :row-key="(row: AdminRecord) => row.id" />
    </NCard>
    <NModal v-model:show="showCreate" preset="card" title="创建管理员" class="modal-card">
      <NForm @submit.prevent="createAdmin">
        <NFormItem label="用户名" required><NInput v-model:value="form.username" placeholder="请输入登录用户名" /></NFormItem>
        <NFormItem label="昵称" required><NInput v-model:value="form.nickname" placeholder="请输入展示昵称" /></NFormItem>
        <NFormItem label="角色" required>
          <NSelect
            v-model:value="form.roleIds"
            multiple
            filterable
            :options="roles.map((role) => ({ label: role.name, value: role.id }))"
            placeholder="请选择一个或多个角色"
          />
        </NFormItem>
        <NFormItem label="初始密码">
          <NInput v-model:value="form.password" type="password" show-password-on="click" placeholder="不填写则使用系统配置密码" />
        </NFormItem>
        <p class="form-tip">新管理员首次登录后必须修改密码，初始密码不会显示在列表或日志中。</p>
        <NFormItem label="启用账号"><NSwitch v-model:value="form.active" /></NFormItem>
        <NButton type="primary" block attr-type="submit" :loading="submitting">创建</NButton>
      </NForm>
    </NModal>
  </section>
</template>
