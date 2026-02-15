# ForgeStudio — 可视化页面搭建平台规划文档

> 版本：v2.0 | 更新日期：2026-02-09
> 定位：协议驱动、框架无关的可视化页面搭建与代码生成平台

---

## 一、项目概述

### 1.1 核心理念

ForgeStudio 采用 **「协议优先」** 架构：

```
拖拽搭建 → 通用协议(FSP) → 代码生成插件 → Taro / UniApp / ...
```

**协议是核心产品**，代码生成器是可插拔的下游消费者。
这意味着同一份协议可以同时生成 Taro 源码、UniApp 源码，甚至未来的 Flutter 代码。

### 1.2 与上一版方案的关键改进

| 维度 | v1 方案 | v2 方案（本版） |
|------|--------|---------------|
| 代码生成 | 编辑器直接生成 Taro 代码 | 编辑器生成通用协议，由独立服务生成代码 |
| 框架绑定 | 强绑定 Taro | 框架无关，Taro/UniApp 作为生成插件 |
| 推进节奏 | 4 阶段但边界模糊 | 5 个里程碑，每个有明确交付物和演示场景 |
| 合作价值 | 技术方案 | 每个里程碑都是可独立展示的产品形态 |

---

## 二、系统架构（协议驱动）

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

### 2.2 关键设计决策：为什么协议优先？

**直接生成代码 vs 协议优先：**

| 对比项 | 直接生成 | 协议优先 |
|--------|---------|---------|
| 开发速度 | 初期快 | 初期稍慢（需设计协议） |
| 多框架支持 | 每加一个框架重写生成逻辑 | 只需新增一个生成插件 |
| 协作模式 | 编辑器和生成器强耦合 | 编辑器团队和生成器团队可独立开发 |
| 第三方扩展 | 困难 | 任何人可基于协议开发生成插件 |
| 商业价值 | 单一工具 | 协议本身成为标准，生态价值更大 |

**结论：协议优先虽然初期多一步设计工作，但带来的扩展性和商业价值远超直接生成。**

### 2.3 工程结构

```
forgestudio/
├── packages/
│   ├── protocol/          # ★ FSP 协议定义、校验、工具函数
│   ├── editor-core/       # 编辑器内核（拖拽、选中、操作历史）
│   ├── editor-ui/         # 编辑器 UI（面板、工具栏、画布）
│   ├── renderer/          # 协议渲染器（编辑态预览）
│   ├── props-panel/       # 属性配置面板
│   ├── data-binding/      # 数据绑定引擎
│   ├── components/        # 内置组件库（协议级组件定义）
│   ├── codegen-core/      # 代码生成公共逻辑（协议解析、IR）
│   ├── codegen-taro/      # Taro 代码生成插件
│   ├── codegen-uniapp/    # UniApp 代码生成插件（Phase 5）
│   └── shared/            # 公共类型与工具
├── apps/
│   ├── web/               # 编辑器 Web 应用
│   ├── server/            # 后端服务
│   └── codegen-service/   # 代码生成微服务（接收协议，返回代码）
└── docs/                  # 文档
```

---

## 三、FSP 协议设计（核心）

### 3.1 设计原则

1. **框架无关**：协议不包含任何框架特定的 API 或语法
2. **声明式**：描述「是什么」而非「怎么做」
3. **可扩展**：通过 `extensions` 字段支持框架特定的扩展信息
4. **可校验**：提供 JSON Schema 校验，保证协议合法性
5. **版本化**：通过 `version` 字段支持协议演进

### 3.2 协议结构总览

```json
{
  "version": "1.0.0",
  "meta": {
    "name": "页面名称",
    "description": "页面描述"
  },
  "state": {
    "count": { "type": "number", "default": 1 }
  },
  "dataSources": [
    {
      "id": "ds_goods",
      "type": "api",
      "options": { "url": "/api/goods/:id", "method": "GET" },
      "autoFetch": true
    }
  ],
  "componentTree": {
    "id": "root",
    "component": "Page",
    "props": {},
    "styles": {},
    "children": []
  },
  "extensions": {
    "taro": {},
    "uniapp": {}
  }
}
```

### 3.3 协议如何映射到不同框架

同一个 `Image` 组件节点：
```json
{ "component": "Image", "props": { "src": "...", "fit": "width" } }
```

| 框架 | 生成结果 |
|------|---------|
| Taro | `<Image src={data.image} mode="widthFix" />` |
| UniApp | `<image :src="data.image" mode="widthFix" />` |
| React H5 | `<img src={data.image} style={{width:'100%'}} />` |

**关键点：** 协议使用通用属性名（如 `fit: "width"`），各生成插件维护自己的组件映射表，负责翻译为框架特定属性。

### 3.4 开发约定与技术规范

以下约定在开发前必须明确，否则会阻塞实现或导致返工。

#### 3.4.1 组件嵌套规则

不是所有组件都能互相嵌套。`ComponentMeta` 中的 `allowChildren` 控制是否可放入子组件，但还需要一张白名单控制「谁能放进谁」：

| 父组件 | 允许的子组件 | 说明 |
|--------|------------|------|
| Page | View, Text, Image, Button, Input, List, Card | 页面根容器，接受所有组件 |
| View | View, Text, Image, Button, Input, List, Card | 通用容器 |
| List | Card, View | 列表容器，children 作为循环模板 |
| Card | View, Text, Image, Button, Input | 卡片容器 |
| Text | — | 叶子节点，不允许子组件 |
| Image | — | 叶子节点 |
| Button | — | 叶子节点 |
| Input | — | 叶子节点 |

在 `ComponentMeta` 中新增字段：

```typescript
interface ComponentMeta {
  // ...已有字段
  allowChildren: boolean
  allowedChildComponents?: string[]  // 为空表示接受所有，undefined 同理
  // 示例：List 的 allowedChildComponents = ['Card', 'View']
}
```

