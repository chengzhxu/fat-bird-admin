<script setup lang="ts">
import { computed, h, onMounted, ref } from "vue";
import {
  NAvatar,
  NButton,
  NCard,
  NDataTable,
  NInput,
  NSelect,
  NSpace,
  NTag,
  useDialog,
  useMessage,
  type DataTableColumns,
  type DataTableSortState,
} from "naive-ui";
import EllipsisTooltip from "../components/EllipsisTooltip.vue";
import ImagePreviewModal from "../components/ImagePreviewModal.vue";
import PagedFooter from "../components/PagedFooter.vue";
import TableTools from "../components/TableTools.vue";
import UserRelationModal from "../components/UserRelationModal.vue";
import { request } from "../api/client";
import { useColumnSettings } from "../composables/useColumnSettings";
import { usePagedQuery } from "../composables/usePagedQuery";
import { usePreferencesStore } from "../stores/preferences";
import type { PageData, UserRecord } from "../types/api";

const message = useMessage();
const dialog = useDialog();
const preferences = usePreferencesStore();
const loading = ref(false);
const keyword = ref("");
const status = ref<number | null>(null);
const rows = ref<UserRecord[]>([]);
const avatarPreviewVisible = ref(false);
const avatarPreviewSrc = ref("");
const relationVisible = ref(false);
const relationUserId = ref("");
const relationDirection = ref<"following" | "followers">("following");
const relationTitle = ref("");
const sortBy = ref("");
const sortOrder = ref<"asc" | "desc">("desc");
const { page, pageSize, total, applyPagination, pageParams, resetPage } =
  usePagedQuery();

function openAvatarPreview(url?: string): void {
  if (!url) return;
  avatarPreviewSrc.value = url;
  avatarPreviewVisible.value = true;
}

function openRelation(row: UserRecord, direction: "following" | "followers"): void {
  relationUserId.value = row.id;
  relationDirection.value = direction;
  relationTitle.value =
    direction === "following"
      ? `${row.nickname || row.username} 的关注`
      : `${row.nickname || row.username} 的粉丝`;
  relationVisible.value = true;
}

function renderCount(value: number, row: UserRecord, direction: "following" | "followers") {
  if (!value) return "0";
  return h(
    "span",
    {
      class: "count-link",
      onClick: () => openRelation(row, direction),
    },
    String(value),
  );
}

const sourceColumns = computed<DataTableColumns<UserRecord>>(() => [
  {
    title: "头像",
    key: "avatarUrl",
    width: 72,
    fixed: "left",
    render: (row) => {
      const label = (row.nickname || row.username || "?").slice(0, 1);
      if (row.avatarUrl) {
        return h("div", { class: "avatar-cell" }, [
          h(
            "button",
            {
              type: "button",
              class: "avatar-thumb",
              title: "查看头像",
              onClick: () => openAvatarPreview(row.avatarUrl),
            },
            [h("img", { src: row.avatarUrl, alt: label })],
          ),
        ]);
      }
      return h("div", { class: "avatar-cell" }, [
        h(NAvatar, { round: true, size: 40 }, { default: () => label }),
      ]);
    },
  },
  { title: "用户名", key: "username", width: 120 },
  { title: "昵称", key: "nickname", width: 120 },
  { title: "邮箱", key: "email", minWidth: 180, ellipsis: { tooltip: true } },
  {
    title: "个人简介",
    key: "bio",
    minWidth: 180,
    render: (row) =>
      h(EllipsisTooltip, { content: row.bio || "", maxWidth: "220px" }),
  },
  {
    title: "关注",
    key: "followingCount",
    width: 80,
    sorter: true,
    render: (row) => renderCount(row.followingCount ?? 0, row, "following"),
  },
  {
    title: "粉丝",
    key: "followerCount",
    width: 80,
    sorter: true,
    render: (row) => renderCount(row.followerCount ?? 0, row, "followers"),
  },
  {
    title: "状态",
    key: "status",
    width: 90,
    render: (row) =>
      h(
        NTag,
        { type: row.status === 1 ? "success" : "error", bordered: false },
        { default: () => (row.status === 1 ? "正常" : "禁用") },
      ),
  },
  {
    title: "注册时间",
    key: "createdAt",
    width: 180,
    sorter: true,
    render: (row) => row.createdAt,
  },
  {
    title: "操作",
    key: "actions",
    width: 180,
    fixed: "right",
    render: (row) =>
      h(NSpace, null, {
        default: () => [
          h(
            NButton,
            { size: "small", onClick: () => changeStatus(row) },
            { default: () => (row.status === 1 ? "禁用" : "启用") },
          ),
          h(
            NButton,
            {
              size: "small",
              type: "warning",
              onClick: () => confirmReset(row),
            },
            { default: () => "重置密码" },
          ),
        ],
      }),
  },
]);

