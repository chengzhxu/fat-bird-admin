<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NAlert, NButton, NCard, NForm, NFormItem, NInput, useMessage } from 'naive-ui'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const message = useMessage()
const loading = ref(false)
const form = reactive({ oldPassword: '', newPassword: '', confirmation: '' })

async function submit(): Promise<void> {
  if (form.newPassword !== form.confirmation) {
    message.error('两次输入的新密码不一致')
    return
  }
  loading.value = true
  try {
    await auth.changePassword(form.oldPassword, form.newPassword)
    message.success('密码修改成功，请重新登录')
    await router.push('/login')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '修改失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <NCard title="修改初始密码" class="auth-card">
      <NAlert type="warning">当前账号使用临时密码，修改完成前不能访问其他管理功能。</NAlert>
      <NForm class="form-gap" @submit.prevent="submit">
        <NFormItem label="当前密码"><NInput v-model:value="form.oldPassword" type="password" /></NFormItem>
        <NFormItem label="新密码"><NInput v-model:value="form.newPassword" type="password" /></NFormItem>
        <NFormItem label="确认新密码"><NInput v-model:value="form.confirmation" type="password" /></NFormItem>
        <NButton type="primary" block attr-type="submit" :loading="loading">保存并重新登录</NButton>
      </NForm>
    </NCard>
  </main>
</template>