拖拽引擎在 drop 时校验此规则，不合法的放置操作不生效。

#### 3.4.2 样式系统

**支持的 CSS 属性白名单（M1 阶段）：**

| 分类 | 属性 | 类型 |
|------|------|------|
| 尺寸 | width, height, minHeight | number (px) |
| 间距 | margin, marginTop/Right/Bottom/Left, padding, padding* | number (px) |
| 背景 | backgroundColor | color |
| 文字 | fontSize, fontWeight, color, textAlign, lineHeight | number/enum/color |
| 边框 | borderRadius, borderWidth, borderColor | number/color |
| 布局 | display(flex), flexDirection, justifyContent, alignItems, gap | enum |

**样式编辑方式：** 属性面板分为两个 Tab——「属性」和「样式」。属性 Tab 展示 `propsSchema` 定义的业务属性，样式 Tab 展示上述白名单中的 CSS 属性。两者分别写入 `node.props` 和 `node.styles`。

**单位约定：** 所有数值类型的样式值在协议中存储为纯数字（如 `fontSize: 32`），不带单位。代码生成器负责添加单位：Taro 生成 `px`（Taro 会自动转 rpx），UniApp 生成 `rpx`。

#### 3.4.3 组件 ID 生成策略

```typescript
// 格式：组件名小写 + 下划线 + 自增序号
// 示例：text_1, image_2, list_1, card_3
function generateNodeId(componentName: string): string {
  const counter = getNextCounter(componentName.toLowerCase())
  return `${componentName.toLowerCase()}_${counter}`
}
```

ID 会出现在生成代码的 className 中，所以必须是合法的 CSS 类名（小写字母 + 数字 + 下划线）。计数器在单个编辑会话内全局递增，不会重复。

#### 3.4.4 画布渲染模式

**决策：使用真实 DOM 渲染，不使用 iframe。**

理由：
- iframe 隔离虽然能避免样式污染，但拖拽交互跨 iframe 实现复杂
- M1 阶段组件简单，样式污染风险低
- 通过 CSS 命名空间（`.forge-canvas .text_1 { ... }`）隔离编辑器样式和组件样式

编辑器自身样式使用 `forge-editor-` 前缀，组件渲染区域包裹在 `.forge-canvas` 容器内。

#### 3.4.5 Taro 目标版本

**M1 阶段锁定 Taro 4.x（最新稳定版）。**

生成的 `package.json` 中固定版本：
```json
{
  "@tarojs/cli": "4.0.x",
  "@tarojs/taro": "4.0.x",
  "@tarojs/components": "4.0.x",
  "@tarojs/react": "4.0.x"
}
```

如果 Taro 4.x 在开发期间有 breaking change，在 `codegen-taro` 的 `templates/` 目录中维护版本化的模板。

#### 3.4.6 数据源响应格式约定

**约定：数据源的 `mockData` 直接存储业务数据，不包含外层包装。**

```json
{
  "id": "ds_goods",
  "mockData": [
    { "id": 1, "title": "商品1", "price": 99 },
    { "id": 2, "title": "商品2", "price": 199 }
  ]
}
```

**代码生成器负责处理 API 响应的解包。** 默认约定 API 返回格式为 `{ code: 0, data: [...] }`，生成代码中使用 `res.data.data`：

```tsx
Taro.request({ url: '/api/goods', method: 'GET' })
  .then(res => setGoodsList(res.data.data))
```

后续 M2 阶段可在数据源配置中增加「响应数据路径」字段（如 `responsePath: "data.data"`），让用户自定义解包路径。

#### 3.4.7 表达式作用域规则

| 表达式前缀 | 可用范围 | 含义 |
|-----------|---------|------|
| `{{$ds.xxx.data.field}}` | 任意组件 | 引用数据源返回的数据 |
| `{{$item.field}}` | **仅限** List 的 children 内部 | 引用当前循环项 |
| `{{$state.xxx}}` | 任意组件（M2 阶段） | 引用页面状态 |

**校验规则：**
- 编辑器在保存表达式时检查作用域。如果在 List 外部使用了 `{{$item.xxx}}`，显示红色警告：「$item 只能在列表组件内部使用」。
- 代码生成器遇到非法表达式时，生成注释 `/* TODO: invalid expression */` 并使用空字符串兜底，不中断生成流程。

**M1 阶段表达式限制：**
- 只支持单层属性访问：`{{$item.title}}` ✅，`{{$item.detail.name}}` ❌
- 不支持数组索引：`{{$item.tags[0]}}` ❌
- 不支持函数调用和运算符：`{{$item.price * 100}}` ❌
- 以上能力在 M2 阶段的完整表达式引擎中支持

---

## 四、里程碑路线图（5 个阶段）

> 每个里程碑都有明确的 **交付物、演示场景、验收标准**，可独立向合作方展示。
> **核心原则：M1 就跑通完整链路，后续里程碑在此基础上扩展深度和广度。**

---

### M1：最小完整产品（可行性验证）

**目标：** 一个里程碑跑通「拖拽搭建 → 数据绑定 → 协议生成 → Taro 代码输出」完整链路。
M1 完成后，就能向合作方演示：拖一个列表组件，配一个 API，生成可运行的 Taro 小程序。

---

#### M1 子阶段划分（4 个子里程碑）

为了降低开发风险，M1 拆分为 4 个子阶段，每个子阶段都有独立可演示的成果：

**M1.1：协议定义 + 静态编辑器**

*目标：* 搭建工程基础，实现静态页面的拖拽搭建和协议导出。

*开发任务清单：*

**T1 - 工程初始化**
- [ ] 初始化 Turborepo + pnpm workspace
- [ ] 创建 `packages/protocol`、`packages/editor-core`、`packages/editor-ui`、`packages/renderer`、`packages/components`、`packages/shared`
- [ ] 创建 `apps/web`（Vite + React 18 + TypeScript）
- [ ] 配置 ESLint、Prettier、tsconfig 共享配置
- [ ] 配置包间依赖和构建流程

