<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
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
import CommentRelation from '../components/CommentRelation.vue'
import PagedFooter from '../components/PagedFooter.vue'
import TableTools from '../components/TableTools.vue'
import { useColumnSettings } from '../composables/useColumnSettings'
import { usePagedQuery } from '../composables/usePagedQuery'
import { usePreferencesStore } from '../stores/preferences'
import type { PageData, Pagination, PostDetailRecord, PostInteractionRecord, PostRecord } from '../types/api'

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
const { page, pageSize, total, applyPagination, pageParams, resetPage } = usePagedQuery()
const showInteractions = ref(false)
const interactionType = ref<'views' | 'favorites' | 'comments'>('views')
const interactionTitle = ref('')
const interactionPostID = ref('')
const interactionRows = ref<PostInteractionRecord[]>([])
const interactionLoading = ref(false)
const {
  page: interactionPage,
  pageSize: interactionPageSize,
  total: interactionTotal,
  applyPagination: applyInteractionPagination,
  pageParams: interactionPageParams,
  resetPage: resetInteractionPage,
} = usePagedQuery(20)
const showDetail = ref(false)
const detailLoading = ref(false)
const detail = ref<PostDetailRecord | null>(null)
const previewImage = ref('')
const showImagePreview = ref(false)
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
  const actions = [
    h(NButton, { size: 'small', secondary: true, onClick: () => openDetail(row) }, { default: () => '详情' }),
  ]
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
  return actions
}

