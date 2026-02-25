# ForgeStudio 技术架构与功能文档

> 更新日期：2026-02-25

## 一、项目定位

ForgeStudio 是面向 Taro 小程序的低代码可视化页面搭建工具。用户通过拖拽组件、配置属性与事件、绑定数据源，导出可运行的 Taro 4.x 代码。

## 二、技术架构

### 2.1 整体架构

```
FSP Schema (JSON) → 可视化编辑器 → IR (中间表示) → 代码生成插件 → Taro 4.x 源码
```

### 2.2 Monorepo 结构

pnpm workspaces + Turborepo，包间依赖使用 `workspace:*`。

```
forgestudio/
├── packages/
│   ├── protocol        # FSP 类型定义（所有包的共享契约）
│   ├── components      # 组件元数据注册表（16 个内置组件）
│   ├── editor          # 可视化编辑器 UI（React + Zustand + dnd-kit）
│   ├── data-binding    # 表达式解析器
│   ├── codegen-core    # IR 层 + 插件接口
│   └── codegen-taro    # Taro 4.x 代码生成插件
├── apps/
│   ├── web             # Vite 5.4 宿主应用
│   └── preview-taro    # Taro 预览项目
```

### 2.3 技术栈

| 层 | 技术 |
|---|------|
| 编辑器 UI | React 18 + TypeScript |
| 状态管理 | Zustand + Immer |
| 拖拽排序 | @dnd-kit |
| 构建工具 | Vite 5.4 + Turborepo |
| 目标框架 | Taro 4.x（React） |
| TypeScript | ES2020 target, strict mode, bundler resolution |

### 2.4 FSP 协议（ForgeStudio Protocol）

所有编辑器状态序列化为 FSP JSON，代码生成读取 FSP 而非编辑器内部状态。

```
FSPSchema
├── version
├── meta: { name, description }
├── pages[]: PageDef
│   ├── id, name, title, path
│   ├── componentTree: ComponentNode（树形结构）
│   ├── dataSources[]: DataSourceDef（页面级数据源）
│   ├── formStates[]: FormStateDef（表单状态）
│   ├── params[]: PageParamDef（页面参数）
│   └── globalDataSourceRefs[]（引用的全局数据源）
└── globalDataSources[]: DataSourceDef（全局数据源）
```

### 2.5 状态管理

单一 Zustand Store，Immer 中间件保证不可变性：

- 持久化到 localStorage（schema + currentPageId）
- 撤销/重做：最多 50 步历史，300ms 防抖
- 剪贴板：复制/粘贴组件（自动生成新 ID）

### 2.6 代码生成管线

```
FSP Schema
  ↓ transformer.ts（codegen-core）
  ├── 拓扑排序数据源（按 dependsOn 解析依赖）
  ├── Tree shaking（只包含被引用的数据源）
  ├── submitForm 预扫描（收集 Input→状态变量映射）
  ├── 递归转换组件树 → IR 节点
  └── 生成状态、副作用、事件处理函数
  ↓ generate-tsx.ts（codegen-taro）
  ├── IR → React TSX 函数组件
  ├── IR → SCSS 样式文件
  └── 脚手架文件（app.config.ts, app.tsx 等）
```

## 三、组件体系

16 个内置组件，分三类：

### 布局组件

| 组件 | 说明 | 允许子组件 |
|-----|------|-----------|
| Page | 根容器 | ✓ |
| View | 通用容器 | ✓ |
| ScrollView | 滚动容器（水平/垂直） | ✓ |
| Form | 表单容器（纯布局，无逻辑） | ✓ |
| Modal | 弹窗（标题 + 可见性控制） | ✓ |
| Swiper | 轮播（自动播放、间隔、循环） | ✓（仅 SwiperItem） |
| SwiperItem | 轮播项 | ✓ |

### 基础组件

| 组件 | 属性 | 事件 |
|-----|------|------|
| Text | fontSize, color, fontWeight | — |
| Image | src, mode(contain/cover/fill/width), borderRadius | — |
| Button | type(default/primary/warn), size(default/mini) | onClick |
| Input | placeholder, type(text/number/password), maxLength | — |
| Textarea | placeholder, maxLength | — |
| Switch | — | onChange |

### 数据组件

| 组件 | 说明 |
|-----|------|
| List | 绑定数据源循环渲染，子组件可用 `$item` / `$index` |
| Card | 带标题的卡片容器 |

## 四、数据源系统

### 4.1 数据源分类

按用途：
- **query（查询）**：获取数据，默认 GET，支持 autoFetch
- **mutation（操作）**：提交/修改/删除，支持 POST/PUT/DELETE

按返回类型：
- **array（数组）**：列表数据，可配分页
- **object（对象）**：详情数据

