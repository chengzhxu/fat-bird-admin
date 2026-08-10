import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: () => import('../views/LoginView.vue'), meta: { public: true } },
    { path: '/change-password', component: () => import('../views/ChangePasswordView.vue') },
    {
      path: '/',
      component: () => import('../layouts/AdminLayout.vue'),
      children: [
        { path: '', redirect: '/dashboard' },
        { path: 'dashboard', component: () => import('../views/DashboardView.vue'), meta: { title: '工作台' } },
        { path: 'users', component: () => import('../views/UsersView.vue'), meta: { title: '用户管理', group: '系统管理' } },
        { path: 'admins', component: () => import('../views/AdminsView.vue'), meta: { title: '管理员管理', group: '系统管理' } },
        { path: 'posts', component: () => import('../views/PostsView.vue'), meta: { title: '帖子管理', group: '内容管理' } },
        { path: 'comments', component: () => import('../views/CommentsView.vue'), meta: { title: '评论管理', group: '内容管理' } },
        { path: 'rbac', component: () => import('../views/RbacView.vue'), meta: { title: '角色管理', group: '系统管理' } },
        { path: 'settings', component: () => import('../views/SettingsView.vue'), meta: { title: '网站设置', group: '其他' } },
        { path: 'files', component: () => import('../views/FilesView.vue'), meta: { title: '文件管理', group: '其他' } },
        { path: 'audit', component: () => import('../views/AuditView.vue'), meta: { title: '审计日志', group: '其他' } },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (to.meta.public) return true
  if (!auth.initialized) {
    await auth.bootstrap()
  }
  if (!auth.isAuthenticated) return '/login'
  if (auth.currentUser?.mustChangePassword && to.path !== '/change-password') {
    return '/change-password'
  }
  if (!auth.currentUser?.mustChangePassword && to.path === '/change-password') {
    return '/dashboard'
  }
  return true
})

export default router
