<script setup lang="ts">
import { computed, h, onMounted, ref } from "vue";
import {
  NButton,
  NCard,
  NDataTable,
  NSpace,
  NTag,
  useMessage,
  type DataTableColumns,
} from "naive-ui";
import ImagePreviewModal from "../components/ImagePreviewModal.vue";
import PagedFooter from "../components/PagedFooter.vue";
import TableTools from "../components/TableTools.vue";
import { request } from "../api/client";
import { useColumnSettings } from "../composables/useColumnSettings";
import { usePagedQuery } from "../composables/usePagedQuery";
import { usePreferencesStore } from "../stores/preferences";
import type { FileRecord, PageData } from "../types/api";

const fileStatus: Record<number, string> = {
  0: "待上传",
  1: "正常",
  2: "待删除",
  3: "已删除",
  4: "处理失败",
};
const message = useMessage();
const preferences = usePreferencesStore();
const rows = ref<FileRecord[]>([]);
const loading = ref(false);
const previewVisible = ref(false);
const previewSrc = ref("");
const previewTitle = ref("");
const { page, pageSize, total, applyPagination, pageParams } = usePagedQuery();

function isImage(row: FileRecord): boolean {
  return row.status === 1 && row.mimeType.startsWith("image/");
}

function openPreview(row: FileRecord): void {
  if (!isImage(row)) return;
  if (!row.previewUrl) {
    message.warning("预览地址不可用，请确认对象存储服务已启动后刷新列表");
    return;
  }
  previewSrc.value = row.previewUrl;
  previewTitle.value = row.originalName;
  previewVisible.value = true;
}

const sourceColumns = computed<DataTableColumns<FileRecord>>(() => [
  // { title: "ID", key: "id", width: 100 },
  {
    title: "文件名",
    key: "originalName",
    minWidth: 200,
    ellipsis: { tooltip: true },
    render: (row) =>
      isImage(row) && row.previewUrl
        ? h(
            "button",
            {
              type: "button",
              class: "file-name-link",
              onClick: () => openPreview(row),
            },
            row.originalName,
          )
        : row.originalName,
  },
  { title: "MIME", key: "mimeType", width: 140 },
  {
    title: "大小",
    key: "sizeBytes",
    width: 100,
    render: (row) => `${(row.sizeBytes / 1024).toFixed(1)} KB`,
  },
  { title: "用途", key: "fileRole", width: 100, render: () => "帖子图片" },
  {
    title: "状态",
    key: "status",
    width: 100,
    render: (row) =>
      h(
        NTag,
        { type: row.status === 1 ? "success" : "default", bordered: false },
        { default: () => fileStatus[row.status] ?? "未知状态" },
      ),
  },
  {
    title: "创建时间",
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
      isImage(row)
        ? h(
            NButton,
            {
              size: "small",
              type: "primary",
              text: true,
              disabled: !row.previewUrl,
              onClick: () => openPreview(row),
            },
            { default: () => "查看" },
          )
        : h("span", { class: "muted-action" }, "—"),
  },
]);

const {
  settings: columnSettings,
  columns,
  reset: resetColumns,
  setVisible,
  setFixed,
  move,
} = useColumnSettings("files", sourceColumns);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const data = await request<PageData<FileRecord>>(
      `/files?${pageParams().toString()}`,
    );
    rows.value = data.list;
    applyPagination(data.pagination);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section>
    <NCard>
      <NSpace class="toolbar" justify="end">
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
        :row-key="(row: FileRecord) => row.id"
        :scroll-x="980"
      />
      <PagedFooter
        v-model:page="page"
        v-model:page-size="pageSize"
        :total="total"
        @change="load"
      />
    </NCard>

    <ImagePreviewModal
      v-model:show="previewVisible"
      :src="previewSrc"
      :title="previewTitle"
    />
  </section>
</template>
