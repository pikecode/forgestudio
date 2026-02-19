# 故障排除指南

## Taro 编译错误

### 错误：window is not defined

#### 症状
```
Failed to compile.
ReferenceError: window is not defined
src/app.config.ts 或 src/app.boot.js
```

#### 原因
1. **app.config.ts 使用了 defineAppConfig**
   - Taro 4.x 不需要 `defineAppConfig` 包装函数
   - 直接导出配置对象即可

2. **H5 路由模式配置问题**
   - `browser` 路由模式会触发 SSR 处理
   - 在构建时尝试在 Node.js 环境执行浏览器代码

#### 解决方案

**1. 修复 app.config.ts**

❌ 错误写法：
```typescript
import { defineAppConfig } from '@tarojs/taro'

export default defineAppConfig({
  pages: ['pages/index/index'],
  window: { ... }
})
```

✅ 正确写法：
```typescript
export default {
  pages: ['pages/index/index'],
  window: { ... }
}
```

**2. 修复 H5 配置（config/index.ts）**

在 `h5` 配置中添加：
```typescript
h5: {
  ssr: false,           // 禁用 SSR
  router: {
    mode: 'hash',       // 使用 hash 模式而非 browser 模式
  },
  // ... 其他配置
}
```

**3. 清理缓存并重启**

```bash
# 停止所有 Taro 进程
pkill -f "taro build"

# 清理构建缓存
rm -rf dist .temp node_modules/.cache .taro-cache

# 重新启动开发服务器
npm run dev:h5
```

### 为什么使用 Hash 路由模式？

| 特性 | Browser 模式 | Hash 模式 |
|------|-------------|-----------|
| URL 格式 | `/page` | `/#/page` |
| SSR 支持 | 需要 | 不需要 |
| 构建复杂度 | 高 | 低 |
| 小程序兼容性 | 一般 | 好 |
| 推荐场景 | 需要 SEO | 低代码/内部应用 |

对于 ForgeStudio 生成的应用，**推荐使用 Hash 模式**：
- ✅ 构建更快，无 SSR 开销
- ✅ 避免 Node.js 环境问题
- ✅ 更好的小程序兼容性
- ✅ 适合大多数低代码场景

## 其他常见问题

### 编译警告：webpackExports

**症状：**
```
UnsupportedFeatureWarning: You don't need `webpackExports`...
```

**说明：** 这是 Taro 组件库的警告，不影响功能，可以忽略。

### 端口被占用

**症状：**
```
ℹ 预览端口 10086 被占用, 自动切换到空闲端口 10088
```

**说明：** Taro 会自动切换到可用端口，无需手动处理。

## 开发建议

1. **每次修改配置后重启开发服务器**
   ```bash
   # Ctrl+C 停止服务器
   # 清理缓存
   rm -rf dist .temp
   # 重新启动
   npm run dev:h5
   ```

2. **使用正确的 Taro 4.x 语法**
   - 不要使用 `defineAppConfig`
   - 不要使用 `definePageConfig`（直接导出即可）

3. **保持依赖版本一致**
   - 确保所有 `@tarojs/*` 包版本相同
   - 当前项目使用 Taro 4.0.9

## 获取帮助

如果问题仍未解决：
1. 检查 Taro 官方文档：https://docs.taro.zone
2. 搜索 Taro GitHub Issues：https://github.com/NervJS/taro/issues
3. 查看完整的错误日志，而不仅仅是错误消息
