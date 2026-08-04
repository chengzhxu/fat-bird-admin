<script setup lang="ts">
import { computed, h, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import {
  NBreadcrumb,
  NBreadcrumbItem,
  NButton,
  NCard,
  NDrawer,
  NDrawerContent,
  NDropdown,
  NForm,
  NFormItem,
  NInput,
  NLayout,
  NLayoutContent,
  NLayoutHeader,
  NLayoutSider,
  NMenu,
  NModal,
  NRadioButton,
  NRadioGroup,
  NSpace,
  NSwitch,
  NTab,
  NTabs,
  NTag,
  NText,
  useDialog,
  useMessage,
  type MenuOption,
} from 'naive-ui'
import { useAuthStore } from '../stores/auth'
import { usePreferencesStore } from '../stores/preferences'
import type { AdminMenu } from '../types/api'

interface PageTab {
  path: string
  title: string
}

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const preferences = usePreferencesStore()
const dialog = useDialog()
const message = useMessage()
const settingsVisible = ref(false)
const profileVisible = ref(false)
const passwordVisible = ref(false)
const passwordLoading = ref(false)
const passwordForm = ref({ oldPassword: '', newPassword: '', confirmation: '' })
const tabs = ref<PageTab[]>([])

// menuOption maps one backend menu node and all descendants into navigation.
function menuOption(menu: AdminMenu): MenuOption {
  return {
    key: menu.route,
    label: menu.children.length ? menu.name : () => h(RouterLink, { to: menu.route }, { default: () => menu.name }),
    children: menu.children.length ? menu.children.map(menuOption) : undefined,
  }
}

// menuItems renders only the current administrator's backend-assigned menus.
const menuItems = computed<MenuOption[]>(() => auth.menus.map(menuOption))

const breadcrumbItems = computed(() => {
  const values = ['首页']
  if (route.meta.group) values.push(String(route.meta.group))
  if (route.meta.title) values.push(String(route.meta.title))
  return values
})

watch(
  () => route.path,
  (path) => {
    const title = String(route.meta.title ?? '页面')
    if (!tabs.value.some((item) => item.path === path) && path !== '/') {
      tabs.value.push({ path, title })
    }
  },
  { immediate: true },
)

// closeTab removes a visited page while keeping at least the dashboard available.
async function closeTab(path: string): Promise<void> {
  const index = tabs.value.findIndex((item) => item.path === path)
  tabs.value = tabs.value.filter((item) => item.path !== path)
  if (route.path === path) {
    const target = tabs.value[Math.max(0, index - 1)]?.path ?? '/dashboard'
    await router.push(target)
  }
}

// confirmLogout requires confirmation before invalidating the current session.
function confirmLogout(): void {
  dialog.warning({
    title: '确认退出',
    content: '退出后需要重新登录才能访问管理后台，是否继续？',
    positiveText: '确认退出',
    negativeText: '取消',
    onPositiveClick: async () => {
      await auth.logout()
      await router.push('/login')
    },
  })
}

// handleUserAction opens account workflows from the user menu.
function handleUserAction(key: string): void {
  if (key === 'profile') profileVisible.value = true
  if (key === 'password') passwordVisible.value = true
  if (key === 'logout') confirmLogout()
}

// changePassword validates and submits an administrator password change.
async function changePassword(): Promise<void> {
  const form = passwordForm.value
  if (form.newPassword !== form.confirmation) {
    message.error('两次输入的新密码不一致')
    return
  }
  passwordLoading.value = true
  try {
    await auth.changePassword(form.oldPassword, form.newPassword)
    passwordVisible.value = false
    message.success('密码修改成功，请重新登录')
    await router.push('/login')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '密码修改失败')
  } finally {
    passwordLoading.value = false
  }
}
</script>

