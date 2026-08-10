<script setup lang="ts">
import { computed, h, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import {
  NBreadcrumb,
  NBreadcrumbItem,
  NButton,
  NCard,
  NConfigProvider,
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
  NTooltip,
  useDialog,
  useMessage,
  type DropdownOption,
  type MenuOption,
} from 'naive-ui'
import { useAuthStore } from '../stores/auth'
import { usePreferencesStore } from '../stores/preferences'
import type { AdminMenu } from '../types/api'
import {
  IconClose,
  IconCloseOthers,
  IconFullscreen,
  IconFullscreenExit,
  IconMenu,
  IconPinLeft,
  IconPinRight,
  IconRefresh,
  IconSettings,
  dropdownIcon,
  renderMenuIcon,
} from '../utils/icons'

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
const viewKey = ref(0)
const tabMenuX = ref(0)
const tabMenuY = ref(0)
const tabMenuShow = ref(false)
const tabMenuTarget = ref<PageTab | null>(null)
const siderCollapsed = ref(false)
const isFullscreen = ref(false)

function menuOption(menu: AdminMenu): MenuOption {
  return {
    key: menu.route,
    label: menu.children.length ? menu.name : () => h(RouterLink, { to: menu.route }, { default: () => menu.name }),
    icon: renderMenuIcon(menu.icon),
    children: menu.children.length ? menu.children.map(menuOption) : undefined,
  }
}

const menuItems = computed<MenuOption[]>(() => auth.menus.map(menuOption))

const breadcrumbItems = computed(() => {
  const values = ['首页']
  if (route.meta.group) values.push(String(route.meta.group))
  if (route.meta.title) values.push(String(route.meta.title))
  return values
})

// Sider always light background (independent of global theme).

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

async function closeTab(name: string | number): Promise<void> {
  const path = String(name)
  if (path === '/dashboard') return
  const index = tabs.value.findIndex((item) => item.path === path)
  if (index < 0) return
  tabs.value = tabs.value.filter((item) => item.path !== path)
  if (route.path === path) {
    const target = tabs.value[Math.max(0, index - 1)]?.path ?? '/dashboard'
    await router.push(target)
  }
}

function refreshCurrentTab(): void {
  viewKey.value += 1
  message.success('已刷新当前页面')
}

async function closeOtherTabs(targetPath = route.path): Promise<void> {
  tabs.value = tabs.value.filter((item) => item.path === targetPath || item.path === '/dashboard')
  if (route.path !== targetPath) await router.push(targetPath)
}

async function closeTabsToSide(side: 'left' | 'right', targetPath = route.path): Promise<void> {
  const index = tabs.value.findIndex((item) => item.path === targetPath)
  if (index < 0) return
  tabs.value = tabs.value.filter((item, i) => {
    if (item.path === '/dashboard') return true
    return side === 'left' ? i >= index : i <= index
  })
  if (!tabs.value.some((item) => item.path === route.path)) {
    await router.push(targetPath)
  }
}

const tabActionOptions = computed<DropdownOption[]>(() => [
  { label: '刷新当前', key: 'refresh', icon: dropdownIcon(IconRefresh) },
  { label: '关闭当前', key: 'close-current', icon: dropdownIcon(IconClose) },
  { label: '关闭其他', key: 'close-others', icon: dropdownIcon(IconCloseOthers) },
  { label: '关闭左侧', key: 'close-left', icon: dropdownIcon(IconPinLeft) },
  { label: '关闭右侧', key: 'close-right', icon: dropdownIcon(IconPinRight) },
  { type: 'divider', key: 'd1' },
  { label: '关闭全部', key: 'close-all', icon: dropdownIcon(IconCloseOthers) },
])

async function handleTabAction(key: string, targetPath = route.path): Promise<void> {
  tabMenuShow.value = false
  if (key === 'refresh') {
    if (route.path !== targetPath) await router.push(targetPath)
    refreshCurrentTab()
    return
  }
  if (key === 'close-current') {
    await closeTab(targetPath)
    return
  }
  if (key === 'close-others') {
    await closeOtherTabs(targetPath)
    return
  }
  if (key === 'close-left') {
    await closeTabsToSide('left', targetPath)
    return
  }
  if (key === 'close-right') {
    await closeTabsToSide('right', targetPath)
    return
  }
  if (key === 'close-all') {
    tabs.value = tabs.value.filter((item) => item.path === '/dashboard')
    await router.push('/dashboard')
  }
}

function openTabContextMenu(event: MouseEvent, tab: PageTab): void {
  event.preventDefault()
  tabMenuTarget.value = tab
  tabMenuX.value = event.clientX
  tabMenuY.value = event.clientY
  tabMenuShow.value = true
}

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

function handleUserAction(key: string): void {
  if (key === 'profile') profileVisible.value = true
  if (key === 'password') passwordVisible.value = true
  if (key === 'logout') confirmLogout()
}

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

async function toggleFullscreen(): Promise<void> {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen()
    return
  }
  await document.exitFullscreen()
}

