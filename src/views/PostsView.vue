<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue'
import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NSelect,
  NSpace,
  NSwitch,
  NTabPane,
  NTabs,
  NTag,
  useDialog,
  useMessage,
  type DataTableColumns,
  type DataTableSortState,
} from 'naive-ui'
import { request } from '../api/client'
import { usePreferencesStore } from '../stores/preferences'
import type { PageData, PostInteractionRecord, PostRecord } from '../types/api'

type ReasonAction = 'reject' | 'offline'

const publicationLabels: Record<number, { label: string; type: 'default' | 'info' | 'success' | 'warning' | 'error' }> = {
  0: { label: '草稿', type: 'default' },
  1: { label: '仅自己可见', type: 'info' },
  2: { label: '公开发布', type: 'success' },
  3: { label: '已下架', type: 'error' },
}
const moderationLabels: Record<number, { label: string; type: 'default' | 'success' | 'warning' }> = {
  0: { label: '待审核', type: 'warning' },
  1: { label: '审核通过', type: 'success' },
  2: { label: '审核驳回', type: 'default' },
}

const message = useMessage()
const dialog = useDialog()
const preferences = usePreferencesStore()
const rows = ref<PostRecord[]>([])
const loading = ref(false)
const title = ref('')
const publisher = ref('')
const authorType = ref<'user' | 'official' | null>(null)
const moderationStatus = ref<number | null>(null)
const sortBy = ref('')
const sortOrder = ref<'asc' | 'desc'>('desc')
const showInteractions = ref(false)
const interactionType = ref<'views' | 'favorites' | 'comments'>('views')
const interactionTitle = ref('')
const interactionPostID = ref('')
const interactionRows = ref<PostInteractionRecord[]>([])
const interactionLoading = ref(false)
const showOfficial = ref(false)
const showReason = ref(false)
const reason = ref('')
const reasonAction = ref<ReasonAction>('reject')
const actionRow = ref<PostRecord | null>(null)
const officialForm = reactive({ title: '', body: '', isPinned: false })

// countButton opens the matching post interaction list.
function countButton(row: PostRecord, type: 'views' | 'favorites' | 'comments', count: number) {
  return h(NButton, { text: true, type: 'primary', onClick: () => openInteractions(row, type) }, { default: () => String(count) })
}

// statusTag renders centralized status text instead of raw enum values.
function statusTag(value: number, labels: typeof publicationLabels | typeof moderationLabels) {
  const item = labels[value] ?? { label: '未知状态', type: 'default' as const }
  return h(NTag, { type: item.type, bordered: false, size: 'small' }, { default: () => item.label })
}

// actionButtons returns only operations valid for the current post lifecycle.
function actionButtons(row: PostRecord) {
  const actions = []
  if (row.moderationStatus === 0) {
    actions.push(h(NButton, { size: 'small', type: 'success', onClick: () => approve(row) }, { default: () => '通过' }))
    actions.push(h(NButton, { size: 'small', type: 'warning', onClick: () => openReason(row, 'reject') }, { default: () => '驳回' }))
  }
  if (row.moderationStatus === 1 && row.publicationStatus === 2) {
    actions.push(h(NButton, { size: 'small', type: row.isPinned ? 'default' : 'primary', secondary: true, onClick: () => updatePin(row) }, { default: () => (row.isPinned ? '取消置顶' : '置顶') }))
    actions.push(h(NButton, { size: 'small', type: 'error', secondary: true, onClick: () => openReason(row, 'offline') }, { default: () => '下架' }))
  }
  if (row.moderationStatus === 1 && row.publicationStatus === 3) {
    actions.push(h(NButton, { size: 'small', type: 'success', secondary: true, onClick: () => restore(row) }, { default: () => '恢复' }))
  }
  return actions.length ? actions : [h('span', { class: 'muted-action' }, '暂无可用操作')]
}

