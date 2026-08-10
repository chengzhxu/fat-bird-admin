<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import {
  NButton,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NSelect,
  NSpace,
  NSwitch,
  NTag,
  NTree,
  useMessage,
  type TreeOption,
} from "naive-ui";
import PagedFooter from "../components/PagedFooter.vue";
import { request } from "../api/client";
import { usePagedQuery } from "../composables/usePagedQuery";
import type {
  AdminMenu,
  PageData,
  PermissionRecord,
  RoleRecord,
} from "../types/api";

const permissionGroups: Record<string, string> = {
  dashboard: "工作台",
  user: "用户管理",
  admin: "管理员管理",
  rbac: "角色权限",
  post: "内容管理",
  comment: "评论管理",
  site: "网站设置",
  dictionary: "字典管理",
  file: "文件管理",
  audit: "审计日志",
};

type ModalMode = "create" | "edit" | "detail";

const message = useMessage();
const roles = ref<RoleRecord[]>([]);
const permissions = ref<PermissionRecord[]>([]);
const menus = ref<AdminMenu[]>([]);
const loading = ref(false);
const submitting = ref(false);
const keyword = ref("");
const status = ref<number | null>(null);
const { page, pageSize, total, applyPagination, pageParams, resetPage } =
  usePagedQuery(12);
const showModal = ref(false);
const modalMode = ref<ModalMode>("create");
const editingId = ref("");
const checkedKeys = ref<string[]>([]);
const form = reactive({
  code: "",
  name: "",
  description: "",
  statusEnabled: true,
});

const assignmentTree = computed<TreeOption[]>(() => {
  const grouped = new Map<string, PermissionRecord[]>();
  for (const permission of permissions.value) {
    const group = permission.code.split(".")[0] ?? "other";
    grouped.set(group, [...(grouped.get(group) ?? []), permission]);
  }
  const permissionChildren: TreeOption[] = Array.from(grouped.entries()).map(
    ([group, records]) => ({
      key: `group:perm:${group}`,
      label: permissionGroups[group] ?? "其他权限",
      children: records.map((permission) => ({
        key: `perm:${permission.id}`,
        label: `${permission.name}（${permission.code}）`,
      })),
    }),
  );
  const mapMenu = (menu: AdminMenu): TreeOption => ({
    key: `menu:${menu.id}`,
    label: menu.name,
    children: menu.children.length ? menu.children.map(mapMenu) : undefined,
  });
  return [
    {
      key: "root:permissions",
      label: "接口权限",
      children: permissionChildren,
    },
    {
      key: "root:menus",
      label: "菜单可见性",
      children: menus.value.map(mapMenu),
    },
  ];
});

const modalTitle = computed(() => {
  if (modalMode.value === "create") return "创建角色";
  if (modalMode.value === "edit") return "编辑角色";
  return "角色详情";
});

const isReadonly = computed(() => modalMode.value === "detail");

function collectLeafKeys(options: TreeOption[]): string[] {
  const leaves: string[] = [];
  for (const option of options) {
    if (option.children?.length) {
      leaves.push(...collectLeafKeys(option.children));
      continue;
    }
    const key = String(option.key);
    if (key.startsWith("perm:") || key.startsWith("menu:")) leaves.push(key);
  }
  return leaves;
}

function toCheckedKeys(permissionIds: string[], menuIds: string[]): string[] {
  return [
    ...permissionIds.map((id) => `perm:${id}`),
    ...menuIds.map((id) => `menu:${id}`),
  ];
}

function fromCheckedKeys(keys: Array<string | number>): {
  permissionIds: string[];
  menuIds: string[];
} {
  const permissionIds: string[] = [];
  const menuIds: string[] = [];
  for (const raw of keys) {
    const key = String(raw);
    if (key.startsWith("perm:")) permissionIds.push(key.slice(5));
    if (key.startsWith("menu:")) menuIds.push(key.slice(5));
  }
  return { permissionIds, menuIds };
}

function selectAllAssignments(): void {
  checkedKeys.value = collectLeafKeys(assignmentTree.value);
}

function invertAssignments(): void {
  const all = collectLeafKeys(assignmentTree.value);
  const selected = new Set(
    checkedKeys.value.filter((key) => all.includes(key)),
  );
  checkedKeys.value = all.filter((key) => !selected.has(key));
}

function resetForm(): void {
  editingId.value = "";
  Object.assign(form, {
    code: "",
    name: "",
    description: "",
    statusEnabled: true,
  });
  checkedKeys.value = [];
}

async function loadCatalog(): Promise<void> {
  const [permissionData, menuData] = await Promise.all([
    request<{ list: PermissionRecord[] }>("/permissions"),
    request<{ list: AdminMenu[] }>("/menus"),
  ]);
  permissions.value = permissionData.list;
  menus.value = menuData.list;
}

async function loadRoles(): Promise<void> {
  loading.value = true;
  try {
    const data = await request<PageData<RoleRecord>>(
      `/roles?${pageParams({
        keyword: keyword.value.trim(),
        status: status.value,
      }).toString()}`,
    );
    roles.value = data.list;
    applyPagination(data.pagination);
  } finally {
    loading.value = false;
  }
}

function search(): void {
  resetPage();
  void loadRoles();
}

function openCreate(): void {
  modalMode.value = "create";
  resetForm();
  showModal.value = true;
}

async function openDetail(role: RoleRecord): Promise<void> {
  modalMode.value = "detail";
  const detail = await request<RoleRecord>(`/roles/${role.id}`);
  editingId.value = detail.id;
  Object.assign(form, {
    code: detail.code,
    name: detail.name,
    description: detail.description,
    statusEnabled: detail.status === 1,
  });
  checkedKeys.value = toCheckedKeys(detail.permissionIds, detail.menuIds);
  showModal.value = true;
}

