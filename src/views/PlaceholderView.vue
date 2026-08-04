<script setup lang="ts">
import { NCard, NEmpty } from 'naive-ui'

defineProps<{ title: string }>()
</script>

<template>
  <section>
    <h1>{{ title }}</h1>
    <NCard><NEmpty description="模块 API 已纳入 V1 契约，页面将在相应实施阶段接入。" /></NCard>
  </section>
</template>

