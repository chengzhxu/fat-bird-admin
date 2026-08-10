<script setup lang="ts">
import {
  NButton,
  NCheckbox,
  NPopover,
  NRadioButton,
  NRadioGroup,
  NSpace,
  NTooltip,
} from 'naive-ui'
import { ACTIONS_COLUMN_KEY, type ColumnSettingItem } from '../composables/useColumnSettings'
import { usePreferencesStore } from '../stores/preferences'
import {
  IconColumns,
  IconDensity,
  IconPinLeft,
  IconPinRight,
  IconRefresh,
} from '../utils/icons'

defineProps<{
  settings: ColumnSettingItem[]
  loading?: boolean
}>()

const emit = defineEmits<{
  refresh: []
  reset: []
  'update:visible': [key: string, visible: boolean]
  'update:fixed': [key: string, fixed: 'left' | 'right' | false]
  move: [key: string, direction: -1 | 1]
}>()

const preferences = usePreferencesStore()
</script>

<template>
  <NSpace class="table-tools" align="center" :wrap="false" :size="8">
    <NTooltip>
      <template #trigger>
        <NButton quaternary circle class="table-tools__btn" :loading="loading" @click="emit('refresh')">
          <IconRefresh :size="16" />
        </NButton>
      </template>
      刷新
    </NTooltip>

    <NPopover trigger="click" placement="bottom-end">
      <template #trigger>
        <NTooltip>
          <template #trigger>
            <NButton quaternary circle class="table-tools__btn">
              <IconDensity :size="16" />
            </NButton>
          </template>
          密度
        </NTooltip>
      </template>
      <div class="table-tools__panel">
        <div class="table-tools__panel-title">表格密度</div>
        <NRadioGroup v-model:value="preferences.tableSize" size="small">
          <NRadioButton value="small">紧凑</NRadioButton>
          <NRadioButton value="medium">默认</NRadioButton>
          <NRadioButton value="large">宽松</NRadioButton>
        </NRadioGroup>
      </div>
    </NPopover>

    <NPopover v-if="settings.length" trigger="click" placement="bottom-end" :style="{ padding: 0 }">
      <template #trigger>
        <NTooltip>
          <template #trigger>
            <NButton quaternary circle class="table-tools__btn">
              <IconColumns :size="16" />
            </NButton>
          </template>
          列设置
        </NTooltip>
      </template>
      <div class="column-setting">
        <div class="column-setting__head">
          <span>列展示</span>
          <NButton text type="primary" size="tiny" @click="emit('reset')">重置</NButton>
        </div>
        <div v-for="item in settings" :key="item.key" class="column-setting__row">
          <template v-if="item.key !== ACTIONS_COLUMN_KEY">
            <NButton text size="tiny" class="column-setting__move" @click="emit('move', item.key, -1)">↑</NButton>
            <NButton text size="tiny" class="column-setting__move" @click="emit('move', item.key, 1)">↓</NButton>
          </template>
          <span v-else class="column-setting__move column-setting__move--placeholder" />
          <NCheckbox
            :checked="item.visible"
            @update:checked="(value: boolean) => emit('update:visible', item.key, value)"
          >
            {{ item.title }}
          </NCheckbox>
          <NSpace v-if="item.key !== ACTIONS_COLUMN_KEY" :size="2" class="column-setting__pins">
            <NTooltip>
              <template #trigger>
                <NButton
                  text
                  size="tiny"
                  :type="item.fixed === 'left' ? 'primary' : 'default'"
                  @click="emit('update:fixed', item.key, item.fixed === 'left' ? false : 'left')"
                >
                  <IconPinLeft :size="14" />
                </NButton>
              </template>
              固定到左侧
            </NTooltip>
            <NTooltip>
              <template #trigger>
                <NButton
                  text
                  size="tiny"
                  :type="item.fixed === 'right' ? 'primary' : 'default'"
                  @click="emit('update:fixed', item.key, item.fixed === 'right' ? false : 'right')"
                >
                  <IconPinRight :size="14" />
                </NButton>
              </template>
              固定到右侧
            </NTooltip>
          </NSpace>
          <span v-else class="column-setting__pin-hint">固定末列</span>
        </div>
      </div>
    </NPopover>
  </NSpace>
</template>