const columns: DataTableColumns<PostRecord> = [
  {
    title: '标题',
    key: 'title',
    minWidth: 220,
    render: (row) => h('div', { class: 'post-title-cell' }, [
      h('strong', row.title),
      row.isOfficial ? h(NTag, { type: 'info', bordered: false, size: 'small' }, { default: () => '官方' }) : null,
      row.isPinned ? h(NTag, { type: 'warning', bordered: false, size: 'small' }, { default: () => '置顶' }) : null,
    ]),
  },
  { title: '发布人', key: 'publisher', width: 140, render: (row) => h(NSpace, { size: 6 }, { default: () => [h('span', row.publisher.name), row.publisher.type === 'official' ? h(NTag, { size: 'small', type: 'info', bordered: false }, { default: () => '官方' }) : null] }) },
  { title: '浏览数', key: 'viewCount', width: 90, sorter: true, render: (row) => countButton(row, 'views', row.viewCount) },
  { title: '评论数', key: 'commentCount', width: 90, sorter: true, render: (row) => countButton(row, 'comments', row.commentCount) },
  { title: '收藏数', key: 'favoriteCount', width: 90, sorter: true, render: (row) => countButton(row, 'favorites', row.favoriteCount) },
  { title: '发布状态', key: 'publicationStatus', width: 120, render: (row) => statusTag(row.publicationStatus, publicationLabels) },
  { title: '审核状态', key: 'moderationStatus', width: 120, render: (row) => statusTag(row.moderationStatus, moderationLabels) },
  { title: '发布时间', key: 'publishedAt', width: 180, sorter: true, render: (row) => new Date(row.publishedAt ?? row.createdAt).toLocaleString() },
  {
    title: '操作',
    key: 'actions',
    width: 280,
    render: (row) => h(NSpace, { size: 8 }, { default: () => actionButtons(row) }),
  },
]

// load applies keyword and moderation filters to the post query.
async function load(): Promise<void> {
  loading.value = true
  try {
    const query = new URLSearchParams()
    if (title.value.trim()) query.set('title', title.value.trim())
    if (publisher.value.trim()) query.set('publisher', publisher.value.trim())
    if (authorType.value) query.set('authorType', authorType.value)
    if (moderationStatus.value !== null) query.set('moderationStatus', String(moderationStatus.value))
    if (sortBy.value) {
      query.set('sortBy', sortBy.value)
      query.set('sortOrder', sortOrder.value)
    }
    rows.value = (await request<PageData<PostRecord>>(`/posts?${query.toString()}`)).list
  } finally {
    loading.value = false
  }
}

// updateSorter maps only supported remote table sort states into API query values.
function updateSorter(sorter: DataTableSortState | DataTableSortState[] | null): void {
  const active = Array.isArray(sorter) ? sorter[0] : sorter
  if (!active?.order) {
    sortBy.value = ''
    sortOrder.value = 'desc'
  } else {
    sortBy.value = String(active.columnKey)
    sortOrder.value = active.order === 'ascend' ? 'asc' : 'desc'
  }
  void load()
}

// openInteractions opens one post's views, favorites, or comments.
async function openInteractions(row: PostRecord, type: 'views' | 'favorites' | 'comments'): Promise<void> {
  interactionPostID.value = row.id
  interactionTitle.value = row.title
  interactionType.value = type
  showInteractions.value = true
  await loadInteractions()
}

// loadInteractions refreshes the selected interaction tab.
async function loadInteractions(): Promise<void> {
  if (!interactionPostID.value) return
  interactionLoading.value = true
  try {
    const result = await request<{ list: PostInteractionRecord[] }>(`/posts/${interactionPostID.value}/interactions?type=${interactionType.value}&pageSize=100`)
    interactionRows.value = result.list
  } finally {
    interactionLoading.value = false
  }
}

// approve confirms a pending post and marks it approved.
function approve(row: PostRecord): void {
  dialog.success({
    title: '通过审核',
    content: `确认通过《${row.title}》的审核？`,
    positiveText: '确认通过',
    negativeText: '取消',
    onPositiveClick: () => moderate(row, 1),
  })
}

// openReason opens the required-reason workflow for rejection or takedown.
function openReason(row: PostRecord, action: ReasonAction): void {
  actionRow.value = row
  reasonAction.value = action
  reason.value = ''
  showReason.value = true
}

// submitReason completes a rejection or takedown with an audit reason.
async function submitReason(): Promise<void> {
  if (!reason.value.trim() || !actionRow.value) {
    message.warning('请填写操作原因')
    return
  }
  if (reasonAction.value === 'reject') {
    await moderate(actionRow.value, 2, undefined, reason.value)
  } else {
    await moderate(actionRow.value, 1, 3, reason.value)
  }
  showReason.value = false
}

// moderate updates the post lifecycle and refreshes the table.
async function moderate(row: PostRecord, moderation: number, publication?: number, operationReason = ''): Promise<void> {
  await request(`/posts/${row.id}/moderation`, {
    method: 'PUT',
    body: JSON.stringify({ moderationStatus: moderation, publicationStatus: publication, reason: operationReason }),
  })
  message.success('帖子状态已更新')
  await load()
}

// restore brings an approved offline post back to public visibility.
async function restore(row: PostRecord): Promise<void> {
  await moderate(row, 1, 2)
}

// updatePin toggles pinned state only for public approved posts.
async function updatePin(row: PostRecord): Promise<void> {
  await request(`/posts/${row.id}/pin`, {
    method: 'PUT',
    body: JSON.stringify({ isPinned: !row.isPinned }),
  })
  message.success(row.isPinned ? '已取消置顶' : '帖子已置顶')
  await load()
}

