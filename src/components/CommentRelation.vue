<script setup lang="ts">
import { computed } from 'vue'
import EllipsisTooltip from './EllipsisTooltip.vue'

const props = withDefaults(defineProps<{
  content?: string | null
  /** 被回复内容；空则视为对帖评论，仅展示 content */
  replyContent?: string | null
  /** 被回复人昵称 */
  replyAuthor?: string | null
  maxWidth?: string
}>(), {
  content: '',
  replyContent: '',
  replyAuthor: '',
  maxWidth: '420px',
})

const hasReply = computed(() => Boolean(props.replyContent?.trim()))
const replyLabel = computed(() => {
  const text = props.replyContent?.trim() || ''
  const author = props.replyAuthor?.trim()
  return author ? `${text}（${author}）` : text
})
</script>

<template>
  <div class="comment-relation" :class="{ 'comment-relation--solo': !hasReply }" :style="{ maxWidth }">
    <EllipsisTooltip
      class="comment-relation__side"
      :content="content || '—'"
      :max-width="hasReply ? '46%' : '100%'"
    />
    <template v-if="hasReply">
      <span class="comment-relation__arrow" aria-hidden="true">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
          <path d="M3 8h9.5M8.5 4l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </span>
      <EllipsisTooltip class="comment-relation__side comment-relation__reply" :content="replyLabel" max-width="46%" />
    </template>
  </div>
</template>
