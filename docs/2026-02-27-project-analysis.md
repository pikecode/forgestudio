# ForgeStudio 项目分析

> 创建日期：2026-02-27
> 分析范围：架构设计、核心能力、已实现功能

---

## 一、项目定位

**ForgeStudio** 是一个面向 **Taro 小程序** 的低代码可视化页面构建平台，采用 **协议驱动架构**。

### 核心理念

```
拖拽搭建 → FSP Schema (JSON协议) → IR中间层 → Taro 4.x 代码
```

**协议是核心产品**，代码生成器是可插拔的下游消费者。这意味着同一份协议可以同时生成 Taro 源码、UniApp 源码，甚至未来的 Flutter 代码。

---

## 二、架构设计

### 2.1 分层架构

```
┌─────────────────────────────────────────────────────────────┐
│                      应用层 (Apps)                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ Web 编辑器 │  │ 预览服务  │  │ 管理后台  │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
├─────────────────────────────────────────────────────────────┤
│                      编辑器内核                              │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐              │
│  │拖拽引擎 │ │属性面板 │ │组件注册 │ │数据绑定 │              │
│  └────────┘ └────────┘ └────────┘ └────────┘              │
├─────────────────────────────────────────────────────────────┤
│              ★ FSP 协议层 (ForgeStudio Protocol) ★          │
│         框架无关的页面描述协议 — 整个系统的核心枢纽            │
├─────────────────────────────────────────────────────────────┤
│                    代码生成服务层                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ FSP → Taro   │  │ FSP → UniApp │  │ FSP → 其他   │      │
│  │  代码生成插件  │  │  代码生成插件  │  │  代码生成插件  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 关键设计决策

| 对比项 | 直接生成 | 协议优先 |
|--------|---------|---------|
| 开发速度 | 初期快 | 初期稍慢（需设计协议） |
| 多框架支持 | 每加一个框架重写生成逻辑 | 只需新增一个生成插件 |
| 协作模式 | 编辑器和生成器强耦合 | 编辑器团队和生成器团队可独立开发 |
| 第三方扩展 | 困难 | 任何人可基于协议开发生成插件 |
| 商业价值 | 单一工具 | 协议本身成为标准，生态价值更大 |

### 2.3 工程结构

**Monorepo:** pnpm workspaces + Turborepo. 内部依赖使用 `workspace:*`.

```
forgestudio/
├── packages/
│   ├── protocol/          # ★ FSP 协议定义、校验、工具函数
│   ├── components/        # 16个内置组件元数据
│   ├── data-binding/      # 表达式解析器/求值器
│   ├── codegen-core/      # IR层 + 插件接口
│   ├── codegen-taro/      # Taro 4.x 代码生成插件
│   └── editor/            # 可视化编辑器 UI
├── apps/
│   ├── web/               # 编辑器 Web 应用 (Vite + React)
│   └── preview-taro/      # Taro 项目用于测试生成代码
└── docs/                  # 文档
```

---

## 三、核心包说明

### packages/protocol
FSP 协议类型定义，是所有其他包的基础依赖。

定义核心类型：
- `FSPSchema` - 完整页面协议
- `ComponentNode` - 组件节点
- `DataSourceDef` - 数据源定义
- `ActionDef` - 事件动作定义

### packages/components
16个内置组件的元数据注册：

| 分类 | 组件 |
|------|------|
| 基础 | View, Text, Image, Button |
| 表单 | Input, Textarea, Switch, Form |
| 布局 | ScrollView, Swiper, SwiperItem |
| 高级 | List, Card, Modal, Page |

组件注册模式：每个组件导出 `ComponentMeta`，通过 `registry.ts` 统一管理。

### packages/data-binding
表达式解析器和求值器：

**支持的语法：**
- 数据源引用：`{{$ds.goods.data.title}}`
- 列表项：`{{$item.title}}`
- 页面状态：`{{$state.count}}`
- URL参数：`{{$param.id}}`
- 运算符：算术、比较、逻辑、三元

**安全设计：** 使用递归下降解析器，不使用 `eval`，确保代码注入安全。

### packages/codegen-core
IR（中间表示）层 + 插件接口：

```
FSP Schema → Transformer → IR → Plugin → Target Code
```

**关键类型：**
- `IRPage` - 页面级 IR
- `IRComponentNode` - 组件节点 IR
- `IRExpression` - 表达式 IR
- `CodegenPlugin` - 插件接口

### packages/codegen-taro
Taro 4.x 代码生成插件：

**组件映射表：**
```
FSP Page      → View (根容器)
FSP View      → @tarojs/components/View
FSP Text      → @tarojs/components/Text
FSP Image     → @tarojs/components/Image
...
```

**生成文件：**
- `src/pages/index/index.tsx` - 页面组件
- `src/pages/index/index.scss` - 样式文件
- `src/app.ts` - 应用入口
- `src/app.config.ts` - 路由配置
- `package.json` - 依赖配置

### packages/editor
可视化编辑器 UI：

**状态管理：** Zustand，支持撤销/重做（最多50步）

**核心模块：**
- `store.ts` - 全局状态管理
- `renderer/` - 组件渲染系统
- `setters/` - 属性编辑器

**技术栈：**
- React 18 + TypeScript
- @dnd-kit - 拖拽
- Monaco Editor - 代码预览
- TailwindCSS - 样式

---

## 四、已实现功能（M1-M4）

### M1.1 - 协议定义 + 静态编辑器
- FSP 协议 v1.0
- 拖拽搭建页面
- 组件属性配置
- 样式编辑器
- JSON 导入/导出

### M1.2 - 静态页面代码生成
- IR 中间表示层
- Taro 代码生成插件
- 生成 TSX + SCSS
- 代码预览面板
- 项目 ZIP 下载

### M1.3 - 数据绑定 + 动态组件
- 数据源配置（API 类型）
- Mock 数据编辑
- 表达式引擎
- List + Card 组件
- 循环渲染预览

### M1.4 - 事件处理
- 4种 Action 类型：
  - `navigate` - 页面跳转
  - `showToast` - 提示框
  - `setState` - 修改状态
  - `submitForm` - 表单提交

### M1.5 - 高级组件
- ScrollView - 滚动容器
- Swiper + SwiperItem - 轮播图
- Modal - 弹窗
- Form - 表单容器

### M1.6 - 表单提交
- Form 组件数据收集
- submitForm Action
- API 请求发送

### M2 - 多数据源支持
- 多个 API 数据源
- 数据源依赖关系（拓扑排序）
- 静态数据源
- 页面状态作为数据源

### M3 - 多页面 + 撤销重做
- 多页面项目管理
- 页面路由配置生成
- 撤销/重做（最多50步）
- 页面切换

### M4 - 页面级数据源
- 页面��据源隔离
- 页面间数据共享
- 更清晰的数据源管理

---

## 五、演示场景

项目包含完整的商品详情页演示 (`demo-product-detail.json`)：

### 功能演示
1. **商品信息展示** - 数据绑定 `{{$ds.goods.data}}`
2. **用户评论列表** - 循环渲染 + 条件渲染
3. **购买表单** - 表单提交 + 状态管理
4. **页面交互** - 事件处理（跳转、提示、状态修改）

### 快速体验
```bash
# 启动项目
pnpm install
pnpm dev

