<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NCard, NForm, NFormItem, NInput, useMessage } from 'naive-ui'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const message = useMessage()
const loading = ref(false)
const form = reactive({ username: '', password: '' })

async function submit(): Promise<void> {
  loading.value = true
  try {
    await auth.login(form.username, form.password)
    await router.push(auth.currentUser?.mustChangePassword ? '/change-password' : '/dashboard')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <NCard title="Fat Bird 管理后台" class="auth-card">
      <NForm @submit.prevent="submit">
        <NFormItem label="用户名">
          <NInput v-model:value="form.username" autocomplete="username" />
        </NFormItem>
        <NFormItem label="密码">
          <NInput v-model:value="form.password" type="password" show-password-on="click" autocomplete="current-password" />
        </NFormItem>
        <NButton type="primary" block attr-type="submit" :loading="loading">登录</NButton>
      </NForm>
    </NCard>
  </main>
</template>

