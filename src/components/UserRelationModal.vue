<script setup lang="ts">
import { computed, h, ref, watch } from "vue";
import { NAvatar, NDataTable, NModal, type DataTableColumns } from "naive-ui";
import PagedFooter from "./PagedFooter.vue";
import ImagePreviewModal from "./ImagePreviewModal.vue";
import { request } from "../api/client";
import { usePagedQuery } from "../composables/usePagedQuery";
import { usePreferencesStore } from "../stores/preferences";
import type { PageData, UserFollowRecord } from "../types/api";

const props = defineProps<{
  show: boolean;
  userId: string;
  direction: "following" | "followers";
  title: string;
}>();

const emit = defineEmits<{
  "update:show": [value: boolean];
}>();

const preferences = usePreferencesStore();
const loading = ref(false);
const rows = ref<UserFollowRecord[]>([]);
const previewSrc = ref("");
const previewVisible = ref(false);
const { page, pageSize, total, applyPagination, pageParams, resetPage } =
  usePagedQuery(20);

function openAvatarPreview(url?: string): void {
  if (!url) return;
  previewSrc.value = url;
  previewVisible.value = true;
}

function renderAvatar(row: UserFollowRecord) {
  const label = (row.nickname || row.username || "?").slice(0, 1);
  if (row.avatarUrl) {
    return h("div", { class: "avatar-cell" }, [
      h(
        "button",
        {
          type: "button",
          class: "avatar-thumb avatar-thumb--sm",
          title: "查看头像",
          onClick: () => openAvatarPreview(row.avatarUrl),
        },
        [h("img", { src: row.avatarUrl, alt: label })],
      ),
    ]);
  }
  return h("div", { class: "avatar-cell" }, [
    h(NAvatar, { round: true, size: 36 }, { default: () => label }),
  ]);
}

const columns = computed<DataTableColumns<UserFollowRecord>>(() => [
  {
    title: "头像",
    key: "avatarUrl",
    width: 72,
    render: (row) => renderAvatar(row),
  },
  {
    title: "昵称",
    key: "nickname",
    minWidth: 120,
    render: (row) => row.nickname || row.username,
  },
  { title: "用户名", key: "username", width: 140 },
  {
    title: "关注时间", //props.direction === 'following' ? '关注时间' : '被关注时间',
    key: "followedAt",
    width: 180,
    render: (row) => row.followedAt,
  },
]);

async function load(): Promise<void> {
  if (!props.userId) return;
  loading.value = true;
  try {
    const data = await request<PageData<UserFollowRecord>>(
      `/users/${props.userId}/follows?${pageParams({ direction: props.direction }).toString()}`,
    );
    rows.value = data.list ?? [];
    applyPagination(data.pagination);
  } finally {
    loading.value = false;
  }
}

watch(
  () => [props.show, props.userId, props.direction] as const,
  ([visible, userId]) => {
    if (!visible || !userId) return;
    resetPage();
    void load();
  },
);
</script>

<template>
  <NModal
    :show="show"
    preset="card"
    :title="title"
    class="modal-card modal-card--interactions"
    @update:show="emit('update:show', $event)"
  >
    <div class="interaction-modal">
      <div class="interaction-modal__body">
        <NDataTable
          :columns="columns"
          :data="rows"
          :loading="loading"
          :size="preferences.tableSize"
          :row-key="(row: UserFollowRecord) => row.id"
          :scroll-x="520"
          flex-height
          style="height: 100%"
        />
      </div>
      <PagedFooter
        v-model:page="page"
        v-model:page-size="pageSize"
        :total="total"
        @change="load"
      />
    </div>
  </NModal>
  <ImagePreviewModal
    v-model:show="previewVisible"
    :src="previewSrc"
    title="头像预览"
  />
</template>