**T2 - FSP 协议 v1.0 定义（`packages/protocol`）**
- [ ] 定义核心 TypeScript 类型：

```typescript
// packages/protocol/src/types.ts
interface FSPSchema {
  version: string
  meta: { name: string; description?: string }
  componentTree: ComponentNode
}

interface ComponentNode {
  id: string
  component: string          // 组件名：'Page' | 'View' | 'Text' | ...
  props: Record<string, any> // 组件属性
  styles: Record<string, any> // 样式
  children?: ComponentNode[]
}

interface ComponentMeta {
  name: string               // 组件名
  title: string              // 中文显示名
  icon: string               // 图标
  category: 'basic' | 'layout' | 'data'
  defaultProps: Record<string, any>
  defaultStyles: Record<string, any>
  propsSchema: PropDefinition[]  // 属性定义，驱动属性面板
  allowChildren: boolean     // 是否允许子组件
}

interface PropDefinition {
  name: string
  title: string
  type: 'string' | 'number' | 'boolean' | 'enum' | 'color' | 'image'
  default?: any
  options?: { label: string; value: any }[]  // enum 类型的选项
}
```

- [ ] 编写 JSON Schema 校验（基于 ajv）
- [ ] 编写协议工具函数：`createNode()`、`findNodeById()`、`removeNode()`、`moveNode()`
- [ ] 编写单元测试

**T3 - 编辑器状态管理（`packages/editor-core`）**
- [ ] 基于 Zustand 实现编辑器 Store：

```typescript
// packages/editor-core/src/store.ts
interface EditorState {
  schema: FSPSchema              // 当前协议数据
  selectedNodeId: string | null  // 当前选中的组件 ID
  // 操作方法
  addNode: (parentId: string, node: ComponentNode, index?: number) => void
  removeNode: (nodeId: string) => void
  moveNode: (nodeId: string, targetParentId: string, index: number) => void
  updateNodeProps: (nodeId: string, props: Partial<Record<string, any>>) => void
  updateNodeStyles: (nodeId: string, styles: Partial<Record<string, any>>) => void
  selectNode: (nodeId: string | null) => void
  exportSchema: () => FSPSchema
  importSchema: (schema: FSPSchema) => void
}
```

**T4 - 编辑器 UI 布局（`apps/web`）**

```
┌──────────────────────────────────────────────────────────┐
│  工具栏：导入 | 导出 | 预览                                │
├────────────┬─────────────────────────┬───────────────────┤
│            │                         │                   │
│  组件面板   │        画布区域          │    属性面板        │
│  (240px)   │     (自适应宽度)         │    (320px)        │
│            │                         │                   │
│ ┌────────┐ │  ┌─────────────────┐   │  组件名称          │
│ │ 基础组件 │ │  │                 │   │  ─────────        │
│ │ ○ View  │ │  │   拖拽放置区域    │   │  属性配置          │
│ │ ○ Text  │ │  │                 │   │  ┌─────────────┐  │
│ │ ○ Image │ │  │   选中组件高亮    │   │  │ 文本内容     │  │
│ │ ○ Button│ │  │   蓝色边框       │   │  │ [输入框]     │  │
│ │ ○ Input │ │  │                 │   │  │ 字体颜色     │  │
│ │         │ │  └─────────────────┘   │  │ [颜色选择器]  │  │
│ └────────┘ │                         │  └─────────────┘  │
│            │                         │                   │
├────────────┴─────────────────────────┴───────────────────┤
│  状态栏：组件数量 | 画布尺寸                                │
└──────────────────────────────────────────────────────────┘
```

- [ ] 实现三栏布局（左：组件面板，中：画布，右：属性面板）
- [ ] 组件面板：按分类展示组件列表，支持拖出
- [ ] 画布区域：基于 dnd-kit 实现拖入和排序
- [ ] 选中态：点击组件显示蓝色边框 + 操作按钮（删除）
- [ ] 工具栏：导入/导出 JSON 按钮

**T5 - 属性面板（`packages/props-panel`）**
- [ ] 根据选中组件的 `ComponentMeta.propsSchema` 动态渲染表单
- [ ] 实现 5 种 Setter 组件：

| Setter | UI 形态 | 对应 prop type |
|--------|---------|---------------|
| StringSetter | 文本输入框 | `string` |
| NumberSetter | 数字输入框（含步进器） | `number` |
| BooleanSetter | Switch 开关 | `boolean` |
| EnumSetter | 下拉选择框 | `enum` |
| ColorSetter | 颜色选择器（预设色 + 自定义） | `color` |

**T6 - 内置组件注册（`packages/components`）**

| 组件 | 默认属性 | 可配置属性 |
|------|---------|-----------|
| Page | `title: "页面"` | title(string) |
| View | — | padding(number), backgroundColor(color) |
| Text | `content: "文本"` | content(string), fontSize(number), color(color), fontWeight(enum: normal/bold) |
| Image | `src: "placeholder.png"` | src(image), fit(enum: contain/cover/fill/width), borderRadius(number) |
| Button | `text: "按钮"` | text(string), type(enum: default/primary/warn), size(enum: default/mini) |
| Input | `placeholder: "请输入"` | placeholder(string), type(enum: text/number/password), maxLength(number) |

**T7 - 渲染器（`packages/renderer`）**
- [ ] 实现编辑态渲染器：遍历 `componentTree`，将每个节点渲染为对应的 React 组件
- [ ] 渲染器包裹层：每个组件外包一层 `<EditWrapper>`，处理选中、拖拽、hover 高亮
- [ ] 空画布提示：「从左侧拖入组件开始搭建」

*交付物：*
- 可运行的编辑器，能拖拽搭建静态页面
- `@forgestudio/protocol` npm 包
- 导出的 FSP JSON 文件