async function openEdit(role: RoleRecord): Promise<void> {
  modalMode.value = "edit";
  const detail = await request<RoleRecord>(`/roles/${role.id}`);
  editingId.value = detail.id;
  Object.assign(form, {
    code: detail.code,
    name: detail.name,
    description: detail.description,
    statusEnabled: detail.status === 1,
  });
  checkedKeys.value = toCheckedKeys(detail.permissionIds, detail.menuIds);
  showModal.value = true;
}

async function submitRole(): Promise<void> {
  if (isReadonly.value) return;
  if (!form.name.trim()) {
    message.warning("请填写角色名称");
    return;
  }
  if (modalMode.value === "create" && !form.code.trim()) {
    message.warning("请填写角色代码");
    return;
  }
  const { permissionIds, menuIds } = fromCheckedKeys(checkedKeys.value);
  submitting.value = true;
  try {
    if (modalMode.value === "create") {
      await request("/roles", {
        method: "POST",
        body: JSON.stringify({
          code: form.code.trim(),
          name: form.name.trim(),
          description: form.description.trim(),
          permissionIds,
          menuIds,
        }),
      });
      message.success("角色已创建");
    } else {
      await request(`/roles/${editingId.value}`, {
        method: "PUT",
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          status: form.statusEnabled ? 1 : 0,
          permissionIds,
          menuIds,
        }),
      });
      message.success("角色已更新");
    }
    showModal.value = false;
    resetForm();
    await loadRoles();
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  await loadCatalog();
  await loadRoles();
});
</script>

<template>
  <section>
    <NSpace justify="space-between" align="center">
      <div>
        <!-- <h1>角色管理</h1>
        <p class="page-description">按业务域配置后台角色权限与菜单可见性。</p> -->
      </div>
      <NButton type="primary" @click="openCreate">创建角色</NButton>
    </NSpace>

    <NCard>
      <NSpace class="toolbar">
        <NInput
          v-model:value="keyword"
          clearable
          placeholder="按代码、名称或说明搜索"
          @keyup.enter="search"
        />
        <NSelect
          v-model:value="status"
          clearable
          style="width: 140px"
          placeholder="全部状态"
          :options="[
            { label: '启用', value: 1 },
            { label: '禁用', value: 0 },
          ]"
        />
        <NButton type="primary" :loading="loading" @click="search">
          查询
        </NButton>
      </NSpace>

      <div v-if="roles.length" class="role-waterfall">
        <NCard
          v-for="role in roles"
          :key="role.id"
          class="role-card"
          :title="role.name"
          size="small"
        >
          <p class="role-card__code">{{ role.code }}</p>
          <p class="role-card__desc">{{ role.description || "暂无说明" }}</p>
          <NSpace class="role-card__tags">
            <NTag
              :type="role.status === 1 ? 'success' : 'default'"
              :bordered="false"
              size="small"
            >
              {{ role.status === 1 ? "启用" : "禁用" }}
            </NTag>
            <NTag :bordered="false" size="small">
              {{ role.permissionIds.length }} 项权限
            </NTag>
            <NTag :bordered="false" size="small">
              {{ role.menuIds.length }} 个菜单
            </NTag>
          </NSpace>
          <NSpace class="role-card__actions">
            <NButton size="small" @click="openDetail(role)">详情</NButton>
            <NButton
              size="small"
              type="primary"
              secondary
              @click="openEdit(role)"
            >
              编辑
            </NButton>
          </NSpace>
        </NCard>
      </div>
      <div v-else class="role-empty">
        {{ loading ? "加载中…" : "暂无角色" }}
      </div>

      <PagedFooter
        v-model:page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[12, 24, 48]"
        @change="loadRoles"
      />
    </NCard>

    <NModal
      v-model:show="showModal"
      preset="card"
      :title="modalTitle"
      class="modal-card modal-card--wide"
    >
      <NForm @submit.prevent="submitRole">
        <div class="two-column-form">
          <NFormItem label="角色代码" required>
            <NInput
              v-model:value="form.code"
              :disabled="modalMode !== 'create'"
              placeholder="例如 content_operator"
            />
          </NFormItem>
          <NFormItem label="角色名称" required>
            <NInput
              v-model:value="form.name"
              :disabled="isReadonly"
              placeholder="例如 内容运营"
            />
          </NFormItem>
        </div>
        <NFormItem label="说明">
          <NInput
            v-model:value="form.description"
            type="textarea"
            :disabled="isReadonly"
            :autosize="{ minRows: 2, maxRows: 4 }"
          />
        </NFormItem>
        <NFormItem v-if="modalMode !== 'create'" label="启用状态">
          <NSwitch v-model:value="form.statusEnabled" :disabled="isReadonly" />
        </NFormItem>
        <NFormItem label="权限与菜单">
          <div class="permission-tree-panel">
            <NSpace v-if="!isReadonly" class="assignment-toolbar">
              <NButton size="tiny" @click="selectAllAssignments">全选</NButton>
              <NButton size="tiny" @click="invertAssignments">反选</NButton>
            </NSpace>
            <NTree
              :checked-keys="checkedKeys"
              block-line
              checkable
              cascade
              default-expand-all
              :selectable="false"
              :check-on-click="!isReadonly"
              :data="assignmentTree"
              @update:checked-keys="
                (keys) => {
                  if (!isReadonly) checkedKeys = keys.map(String);
                }
              "
            />
          </div>
        </NFormItem>
        <NButton
          v-if="!isReadonly"
          type="primary"
          block
          attr-type="submit"
          :loading="submitting"
        >
          {{ modalMode === "create" ? "创建角色" : "保存修改" }}
        </NButton>
      </NForm>
    </NModal>
  </section>
</template>
