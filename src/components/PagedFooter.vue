<script setup lang="ts">
import { NPagination } from 'naive-ui'

const page = defineModel<number>('page', { required: true })
const pageSize = defineModel<number>('pageSize', { required: true })

defineProps<{
  total: number
  pageSizes?: number[]
}>()

const emit = defineEmits<{
  change: []
}>()

function onUpdatePage(value: number): void {
  page.value = value
  emit('change')
}

function onUpdatePageSize(value: number): void {
  pageSize.value = value
  page.value = 1
  emit('change')
}
</script>

<template>
  <div class="paged-footer">
    <NPagination
      :page="page"
      :page-size="pageSize"
      :item-count="total"
      :page-sizes="pageSizes ?? [10, 20, 50, 100]"
      show-size-picker
      show-quick-jumper
      @update:page="onUpdatePage"
      @update:page-size="onUpdatePageSize"
    />
  </div>
</template>
