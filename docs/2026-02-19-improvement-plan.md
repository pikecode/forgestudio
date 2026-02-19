# ForgeStudio 改进规划

> 创建日期：2026-02-19
> 基于：项目全面 Review 和架构分析

本文档将已识别的问题按优先级分为三个阶段，每个阶段内的任务按依赖关系排序。

---

## 阶段一：修复正确性问题（P0）

影响数据一致性和代码生成正确性的问题，必须优先修复。

### 1.1 消除 componentTree 双写

**问题：** `schema.componentTree` 和 `schema.pages[x].componentTree` 存在两份数据，依赖 `syncCurrentPageTree()` 手动同步，遗漏即导致数据不一致。

**方案：**
- 移除 `schema.componentTree` 作为独立存储
- 改为 computed getter：`get componentTree() { return pages[currentPageIndex].componentTree }`
- 所有读取 componentTree 的地方改为通过 `getCurrentPageTree()` 获取
- 移除所有 `syncCurrentPageTree()` 调用

**涉及文件：**
- `packages/protocol/src/types.ts` — FSPSchema 类型调整
- `packages/protocol/src/utils.ts` — 工具函数适配
- `packages/editor/src/store.ts` — 移除 syncCurrentPageTree，重构所有 action
- `packages/editor/src/renderer/Renderer.tsx` — 读取方式调整
- `packages/editor/src/components/Canvas.tsx`
- `packages/codegen-core/src/transformer.ts` — 兼容处理

**注意：** 需要保持 `importSchema` 对旧 schema 的向后兼容。

---

### 1.2 修复表达式转换顺序 bug

**问题：** `generate-tsx.ts` 中 `convertExprVars` 的两个 replace 顺序错误，第二个永远不会执行。

**当前代码：**
```typescript
.replace(/\$ds\.([^.]+)\.([^.\s}]+)/g, '$1Data?.$2')  // 先匹配所有
.replace(/\$ds\.(\w+)\.data/g, '$1Data')               // 永远不执行
```

**修复：** 调换顺序，先匹配特定模式再匹配通用模式：
```typescript
.replace(/\$ds\.(\w+)\.data$/g, '$1Data')              // 先匹配 .data
.replace(/\$ds\.([^.]+)\.([^.\s}]+)/g, '$1Data?.$2')   // 再匹配其他字段
```

**涉及文件：**
- `packages/codegen-taro/src/generate-tsx.ts`

---

### 1.3 修复 useEffect 依赖数组

**问题：** 所有生成的 useEffect 依赖数组都是 `[]`，即使数据源有 `dependsOn` 关系，依赖变化时不会重新请求。

**方案：**
- IR 的 `IREffect` 增加 `dependencies: string[]` 字段
- Transformer 根据 `dependsOn` 生成正确的依赖数组
- TSX 生成器输出依赖数组：`useEffect(() => { ... }, [dep1Data, dep2Data])`

**涉及文件：**
- `packages/codegen-core/src/ir.ts` — IREffect 类型
- `packages/codegen-core/src/transformer.ts` — 生成依赖
- `packages/codegen-taro/src/generate-tsx.ts` — 输出依赖数组

---

## 阶段二：改进可用性（P1）

影响用户操作效率和体验的问题。

### 2.1 事件 Action 支持编辑

**问题：** 已配置的 Action 只能删除重建，不能编辑。

**方案：**
- 点击已有 Action 进入编辑模式（复用 ActionEditor）
- 编辑时回填当前 Action 的参数
- 保存时替换对应索引的 Action
- 支持拖拽排序 Action 列表

**涉及文件：**
- `packages/editor/src/components/props-panel/EventsSection.tsx`

---

### 2.2 导航支持多参数

**问题：** navigate Action UI 只支持单个 key-value 参数。

**方案：**
- 改为动态参数列���，支持添加/删除多个 key-value 对
- 每行一个参数：`[参数名输入框] [参数值输入框] [删除按钮]`
- 底部"添加参数"按钮

**涉及文件：**
- `packages/editor/src/components/props-panel/EventsSection.tsx`

---

### 2.3 生成代码增加 loading/error 处理