<template>
  <NLayout class="admin-shell" :has-sider="preferences.layout === 'side'">
    <NLayoutSider
      v-if="preferences.layout === 'side'"
      bordered
      :width="236"
      collapse-mode="width"
      :collapsed-width="76"
      show-trigger
    >
      <RouterLink to="/dashboard" class="brand brand--admin" aria-label="Fat Bird 管理后台">
        <img class="brand__image" src="/fatBird-admin-horizontal.png" alt="Fat Bird 管理后台">
        <img class="brand__collapsed-logo" src="/logoAdmin-tight.png" alt="">
      </RouterLink>
      <NMenu :value="route.path" :options="menuItems" :indent="22" />
    </NLayoutSider>

    <NLayout>
      <NLayoutHeader bordered class="admin-header">
        <div class="header-brand-menu">
          <RouterLink v-if="preferences.layout === 'top'" to="/dashboard" class="brand brand--top" aria-label="Fat Bird 管理后台">
            <img class="brand__image" src="/fatBird-admin-horizontal.png" alt="Fat Bird 管理后台">
          </RouterLink>
          <NMenu v-if="preferences.layout === 'top'" mode="horizontal" :value="route.path" :options="menuItems" />
        </div>
        <NSpace align="center" :wrap="false">
          <NButton quaternary circle title="界面设置" @click="settingsVisible = true">⚙</NButton>
          <NDropdown
            trigger="click"
            :options="[
              { label: '个人信息', key: 'profile' },
              { label: '修改密码', key: 'password' },
              { type: 'divider', key: 'divider' },
              { label: '退出登录', key: 'logout' },
            ]"
            @select="handleUserAction"
          >
            <NButton text class="user-trigger">
              <span class="user-avatar">{{ auth.currentUser?.nickname?.slice(0, 1) || 'A' }}</span>
              <span>{{ auth.currentUser?.nickname || auth.currentUser?.username }}</span>
              <span class="dropdown-arrow">⌄</span>
            </NButton>
          </NDropdown>
        </NSpace>
      </NLayoutHeader>

      <div v-if="preferences.showBreadcrumb" class="breadcrumb-bar">
        <NBreadcrumb>
          <NBreadcrumbItem v-for="item in breadcrumbItems" :key="item">{{ item }}</NBreadcrumbItem>
        </NBreadcrumb>
      </div>

      <div v-if="preferences.showTabs" class="page-tabs">
        <NTabs type="card" :value="route.path" @update:value="(value) => router.push(String(value))">
          <NTab v-for="tab in tabs" :key="tab.path" :name="tab.path" :closable="tab.path !== '/dashboard'" @close="closeTab(tab.path)">
            {{ tab.title }}
          </NTab>
        </NTabs>
      </div>

      <NLayoutContent class="admin-content">
        <RouterView />
      </NLayoutContent>
    </NLayout>
  </NLayout>

  <NDrawer v-model:show="settingsVisible" :width="360" placement="right">
    <NDrawerContent title="界面设置" closable>
      <div class="preference-section">
        <NText depth="3">主题模式</NText>
        <NRadioGroup v-model:value="preferences.theme">
          <NRadioButton value="light">浅色</NRadioButton>
          <NRadioButton value="dark">深色</NRadioButton>
        </NRadioGroup>
      </div>
      <div class="preference-section">
        <NText depth="3">导航布局</NText>
        <NRadioGroup v-model:value="preferences.layout">
          <NRadioButton value="side">侧边菜单</NRadioButton>
          <NRadioButton value="top">顶部菜单</NRadioButton>
        </NRadioGroup>
      </div>
      <div class="preference-section">
        <NText depth="3">表格密度</NText>
        <NRadioGroup v-model:value="preferences.tableSize">
          <NRadioButton value="small">紧凑</NRadioButton>
          <NRadioButton value="medium">默认</NRadioButton>
          <NRadioButton value="large">宽松</NRadioButton>
        </NRadioGroup>
      </div>
      <div class="switch-setting"><span>显示面包屑</span><NSwitch v-model:value="preferences.showBreadcrumb" /></div>
      <div class="switch-setting"><span>显示页面标签</span><NSwitch v-model:value="preferences.showTabs" /></div>
      <NButton block @click="preferences.reset">恢复默认设置</NButton>
    </NDrawerContent>
  </NDrawer>

  <NModal v-model:show="profileVisible" preset="card" title="个人信息" class="modal-card profile-modal">
    <div class="profile-summary">
      <span class="profile-avatar-large">{{ auth.currentUser?.nickname?.slice(0, 1) || 'A' }}</span>
      <div>
        <h2>{{ auth.currentUser?.nickname }}</h2>
        <NText depth="3">@{{ auth.currentUser?.username }}</NText>
      </div>
    </div>
    <NCard size="small" embedded>
      <div class="profile-row"><span>管理员 ID</span><strong>{{ auth.currentUser?.id }}</strong></div>
      <div class="profile-row"><span>账号类型</span><NTag :type="auth.currentUser?.isSuperAdmin ? 'warning' : 'info'">{{ auth.currentUser?.isSuperAdmin ? '超级管理员' : '管理员' }}</NTag></div>
      <div class="profile-row"><span>密码状态</span><NTag type="success">正常</NTag></div>
    </NCard>
    <NButton class="form-gap" type="primary" block @click="profileVisible = false; passwordVisible = true">修改密码</NButton>
  </NModal>

  <NModal v-model:show="passwordVisible" preset="card" title="修改密码" class="modal-card">
    <NForm @submit.prevent="changePassword">
      <NFormItem label="当前密码"><NInput v-model:value="passwordForm.oldPassword" type="password" show-password-on="click" /></NFormItem>
      <NFormItem label="新密码"><NInput v-model:value="passwordForm.newPassword" type="password" show-password-on="click" placeholder="8-20 位，至少包含两类字符" /></NFormItem>
      <NFormItem label="确认新密码"><NInput v-model:value="passwordForm.confirmation" type="password" show-password-on="click" /></NFormItem>
      <NButton type="primary" block attr-type="submit" :loading="passwordLoading">保存并重新登录</NButton>
    </NForm>
  </NModal>
</template>
