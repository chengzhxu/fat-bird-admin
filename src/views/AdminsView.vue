<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from "vue";
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
  NTag,
  useDialog,
  useMessage,
  type DataTableColumns,
} from "naive-ui";
import PagedFooter from "../components/PagedFooter.vue";
import TableTools from "../components/TableTools.vue";
import { request } from "../api/client";
import { useColumnSettings } from "../composables/useColumnSettings";
import { usePagedQuery } from "../composables/usePagedQuery";
import { usePreferencesStore } from "../stores/preferences";
import type { AdminRecord, PageData, RoleRecord } from "../types/api";

const message = useMessage();
const dialog = useDialog();
const preferences = usePreferencesStore();
const rows = ref<AdminRecord[]>([]);
const roles = ref<RoleRecord[]>([]);
const loading = ref(false);
const submitting = ref(false);
const showCreate = ref(false);
const keyword = ref("");
const roleId = ref<string | null>(null);
const status = ref<number | null>(null);
const { page, pageSize, total, applyPagination, pageParams, resetPage } =
  usePagedQuery();
const form = reactive({
  username: "",
  nickname: "",
  password: "",
  roleIds: [] as string[],
  active: true,
});

const sourceColumns = computed<DataTableColumns<AdminRecord>>(() => [
  { title: "用户名", key: "username" },
  { title: "昵称", key: "nickname" },
  {
    title: "角色",
    key: "roleNames",
    render: (row) =>
      h(
        NSpace,
        { size: 4 },
        {
          default: () =>
            row.isSuperAdmin
              ? [
                  h(
                    NTag,
                    { type: "warning", bordered: false, size: "small" },
                    { default: () => "全部权限" },
                  ),
                ]
              : row.roleNames.map((name) =>
                  h(
                    NTag,
                    { bordered: false, size: "small" },
                    { default: () => name },
                  ),
                ),
        },
      ),
  },
  {
    title: "状态",
    key: "status",
    render: (row) =>
      h(
        NTag,
        { type: row.status === 1 ? "success" : "error", bordered: false },
        { default: () => (row.status === 1 ? "正常" : "禁用") },
      ),
  },
  {
    title: "账号类型",
    key: "isSuperAdmin",
    render: (row) =>
      h(
        NTag,
        { type: row.isSuperAdmin ? "warning" : "info", bordered: false },
        { default: () => (row.isSuperAdmin ? "超级管理员" : "管理员") },
      ),
  },
  {
    title: "密码状态",
    key: "mustChangePassword",
    render: (row) =>
      h(
        NTag,
        {
          type: row.mustChangePassword ? "warning" : "success",
          bordered: false,
        },
        { default: () => (row.mustChangePassword ? "待修改" : "正常") },
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
    width: 180,
    fixed: "right",
    render: (row) => {
      if (row.isSuperAdmin) return h("span", { class: "muted-action" }, "—");
      return h(
        NSpace,
        { size: 8 },
        {
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
        },
      );
    },
  },
]);

const {
  settings: columnSettings,
  columns,
  reset: resetColumns,
  setVisible,
  setFixed,
  move,
} = useColumnSettings("admins", sourceColumns);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const [adminData, roleData] = await Promise.all([
      request<PageData<AdminRecord>>(
        `/admins?${pageParams({
          keyword: keyword.value.trim(),
          roleId: roleId.value,
          status: status.value,
        }).toString()}`,
      ),
      request<{ list: Array<Pick<RoleRecord, "id" | "name" | "code">> }>(
        "/role-options",
      ),
    ]);
    rows.value = adminData.list;
    applyPagination(adminData.pagination);
    roles.value = roleData.list.map((role) => ({
      ...role,
      description: "",
      status: 1,
      permissionIds: [],
      menuIds: [],
    }));
  } finally {
    loading.value = false;
  }
}

function search(): void {
  resetPage();
  void load();
}

