<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NAlert, NCard, NGrid, NGridItem, NStatistic } from 'naive-ui'
import { request } from '../api/client'

const stats = ref({ users: 0, posts: 0, comments: 0, pendingPosts: 0 })
const errorMessage = ref('')

// loadDashboard reports infrastructure failures without breaking the application shell.
async function loadDashboard(): Promise<void> {
  try {
    stats.value = await request<typeof stats.value>('/dashboard')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '工作台数据加载失败'
  }
}

onMounted(loadDashboard)
</script>

<template>
  <section>
    <h1>工作台</h1>
    <NAlert v-if="errorMessage" class="form-gap" type="error" title="数据加载失败">{{ errorMessage }}</NAlert>
    <NGrid responsive="screen" :cols="4" :x-gap="16" :y-gap="16">
      <NGridItem><NCard><NStatistic label="用户" :value="stats.users" /></NCard></NGridItem>
      <NGridItem><NCard><NStatistic label="帖子" :value="stats.posts" /></NCard></NGridItem>
      <NGridItem><NCard><NStatistic label="评论" :value="stats.comments" /></NCard></NGridItem>
      <NGridItem><NCard><NStatistic label="待审核" :value="stats.pendingPosts" /></NCard></NGridItem>
    </NGrid>
  </section>
</template>
