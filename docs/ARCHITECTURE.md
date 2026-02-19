# ForgeStudio 架构设计与功能文档

> 最后更新：2026-02-19

## 目录

- [1. 项目概述](#1-项目概述)
- [2. 技术栈](#2-技术栈)
- [3. Monorepo 架构](#3-monorepo-架构)
- [4. 核心数据流](#4-核心数据流)
- [5. 协议层 (protocol)](#5-协议层-protocol)
- [6. 组件注册表 (components)](#6-组件注册表-components)
- [7. 数据绑定 (data-binding)](#7-数据绑定-data-binding)
- [8. 代码生成核心 (codegen-core)](#8-代码生成核心-codegen-core)
- [9. Taro 代码生成 (codegen-taro)](#9-taro-代码生成-codegen-taro)
- [10. 可视化编辑器 (editor)](#10-可视化编辑器-editor)
- [11. 宿主应用 (apps/web)](#11-宿主应用-appsweb)
- [12. 已实现功能清单](#12-已实现功能清单)
- [13. 设计决策与权衡](#13-设计决策与权衡)

---

## 1. 项目概述

ForgeStudio 是一个面向 **Taro 小程序** 的低代码可视化页面构建平台。用户通过拖拽组件、配置属性和数据绑定，即可生成可运行的 Taro 4.x 项目代码。

**核心理念：**

- **协议驱动 (Protocol-Driven)**：所有编辑器状态序列化为 FSP JSON Schema，代码生成读取协议而非编辑器内部状态
- **插件架构 (Plugin Architecture)**：代码生成器是可替换的插件，当前实现 Taro 4.x，未来可扩展 Vue、React Native 等
- **中间表示 (IR Layer)**：FSP → IR → 目标代码，解耦协议与目标框架

---

## 2. 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript 5.4 (strict) |
| 状态管理 | Zustand + Immer middleware |
| 拖拽 | @dnd-kit/core |
| 构建工具 | Vite 5.4 + Turborepo 2.0 |
| 包管理 | pnpm workspaces |
| 代码高亮 | highlight.js |
| 压缩下载 | JSZip |
| 目标框架 | Taro 4.0.9 |
| TypeScript 配置 | ES2020 target, ESNext modules, bundler resolution |

---

## 3. Monorepo 架构

```
forgestudio/
├── packages/
│   ├── protocol/          # FSP 协议类型定义（所有包的基础依赖）
│   ├── components/        # 组件注册表（16 个内置组件元数据）
│   ├── data-binding/      # 表达式解析器 / 求值器
│   ├── codegen-core/      # IR 中间表示 + 插件接口
│   ├── codegen-taro/      # Taro 4.x 代码生成插件
│   └── editor/            # 可视化编辑器 UI
├── apps/
│   ├── web/               # Vite 宿主应用（端口 5173）
│   └── preview-taro/      # Taro 预览项目
├── turbo.json             # Turborepo 任务配置
├── pnpm-workspace.yaml    # 工作区定义
└── tsconfig.base.json     # 共享 TypeScript 配置
```

**依赖关系：**

```
protocol ← components ← editor
protocol ← codegen-core ← codegen-taro ← editor
protocol ← data-binding ← editor
```

所有内部依赖使用 `workspace:*`，Turborepo 自动处理构建顺序。

---

## 4. 核心数据流

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  FSP Schema  │ ──→ │   Editor UI   │ ──→ │  IR 中间表示  │ ──→ │  Taro 代码    │
│   (JSON)     │ ←── │  (Zustand)    │     │ (transformer) │     │  (plugin)     │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
```

1. **FSP Schema** — 可序列化的 JSON 协议，描述页面结构、数据源、事件
2. **Editor** — Zustand store 管理 schema，拖拽/属性编辑修改 schema
3. **IR** — Transformer 将 FSP 转换为中间表示（imports、state、effects、handlers、renderTree）
4. **Codegen** — Plugin 将 IR 转换为目标框架代码（当前为 Taro 4.x）

---

## 5. 协议层 (protocol)

`@forgestudio/protocol` 是整个系统的基础，定义了所有共享类型。

### 5.1 FSPSchema — 顶层结构

```typescript
interface FSPSchema {
  version: string
  meta: { name: string; description: string }
  componentTree: ComponentNode       // 当前页面的组件树（向后兼容）
  pages?: PageDef[]                  // 多页面定义（M3）
  globalDataSources?: DataSourceDef[] // 全局数据源（跨页面共享）
}
```

### 5.2 PageDef — 页面定义

```typescript
interface PageDef {
  id: string
  name: string                       // 路由名，如 'index', 'detail'
  title: string                      // 显示标题
  path: string                       // 路由路径
  componentTree: ComponentNode       // 页面组件树
  dataSources?: DataSourceDef[]      // 页面级数据源
  formStates?: FormStateDef[]        // 页面级表单状态
  params?: PageParamDef[]            // 页面参数（用于导航传参）
  globalDataSourceRefs?: string[]    // 引用的全局数据源 ID
}
```

### 5.3 ComponentNode — 组件节点

```typescript
interface ComponentNode {
  id: string
  component: string                  // 组件类型名
  props: Record<string, unknown>     // 组件属性
  styles: Record<string, unknown>    // 样式属性
  children?: ComponentNode[]         // 子节点
  loop?: {                           // 循环渲染（M1.3）
    dataSourceId: string
    itemName?: string
  }
  events?: {                         // 事件处理（M1.4）
    [eventName: string]: Action[]
  }
  condition?: {                      // 条件渲染（M1.5）
    type: 'expression'
    expression: string
  }
}
```

### 5.4 DataSourceDef — 数据源

```typescript
interface DataSourceDef {
  id: string
  type: 'api'
  purpose: 'query' | 'mutation'      // query=查询, mutation=操作
  dataType?: 'array' | 'object'
  label?: string
  options: {
    url: string                      // 支持 {{$param.xxx}} 占位符
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
    headers?: Record<string, string>
    body?: string                    // mutation 的请求体模板
  }
  autoFetch: boolean                 // 页面加载时自动请求
  sampleData?: unknown[]             // 缓存的示例数据（预览用）
  responseFields?: FieldSchema[]     // 提取的字段元数据
  dependsOn?: string[]               // 依赖的其他数据源（M2）
}
```

### 5.5 Action — 事件动作

```typescript
type Action =
  | { type: 'navigate'; url: string; params?: Record<string, string> }
  | { type: 'showToast'; title: string; icon?: 'success' | 'error' | 'loading' | 'none' }
  | { type: 'setState'; target: string; value: string }
  | { type: 'submitForm'; url: string; method: string; fields: string[];
      successMessage?: string; errorMessage?: string }
```

### 5.6 工具函数

| 函数 | 用途 |
|------|------|
| `createNode()` | 创建组件节点（自动生成 ID） |
| `findNodeById()` | 在树中查找节点 |
| `removeNode()` / `moveNode()` | 树操作 |
| `createEmptySchema()` | 创建空 schema（含默认首页） |
| `addDataSourceToPage()` | 页面级数据源 CRUD |
| `addGlobalDataSource()` | 全局数据源 CRUD |
| `getEffectiveDataSources()` | 获取页面有效数据源（页面级 + 引用的全局） |

---

## 6. 组件注册表 (components)

`@forgestudio/components` 管理 16 个内置组件的元数据。

### 6.1 组件列表

| 分类 | 组件 | 说明 | 支持事件 |
|------|------|------|----------|
| **布局** | Page | 页面根容器 | — |
| | View | 通用容器 | — |
| | ScrollView | 滚动容器 | — |
| | Swiper | 轮播容器 | — |
| | SwiperItem | 轮播项 | — |
| | Modal | 弹窗 | — |
| **基础** | Text | 文本 | — |
| | Image | 图片 | — |
| | Button | 按钮 | onClick |
| | Input | 输入框 | onChange |
| | Switch | 开关 | onChange |
| | Textarea | 多行输入 | onChange |
| **数据** | List | 列表容器（循环渲染） | — |
| | Card | 卡片容器 | — |
| | Form | 表单容器 | onSubmit |

### 6.2 ComponentMeta 结构

```typescript
interface ComponentMeta {
  name: string                       // 组件标识
  title: string                      // 中文显示名
  icon: string                       // 图标名
  category: 'basic' | 'layout' | 'data'
  allowChildren: boolean             // 是否允许子节点
  allowedChildComponents?: string[]  // 限制子组件类型（如 Swiper 只允许 SwiperItem）
  defaultProps: Record<string, unknown>
  defaultStyles: Record<string, unknown>
  propsSchema: PropDefinition[]      // 属性编辑器配置
  supportedEvents?: string[]         // 支持的事件列表
}
```

### 6.3 注册表 API

```typescript
getComponentMeta(name)        // 获取单个组件元数据
getAllComponentMetas()         // 获取所有组件
getDraggableComponents()      // 获取可拖拽组件（排除 Page）
```

---

## 7. 数据绑定 (data-binding)

`@forgestudio/data-binding` 提供表达式解析和安全求值。

### 7.1 表达式语法

```
{{$state.count}}              // 表单状态变量
{{$item.title}}               // 循环项字段
{{$ds.productList.data}}      // 数据源字段
{{$param.id}}                 // 页面参数
{{price > 100 ? '贵' : '便宜'}}  // 复杂表达式
{{stock === 0}}               // 比较表达式
{{a + b * 2}}                 // 算术表达式
```

### 7.2 解析器 (parser)

- `parseExpression(template)` — 将模板拆分为 `ParsedPart[]`
- 区分三种类型：`static`（静态文本）、`expression`（路径表达式）、`complex`（含运算符）
- 路径表达式无深度限制

### 7.3 求值器 (evaluator)

- `evaluate(template, context)` — 安全求值
- **安全实现**：使用递归下降解析器，不使用 `eval()` 或 `new Function()`
- **运算符优先级**（从低到高）：
  1. 三元 `? :`
  2. 逻辑或 `||`
  3. 逻辑与 `&&`
  4. 等值 `=== !== == !=`
  5. 比较 `> < >= <=`
  6. 加减 `+ -`
  7. 乘除 `* / %`
  8. 一元 `! -`
  9. 基础值（变量、数字、字符串、布尔、null、括号）

### 7.4 上下文结构

```typescript
interface ExpressionContext {
  $item?: Record<string, any>    // 循环项
  $ds?: Record<string, any>      // 数据源
  $state?: Record<string, any>   // 表单状态
  $param?: Record<string, any>   // 页面参数
}
```

---

## 8. 代码生成核心 (codegen-core)

`@forgestudio/codegen-core` 定义 IR 中间表示和插件接口。

### 8.1 IR 类型体系

```
IRProject
  └── IRPage[]
        ├── imports: IRImport[]          // 导入声明
        ├── stateVars: IRStateVar[]      // useState 声明
        ├── effects: IREffect[]          // useEffect 钩子
        ├── handlers: IRHandler[]        // 事件处理函数
        ├── renderTree: IRRenderNode     // 渲染树
        └── styles: IRStyleSheet         // 样式表
```

### 8.2 Transformer — FSP → IR

`transformFSPtoIR(schema)` 执行以下转换：

1. **数据源 ID 清洗** — 将中文等非 ASCII 字符转换为合法 JS 标识符
2. **拓扑排序** — 按 `dependsOn` 解析数据源依赖顺序
3. **引用收集** — 只包含组件树中实际引用的数据源
4. **状态变量生成** — 从数据源和表单状态生成 `useState` 声明
5. **副作用生成** — 为 `autoFetch` 数据源生成 `useEffect` 钩子
6. **事件处理器生成** — 从组件事件生成处理函数
7. **表达式转换** — `{{$state.x}}` → JSX `{x}`
8. **样式提取** — 内联样式转换为 CSS class

### 8.3 插件接口

```typescript
interface CodegenPlugin {
  name: string
  generate(ir: IRProject): GeneratedProject
  generatePage?(ir: IRPage): { tsx: string; scss: string }
}

interface GeneratedProject {
  files: GeneratedFile[]
}
```

### 8.4 样式工具

- 支持 48 个 CSS 属性（含 position、overflow、opacity、boxShadow 等）
- 数值属性自动添加 `px` 后缀
- camelCase → kebab-case 转换

---

## 9. Taro 代码生成 (codegen-taro)

`@forgestudio/codegen-taro` 实现 Taro 4.x 代码生成插件。

### 9.1 生成的项目结构

```
generated-project/
├── package.json                    # Taro 4.0.9 依赖
├── tsconfig.json
├── babel.config.js
├── project.config.json             # 微信小程序配置
├── config/
│   ├── index.ts                    # Taro 构建配置
│   ├── dev.ts
│   └── prod.ts
├── types/global.d.ts
└── src/
    ├── app.tsx                     # 应用入口
    ├── app.config.ts               # 路由配置
    ├── app.scss                    # 全局样式
    ├── index.html
    └── pages/
        └── [pageName]/
            ├── index.tsx           # 页面组件
            ├── index.scss          # 页面样式
            └── index.config.ts     # 页面配置
```

### 9.2 组件映射

| FSP 组件 | Taro 组件 | 说明 |
|----------|-----------|------|
| View | View | 直接映射 |
| Text | Text | 直接映射 |
| Image | Image | `fit` → `mode` 属性转换 |
| Button | Button | 直接映射 |
| Input | Input | 直接映射 |
| Switch | Switch | 直接映射 |
| Textarea | Textarea | `maxLength` → `maxlength` |
| ScrollView | ScrollView | 直接映射 |
| Swiper / SwiperItem | Swiper / SwiperItem | 直接映射 |
| List / Card | View | 容器组件映射为 View |
| Form | Form | 直接映射 |
| Modal | View | 占位映射 |

### 9.3 表达式转换

```
{{$state.count}}        →  {count}
{{$item.title}}         →  {item.title}
{{$ds.products.data}}   →  {productsData}
{{$param.id}}           →  {id}  (从 URL 参数获取)
```

### 9.4 代码生成特性

- 自动生成 `useState` 钩子
- 自动生成 `useEffect` 数据获取（含依赖检测）
- 生成 `extractList` 辅助函数（从各种 API 响应格式提取数组）
- 循环渲染使用 `.map()` + `item` 参数
- 条件渲染使用 `&&` 短路
- 事件处理器自动检测参数（`e` / `item`）

---

## 10. 可视化编辑器 (editor)

`@forgestudio/editor` 是核心 UI 包，提供完整的可视化编辑体验。

### 10.1 状态管理 (Zustand Store)

```typescript
// 状态结构
{
  schema: FSPSchema                  // 完整 schema
  selectedNodeId: string | null      // 当前选中节点
  generatedProject: GeneratedProject | null
  rightPanelTab: 'props' | 'datasource' | 'code'
  currentPageId: string | null       // 当前编辑页面
  history: HistoryEntry[]            // 撤销/重做历史（最多 50 条）
  historyIndex: number
  clipboard: ComponentNode | null    // 剪贴板
}
```

**中间件栈：** `create → persist → immer`

- **Immer**：安全的不可变更新
- **Persist**：自动保存 schema 和 currentPageId 到 localStorage
- **History**：结构性操作立即记录，属性/样式修改 300ms 防抖合并

### 10.2 编辑器布局

```
┌─────────────────────────────────────────────────────┐
│                     Toolbar                          │
│  [撤销] [重做] [复制] [粘贴] [导入] [导出] [生成代码]  │
├──────────┬──────────────────────┬───────────────────┤
│ 左侧面板  │      Canvas          │    右侧面板        │
│          │                      │                   │
│ 页面管理  │   ┌──────────────┐   │  属性 / 数据源     │
│ 组件面板  │   │  Page        │   │  / 代码预览        │
│ 组件树   │   │  ├─ View     │   │                   │
│          │   │  │  ├─ Text  │   │  [属性编辑器]      │
│          │   │  │  └─ Image │   │  [样式编辑器]      │
│          │   │  └─ Button   │   │  [事件编辑器]      │
│          │   └──────────────┘   │  [条件/循环]       │
└──────────┴──────────────────────┴───────────────────┘
```

### 10.3 面板功能

**页面管理 (PageManager)**
- 多页面 CRUD
- 页面切换（保存/恢复 componentTree）
- 内联编辑页面名称和标题
- 至少保留一个页面

**组件面板 (ComponentPanel)**
- 按分类分组：布局、基础、数据
- 拖拽到画布添加组件
- React.memo 优化渲染

**组件树 (TreePanel)**
- 层级树形视图
- 拖拽排序（防止循环依赖）
- 折叠/展开分支
- 显示组件名 + ID

**属性面板 (PropsPanel)**
- 根据 `propsSchema` 动态生成编辑器
- 样式编辑器：间距、布局、排版、边框
- 事件编辑器：配置 navigate / showToast / setState / submitForm
- 循环配置：绑定数据源
- 条件配置：表达式编辑器

**数据源面板 (DataSourcePanel)**
- 全局 / 页面级数据源管理
- 模板快速创建（列表、详情、提交）
- API 测试（通过 Vite 代理）
- 字段自动提取
- 依赖关系配置
- 导入/导出 JSON

**代码预览 (CodePreviewPanel)**
- 文件树导航
- 语法高亮（highlight.js）
- 复制到剪贴板
- ZIP 下载

### 10.4 渲染器系统

**NodeRenderer** — 递归渲染组件树：
- 构建表达式上下文（$state, $item, $ds, $param）
- 条件渲染：求值表达式，不满足时显示占位符
- 循环渲染：预览前 3 条数据，第一条可编辑
- 将 FSP 组件映射为 HTML 元素预览

**EditWrapper** — 编辑交互层：
- 点击选中
- 悬停高亮
- 拖放目标区域
- 选中时自动滚动到视图

### 10.5 属性编辑器 (Setters)

| Setter | 用途 |
|--------|------|
| StringSetter | 文本输入，支持切换表达式模式 |
| NumberSetter | 数字输入 |
| BooleanSetter | 复选框 |
| EnumSetter | 下拉选择 |
| ColorSetter | 颜色选择器 |
| ExpressionSetter | 可视化表达式构建器 |
| SpacingSetter | 内外边距（支持联动/独立模式） |
| LayoutSetter | Flex 布局属性 |
| TypographySetter | 字体大小、粗细、行高、对齐 |
| BorderSetter | 边框宽度、颜色、样式、圆角 |

### 10.6 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl/Cmd + Z` | 撤销 |
| `Ctrl/Cmd + Shift + Z` / `Ctrl + Y` | 重做 |
| `Ctrl/Cmd + C` | 复制节点 |
| `Ctrl/Cmd + V` | 粘贴节点 |
| `Delete` / `Backspace` | 删除节点 |
| `Ctrl/Cmd + S` | 自动保存提示 |
| `Ctrl/Cmd + Shift + S` | 导出 Schema |

### 10.7 工具函数

- **field-extractor** — 从 API 响应中提取数组和字段元数据
- **param-analyzer** — 分析组件树和数据源中的 `{{$param.xxx}}` 引用
- **datasource-templates** — 预定义数据源模板（列表、详情、提交）

---

## 11. 宿主应用 (apps/web)

极简的 Vite 宿主，仅 15 行源码：

```typescript
// App.tsx
import { EditorLayout } from '@forgestudio/editor'
export default function App() {
  return <EditorLayout />
}
```

**API 代理配置：**

| 路径 | 目标 |
|------|------|
| `/api-proxy/reqres` | https://reqres.in |
| `/api-proxy/dummyjson` | https://dummyjson.com |
| `/api-proxy/jsonplaceholder` | https://jsonplaceholder.typicode.com |

---

## 12. 已实现功能清单

### M1.1 — 协议 + 静态编辑器
- [x] FSP 协议类型定义
- [x] 8 个基础组件（Page, View, Text, Image, Button, Input, List, Card）
- [x] 三栏布局拖拽编辑器
- [x] JSON Schema 导入/导出

### M1.2 — 代码生成
- [x] IR 中间表示层
- [x] Taro 4.x 项目生成（15+ 脚手架文件）
- [x] 代码预览面板（语法高亮）
- [x] ZIP 下载

### M1.3 — 数据绑定
- [x] 表达式解析器（`{{$item.field}}` 语法）
- [x] List/Card 循环渲染
- [x] 数据源管理 UI
- [x] API 测试 + 自动填充 sampleData
- [x] Vite 代理（3 个公共 API）

### M1.4 — 事件处理
- [x] 4 种 Action 类型（navigate, showToast, setState, submitForm）
- [x] Button onClick / Input onChange 事件
- [x] 事件配置 UI
- [x] 代码生成输出事件处理器

### M1.5 — 高级组件与表达式
- [x] 8 个新组件（Switch, Textarea, ScrollView, Form, Swiper, SwiperItem, Modal）
- [x] 条件渲染（表达式求值）
- [x] 复杂表达式支持（比较、逻辑、三元、算术）

### M1.6 — 表单提交
- [x] submitForm Action
- [x] Form onSubmit 事件
- [x] 表单状态管理（FormStateDef）
- [x] 表单字段收集与提交

### M2 — 多数据源与依赖
- [x] 数据源依赖关系（dependsOn）
- [x] 拓扑排序初始化
- [x] ExpressionSetter 可视化字段选择器
- [x] 商品详情页演示场景

### M3 — 多页面与编辑器增强
- [x] 多页面管理（CRUD）
- [x] 页面切换与状态保持
- [x] 撤销/重做（最多 50 步）
- [x] 复制/粘贴（ID 重新生成）
- [x] 键盘快捷键
- [x] 组件树拖拽排序

### M4 — 页面级数据源
- [x] 数据源从全局迁移到页面级
- [x] 全局数据源 + 页面引用机制
- [x] 向后兼容迁移（导入旧 schema）

---

## 13. 设计决策与权衡

### 为什么选择 FSP 协议而非直接操作 AST？

FSP 是一个高层抽象，描述"用户意图"而非"代码结构"。这使得：
- 同一份 schema 可以生成不同框架的代码
- 编辑器不需要理解目标框架的细节
- Schema 可以轻松序列化、传输、版本化

### 为什么需要 IR 中间层？

IR 将"协议语义"转换为"代码语义"，解耦了两端：
- Transformer 处理通用逻辑（依赖排序、表达式转换、样式提取）
- Plugin 只需关注目标框架的映射
- 新增目标框架只需实现 Plugin 接口

### 为什么用 Zustand 而非 Redux？

- 更少的样板代码
- 天然支持 Immer middleware
- 选择器模式减少不必要的重渲染
- 与 React 18 并发模式兼容

### 为什么用递归下降解析器而非 eval？

- **安全**：`new Function()` 和 `eval()` 存在代码注入风险
- **可控**：只支持白名单运算符，不会执行任意代码
- **可调试**：每个运算符的行为都是显式定义的

### 数据源为什么分全局和页面级？

- 全局数据源适合跨页面共享的数据（如用户信息、配置）
- 页面级数据源适合页面特有的数据（如商品列表、详情）
- 引用机制让页面按需使用全局数据源，避免不必要的请求