function syncFullscreen(): void {
  isFullscreen.value = Boolean(document.fullscreenElement)
}

onMounted(() => {
  document.addEventListener('fullscreenchange', syncFullscreen)
})
onUnmounted(() => {
  document.removeEventListener('fullscreenchange', syncFullscreen)
})
</script>

<template>
  <NLayout class="admin-shell" :has-sider="preferences.layout === 'side'">
    <NLayoutSider
      v-if="preferences.layout === 'side'"
      class="admin-sider"
      bordered
      collapse-mode="width"
      :collapsed="siderCollapsed"
      :collapsed-width="72"
      :width="236"
      show-trigger="bar"
      @update:collapsed="(value) => (siderCollapsed = value)"
    >
      <NConfigProvider :theme="null">
        <RouterLink to="/dashboard" class="brand brand--admin" aria-label="Fat Bird 管理后台">
          <img class="brand__image" src="/fatBird-admin-horizontal.png" alt="Fat Bird 管理后台">
          <img class="brand__collapsed-logo" src="/logoAdmin-tight.png" alt="">
        </RouterLink>
        <NMenu
          class="admin-menu"
          :value="route.path"
          :collapsed="siderCollapsed"
          :collapsed-width="72"
          :collapsed-icon-size="20"
          :options="menuItems"
          :indent="22"
        />
      </NConfigProvider>
    </NLayoutSider>

    <NLayout>
      <NLayoutHeader bordered class="admin-header">
        <div class="header-left">
          <template v-if="preferences.layout === 'side'">
            <NTooltip>
              <template #trigger>
                <NButton quaternary circle class="header-icon-btn" @click="siderCollapsed = !siderCollapsed">
                  <IconMenu :size="18" />
                </NButton>
              </template>
              {{ siderCollapsed ? '展开菜单' : '收起菜单' }}
            </NTooltip>
          </template>
          <NTooltip>
            <template #trigger>
              <NButton quaternary circle class="header-icon-btn" @click="refreshCurrentTab">
                <IconRefresh :size="17" />
              </NButton>
            </template>
            刷新页面
          </NTooltip>
          <div v-if="preferences.layout === 'top'" class="header-brand-menu">
            <RouterLink to="/dashboard" class="brand brand--top" aria-label="Fat Bird 管理后台">
              <img class="brand__image" src="/fatBird-admin-horizontal.png" alt="Fat Bird 管理后台">
            </RouterLink>
            <NMenu mode="horizontal" :value="route.path" :options="menuItems" />
          </div>
        </div>

        <NSpace align="center" :wrap="false" :size="8">
          <NTooltip>
            <template #trigger>
              <NButton quaternary circle class="header-icon-btn" @click="toggleFullscreen">
                <IconFullscreenExit v-if="isFullscreen" :size="17" />
                <IconFullscreen v-else :size="17" />
              </NButton>
            </template>
            {{ isFullscreen ? '退出全屏' : '全屏' }}
          </NTooltip>
          <NTooltip>
            <template #trigger>
              <NButton quaternary circle class="header-icon-btn" @click="settingsVisible = true">
                <IconSettings :size="17" />
              </NButton>
            </template>
            界面设置
          </NTooltip>
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
              <span class="user-name">{{ auth.currentUser?.nickname || auth.currentUser?.username }}</span>
              <span class="dropdown-caret" aria-hidden="true" />
            </NButton>
          </NDropdown>
        </NSpace>
      </NLayoutHeader>

      <div v-if="preferences.showBreadcrumb" class="breadcrumb-bar">
        <NBreadcrumb>
          <NBreadcrumbItem v-for="item in breadcrumbItems" :key="item">{{ item }}</NBreadcrumbItem>
        </NBreadcrumb>
      </div>

      <div v-if="preferences.showTabs" class="page-tabs-row">
        <NTabs
          class="page-tabs"
          type="card"
          :value="route.path"
          @update:value="(value) => router.push(String(value))"
          @close="closeTab"
        >
          <NTab
            v-for="tab in tabs"
            :key="tab.path"
            :name="tab.path"
            :closable="tab.path !== '/dashboard'"
            @contextmenu="openTabContextMenu($event, tab)"
          >
            {{ tab.title }}
          </NTab>
        </NTabs>
        <NDropdown trigger="click" :options="tabActionOptions" @select="(key) => handleTabAction(String(key))">
          <NButton quaternary size="small" class="tab-ops-btn" title="标签页操作">⋯</NButton>
        </NDropdown>
      </div>

      <NDropdown
        placement="bottom-start"
        trigger="manual"
        :x="tabMenuX"
        :y="tabMenuY"
        :show="tabMenuShow"
        :options="tabActionOptions"
        @clickoutside="tabMenuShow = false"
        @select="(key) => handleTabAction(String(key), tabMenuTarget?.path ?? route.path)"
      />

      <NLayoutContent class="admin-content">
        <RouterView :key="`${route.path}-${viewKey}`" />
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