*演示场景：*
> 打开编辑器 → 拖入 Image、Text、Button → 配置文字和颜色 →
> 画布实时显示 → 导出 JSON → 导入 JSON 还原页面

*验收标准：*
- [ ] 可拖拽 6 个组件到画布
- [ ] 属性修改后画布实时更新
- [ ] 导出的 JSON 通过 Schema 校验
- [ ] 导入 JSON 可还原编辑器状态

---

**M1.2：静态页面代码生成**

*目标：* 实现 FSP → Taro 的代码生成，验证协议到代码的转换逻辑。

*开发任务清单：*

**T1 - 代码生成核心（`packages/codegen-core`）**
- [ ] 定义中间表示（IR）类型：

```typescript
// packages/codegen-core/src/ir.ts
interface IRPage {
  name: string
  imports: IRImport[]       // import 语句
  stateVars: IRStateVar[]   // 状态变量
  effects: IREffect[]       // 副作用（M1.4 使用）
  handlers: IRHandler[]     // 事件处理函数（M2 使用）
  renderTree: IRRenderNode  // 渲染树
  styles: IRStyleSheet      // 样式表
}

interface IRRenderNode {
  tag: string               // 组件标签名
  props: Record<string, IRExpression>
  children: (IRRenderNode | IRTextContent)[]
  className?: string
}
```

- [ ] 实现协议解析器：`FSPSchema → IRPage`
- [ ] 定义代码生成器插件接口：

```typescript
// packages/codegen-core/src/plugin.ts
interface CodegenPlugin {
  name: string                    // 'taro' | 'uniapp'
  generate(ir: IRPage): GeneratedProject
}

interface GeneratedProject {
  files: GeneratedFile[]          // 生成的文件列表
}

interface GeneratedFile {
  path: string                    // 相对路径，如 'src/pages/index/index.tsx'
  content: string                 // 文件内容
}
```

**T2 - Taro 代码生成插件（`packages/codegen-taro`）**
- [ ] 实现组件映射表：

| FSP 组件 | Taro 组件 | import 来源 |
|---------|----------|------------|
| Page | View (根容器) | `@tarojs/components` |
| View | View | `@tarojs/components` |
| Text | Text | `@tarojs/components` |
| Image | Image | `@tarojs/components` |
| Button | Button | `@tarojs/components` |
| Input | Input | `@tarojs/components` |

- [ ] 实现 IR → TSX 代码生成（基于 @babel/types + @babel/generator）
- [ ] 实现 IR → SCSS 样式文件生成
- [ ] 生成 Taro 项目脚手架文件：

```
output/
├── package.json              # 依赖：@tarojs/cli, @tarojs/taro, react
├── tsconfig.json
├── config/
│   └── index.ts              # Taro 构建配置
├── src/
│   ├── app.ts                # 应用入口
│   ├── app.config.ts         # 应用配置（页面路由）
│   ├── app.scss
│   └── pages/
│       └── index/
│           ├── index.tsx      # ← 生成的页面代码
│           ├── index.scss     # ← 生成的样式
│           └── index.config.ts
└── project.config.json       # 微信小程序配置
```

- [ ] 生成代码示例（输入 → 输出）：

输入协议片段：
```json
{
  "id": "text_1",
  "component": "Text",
  "props": { "content": "Hello ForgeStudio" },
  "styles": { "fontSize": 32, "color": "#333", "fontWeight": "bold" }
}
```

输出 TSX：
```tsx
<Text className="text_1">Hello ForgeStudio</Text>
```

输出 SCSS：
```scss
.text_1 {
  font-size: 32px;
  color: #333;
  font-weight: bold;
}
```

**T3 - 编辑器集成**
- [ ] 工具栏新增「生成 Taro 代码」按钮
- [ ] 右侧新增「代码预览」Tab（与属性面板切换）
- [ ] 代码预览面板：Monaco Editor 只读模式，展示生成的 TSX + SCSS
- [ ] 文件树切换：可在生成的多个文件间切换查看
- [ ] 「下载项目」按钮：使用 JSZip 打包为 zip 下载

*交付物：*
- 静态页面可生成可运行的 Taro 项目
- `@forgestudio/codegen-core` + `@forgestudio/codegen-taro` npm 包

*演示场景：*
> 用 M1.1 的编辑器搭建一个商品展示页（静态内容）→
> 点击「生成 Taro 代码」→ 右侧展示 TSX/SCSS →
> 下载项目 → `npm install && npm run dev:weapp` → 微信开发者工具中看到页面

*验收标准：*
- [ ] 生成的 Taro 项目可直接运行（微信小程序 + H5）
- [ ] 生成代码通过 ESLint 检查
- [ ] 生成页面视觉效果与编辑器预览一致
- [ ] 支持 6 个基础组件的代码生成

---

**M1.3：数据绑定 + 动态组件**

*目标：* 增加数据绑定能力，支持动态列表渲染。

*开发任务清单：*

**T1 - 协议升级（`packages/protocol`）**
- [ ] 扩展 FSPSchema 类型，新增数据源和表达式：

```typescript
// 新增到 FSPSchema
interface FSPSchema {
  // ...已有字段
  dataSources?: DataSourceDef[]
}

interface DataSourceDef {
  id: string                    // 数据源 ID，如 'ds_goods'
  type: 'api'                   // M1 只支持 api 类型
  options: {
    url: string                 // API 地址
    method: 'GET' | 'POST'
    headers?: Record<string, string>
  }
  autoFetch: boolean            // 页面加载时自动请求
  mockData?: any                // Mock 数据，用于编辑器预览
}

// 表达式约定：属性值为 string 且匹配 {{...}} 格式时视为表达式
// 示例：
// "content": "{{$ds.ds_goods.data.title}}"     → 绑定数据源字段
// "content": "{{$item.title}}"                  → List 循环内绑定当前项
// "content": "价格：¥{{$item.price}}"           → 混合文本 + 表达式
```