async function changeStatus(row: AdminRecord): Promise<void> {
  await request(`/admins/${row.id}/status`, {
    method: "PUT",
    body: JSON.stringify({
      status: row.status === 1 ? 0 : 1,
      reason: "后台管理员操作",
    }),
  });
  message.success("状态已更新");
  await load();
}

function confirmReset(row: AdminRecord): void {
  dialog.warning({
    title: "重置管理员密码",
    content: `确认重置 ${row.username} 的密码？该账号所有会话会立即失效，并必须在下次登录时修改密码。`,
    positiveText: "确认重置",
    negativeText: "取消",
    onPositiveClick: async () => {
      await request(`/admins/${row.id}/password-reset`, { method: "POST" });
      message.success("密码已重置");
      await load();
    },
  });
}

async function createAdmin(): Promise<void> {
  if (!form.roleIds.length) {
    message.warning("请至少选择一个角色");
    return;
  }
  submitting.value = true;
  try {
    const result = await request<{
      usedDefaultPassword: boolean;
      mustChangePassword: boolean;
    }>("/admins", {
      method: "POST",
      body: JSON.stringify({
        username: form.username,
        nickname: form.nickname,
        password: form.password || undefined,
        roleIds: form.roleIds,
        status: form.active ? 1 : 0,
      }),
    });
    message.success(
      result.usedDefaultPassword
        ? "管理员已创建，并使用系统初始密码"
        : "管理员已创建",
    );
    showCreate.value = false;
    Object.assign(form, {
      username: "",
      nickname: "",
      password: "",
      roleIds: [],
      active: true,
    });
    await load();
  } finally {
    submitting.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section>
    <NSpace justify="space-between" align="center">
      <!-- <div><h1>管理员管理</h1><p class="page-description">维护后台账号、角色和初始密码状态。</p></div> -->
      <NButton type="primary" @click="showCreate = true">创建管理员</NButton>
    </NSpace>
    <NCard>
      <NSpace class="toolbar" justify="space-between" align="center">
        <NSpace wrap>
          <NInput
            v-model:value="keyword"
            clearable
            placeholder="用户名或昵称"
            @keyup.enter="search"
          />
          <NSelect
            v-model:value="roleId"
            clearable
            style="width: 180px"
            placeholder="全部角色"
            :options="roles.map((role) => ({ label: role.name, value: role.id }))"
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
        :row-key="(row: AdminRecord) => row.id"
        :scroll-x="1200"
      />
      <PagedFooter
        v-model:page="page"
        v-model:page-size="pageSize"
        :total="total"
        @change="load"
      />
    </NCard>
    <NModal
      v-model:show="showCreate"
      preset="card"
      title="创建管理员"
      class="modal-card"
    >
      <NForm @submit.prevent="createAdmin">
        <NFormItem label="用户名" required>
          <NInput
            v-model:value="form.username"
            placeholder="请输入登录用户名"
          />
        </NFormItem>
        <NFormItem label="昵称" required>
          <NInput v-model:value="form.nickname" placeholder="请输入展示昵称" />
        </NFormItem>
        <NFormItem label="角色" required>
          <NSelect
            v-model:value="form.roleIds"
            multiple
            filterable
            :options="
              roles.map((role) => ({ label: role.name, value: role.id }))
            "
            placeholder="请选择一个或多个角色"
          />
        </NFormItem>
        <NFormItem label="初始密码">
          <NInput
            v-model:value="form.password"
            type="password"
            show-password-on="click"
            placeholder="不填写则使用系统配置密码"
          />
        </NFormItem>
        <p class="form-tip">
          新管理员首次登录后必须修改密码，初始密码不会显示在列表或日志中。
        </p>
        <NFormItem label="启用账号">
          <NSwitch v-model:value="form.active" />
        </NFormItem>
        <NButton type="primary" block attr-type="submit" :loading="submitting">
          创建
        </NButton>
      </NForm>
    </NModal>
  </section>
</template>
