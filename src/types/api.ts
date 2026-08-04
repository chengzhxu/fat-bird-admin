export interface ApiEnvelope<T> {
  code: number
  message: string
  data: T
}

export interface Pagination {
  page: number
  pageSize: number
  total: number
}

export interface PageData<T> {
  list: T[]
  pagination: Pagination
}

export interface AuthUser {
  id: string
  username: string
  nickname: string
  isSuperAdmin: boolean
  mustChangePassword: boolean
}

export interface AdminMenu {
  id: string
  parentId: string | null
  name: string
  route: string
  icon: string
  sortOrder: number
  children: AdminMenu[]
}

export interface AdminRecord {
  id: string
  username: string
  nickname: string
  status: number
  isSuperAdmin: boolean
  mustChangePassword: boolean
  roleIds: string[]
  roleNames: string[]
  createdAt: string
}

export interface UserRecord {
  id: string
  email: string
  username: string
  nickname: string
  status: number
  disabledUntil: string | null
  mustChangePassword: boolean
  createdAt: string
}

export interface PostRecord {
  id: string
  userId: string | null
  title: string
  summary: string
  publicationStatus: number
  moderationStatus: number
  moderationReason: string
  isOfficial: boolean
  isPinned: boolean
  viewCount: number
  commentCount: number
  favoriteCount: number
  publisher: {
    id: string | null
    name: string
    type: 'user' | 'official'
  }
  publishedAt: string | null
  createdAt: string
}

export interface PostInteractionRecord {
  id: string
  userId: string | null
  userName: string
  content: string
  createdAt: string
}

export interface RoleRecord {
  id: string
  code: string
  name: string
  description: string
  status: number
  permissionIds: string[]
  menuIds: string[]
}