**问题：** 生成的 fetch 代码没有 loading 状态和错误处理。

**方案：**
- 每个 query 数据源自动生成 `xxxLoading` 和 `xxxError` state
- useEffect 中添加 try/catch 和 loading 状态管理
- 渲染树中为 List 组件生成 loading/empty/error 三种状态的 UI

**生成代码示例：**
```typescript
const [productsData, setProductsData] = useState<any[]>([])
const [productsLoading, setProductsLoading] = useState(false)

useEffect(() => {
  setProductsLoading(true)
  Taro.request({ url: '...' })
    .then(res => { setProductsData(extractList(res.data)); })
    .catch(err => { console.error(err); Taro.showToast({ title: '加载失败', icon: 'error' }); })
    .finally(() => { setProductsLoading(false); })
}, [])
```

**涉及文件：**
- `packages/codegen-core/src/ir.ts` — IRStateVar 增加 loading 类型
- `packages/codegen-core/src/transformer.ts` — 生成 loading state 和 error 处理
- `packages/codegen-taro/src/generate-tsx.ts` — 输出 loading/error 代码

---

### 2.4 数据源请求头配置 UI

**问题：** `DataSourceDef.options.headers` 存在但 UI 未暴露。

**方案：**
- 在数据源编辑表单中增加"请求头"折叠区域
- 动态 key-value 列表编辑器
- 预设常用 header（Content-Type, Authorization）

**涉及文件：**
- `packages/editor/src/components/DataSourcePanel.tsx`

---

### 2.5 条件渲染可视化构建器

**问题：** 条件渲染只有文本输入框，需要手写表达式。

**方案：**
- 复用 ExpressionSetter 的可视化模式
- 提供"变量 + 运算符 + 值"的可视化构建
- 保留手动输入模式作为高级选项

**涉及文件：**
- `packages/editor/src/components/props-panel/AppearanceSection.tsx`
- 可复用 `packages/editor/src/setters/index.tsx` 中的 ExpressionSetter

---

### 2.6 extractList 支持深层嵌套

**问题：** 只检查第一层对象值，不支持 `{ data: { items: [] } }` 格式。

**方案：**
- 递归搜索（限制深度 3 层）
- 优先匹配常见 key：`data`, `list`, `items`, `results`, `records`
- 回退到第一个找到的数组

**涉及文件：**
- `packages/codegen-taro/src/generate-tsx.ts`
- `packages/editor/src/utils/field-extractor.ts`（编辑器侧同步改进）

---

### 2.7 页面组件名使用页面名称

**问题：** 所有生成的页面组件都叫 `Index`。

**方案：**
- 根据 `PageDef.name` 生成 PascalCase 组件名
- 如 `detail` → `export default function Detail()`
- `product-list` → `export default function ProductList()`

**涉及文件：**
- `packages/codegen-taro/src/generate-tsx.ts`

---

## 阶段三：增强竞争力（P2）

提升产品完整度和专业度的功能。

### 3.1 表单验证机制

**方案：**
- Protocol 层：`FormStateDef` 增加 `rules` 字段
  ```typescript
  rules?: {
    required?: boolean
    minLength?: number
    maxLength?: number
    pattern?: string  // 正则
    message?: string  // 错误提示
  }[]
  ```
- Editor：属性面板增加验证规则配置 UI
- Codegen：生成验证逻辑和错误提示 UI

**涉及文件：**
- `packages/protocol/src/types.ts`
- `packages/editor/src/components/StatePanel.tsx`
- `packages/codegen-core/src/transformer.ts`
- `packages/codegen-taro/src/generate-tsx.ts`

---

### 3.2 List 分页/加载更多

**方案：**
- Protocol 层：`DataSourceDef` 增加分页配置
  ```typescript
  pagination?: {
    type: 'page' | 'cursor'
    pageSize: number
    pageParam?: string   // 页码参数名
    sizeParam?: string   // 每页数量参数名
  }
  ```
- Editor：数据源面板增加分页配置区域
- Codegen：生成分页 state、加载更多函数、ScrollView 触底事件

