<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { NButton, NCard, NForm, NFormItem, NInput, NModal, NSpace, NTag, NTree, useMessage, type TreeOption } from 'naive-ui'
import { request } from '../api/client'
import type { AdminMenu, RoleRecord } from '../types/api'

interface PermissionRecord {
  ID: number
  Code: string
  Name: string
  Description: string
}

const permissionGroups: Record<string, string> = {
  dashboard: '工作台',
  user: '用户管理',
  admin: '管理员管理',
  rbac: '角色权限',
  post: '内容管理',
  comment: '评论管理',
  site: '网站设置',
  dictionary: '字典管理',
  file: '文件管理',
  audit: '审计日志',
}

const message = useMessage()
const roles = ref<RoleRecord[]>([])
const permissions = ref<PermissionRecord[]>([])
const menus = ref<AdminMenu[]>([])
const showCreate = ref(false)
const submitting = ref(false)
const form = reactive({ code: '', name: '', description: '', permissionIds: [] as string[], menuIds: [] as string[] })

const permissionTree = computed<TreeOption[]>(() => {
  const grouped = new Map<string, PermissionRecord[]>()
  for (const permission of permissions.value) {
    const group = permission.Code.split('.')[0] ?? 'other'
    grouped.set(group, [...(grouped.get(group) ?? []), permission])
  }
  return Array.from(grouped.entries()).map(([group, records]) => ({
    key: `group:${group}`,
    label: permissionGroups[group] ?? '其他权限',
    children: records.map((permission) => ({
      key: String(permission.ID),
      label: permission.Name,
      suffix: () => permission.Code,
    })),
  }))
})

// menuTree maps the backend menu hierarchy into selectable role menu nodes.
const menuTree = computed<TreeOption[]>(() => {
  const mapMenu = (menu: AdminMenu): TreeOption => ({
    key: menu.id,
    label: menu.name,
    children: menu.children.map(mapMenu),
  })
  return menus.value.map(mapMenu)
})

// load fetches role cards and the permission catalog.
async function load(): Promise<void> {
  const [roleData, permissionData, menuData] = await Promise.all([
    request<{ list: RoleRecord[] }>('/roles'),
    request<{ list: PermissionRecord[] }>('/permissions'),
    request<{ list: AdminMenu[] }>('/menus'),
  ])
  roles.value = roleData.list
  permissions.value = permissionData.list
  menus.value = menuData.list
}

// createRole submits only leaf permission identifiers selected in the tree.
async function createRole(): Promise<void> {
  submitting.value = true
  try {
    const permissionIds = form.permissionIds.filter((id) => !id.startsWith('group:'))
    await request('/roles', {
      method: 'POST',
      body: JSON.stringify({ code: form.code, name: form.name, description: form.description, permissionIds, menuIds: form.menuIds }),
    })
    message.success('角色已创建')
    showCreate.value = false
    Object.assign(form, { code: '', name: '', description: '', permissionIds: [], menuIds: [] })
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
      <div><h1>角色管理</h1><p class="page-description">按业务域配置后台角色权限。</p></div>
      <NButton type="primary" @click="showCreate = true">创建角色</NButton>
    </NSpace>
    <div class="card-grid">
      <NCard v-for="role in roles" :key="role.id" :title="role.name">
        <p>{{ role.description || role.code }}</p>
        <NSpace>
          <NTag :type="role.status === 1 ? 'success' : 'default'" :bordered="false">{{ role.status === 1 ? '启用' : '禁用' }}</NTag>
          <NTag :bordered="false">{{ role.permissionIds.length }} 项权限</NTag>
          <NTag :bordered="false">{{ role.menuIds.length }} 个菜单</NTag>
        </NSpace>
      </NCard>
    </div>
    <NModal v-model:show="showCreate" preset="card" title="创建角色" class="modal-card modal-card--wide">
      <NForm @submit.prevent="createRole">
        <div class="two-column-form">
          <NFormItem label="角色代码" required><NInput v-model:value="form.code" placeholder="例如 content_operator" /></NFormItem>
          <NFormItem label="角色名称" required><NInput v-model:value="form.name" placeholder="例如 内容运营" /></NFormItem>
        </div>
        <NFormItem label="说明"><NInput v-model:value="form.description" type="textarea" /></NFormItem>
        <NFormItem label="权限设置">
          <div class="permission-tree-panel">
            <NTree
              v-model:checked-keys="form.permissionIds"
              block-line
              cascade
              checkable
              default-expand-all
              :data="permissionTree"
            />
          </div>
        </NFormItem>
        <NFormItem label="菜单设置">
          <div class="permission-tree-panel">
            <NTree
              v-model:checked-keys="form.menuIds"
              block-line
              cascade
              checkable
              default-expand-all
              :data="menuTree"
            />
          </div>
        </NFormItem>
        <NButton type="primary" block attr-type="submit" :loading="submitting">创建角色</NButton>
      </NForm>
    </NModal>
  </section>
</template>