### 4.2 数据源作用域

- **页面数据源**：仅当前页面可用
- **全局数据源**：跨页面共享，各页面通过引用启用/禁用

### 4.3 配置项

| 配置 | 适用 | 说明 |
|-----|------|------|
| 用途 | 全部 | query / mutation |
| 返回类型 | query | array / object |
| 名称 | 全部 | 显示名称，自动转为 camelCase ID |
| 接口地址 | 全部 | 支持 `{{$param.id}}` 路由参数 |
| 请求方法 | mutation | POST / PUT / DELETE |
| 请求参数 | mutation | 结构化定义（名称、类型、必填、位置） |
| 自动获取 | query | 页面加载时自动请求 |
| 分页 | query + array | 页码参数名、每页数量 |
| 依赖数据源 | 全部 | 拓扑排序 + 等待依赖加载 |
| 请求头 | 全部 | 自定义 HTTP Headers |

### 4.4 API 测试

编辑器内置接口测试功能：
- 实时发送 HTTP 请求
- 自动提取响应字段和样本数据
- 开发代理：reqres.in、dummyjson.com、jsonplaceholder.typicode.com

### 4.5 导入/导出

支持将页面数据源导出为 JSON，导入时自动检测重复 ID。

### 4.6 快速模板

新建数据源时可选：列表接口、详情接口、提交接口、自定义。

## 五、事件系统

### 5.1 支持的动作类型

| 动作 | 说明 |
|-----|------|
| navigate | 页面跳转，支持动态参数 `{{$item.id}}` |
| showToast | 提示消息（success/error/loading/none） |
| setState | 修改状态变量，支持类型转换 |
| submitForm | 表单提交（Button 驱动，见下方） |

每个事件可配置多个动作，按顺序执行。

### 5.2 表单提交设计（submitForm）

采用 Button 驱动的方式，取代传统 Form 组件提交：

1. 在 Button 的 onClick 中添加 submitForm 动作
2. 选择一个 mutation 数据源
3. 可视化映射：API 请求参数 → 页面上的 Input/Textarea 组件

代码生成时自动：
- 为被引用的 Input/Textarea 创建 `useState` 状态变量
- 生成 `onInput` 事件处理函数
- 构造请求体并发送 API 请求

## 六、数据绑定

### 6.1 表达式语法

| 表达式 | 含义 |
|--------|------|
| `{{$ds.dataSourceId.data}}` | 数据源完整数据 |
| `{{$ds.dataSourceId.field}}` | 数据源字段 |
| `{{$item.field}}` | 列表循环项字段 |
| `{{$index}}` | 列表循环索引 |
| `{{$state.varName}}` | 状态变量 |
| `{{$param.id}}` | 页面路由参数 |

### 6.2 自动绑定

- Input/Textarea：被 submitForm 引用时自动创建状态和 onInput 处理
- Switch：在数据绑定面板手动绑定状态变量（checked + onChange）

### 6.3 列表循环

List 组件绑定数据源后，子组件内可使用 `$item` 和 `$index`，支持嵌套循环和自定义变量名。

### 6.4 条件渲染

组件可配置条件表达式（如 `{{count > 0}}`），生成 `{condition && (<Component />)}` 代码。

## 七、代码生成

### 7.1 生成产物

每个页面生成：
- `index.tsx`：React 函数组件（useState + useEffect + Taro API）
- `index.scss`：样式文件

项目级脚手架：
- `app.config.ts`：Taro 应用配置
- `app.tsx`：应用入口
- `app.scss`：全局样式

### 7.2 生成能力

- `useState` 状态管理（带类型标注）
- `useEffect` 数据获取（含依赖数组和加载状态）
- `Taro.request` API 调用（含错误处理）
- `Taro.navigateTo` 页面跳转
- `Taro.showToast` 提示消息
- `.map()` 列表渲染
- `&&` 条件渲染
- `extractList` 辅助函数（自动检测 API 响应中的数组位置）
- 分页加载（loadMore 处理函数）
- 表单验证（required/minLength/maxLength/pattern/min/max）

### 7.3 插件架构

`codegen-taro` 实现 `codegen-core` 的插件接口。新增目标框架只需实现新插件。

## 八、编辑器功能

- 拖拽排序组件（@dnd-kit）
- 组件树可视化
- 属性面板（外观 / 数据 / 事件 三个标签页）
- 样式编辑器
- 撤销/重做（最多 50 步）
- 复制/粘贴组件
- 多页面管理（新增/删除/切换）
- 数据源管理面板（页面级 + 全局）
- 数据源导入/导出
- API 接口测试
- 代码预览与导出
- 页面参数检测与提示