const sourceColumns = computed<DataTableColumns<PostRecord>>(() => [
  {
    title: '标题',
    key: 'title',
    minWidth: 220,
    render: (row) => h('div', { class: 'post-title-cell' }, [
      h('strong', { class: 'post-title-link', onClick: () => openDetail(row) }, row.title),
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
  { title: '发布时间', key: 'publishedAt', width: 180, sorter: true, render: (row) => row.publishedAt ?? row.createdAt },
  {
    title: '操作',
    key: 'actions',
    width: 320,
    fixed: 'right',
    render: (row) => h(NSpace, { size: 8 }, { default: () => actionButtons(row) }),
  },
])

const {
  settings: columnSettings,
  columns,
  reset: resetColumns,
  setVisible,
  setFixed,
  move,
} = useColumnSettings('posts', sourceColumns)

// load applies keyword and moderation filters to the post query.
async function load(): Promise<void> {
  loading.value = true
  try {
    const query = pageParams({
      title: title.value.trim(),
      publisher: publisher.value.trim(),
      authorType: authorType.value,
      moderationStatus: moderationStatus.value,
      sortBy: sortBy.value || undefined,
      sortOrder: sortBy.value ? sortOrder.value : undefined,
    })
    const data = await request<PageData<PostRecord>>(`/posts?${query.toString()}`)
    rows.value = data.list
    applyPagination(data.pagination)
  } finally {
    loading.value = false
  }
}

function search(): void {
  resetPage()
  void load()
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
  resetPage()
  void load()
}
async function openInteractions(row: PostRecord, type: 'views' | 'favorites' | 'comments'): Promise<void> {
  interactionPostID.value = row.id
  interactionTitle.value = row.title
  interactionType.value = type
  resetInteractionPage()
  showInteractions.value = true
  await loadInteractions()
}

async function openDetail(row: PostRecord): Promise<void> {
  showDetail.value = true
  detailLoading.value = true
  detail.value = null
  try {
    detail.value = await request<PostDetailRecord>(`/posts/${row.id}`)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载帖子详情失败')
    showDetail.value = false
  } finally {
    detailLoading.value = false
  }
}

async function changeInteractionTab(type: 'views' | 'favorites' | 'comments'): Promise<void> {
  interactionType.value = type
  resetInteractionPage()
  await loadInteractions()
}

// loadInteractions refreshes the selected interaction tab.
async function loadInteractions(): Promise<void> {
  if (!interactionPostID.value) return
  interactionLoading.value = true
  try {
    const query = interactionPageParams({ type: interactionType.value })
    const result = await request<{
      list: PostInteractionRecord[]
      pagination: Pagination
    }>(`/posts/${interactionPostID.value}/interactions?${query.toString()}`)
    interactionRows.value = result.list
    applyInteractionPagination(result.pagination)
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
      <!-- <div><h1>帖子管理</h1><p class="page-description">审核社区内容、发布官方帖子并管理首页置顶。</p></div> -->
      <NButton type="primary" @click="showOfficial = true">发布官方帖子</NButton>
    </NSpace>
    <NCard>
      <NSpace class="toolbar" justify="space-between" align="center">
        <NSpace align="center">
          <NInput v-model:value="title" clearable placeholder="按标题模糊搜索" @keyup.enter="search" />
          <NInput v-model:value="publisher" clearable placeholder="按发布人模糊搜索" @keyup.enter="search" />
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
          <NButton type="primary" @click="search">查询</NButton>
        </NSpace>
        <TableTools
          :settings="columnSettings"
          :loading="loading"
          @refresh="load"
          @reset="resetColumns"
          @update:visible="setVisible"
          @update:fixed="setFixed"
          @move="move"
        />
      </NSpace>
      <NDataTable :columns="columns" :data="rows" :loading="loading" :size="preferences.tableSize" :row-key="(row: PostRecord) => row.id" :scroll-x="1450" remote @update:sorter="updateSorter" />
      <PagedFooter v-model:page="page" v-model:page-size="pageSize" :total="total" @change="load" />
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

    <NModal
      v-model:show="showDetail"
      preset="card"
      title="帖子详情"
      class="modal-card modal-card--wide"
      :bordered="false"
    >
      <div v-if="detailLoading" class="role-empty">加载中…</div>
      <div v-else-if="detail" class="post-detail">
        <h2 class="post-detail__title">{{ detail.title }}</h2>
        <div class="post-detail__meta">
          <span>发布人：{{ detail.publisher.name }}</span>
          <span>发布时间：{{ detail.publishedAt ?? detail.createdAt }}</span>
          <span>浏览 {{ detail.viewCount }} · 评论 {{ detail.commentCount }} · 收藏 {{ detail.favoriteCount }}</span>
        </div>
        <NSpace>
          <NTag :type="publicationLabels[detail.publicationStatus]?.type ?? 'default'" :bordered="false" size="small">
            {{ publicationLabels[detail.publicationStatus]?.label ?? '未知发布状态' }}
          </NTag>
          <NTag :type="moderationLabels[detail.moderationStatus]?.type ?? 'default'" :bordered="false" size="small">
            {{ moderationLabels[detail.moderationStatus]?.label ?? '未知审核状态' }}
          </NTag>
          <NTag v-if="detail.isOfficial" type="info" :bordered="false" size="small">官方</NTag>
          <NTag v-if="detail.isPinned" type="warning" :bordered="false" size="small">置顶</NTag>
        </NSpace>
        <p class="post-detail__body">{{ detail.contentText || detail.summary || '（无正文）' }}</p>
        <div v-if="detail.images.length" class="post-detail__images">
          <img
            v-for="image in detail.images"
            :key="image.id"
            class="post-detail__image"
            :src="image.url"
            :alt="image.originalName || '帖子图片'"
            loading="lazy"
            @click="previewImage = image.url; showImagePreview = true"
          />
        </div>
      </div>
    </NModal>

    <NModal v-model:show="showImagePreview" preset="card" title="图片预览" class="modal-card modal-card--wide">
      <img v-if="previewImage" :src="previewImage" alt="预览" style="display:block;max-width:100%;max-height:70vh;margin:0 auto;border-radius:12px;" />
    </NModal>

    <NModal
      v-model:show="showInteractions"
      preset="card"
      :title="`《${interactionTitle}》互动明细`"
      class="modal-card modal-card--interactions"
    >
      <div class="interaction-modal">
        <NTabs :value="interactionType" @update:value="changeInteractionTab">
          <NTabPane name="views" tab="浏览记录" />
          <NTabPane name="favorites" tab="收藏记录" />
          <NTabPane name="comments" tab="评论记录" />
        </NTabs>
        <div class="interaction-modal__body">
          <NDataTable
            :loading="interactionLoading"
            :data="interactionRows"
            :columns="[
              { title: '用户', key: 'userName', width: 140 },
              ...(interactionType === 'comments'
                ? [{
                    title: '评论',
                    key: 'content',
                    minWidth: 280,
                    render: (row: PostInteractionRecord) => h(CommentRelation, {
                      content: row.content || '',
                      replyContent: row.replyTarget?.content || '',
                      replyAuthor: row.replyTarget?.userNickname || '',
                      maxWidth: '100%',
                    }),
                  }]
                : []),
              { title: '时间', key: 'createdAt', width: 180, render: (row: PostInteractionRecord) => row.createdAt },
            ]"
            :row-key="(row: PostInteractionRecord) => row.id"
            :size="preferences.tableSize"
            flex-height
            style="height: 100%"
          />
        </div>
        <PagedFooter
          v-model:page="interactionPage"
          v-model:page-size="interactionPageSize"
          :total="interactionTotal"
          @change="loadInteractions"
        />
      </div>
    </NModal>
  </section>
</template>