# 访问 http://localhost:5173
# 点击 "导入 JSON" 选择 demo-product-detail.json
```

---

## 六、技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | React 18 + TypeScript | 与 Taro 生态一致 |
| 状态管理 | Zustand | 轻量，适合编辑器复杂状态 |
| 拖拽 | @dnd-kit | 现代化，支持嵌套容器 |
| 样式 | TailwindCSS | 编辑器 UI |
| 代码编辑 | Monaco Editor | 协议/代码预览 |
| 构建 | Vite + Turborepo | Monorepo + 快速构建 |
| 代码生成 | @babel/types + @babel/generator | AST 转换 |
| 目标框架 | Taro 4.x | 小程序/H5 多端 |

---

## 七、能力总结

### 编辑器能力
| 能力 | 描述 |
|------|------|
| **16个组件** | Page, View, Text, Image, Button, Input, Switch, Textarea, ScrollView, Swiper, SwiperItem, Modal, List, Card, Form |
| **拖拽搭建** | 从组件面板拖入画布，支持嵌套和排序 |
| **属性配置** | 根据组件元数据动态渲染表单 |
| **样式编辑** | 支持尺寸、间距、字体、背景、边框、布局 |
| **数据绑定** | `{{$item.field}}`, `{{$state.xxx}}`, `{{$ds.xxx}}`, `{{$param.xxx}}` |
| **表达式** | 算术/比较/逻辑/三元运算符 |
| **事件处理** | navigate, showToast, setState, submitForm |
| **多页面管理** | 页面列表、切换、路由配置 |
| **撤销重做** | 最多50步历史记录 |
| **实时预览** | Mock 数据预览循环列表 |

### 代码生成能力
| 能力 | 描述 |
|------|------|
| **完整项目** | 生成可运行的 Taro 4.x 项目 |
| **TSX + SCSS** | 类型安全的组件代码 |
| **状态管理** | useState + useEffect |
| **API 请求** | Taro.request 自动生成 |
| **循环渲染** | map 函数正确生成 |
| **条件渲染** | 逻辑表达式转换为条件判断 |
| **事件处理** | 完整的事件处理函数 |
| **路由配置** | app.config.ts 自动生成 |
| **样式文件** | SCSS 文件与组件分离 |

### 技术亮点
1. **协议驱动** - FSP Schema 可序列化、版本化、跨框架
2. **IR 中间层** - 解耦协议与目标框架
3. **安全表达式** - 递归下降解析器，不使用 eval
4. **拓扑排序** - 自动处理数据源依赖关系
5. **实时预览** - 编辑器内 Mock 数据预览循环列表
6. **撤销重做** - Zustand 历史栈，支持 Ctrl+Z/Ctrl+Shift+Z

---

## 八、本地启动

### 安装依赖
```bash
pnpm install
```

### 启动开发服务器
```bash
pnpm dev
```

编辑器访问地址：http://localhost:5173

### 导入演示
1. 点击顶部 "导入 JSON" 按钮
2. 选择项目根目录下的 `demo-product-detail.json`
3. 查看完整的商品详情页演示

### 生成代码
1. 在编辑器中搭建页面
2. 点击右侧 "代码预览" Tab
3. 查看生成的 TSX 和 SCSS
4. 点击 "下载项目" 获取 ZIP 包

---

## 九、后续规划

根据 `PLANNING.md`，项目规划了 5 个里程碑：

- **M1** ✅ 最小完整产品（已完成）
- **M2** ✅ 完整数据能力 + 事件交互（已完成）
- **M3** ✅ 编辑体验完善 + 模板系统（已完成）
- **M4** ✅ 页面级数据源（已完成）
- **M5** 🚧 SaaS 平台 + 商业化（规划中）

### M5 规划
- 用户系统（注册、登录、OAuth）
- 项目云端存储
- 团队协作
- 组件市场
- 模板市场
- 在线预览和分享
- 付费体系

---

## 十、项目特色

1. **协议驱动，框架无关** - 唯一支持同一协议生成多框架代码的平台
2. **生成源码而非黑盒** - 开发者可二次修改，降低迁移成本
3. **渐进式价值** - 从免费编辑器到付费 SaaS，用户自然升级
4. **完整的编辑体验** - 撤销重做、多页面、实时预览
5. **安全的数据绑定** - 不使用 eval，解析器确保代码安全
