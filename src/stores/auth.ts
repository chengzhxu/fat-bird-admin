import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { request, setAccessToken } from '../api/client'
import type { AdminMenu, AuthUser } from '../types/api'

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref<AuthUser | null>(null)
  const menus = ref<AdminMenu[]>([])
  const initialized = ref(false)
  const isAuthenticated = computed(() => currentUser.value !== null)

  async function login(username: string, password: string): Promise<void> {
    const session = await request<{
      accessToken: string
      mustChangePassword: boolean
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
    setAccessToken(session.accessToken)
    await loadCurrentUser()
  }

  async function loadCurrentUser(): Promise<void> {
    try {
      currentUser.value = await request<AuthUser>('/auth/me')
      if (!currentUser.value.mustChangePassword) {
        menus.value = (await request<{ list: AdminMenu[] }>('/menus/current')).list
      } else {
        menus.value = []
      }
    } finally {
      initialized.value = true
    }
  }

  async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await request('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ oldPassword, newPassword }),
    })
    currentUser.value = null
    menus.value = []
    setAccessToken('')
  }

  async function logout(): Promise<void> {
    try {
      await request('/auth/logout', { method: 'POST' })
    } finally {
      currentUser.value = null
      menus.value = []
      setAccessToken('')
    }
  }

  return { currentUser, menus, initialized, isAuthenticated, login, loadCurrentUser, changePassword, logout }
})
