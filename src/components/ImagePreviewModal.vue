<script setup lang="ts">
import { NModal } from 'naive-ui'

defineProps<{
  show: boolean
  src: string
  title?: string
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()
</script>

<template>
  <NModal
    :show="show"
    preset="card"
    :title="title || '图片预览'"
    class="modal-card image-preview-modal"
    @update:show="emit('update:show', $event)"
  >
    <div class="image-preview-modal__body">
      <img
        v-if="src"
        :src="src"
        :alt="title || 'preview'"
        class="image-preview-modal__img"
      >
    </div>
  </NModal>
</template>
