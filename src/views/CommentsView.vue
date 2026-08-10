<script setup lang="ts">
import { computed, h, onMounted, ref } from "vue";
import {
  NButton,
  NCard,
  NDataTable,
  NInput,
  NSpace,
  NTag,
  useMessage,
  type DataTableColumns,
} from "naive-ui";
import CommentRelation from "../components/CommentRelation.vue";
import PagedFooter from "../components/PagedFooter.vue";
import TableTools from "../components/TableTools.vue";
import { request } from "../api/client";
import { useColumnSettings } from "../composables/useColumnSettings";
import { usePagedQuery } from "../composables/usePagedQuery";
import { usePreferencesStore } from "../stores/preferences";
import type { PageData } from "../types/api";

interface CommentReplyTarget {
  id: string;
  userId: string;
  userNickname: string;
  content: string;
}

interface CommentRecord {
  id: string;
  postId: string;
  postTitle: string;
  userId: string;
  userNickname: string;
  parentId: string | null;
  depth: number;
  content: string;
  status: number;
  createdAt: string;
  replyTarget: CommentReplyTarget | null;
}

const message = useMessage();
const preferences = usePreferencesStore();
const keyword = ref("");
const rows = ref<CommentRecord[]>([]);
const loading = ref(false);
const { page, pageSize, total, applyPagination, pageParams, resetPage } =
  usePagedQuery();

const sourceColumns = computed<DataTableColumns<CommentRecord>>(() => [
  {
    title: "帖子标题",
    key: "postTitle",
    minWidth: 180,
    ellipsis: { tooltip: true },
  },
  {
    title: "评论人",
    key: "userNickname",
    width: 120,
    render: (row) => row.userNickname || row.userId,
  },
  {
    title: "评论",
    key: "content",
    minWidth: 320,
    render: (row) =>
      h(CommentRelation, {
        content: row.content || "",
        replyContent: row.replyTarget?.content || "",
        replyAuthor: row.replyTarget?.userNickname || "",
        maxWidth: "100%",
      }),
  },
  {
    title: "状态",
    key: "status",
    width: 90,
    render: (row) =>
      h(
        NTag,
        { type: row.status === 1 ? "success" : "warning", bordered: false },
        { default: () => (row.status === 1 ? "正常" : "隐藏") },
      ),
  },
  {
    title: "评论时间",
    key: "createdAt",
    width: 180,
    render: (row) => row.createdAt,
  },
  {
    title: "操作",
    key: "actions",
    width: 100,
    fixed: "right",
    render: (row) =>
      h(
        NButton,
        { size: "small", onClick: () => toggle(row) },
        { default: () => (row.status === 1 ? "下架" : "恢复") },
      ),
  },
]);

const {
  settings: columnSettings,
  columns,
  reset: resetColumns,
  setVisible,
  setFixed,
  move,
} = useColumnSettings("comments", sourceColumns);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const data = await request<PageData<CommentRecord>>(
      `/comments?${pageParams({ keyword: keyword.value.trim() }).toString()}`,
    );
    rows.value = data.list;
    applyPagination(data.pagination);
  } finally {
    loading.value = false;
  }
}

function search(): void {
  resetPage();
  void load();
}

async function toggle(row: CommentRecord): Promise<void> {
  await request(`/comments/${row.id}/status`, {
    method: "PUT",
    body: JSON.stringify({
      status: row.status === 1 ? 0 : 1,
      reason: "后台内容治理",
    }),
  });
  message.success("评论状态已更新");
  await load();
}

onMounted(load);
</script>

<template>
  <section>
    <!-- <h1>评论管理</h1> -->
    <NCard>
      <NSpace class="toolbar" justify="space-between" align="center">
        <NSpace>
          <NInput
            v-model:value="keyword"
            placeholder="搜索评论内容"
            clearable
            @keyup.enter="search"
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
      <NDataTable
        :columns="columns"
        :data="rows"
        :loading="loading"
        :size="preferences.tableSize"
        :row-key="(row: CommentRecord) => row.id"
        :scroll-x="1200"
      />
      <PagedFooter
        v-model:page="page"
        v-model:page-size="pageSize"
        :total="total"
        @change="load"
      />
    </NCard>
  </section>
</template>