- [ ] 扩展 ComponentNode，新增循环绑定：

```typescript
interface ComponentNode {
  // ...已有字段
  loop?: {
    dataSourceId: string        // 绑定的数据源 ID
    itemName?: string           // 循环变量名，默认 '$item'
  }
}
```

**T2 - 基础表达式引擎（`packages/data-binding`）**
- [ ] 实现表达式解析器：

```typescript
// packages/data-binding/src/parser.ts
// 输入: "价格：¥{{$item.price}}"
// 输出: [
//   { type: 'literal', value: '价格：¥' },
//   { type: 'expression', path: '$item.price' }
// ]
function parseExpression(template: string): ExpressionPart[]
```

- [ ] 实现表达式求值器（用于编辑器预览）：

```typescript
// packages/data-binding/src/evaluator.ts
// 给定上下文 { $ds: { ds_goods: { data: [...] } }, $item: { price: 99 } }
// 求值 "价格：¥{{$item.price}}" → "价格：¥99"
function evaluate(template: string, context: Record<string, any>): any
```

**T3 - 数据源管理面板**
- [ ] 属性面板新增「数据源」Tab：

```
┌─────────────────────┐
│  数据源管理           │
│  ┌─────────────────┐ │
│  │ ds_goods    [编辑]│ │
│  │ GET /api/goods   │ │
│  └─────────────────┘ │
│  [+ 添加数据源]       │
│                      │
│  ── 编辑数据源 ──     │
│  名称: [ds_goods    ] │
│  URL:  [/api/goods  ] │
│  方法: [GET ▼]        │
│  Mock 数据:           │
│  ┌─────────────────┐ │
│  │ [JSON 编辑器]    │ │
│  └─────────────────┘ │
│  [保存]  [取消]       │
└─────────────────────┘
```

- [ ] Mock 数据编辑器（简单 JSON 文本框，后续可升级为可视化）

**T4 - List 和 Card 组件**
- [ ] List 组件 Meta 定义：

```typescript
const ListMeta: ComponentMeta = {
  name: 'List',
  title: '列表',
  icon: 'list',
  category: 'data',
  allowChildren: true,          // 允许拖入子组件作为循环模板
  defaultProps: {},
  propsSchema: [
    { name: 'dataSourceId', title: '数据源', type: 'enum', options: [] },
    // options 动态填充为当前已配置的数据源列表
  ],
  defaultStyles: {}
}
```

- [ ] Card 组件 Meta 定义：

```typescript
const CardMeta: ComponentMeta = {
  name: 'Card',
  title: '卡片',
  icon: 'card',
  category: 'data',
  allowChildren: true,
  defaultProps: {},
  propsSchema: [
    { name: 'padding', title: '内边距', type: 'number', default: 16 },
    { name: 'borderRadius', title: '圆角', type: 'number', default: 8 },
    { name: 'shadow', title: '阴影', type: 'boolean', default: true },
  ],
  defaultStyles: { backgroundColor: '#fff' }
}
```

- [ ] 编辑器渲染器升级：遇到 `loop` 属性时，用 Mock 数据循环渲染 3 条

**T5 - ExpressionSetter（简化版）**
- [ ] 属性面板中，当属性值可绑定表达式时，显示绑定图标
- [ ] 点击绑定图标，弹出表达式输入框（手写 `{{$item.xxx}}`）
- [ ] 已绑定的属性显示绑定标识（如绿色图标）

*交付物：*
- 编辑器支持数据源配置和表达式绑定
- List/Card 组件可用 Mock 数据预览
- `@forgestudio/data-binding` npm 包

*演示场景：*
> 拖入 List 组件 → 配置数据源 `GET /api/goods` → 填入 Mock 数据 →
> List 内拖入 Card → Card 内拖入 Image 和 Text →
> Image 的 src 绑定 `{{$item.image}}`，Text 绑定 `{{$item.title}}` →
> 画布中用 Mock 数据显示 3 条商品卡片

*验收标准：*
- [ ] 可配置 API 数据源并填写 Mock 数据
- [ ] List 组件绑定数据源后，画布用 Mock 数据循环渲染
- [ ] Card 内子组件可通过 `{{$item.xxx}}` 绑定字段
- [ ] 导出的 FSP JSON 包含 dataSources 和 loop 定义

---

**M1.4：动态代码生成（完整链路）**

*目标：* 升级代码生成器，支持数据绑定和 API 调用，跑通完整链路。

*开发任务清单：*

**T1 - IR 扩展**
- [ ] IRPage 新增 `effects`（数据请求副作用）和 `stateVars`（状态变量）
- [ ] IRRenderNode 新增 `loop` 属性（循环渲染）
- [ ] IRExpression 支持模板字符串（混合文本 + 变量）

**T2 - 协议解析器升级（`packages/codegen-core`）**
- [ ] 解析 `dataSources` → 生成 IR 的 stateVars + effects：

```
dataSources[0] = { id: "ds_goods", url: "/api/goods", autoFetch: true }
  ↓ 解析为
stateVars = [{ name: "goodsList", type: "array", default: [] }]
effects = [{ trigger: "mount", action: "fetchApi", url: "/api/goods", target: "goodsList" }]
```

- [ ] 解析 `loop` → 生成 IR 的循环渲染节点
- [ ] 解析 `{{$item.xxx}}` 表达式 → 生成 IR 的变量引用

**T3 - Taro 代码生成器升级（`packages/codegen-taro`）**
- [ ] 生成 useState 声明：

```tsx
const [goodsList, setGoodsList] = useState<any[]>([])
```

- [ ] 生成 useEffect + API 请求：

```tsx
useEffect(() => {
  Taro.request({ url: '/api/goods', method: 'GET' })
    .then(res => setGoodsList(res.data))
}, [])
```

