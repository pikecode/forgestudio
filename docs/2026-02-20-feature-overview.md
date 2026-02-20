# ForgeStudio 功能与设计总览

> 更新日期：2026-02-20

## 项目定位

ForgeStudio 是一个面向 Taro 小程序的低代码可视化页面搭建工具。用户通过拖拽组件、配置属性和事件、绑定数据源，最终导出可运行的 Taro 4.x 代码。

## 架构概览

```
FSP Schema (JSON) → 可视化编辑器 → IR (中间表示) → 代码生成插件 → Taro 源码
```

Monorepo 结构（pnpm workspaces + Turborepo），核心包：

| 包 | 职责 |
|---|------|
| `protocol` | FSP 类型定义，所有包的共享契约 |
| `components` | 组件元数据注册表（15 个内置组件） |
| `editor` | 可视化编辑器 UI（React + Zustand + dnd-kit） |
| `data-binding` | 表达式解析器（`{{dataSource[0].field}}`） |
| `codegen-core` | IR 层 + 插件接口，FSP → IR 转换 |
| `codegen-taro` | Taro 4.x 代码生成插件 |

## 组件体系

15 个内置组件，分三类：

**布局类** — Page、View、ScrollView、Swiper、SwiperItem、Form、Modal

**基础类** — Text、Image、Button、Input、Textarea、Switch

**数据类** — List、Card

### 关键组件能力

- **Button**：支持 onClick 事件，可配置 navigate / showToast / setState / submitForm 四种动作
- **Input / Textarea**：纯输入组件，无需手动绑定值。通过 Button 的 submitForm 动作自动建立状态绑定
- **Switch**：支持 onChange 事件，可在数据绑定面板手动绑定状态变量
- **List**：绑定数据源后自动循环渲染子组件，子组件内可用 `$item` / `$index` 表达式
- **Form**：纯布局容器，无逻辑（表单提交逻辑由 Button submitForm 承担）

## 事件系统

组件通过 `supportedEvents` 声明支持的事件（onClick、onChange），每个事件可配置多个动作：

| 动作类型 | 说明 |
|---------|------|
| `navigate` | 页面跳转，支持动态参数（`{{$item.id}}`） |
| `showToast` | 提示消息，可选 success/error/loading/none 图标 |
| `setState` | 修改状态变量，支持类型转换 |
| `submitForm` | 表单提交（见下方详细说明） |

### 表单提交（submitForm）

采用 Button 驱动的设计，配置流程：

1. 在 Button 的 onClick 事件中添加 submitForm 动作
2. 选择一个 mutation 类型的数据源（POST/PUT/DELETE）
3. 可视化映射：将数据源的请求参数逐一映射到页面上的 Input/Textarea 组件

代码生成时，transformer 会：
- 预扫描所有 Button 的 submitForm 配置，收集 inputComponentId → 状态变量名 的映射
- 为被引用的 Input/Textarea 自动创建 `useState` 和 `onInput` 处理函数
- 生成提交函数，从状态变量中读取值构造请求体

## 数据源系统

### 数据源类型

按用途分两类：

- **query（查询）**：获取数据，默认 GET，支持自动获取（autoFetch）
- **mutation（操作）**：提交/修改/删除数据，支持 POST/PUT/DELETE

按返回类型分：

- **array（数组）**：列表数据，可配置分页
- **object（对象）**：详情数据，无分页

### 数据源配置项

| 配置 | 适用场景 | 说明 |
|-----|---------|------|
| 用途 | 全部 | query / mutation |
| 返回类型 | query | array / object |
| 名称 | 全部 | 数据源唯一标识 |
| 接口地址 | 全部 | API URL，支持 `{{$param.id}}` 参数 |
| 请求方法 | mutation | POST / PUT / DELETE |
| 请求参数 | mutation | 结构化参数定义（名称、类型、位置） |
| 自动获取 | query | 页面加载时自动请求 |
| 分页配置 | query + array | 页码参数名、每页数量 |
| 依赖数据源 | 全部 | 拓扑排序 + 等待依赖加载后再请求 |
| 请求头 | 全部 | 自定义 HTTP Headers |

### 作用域

- **页面数据源**：仅当前页面可用
- **全局数据源**：跨页面共享，各页面通过引用启用

### 快速模板

新建数据源时可选模板快速填充：列表接口、详情接口、提交接口、自定义。

## 数据绑定

### 表达式语法

| 表达式 | 含义 |
|--------|------|
| `{{$ds.dataSourceId.data}}` | 数据源数据 |
| `{{$ds.dataSourceId.field}}` | 数据源字段 |
| `{{$item.field}}` | 列表循环项字段 |
| `{{$index}}` | 列表循环索引 |
| `{{$state.varName}}` | 状态变量 |
| `{{$param.id}}` | 页面/URL 参数 |

### 自动绑定

Input/Textarea 不需要手动配置数据绑定。当它们被 Button 的 submitForm 动作引用时，代码生成器自动：
- 创建对应的 `useState` 状态变量
- 生成 `onInput` 事件处理函数
- 在提交函数中读取状态值

Switch 是唯一需要在数据绑定面板手动绑定的组件。

## 代码生成

### 生成产物

Taro 4.x React 函数组件，包含：
- `useState` 状态管理
- `useEffect` 数据获取（含依赖数组）
- `Taro.request` API 调用
- `Taro.navigateTo` 页面跳转
- `Taro.showToast` 提示消息
- `.map()` 列表渲染
- `&&` 条件渲染
- SCSS 样式文件

### 插件架构

`codegen-taro` 实现 `codegen-core` 的插件接口。新增目标框架只需实现新插件，无需修改核心逻辑。

## 编辑器功能

- 拖拽排序（@dnd-kit）
- 组件树可视化
- 属性面板（外观 / 数据 / 事件 三个标签页）
- 样式编辑器
- 撤销/重做（Zustand history）
- 多页面管理
- 数据源导入/导出
- API 接口测试（实时请求 + 响应预览 + 字段自动检测）
- 代码预览与导出
