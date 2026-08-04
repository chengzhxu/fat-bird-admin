<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NCard, NDataTable, NTabs, NTabPane, type DataTableColumns } from 'naive-ui'
import { request } from '../api/client'
import { usePreferencesStore } from '../stores/preferences'
import type { PageData } from '../types/api'

interface RequestLog { ID: number; RequestID: string; Method: string; Path: string; HTTPStatus: number; DurationMS: number; CreatedAt: string }
interface OperationLog { ID: number; AdminID: number; Action: string; TargetType: string; TargetID: number | null; Result: number; CreatedAt: string }
const requests = ref<RequestLog[]>([])
const operations = ref<OperationLog[]>([])
const preferences = usePreferencesStore()
const requestColumns: DataTableColumns<RequestLog> = [
  { title: 'Request ID', key: 'RequestID' }, { title: '方法', key: 'Method' }, { title: '路径', key: 'Path' }, { title: '状态', key: 'HTTPStatus' }, { title: '耗时(ms)', key: 'DurationMS' },
]
const operationColumns: DataTableColumns<OperationLog> = [
  { title: '管理员', key: 'AdminID' }, { title: '动作', key: 'Action' }, { title: '目标', key: 'TargetType' }, { title: '结果', key: 'Result' }, { title: '时间', key: 'CreatedAt' },
]
onMounted(async () => {
  requests.value = (await request<PageData<RequestLog>>('/request-logs')).list
  operations.value = (await request<PageData<OperationLog>>('/operation-logs')).list
})
</script>

<template>
  <section>
    <h1>审计日志</h1>
    <NCard>
      <NTabs>
        <NTabPane name="request" tab="请求日志"><NDataTable :columns="requestColumns" :data="requests" :size="preferences.tableSize" /></NTabPane>
        <NTabPane name="operation" tab="操作日志"><NDataTable :columns="operationColumns" :data="operations" :size="preferences.tableSize" /></NTabPane>
      </NTabs>
    </NCard>
  </section>
</template>