- [ ] 生成 List 的 map 循环：

```tsx
{goodsList.map((item, index) => (
  <View key={index} className="card_1">
    <Image src={item.image} className="img_1" />
    <Text className="text_1">{item.title}</Text>
    <Text className="text_2">¥{item.price}</Text>
  </View>
))}
```

- [ ] 完整生成代码示例（输入 → 输出）：

输入协议：
```json
{
  "dataSources": [
    { "id": "ds_goods", "type": "api",
      "options": { "url": "/api/goods", "method": "GET" },
      "autoFetch": true }
  ],
  "componentTree": {
    "id": "root", "component": "Page", "children": [
      { "id": "list_1", "component": "List",
        "loop": { "dataSourceId": "ds_goods" },
        "children": [
          { "id": "card_1", "component": "Card", "children": [
            { "id": "img_1", "component": "Image",
              "props": { "src": "{{$item.image}}" } },
            { "id": "text_1", "component": "Text",
              "props": { "content": "{{$item.title}}" } }
          ]}
        ]}
    ]
  }
}
```

输出 TSX：
```tsx
import { View, Image, Text } from '@tarojs/components'
import Taro, { useEffect, useState } from '@tarojs/taro'
import './index.scss'

export default function Index() {
  const [goodsList, setGoodsList] = useState<any[]>([])

  useEffect(() => {
    Taro.request({ url: '/api/goods', method: 'GET' })
      .then(res => setGoodsList(res.data.data))
  }, [])

  return (
    <View className="page">
      {goodsList.map((item, index) => (
        <View key={index} className="card_1">
          <Image src={item.image} className="img_1" />
          <Text className="text_1">{item.title}</Text>
        </View>
      ))}
    </View>
  )
}
```

**T4 - Mock API 服务（用于演示）**
- [ ] 创建简单的 Express 服务，提供 `GET /api/goods` 返回示例数据
- [ ] 或使用 Mock Service Worker (MSW) 在浏览器端拦截请求
- [ ] 示例数据：3-5 条商品（含 image、title、price 字段）

**T5 - 端到端验证**
- [ ] 在编辑器中完成完整操作流程
- [ ] 生成的 Taro 项目在微信开发者工具中运行
- [ ] 生成的 Taro 项目在 H5 模式下运行
- [ ] 录制演示视频

*交付物：*
- 完整的动态页面代码生成能力
- M1 完整演示 Demo（含录屏）
- Mock API 服务

*演示场景（M1 最终 Demo）：*
> 打开编辑器 → 拖入 Image 作为 Banner →
> 拖入 List 组件 → 配置 API `GET /api/goods` → 填入 Mock 数据 →
> List 内拖入 Card → Card 内拖入 Image 和 Text →
> 绑定 `{{$item.image}}`、`{{$item.title}}`、`{{$item.price}}` →
> 画布中用 Mock 数据显示 3 条商品 →
> 点击「生成 Taro 代码」→ 查看生成的 TSX（含 API 调用和 map 循环）→
> 下载项目 → `npm install && npm run dev:weapp` →
> 微信开发者工具中看到从真实 API 拉取的动态商品列表

*验收标准：*
- [ ] 生成的 Taro 项目包含 API 请求代码
- [ ] 生成的代码可从真实 API 拉取数据并渲染
- [ ] List 组件生成正确的 map 循环代码
- [ ] 完整链路可演示：拖拽 → 绑定 → 生成 → 运行
- [ ] 演示视频录制完成

---

#### M1 整体范围总结

完成 M1.1-M1.4 后，M1 整体交付：

**交付物：**
1. `@forgestudio/protocol` — 协议定义与校验
2. `@forgestudio/codegen-core` + `@forgestudio/codegen-taro` — 代码生成
3. Web 编辑器可运行版本（含数据绑定和代码生成）
4. FSP 协议 v1.0 规范文档

**演示场景（核心 Demo）：**
> 打开编辑器 → 拖入一个 Image 组件作为 Banner →
> 拖入一个 **List 组件** → 在数据源面板配置 API `GET /api/goods` →
> 将 List 绑定到该数据源 → List 内拖入 Card 子组件 →
> Card 的图片绑定 `{{$item.image}}`，标题绑定 `{{$item.title}}`，价格绑定 `{{$item.price}}` →
> 画布中用 Mock 数据显示 3 条商品卡片 →
> 点击「生成 Taro 代码」→ 右侧展示生成的 TSX 代码 →
> 下载项目 → `npm install && npm run dev:weapp` → 微信开发者工具中看到动态商品列表

**验收标准：**
- [ ] 可拖拽 8 个组件到画布并排列
- [ ] 可配置 API 数据源，List 组件绑定后画布用 Mock 数据预览
- [ ] Card 内子组件可通过 `{{$item.xxx}}` 绑定列表项字段
- [ ] 导出的 FSP JSON 通过 Schema 校验，导入可还原状态
- [ ] 生成的 Taro 项目可直接运行，页面从 API 拉取数据并渲染列表
- [ ] 生成代码通过 ESLint 检查，Prettier 格式化

**M1 不做的事（明确边界）：**
- 不做复杂表达式（条件判断、管道函数）→ M2
- 不做事件系统（点击、跳转）→ M2
- 不做撤销/重做 → M3
- 不做 UniApp 生成 → M4
- 不做用户系统和云端存储 → M5

---

### M2：完整数据能力 + 事件交互

**目标：** 从「能展示数据」升级到「能交互操作」，支持完整的动态页面搭建。

**范围：**
- 完整表达式引擎（条件表达式、管道函数、状态引用）
- 多数据源支持（多个 API + 静态数据 + 页面状态）
- 数据源间依赖（数据源 B 的参数引用数据源 A 的返回值）
- ExpressionSetter（可视化选择字段绑定，非手写表达式）
- 事件系统：tap → 调用 API / 页面跳转 / showToast / 修改状态
- 条件渲染：`visible` 属性支持表达式控制显示/隐藏
- 扩展组件库：Form（表单）、Tab、Swiper、ScrollView、Modal
- 代码生成器升级：生成事件处理、条件渲染、表单提交逻辑

