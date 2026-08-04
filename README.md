# Fat Bird Admin

Vue 3、TypeScript、Vite、Naive UI 和 Pinia 构建的轻量管理后台。

默认 Logo 位于 `public/fat-bird-admin.svg`。

```bash
pnpm install
pnpm run dev
pnpm run typecheck
pnpm run build
```

开发环境通过 Vite 将 `/api` 代理到 `http://localhost:8080`。Access Token 只保存在内存，Refresh Token 使用 HttpOnly Cookie。