// createOfficialPost converts plain paragraphs into the shared Tiptap JSON contract.
async function createOfficialPost(): Promise<void> {
  const paragraphs = officialForm.body.split(/\n+/).filter(Boolean).map((text) => ({
    type: 'paragraph',
    content: [{ type: 'text', text }],
  }))
  if (!officialForm.title.trim() || !paragraphs.length) {
    message.warning('请填写标题和正文')
    return
  }
  await request('/posts', {
    method: 'POST',
    body: JSON.stringify({
      title: officialForm.title,
      content: { type: 'doc', content: paragraphs },
      isPinned: officialForm.isPinned,
    }),
  })
  message.success('官方帖子已发布')
  showOfficial.value = false
  Object.assign(officialForm, { title: '', body: '', isPinned: false })
  await load()
}

onMounted(load)
</script>

<template>
  <section>
    <NSpace justify="space-between" align="center">
      <div><h1>帖子管理</h1><p class="page-description">审核社区内容、发布官方帖子并管理首页置顶。</p></div>
      <NButton type="primary" @click="showOfficial = true">发布官方帖子</NButton>
    </NSpace>
    <NCard>
      <NSpace class="toolbar" align="center">
        <NInput v-model:value="title" clearable placeholder="按标题模糊搜索" @keyup.enter="load" />
        <NInput v-model:value="publisher" clearable placeholder="按发布人模糊搜索" @keyup.enter="load" />
        <NSelect
          v-model:value="authorType"
          clearable
          style="width: 150px"
          placeholder="全部发布来源"
          :options="[{ label: '用户发布', value: 'user' }, { label: '官方发布', value: 'official' }]"
        />
        <NSelect
          v-model:value="moderationStatus"
          clearable
          style="width: 180px"
          placeholder="全部审核状态"
          :options="[
            { label: '待审核', value: 0 },
            { label: '审核通过', value: 1 },
            { label: '审核驳回', value: 2 },
          ]"
        />
        <NButton type="primary" @click="load">查询</NButton>
      </NSpace>
      <NDataTable :columns="columns" :data="rows" :loading="loading" :size="preferences.tableSize" :row-key="(row: PostRecord) => row.id" :scroll-x="1450" remote @update:sorter="updateSorter" />
    </NCard>

    <NModal v-model:show="showOfficial" preset="card" title="发布官方帖子" class="modal-card modal-card--wide">
      <NForm @submit.prevent="createOfficialPost">
        <NFormItem label="标题" required><NInput v-model:value="officialForm.title" maxlength="200" show-count /></NFormItem>
        <NFormItem label="正文" required>
          <NInput v-model:value="officialForm.body" type="textarea" :autosize="{ minRows: 8, maxRows: 16 }" placeholder="每个自然段会转换为安全的富文本段落" />
        </NFormItem>
        <NFormItem label="发布后置顶"><NSwitch v-model:value="officialForm.isPinned" /></NFormItem>
        <NButton type="primary" block attr-type="submit">立即发布</NButton>
      </NForm>
    </NModal>

    <NModal v-model:show="showReason" preset="card" :title="reasonAction === 'reject' ? '驳回帖子' : '下架帖子'" class="modal-card">
      <NForm @submit.prevent="submitReason">
        <NFormItem label="原因" required>
          <NInput v-model:value="reason" type="textarea" :autosize="{ minRows: 4, maxRows: 8 }" placeholder="该原因将写入审核记录并通知作者" />
        </NFormItem>
        <NButton :type="reasonAction === 'reject' ? 'warning' : 'error'" block attr-type="submit">确认操作</NButton>
      </NForm>
    </NModal>

    <NModal v-model:show="showInteractions" preset="card" :title="`《${interactionTitle}》互动明细`" class="modal-card modal-card--wide">
      <NTabs v-model:value="interactionType" @update:value="loadInteractions">
        <NTabPane name="views" tab="浏览记录" />
        <NTabPane name="favorites" tab="收藏记录" />
        <NTabPane name="comments" tab="评论记录" />
      </NTabs>
      <NDataTable
        :loading="interactionLoading"
        :data="interactionRows"
        :columns="[
          { title: '用户', key: 'userName', width: 160 },
          ...(interactionType === 'comments' ? [{ title: '评论内容', key: 'content', ellipsis: { tooltip: true } }] : []),
          { title: '时间', key: 'createdAt', width: 200, render: (row: PostInteractionRecord) => new Date(row.createdAt).toLocaleString() },
        ]"
        :row-key="(row: PostInteractionRecord) => row.id"
      />
    </NModal>
  </section>
</template>
