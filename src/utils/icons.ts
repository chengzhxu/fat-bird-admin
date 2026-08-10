import { h, defineComponent, type PropType, type VNode } from 'vue'
import { NIcon } from 'naive-ui'

const svgProps = {
  size: { type: Number, default: 18 },
}

function createSvgIcon(paths: string, viewBox = '0 0 24 24') {
  return defineComponent({
    name: 'SvgIcon',
    props: svgProps,
    setup(props) {
      return () =>
        h(
          'svg',
          {
            xmlns: 'http://www.w3.org/2000/svg',
            viewBox,
            width: props.size,
            height: props.size,
            fill: 'none',
            stroke: 'currentColor',
            'stroke-width': '1.8',
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
            'aria-hidden': 'true',
          },
          paths.split('|').map((d) => h('path', { d })),
        )
    },
  })
}

export const IconDashboard = createSvgIcon('M3 13h8V3H3v10Zm10 8h8V11h-8v10ZM3 21h8v-6H3v6Zm10-18v6h8V3h-8Z')
export const IconUsers = createSvgIcon('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2|M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z|M22 21v-2a4 4 0 0 0-3-3.87|M16 3.13a4 4 0 0 1 0 7.75')
export const IconDocument = createSvgIcon('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z|M14 2v6h6|M16 13H8|M16 17H8|M10 9H8')
export const IconShield = createSvgIcon('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z')
export const IconKey = createSvgIcon('M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78ZM15.5 7.5 19 4|M17.5 9.5 21 6')
export const IconSettings = createSvgIcon('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z|M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z')
export const IconImage = createSvgIcon('M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z|M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z|M21 15l-5-5L5 21')
export const IconHistory = createSvgIcon('M3 12a9 9 0 1 0 3-6.7L3 8|M3 3v5h5|M12 7v5l4 2')
export const IconSystem = createSvgIcon('M4 4h7v7H4V4Z|M13 4h7v7h-7V4Z|M4 13h7v7H4v-7Z|M13 13h7v7h-7v-7Z')
export const IconMore = createSvgIcon('M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z|M19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z|M5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z')
export const IconComment = createSvgIcon('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z')
export const IconMenu = createSvgIcon('M4 6h16|M4 12h16|M4 18h16')
export const IconRefresh = createSvgIcon('M23 4v6h-6|M1 20v-6h6|M3.51 9a9 9 0 0 1 14.85-3.36L23 10|M20.49 15a9 9 0 0 1-14.85 3.36L1 14')
export const IconFullscreen = createSvgIcon('M8 3H5a2 2 0 0 0-2 2v3|M16 3h3a2 2 0 0 1 2 2v3|M8 21H5a2 2 0 0 1-2-2v-3|M16 21h3a2 2 0 0 0 2-2v-3')
export const IconFullscreenExit = createSvgIcon('M8 3v3a2 2 0 0 1-2 2H3|M16 3v3a2 2 0 0 0 2 2h3|M8 21v-3a2 2 0 0 0-2-2H3|M16 21v-3a2 2 0 0 1 2-2h3')
export const IconClose = createSvgIcon('M18 6 6 18|M6 6l12 12')
export const IconCloseOthers = createSvgIcon('M4 6h16|M4 18h16|M9 12h6')
export const IconPinLeft = createSvgIcon('M15 18l-6-6 6-6|M9 12h12|M3 5v14')
export const IconPinRight = createSvgIcon('M9 18l6-6-6-6|M3 12h12|M21 5v14')
export const IconColumns = createSvgIcon('M12 3v18|M5 5h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z')
export const IconDensity = createSvgIcon('M4 6h16|M4 12h16|M4 18h10')
export const IconSearch = createSvgIcon('M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z|M21 21l-4.3-4.3')

const menuIconMap: Record<string, ReturnType<typeof createSvgIcon>> = {
  dashboard: IconDashboard,
  users: IconUsers,
  document: IconDocument,
  shield: IconShield,
  key: IconKey,
  settings: IconSettings,
  image: IconImage,
  history: IconHistory,
  system: IconSystem,
  more: IconMore,
  comment: IconComment,
}

export function renderMenuIcon(name?: string | null, size = 18): (() => VNode) | undefined {
  if (!name) return undefined
  const Comp = menuIconMap[name] ?? IconMore
  return () => h(NIcon, { size }, { default: () => h(Comp, { size }) })
}

export function dropdownIcon(Comp: ReturnType<typeof createSvgIcon>) {
  return () => h(NIcon, { size: 16 }, { default: () => h(Comp, { size: 16 }) })
}