const {
  settings: columnSettings,
  columns,
  reset: resetColumns,
  setVisible,
  setFixed,
  move,
} = useColumnSettings("users", sourceColumns);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const data = await request<PageData<UserRecord>>(
      `/users?${pageParams({
        keyword: keyword.value.trim(),
        status: status.value,
        sortBy: sortBy.value || undefined,
        sortOrder: sortBy.value ? sortOrder.value : undefined,
      }).toString()}`,
    );
    rows.value = data.list;
    applyPagination(data.pagination);
  } catch (error) {
    message.error(error instanceof Error ? error.message : "加载失败");
  } finally {
    loading.value = false;
  }
}

function search(): void {
  resetPage();
  void load();
}

function updateSorter(
  sorter: DataTableSortState | DataTableSortState[] | null,
): void {
  const active = Array.isArray(sorter) ? sorter[0] : sorter;
  if (!active?.order) {
    sortBy.value = "";
    sortOrder.value = "desc";
  } else {
    sortBy.value = String(active.columnKey);
    sortOrder.value = active.order === "ascend" ? "asc" : "desc";
  }
  resetPage();
  void load();
}

async function changeStatus(row: UserRecord): Promise<void> {
  await request(`/users/${row.id}/status`, {
    method: "PUT",
    body: JSON.stringify({
      status: row.status === 1 ? 0 : 1,
      reason: "后台管理员操作",
    }),
  });
  message.success("状态已更新");
  await load();
}

function confirmReset(row: UserRecord): void {
  dialog.warning({
    title: "重置用户密码",
    content: `确认重置 ${row.username} 的密码？该用户所有会话会立即失效，并必须在下次登录时修改密码。`,
    positiveText: "确认重置",
    negativeText: "取消",
    onPositiveClick: async () => {
      await request(`/users/${row.id}/password-reset`, { method: "POST" });
      message.success("密码已重置，账号已进入强制改密状态");
      await load();
    },
  });
}

onMounted(load);
</script>

<template>
  <section>
    <NCard>
      <NSpace class="toolbar" justify="space-between" align="center">
        <NSpace wrap>
          <NInput
            v-model:value="keyword"
            placeholder="用户名、昵称或邮箱"
            clearable
            @keyup.enter="search"
          />
          <NSelect
            v-model:value="status"
            clearable
            style="width: 140px"
            placeholder="全部状态"
            :options="[
              { label: '正常', value: 1 },
              { label: '禁用', value: 0 },
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
      <NDataTable
        :columns="columns"
        :data="rows"
        :loading="loading"
        :size="preferences.tableSize"
        :row-key="(row: UserRecord) => row.id"
        :scroll-x="1280"
        remote
        @update:sorter="updateSorter"
      />
      <PagedFooter
        v-model:page="page"
        v-model:page-size="pageSize"
        :total="total"
        @change="load"
      />
    </NCard>

    <ImagePreviewModal
      v-model:show="avatarPreviewVisible"
      :src="avatarPreviewSrc"
      title="头像预览"
    />
    <UserRelationModal
      v-model:show="relationVisible"
      :user-id="relationUserId"
      :direction="relationDirection"
      :title="relationTitle"
    />
  </section>
</template>