**交付物：**
1. FSP 协议 v1.1（完整数据绑定 + 事件规范）
2. 表达式引擎 `@forgestudio/data-binding`
3. 编辑器支持事件配置和条件渲染

**演示场景：**
> 搭建商品详情页 → 配置 API 获取商品数据 →
> 绑定图片、标题、价格 → 添加「数量选择器」绑定页面状态 `count` →
> 配置「加入购物车」按钮：点击 → 调用加购 API（传入 count）→ 弹出提示 →
> 配置「已售罄」文案：当 `{{$ds.goods.data.stock === 0}}` 时显示 →
> 生成 Taro 代码 → 运行后完整交互流程可用

**验收标准：**
- [ ] 支持条件表达式 `{{a > b ? x : y}}`
- [ ] 事件绑定可配置动作链（调用 API → 修改状态 → 弹提示）
- [ ] 条件渲染在编辑器和生成代码中均正常工作
- [ ] 表单组件可收集数据并提交到 API
- [ ] 生成代码包含完整的事件处理和状态管理

---

### M3：编辑体验完善 + 模板系统

**目标：** 编辑器达到生产可用水平，支持模板复用，可对外小范围试用。

**范围：**
- 撤销/重做（Undo/Redo，基于操作历史栈）
- 复制/粘贴组件（含跨页面粘贴）
- 组件树大纲面板（树形结构展示，支持拖拽排序）
- 样式可视化编辑器（间距、布局、字体、背景）
- 多页面项目管理（一个项目包含多个页面 + 路由配置）
- 模板系统：保存当前页面为模板 / 从模板创建页面
- 内置 3-5 个行业模板（电商首页、商品详情、个人中心、登录页）
- 键盘快捷键（Ctrl+Z/C/V/Delete）
- 协议版本迁移工具（v1.0 → v1.1 自动升级）

**交付物：**
1. 生产级编辑器（可邀请外部用户试用）
2. 模板库（含 3-5 个完整可用模板）
3. 用户试用反馈报告

**演示场景：**
> 从模板库选择「电商首页」→ 自动生成完整页面 →
> 修改 Banner 图和商品列表 API → Ctrl+Z 撤销 → Ctrl+Shift+Z 重做 →
> 在组件树中拖拽调整层级 → 新增「我的」页面 →
> 导出整个项目 Taro 代码 → 运行后得到完整多页面小程序

**验收标准：**
- [ ] 撤销/重做支持至少 50 步
- [ ] 模板加载后可正常编辑和生成代码
- [ ] 多页面项目生成正确的 Taro 路由配置
- [ ] 邀请 5-10 名外部用户试用并收集反馈

---

### M4：UniApp 代码生成 + 代码生成服务化

**目标：** 验证协议通用性，新增 UniApp 生成插件，证明「一份协议，多端生成」。

**范围：**
- 实现 `codegen-uniapp`：FSP → UniApp (Vue3 SFC) 代码
- UniApp 组件映射表（FSP 通用组件 → UniApp 组件 + 属性翻译）
- 代码生成微服务（HTTP API：`POST /codegen` 接收 FSP，返回代码）
- 编辑器支持选择目标框架（Taro / UniApp）
- 生成代码对比面板（左右对照 Taro vs UniApp）
- 补充 UniApp 特有的 extensions 支持

**交付物：**
1. `@forgestudio/codegen-uniapp` 包
2. 代码生成 HTTP 服务（可独立部署）
3. 编辑器多框架切换生成功能

**演示场景：**
> 用 M3 的电商模板 → 选择「Taro」生成 → 查看 React TSX →
> 切换「UniApp」→ 查看 Vue3 SFC →
> 两份代码分别运行，页面效果一致 →
> 调用 API：`POST /api/codegen { schema, target: "uniapp" }` 获取代码

**验收标准：**
- [ ] 同一份 FSP 协议生成的 Taro 和 UniApp 代码视觉效果一致
- [ ] UniApp 生成代码可直接运行（微信小程序 + H5）
- [ ] 代码生成 API 响应正常，支持并发
- [ ] 协议层无任何框架特定代码（验证框架无关性）

---

### M5：SaaS 平台 + 商业化

**目标：** 构建完整 SaaS 平台，支持用户注册、项目管理、团队协作，启动商业化。

**范围：**
- 用户系统（注册、登录、OAuth、权限管理）
- 项目云端存储（创建、保存、版本历史、回滚）
- 后端服务（NestJS + PostgreSQL + Redis）
- 团队协作（项目共享、角色权限）
- 组件市场 v1（自定义组件上传、审核、安装）
- 模板市场 v1（社区模板分享）
- 在线预览和分享（生成预览链接）
- 付费体系接入（免费版 / 专业版 / 企业版）

**交付物：**
1. 可公开访问的 SaaS 平台
2. 付费订阅系统
3. 组件市场和模板市场
4. 运营数据看板

**演示场景：**
> 用户注册登录 → 创建项目 → 从模板市场选择模板 →
> 编辑页面并绑定数据 → 选择 Taro 下载 → 切换 UniApp 下载 →
> 保存项目 → 分享预览链接给同事 → 同事打开查看效果

**验收标准：**
- [ ] 平台支持 100+ 并发用户
- [ ] 项目保存和加载延迟 < 2s
- [ ] 付费流程完整可用
- [ ] 组件市场支持上传和安装自定义组件

---

## 五、里程碑总览（合作方视角）

