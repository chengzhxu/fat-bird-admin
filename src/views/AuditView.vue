<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import {
  NCard,
  NDataTable,
  NSpace,
  NTabPane,
  NTabs,
  type DataTableColumns,
} from "naive-ui";
import PagedFooter from "../components/PagedFooter.vue";
import TableTools from "../components/TableTools.vue";
import { request } from "../api/client";
import { useColumnSettings } from "../composables/useColumnSettings";
import { usePagedQuery } from "../composables/usePagedQuery";
import { usePreferencesStore } from "../stores/preferences";
import type { PageData } from "../types/api";

interface RequestLog {
  id: string;
  requestId: string;
  method: string;
  path: string;
  httpStatus: number;
  durationMs: number;
  createdAt: string;
}

interface OperationLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetType: string;
  targetId: string | null;
  result: number;
  createdAt: string;
}

const preferences = usePreferencesStore();
const activeTab = ref<"request" | "operation">("request");
const requestLoading = ref(false);
const operationLoading = ref(false);
const requests = ref<RequestLog[]>([]);
const operations = ref<OperationLog[]>([]);
const {
  page: requestPage,
  pageSize: requestPageSize,
  total: requestTotal,
  applyPagination: applyRequestPagination,
  pageParams: requestParams,
} = usePagedQuery();
const {
  page: operationPage,
  pageSize: operationPageSize,
  total: operationTotal,
  applyPagination: applyOperationPagination,
  pageParams: operationParams,
} = usePagedQuery();

const requestSourceColumns = computed<DataTableColumns<RequestLog>>(() => [
  {
    title: "Request ID",
    key: "requestId",
    minWidth: 220,
    ellipsis: { tooltip: true },
  },
  { title: "方法", key: "method", width: 90 },
  { title: "路径", key: "path", minWidth: 240, ellipsis: { tooltip: true } },
  { title: "状态", key: "httpStatus", width: 90 },
  { title: "耗时(ms)", key: "durationMs", width: 100 },
  {
    title: "操作时间",
    key: "createdAt",
    width: 180,
    render: (row) => row.createdAt,
  },
]);

const operationSourceColumns = computed<DataTableColumns<OperationLog>>(() => [
  {
    title: "管理员",
    key: "adminName",
    width: 140,
    render: (row) => row.adminName || row.adminId,
  },
  { title: "动作", key: "action", minWidth: 160, ellipsis: { tooltip: true } },
  { title: "目标", key: "targetType", width: 140 },
  {
    title: "目标 ID",
    key: "targetId",
    width: 120,
    render: (row) => row.targetId ?? "—",
  },
  {
    title: "结果",
    key: "result",
    width: 90,
    render: (row) => (row.result === 1 ? "成功" : "失败"),
  },
  {
    title: "操作时间",
    key: "createdAt",
    width: 180,
    render: (row) => row.createdAt,
  },
]);

const {
  settings: requestColumnSettings,
  columns: requestColumns,
  reset: resetRequestColumns,
  setVisible: setRequestVisible,
  setFixed: setRequestFixed,
  move: moveRequestColumn,
} = useColumnSettings("audit-request", requestSourceColumns);

const {
  settings: operationColumnSettings,
  columns: operationColumns,
  reset: resetOperationColumns,
  setVisible: setOperationVisible,
  setFixed: setOperationFixed,
  move: moveOperationColumn,
} = useColumnSettings("audit-operation", operationSourceColumns);

async function loadRequests(): Promise<void> {
  requestLoading.value = true;
  try {
    const data = await request<PageData<RequestLog>>(
      `/request-logs?${requestParams().toString()}`,
    );
    requests.value = data.list;
    applyRequestPagination(data.pagination);
  } finally {
    requestLoading.value = false;
  }
}

async function loadOperations(): Promise<void> {
  operationLoading.value = true;
  try {
    const data = await request<PageData<OperationLog>>(
      `/operation-logs?${operationParams().toString()}`,
    );
    operations.value = data.list;
    applyOperationPagination(data.pagination);
  } finally {
    operationLoading.value = false;
  }
}

watch(activeTab, (tab) => {
  if (tab === "request" && !requests.value.length) void loadRequests();
  if (tab === "operation" && !operations.value.length) void loadOperations();
});

onMounted(loadRequests);
</script>

<template>
  <section>
    <NCard>
      <NTabs v-model:value="activeTab">
        <NTabPane name="request" tab="请求日志">
          <NSpace class="toolbar" justify="end">
            <TableTools
              :settings="requestColumnSettings"
              :loading="requestLoading"
              @refresh="loadRequests"
              @reset="resetRequestColumns"
              @update:visible="setRequestVisible"
              @update:fixed="setRequestFixed"
              @move="moveRequestColumn"
            />
          </NSpace>
          <NDataTable
            :columns="requestColumns"
            :data="requests"
            :loading="requestLoading"
            :size="preferences.tableSize"
            :row-key="(row: RequestLog) => row.id"
            :scroll-x="1100"
          />
          <PagedFooter
            v-model:page="requestPage"
            v-model:page-size="requestPageSize"
            :total="requestTotal"
            @change="loadRequests"
          />
        </NTabPane>
        <NTabPane name="operation" tab="操作日志">
          <NSpace class="toolbar" justify="end">
            <TableTools
              :settings="operationColumnSettings"
              :loading="operationLoading"
              @refresh="loadOperations"
              @reset="resetOperationColumns"
              @update:visible="setOperationVisible"
              @update:fixed="setOperationFixed"
              @move="moveOperationColumn"
            />
          </NSpace>
          <NDataTable
            :columns="operationColumns"
            :data="operations"
            :loading="operationLoading"
            :size="preferences.tableSize"
            :row-key="(row: OperationLog) => row.id"
            :scroll-x="1000"
          />
          <PagedFooter
            v-model:page="operationPage"
            v-model:page-size="operationPageSize"
            :total="operationTotal"
            @change="loadOperations"
          />
        </NTabPane>
      </NTabs>
    </NCard>
  </section>
</template>