**涉及文件：**
- `packages/protocol/src/types.ts`
- `packages/editor/src/components/DataSourcePanel.tsx`
- `packages/codegen-core/src/transformer.ts`
- `packages/codegen-taro/src/generate-tsx.ts`

---

### 3.3 Schema 版本迁移框架

**方案：**
- 定义版本号规范（semver）
- 创建 `packages/protocol/src/migrations/` 目录
- 每个版本一个迁移函数：`migrate_1_0_to_1_1(schema)`
- `importSchema` 时自动检测版本并链式执行迁移

**涉及文件：**
- `packages/protocol/src/migrations/` — 新建
- `packages/protocol/src/utils.ts` — 迁移入口
- `packages/editor/src/store.ts` — importSchema 调用迁移

---

### 3.4 组件渲染器 Registry 化

**方案：**
- 创建 `ComponentRendererRegistry`
- 每个组件注册自己的渲染函数
- Renderer.tsx 从 registry 查找渲染器，移除 switch
- 支持第三方组件注册自定义渲染器

**涉及文件：**
- `packages/editor/src/renderer/registry.ts` — 新建
- `packages/editor/src/renderer/renderers/` — 每个组件一个文件
- `packages/editor/src/renderer/Renderer.tsx` — 重构

---

### 3.5 DataSourcePanel 拆分

**方案：**
- `DataSourceList.tsx` — 数据源列表展示
- `DataSourceForm.tsx` — 创建/编辑表单
- `DataSourceTester.tsx` — API 测试
- `DataSourceTemplateSelector.tsx` — 模板选择（已存在，整合）
- `GlobalDataSourceSection.tsx` — 全局数据源区域

**涉及文件：**
- `packages/editor/src/components/DataSourcePanel.tsx` — 拆分
- `packages/editor/src/components/datasource/` — 新建目录

---

### 3.6 添加核心单元测试

**方案：**
- 配置 Vitest 测试框架
- 优先覆盖纯函数模块：
  1. `data-binding` — 表达式解析和求值（覆盖所有运算符和边界情况）
  2. `protocol/utils` — 树操作函数
  3. `codegen-core/transformer` — FSP → IR 转换
  4. `codegen-taro/generate-tsx` — 代码生成输出

**涉及文件：**
- `package.json` — 添加 vitest 依赖和 test script
- `packages/data-binding/src/__tests__/` — 新建
- `packages/protocol/src/__tests__/` — 新建
- `packages/codegen-core/src/__tests__/` — 新建
- `packages/codegen-taro/src/__tests__/` — 新建

---

## 实施顺序

```
阶段一（P0）                阶段二（P1）                 阶段三（P2）
┌──────────────┐          ┌──────────────┐           ┌──────────────┐
│ 1.1 双写消除   │──┐       │ 2.1 Action编辑 │           │ 3.1 表单验证   │
│ 1.2 表达式bug  │  │       │ 2.2 多参数导航  │           │ 3.2 List分页   │
│ 1.3 Effect依赖 │  │       │ 2.3 loading处理 │──┐        │ 3.3 版本迁移   │
└──────────────┘  │       │ 2.4 请求头配置  │  │        │ 3.4 渲染器注册  │
                  ├──→    │ 2.5 条件构建器  │  ├──→     │ 3.5 面板拆分   │
                  │       │ 2.6 extractList │  │        │ 3.6 单元测试   │
                  │       │ 2.7 组件名优化  │  │        └──────────────┘
                  │       └──────────────┘  │
                  └─────────────────────────┘
```

阶段一是阶段二的前置条件（特别是 1.1 双写消除会影响后续所有 store 相关改动）。阶段二中的 2.3 是阶段三中 3.1、3.2 的基础。

---

## 不在本规划范围内（记录备查）

以下问题已识别但暂不纳入当前规划：

- 全局状态/跨页面通信 — 需要更深入的需求分析
- 组件面板搜索/过滤 — 16 个组件暂时够用
- 属性/样式编辑器边界重叠 — 需要产品层面决策
- 预览模式（可交互） — 工作量大，需独立规划
- i18n 国际化 — 当前面向中文用户
- CI/CD 流程 — 基础设施层面，独立处理