| 里程碑 | 核心成果 | 可展示形态 | 商业价值 |
|--------|---------|-----------|---------|
| **M1** | 完整链路 MVP | 拖拽 → API 绑定 → 动态列表 → 生成可运行 Taro 代码 | **验证全链路可行性**，可做技术演示 |
| **M2** | 完整数据 + 交互 | 带表单、条件渲染、事件交互的完整业务页面 | 具备实际生产价值 |
| **M3** | 编辑体验 + 模板 | 专业级编辑器 + 行业模板库 | 可对外试用推广 |
| **M4** | UniApp + 服务化 | 一份协议同时生成 Taro 和 UniApp | 验证通用性，市场扩大一倍 |
| **M5** | SaaS 平台上线 | 完整在线平台，支持付费和协作 | 正式商业化运营 |

### 阶段依赖关系

```
M1 (完整MVP) → M2 (数据+交互) → M3 (体验+模板)
                                      ↓
                                 M4 (UniApp+服务化) → M5 (SaaS平台)
```

**关键节点说明：**
- **M1 是可行性验证**：完成后即可向合作方演示完整链路，证明技术可行
- **M2 是价值拐点**：有了完整交互能力，才能搭建真实业务页面
- **M3 是推广门槛**：编辑体验达标 + 模板库，适合对外推广试用
- **M4 验证平台化**：证明协议优先架构的价值，一份协议多端生成
- **M5 是商业化起点**：具备完整产品和付费能力

### 合作推进节奏

| 节点 | 合作方动作 | 我方展示 |
|------|-----------|---------|
| M1 完成 | 技术评估，确认合作意向 | 现场演示：拖拽 → API 绑定 → 生成 Taro 小程序 |
| M2 完成 | 提供真实业务场景试用 | 用合作方的 API 搭建真实页面 |
| M3 完成 | 参与用户测试，反馈需求 | 提供行业模板，邀请合作方团队试用 |
| M4 完成 | 确定商业合作模式 | 演示一份协议同时生成 Taro + UniApp |
| M5 完成 | 正式签约，商业化运营 | 上线 SaaS 平台，开放注册 |

---

## 六、技术选型

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | React 18 + TypeScript | 与 Taro 生态一致 |
| 状态管理 | Zustand | 轻量，适合编辑器复杂状态 |
| 拖拽 | dnd-kit | 现代化，支持嵌套容器 |
| 样式 | TailwindCSS | 编辑器 UI |
| 代码编辑 | Monaco Editor | 协议/代码预览 |
| 构建 | Vite + Turborepo | Monorepo + 快速构建 |
| 后端 | NestJS + PostgreSQL | TypeScript 全栈（M5 阶段） |
| 代码生成 | Babel AST + Prettier | 生成高质量可读代码 |

---

## 七、商业价值与合作模式

### 7.1 目标市场

| 用户群体 | 规模 | 付费意愿 | 切入方式 |
|---------|------|---------|---------|
| Taro 开发者 | 50 万+ | 中 | 开源引擎 + 增值服务 |
| UniApp 开发者 | 100 万+ | 中 | M5 阶段覆盖 |
| 中小企业/外包 | 大 | 高 | 模板市场 + SaaS 订阅 |
| 产品经理 | 大 | 中 | 原型搭建 + 代码交付 |

### 7.2 竞争优势

1. **协议驱动，框架无关**：唯一支持同一协议生成多框架代码的平台
2. **生成源码而非黑盒**：开发者可二次修改，降低迁移成本
3. **渐进式价值**：从免费编辑器到付费 SaaS，用户自然升级

### 7.3 商业模式

| 阶段 | 模式 | 收入来源 |
|------|------|---------|
| M1-M2 | 开源免费 | 无（积累用户和口碑） |
| M3 | 开源 + 增值 | 高级模板付费 |
| M4-M5 | SaaS 订阅 | 专业版 ¥99/月，企业版按需 |
| 长期 | 平台生态 | 组件市场抽成 + 企业定制 |

### 7.4 合作方案建议

**适合的合作方类型：**
- 有小程序/H5 开发需求的企业（作为内部工具使用）
- 前端技术服务公司（集成到自有工作流）
- 投资方（看好低代码 + 跨端赛道）

**合作推进节奏：**
1. **M1 完成后**：技术演示，验证合作意向
2. **M2 完成后**：合作方提供真实业务场景试用
3. **M3 完成后**：小范围推广，合作方参与用户测试
4. **M4 完成后**：确定商业合作模式
5. **M5 完成后**：正式商业化运营

---

## 八、风险与应对

| 风险 | 应对策略 |
|------|---------|
| 协议设计不合理需重构 | M1 充分验证，预留 extensions 扩展点 |
| Taro/UniApp 版本升级不兼容 | 生成器与框架版本解耦，支持多版本模板 |
| 复杂页面无法拖拽实现 | 定位为「80% 场景覆盖」，支持代码混合编辑 |
| 生成代码质量不达预期 | 遵循框架最佳实践，支持自定义代码模板 |
| 开发者付费意愿低 | 先开源建口碑，SaaS 增值服务收费 |
| 团队资源不足 | 按里程碑推进，每个阶段独立可交付 |

---

## 九、总结

ForgeStudio v2 方案的核心改进：

1. **协议优先架构**：FSP 协议是框架无关的中间层，一份协议可生成 Taro、UniApp 等多框架代码
2. **M1 即完整链路**：第一个里程碑就跑通「拖拽 → 数据绑定 → Taro 代码生成」，可立即验证可行性并向合作方演示
3. **渐进式推进**：5 个里程碑从简到繁，每个阶段都有独立可展示的成果
4. **合作友好**：每个里程碑都有明确的演示场景和验收标准，适合向合作方分阶段展示进度
5. **商业可扩展**：从单一 Taro 工具升级为跨框架平台，市场空间扩大数倍

**下一步行动：启动 M1，定义 FSP 协议 + 实现编辑器 + 基础数据绑定 + Taro 代码生成，跑通完整链路。**
