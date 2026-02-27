# ForgeStudio 流程编排系统设计文档

> 版本：v1.0.0 | 日期：2026-02-27 | 状态：设计阶段

## 一、概述

### 1.1 背景与目标

ForgeStudio 是一个协议驱动的低代码可视化页面构建平台，目标是 Taro 小程序。当前系统已具备组件拖拽、属性配置、数据绑定、事件处理等核心能力，但在流程编排方面存在明显短板：

- 事件系统仅支持线性动作列表（`Action[]` 顺序执行），无法表达分支、并行、循环等复杂逻辑
- 数据源依赖虽支持拓扑排序，但缺乏可视化编排和运行时错误处理
- 完全没有业务审批流的支持能力

本设计文档旨在为 ForgeStudio 引入完整的流程编排能力，覆盖三大场景：

| 场景 | 描述 | 示例 |
|------|------|------|
| 页面交互流程 | 用户操作触发的复杂交互链 | 点击按钮 → 校验表单 → 调用API → 成功跳转/失败提示 |
| 数据编排流程 | 多个API调用的编排与数据流转 | 先查用户 → 再查订单 → 合并数据 → 渲染页面 |
| 业务审批流程 | 多角色参与、多步骤流转的OA审批 | 发起申请 → 主管审批 → 条件分支 → 通知 |

### 1.2 设计原则

1. **协议驱动（Protocol-First）**：流程定义序列化为 WFP（Workflow Protocol）JSON，与 FSP 协议体系一致
2. **渐进增强（Progressive Enhancement）**：向后兼容现有 `Action[]` 事件系统，简单场景无需使用流程编排
3. **可视化优先（Visual-First）**：所有流程均可通过可视化编辑器创建和编辑
4. **插件化架构（Plugin Architecture）**：流程引擎和代码生成均采用插件模式，与现有 codegen 体系一致
5. **前后端分离**：页面交互流程和数据编排在前端运行，业务审批流程对接后端引擎

### 1.3 与现有架构的关系

```
现有架构：
  FSP Schema (JSON) → Editor (visual) → IR → Codegen Plugin → Taro code

扩展后架构：
  FSP Schema ─────────→ Editor ──────→ IR ──────→ Codegen Plugin → Taro code
       │                    │              │
       ▼                    ▼              ▼
  WFP Schema ─────→ Workflow Editor → IR(ext) → Codegen-Workflow → Taro code
  (流程协议)        (流程编辑器)     (IR扩展)    (流程代码生成)
```

WFP 协议作为 FSP 协议的扩展，通过以下方式集成：

- `FSPSchema` 新增 `workflows` 字段引用流程定义
- `ComponentNode.events` 支持 `executeWorkflow` 动作类型
- `DataSourceDef` 可被流程节点引用
- 表达式引擎（`data-binding` 包）在流程上下文中复用

---

## 二、系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ForgeStudio Editor                          │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────────────┐ │
│  │  组件编辑器   │  │   流程编辑器      │  │    属性/配置面板      │ │
│  │  (现有)      │  │  (LogicFlow)     │  │  (节点属性编辑)      │ │
│  │  @dnd-kit    │  │  workflow-editor  │  │  (现有 setters 扩展) │ │
│  └──────┬───────┘  └────────┬─────────┘  └───────────┬───────────┘ │
│         │                   │                        │             │
│         ▼                   ▼                        ▼             │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Zustand Store (统一状态)                    │  │
│  │  schema: FSPSchema    workflows: WFPSchema[]                 │  │
│  └──────────────────────────┬───────────────────────────────────┘  │
│                             │                                      │
└─────────────────────────────┼──────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Protocol Layer   │
                    │  ┌──────────────┐  │
                    │  │ FSP Protocol │  │  @forgestudio/protocol
                    │  │ (组件/页面)   │  │
                    │  └──────────────┘  │
                    │  ┌──────────────┐  │
                    │  │ WFP Protocol │  │  @forgestudio/workflow-protocol
                    │  │ (流程定义)    │  │
                    │  └──────────────┘  │
                    └─────────┬─────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
   │  codegen-core │  │codegen-taro  │  │codegen-wf    │
   │  (现有 IR)    │  │(现有 Taro)   │  │(流程代码生成) │
   │  transformer  │  │  plugin      │  │  plugin      │
   └──────────────┘  └──────────────┘  └──────────────┘
              │               │               │
              └───────────────┼───────────────┘
                              ▼
                    ┌─────────────────┐
                    │  Generated Code  │
                    │  Taro 4.x 小程序 │
                    └─────────────────┘
```

### 2.2 分层设计

系统采用四层架构：

| 层级 | 职责 | 对应包 |
|------|------|--------|
| 协议层（Protocol） | 定义流程的数据结构和类型 | `workflow-protocol` |
| 编辑层（Editor） | 可视化流程编辑器 UI | `workflow-editor` |
| 引擎层（Engine） | 前端流程运行时执行 | `workflow-engine` |
| 生成层（Codegen） | 流程 → Taro 代码转换 | `codegen-workflow` |

### 2.3 与 FSP 协议的关系

WFP 协议通过以下方式嵌入 FSP 体系：

```typescript
// FSPSchema 扩展（packages/protocol/src/types.ts）
export interface FSPSchema {
  version: string
  meta: FSPMeta
  componentTree: ComponentNode
  dataSources?: DataSourceDef[]
  formStates?: FormStateDef[]
  pages?: PageDef[]
  globalDataSources?: DataSourceDef[]
  // ---- 新增 ----
  /** 流程定义列表 */
  workflows?: WorkflowRef[]
}

/** 流程引用（FSP 侧只存引用，完整定义在 WFP 中） */
export interface WorkflowRef {
  id: string           // 流程 ID，对应 WFPSchema.id
  name: string         // 显示名称
  type: 'interaction' | 'data-orchestration' | 'approval'
  /** 内联流程定义（小型流程直接嵌入 FSP） */
  inline?: WFPSchema
  /** 外部流程文件引用（大型流程独立存储） */
  externalRef?: string  // 文件路径或 URL
}
```

新增 Action 类型以触发流程：

```typescript
// 新增 Action 类型
export interface ExecuteWorkflowAction {
  type: 'executeWorkflow'
  workflowId: string
  /** 传入流程的初始变量 */
  inputMapping?: Record<string, string>  // 变量名 → 表达式
}

// 扩展 Action 联合类型
export type Action =
  | NavigateAction
  | ShowToastAction
  | SetStateAction
  | SubmitFormAction
  | ExecuteWorkflowAction  // 新增
```

---

## 三、WFP 流程协议设计（Workflow Protocol）

### 3.1 协议结构总览

WFP（Workflow Protocol）是一个基于有向图的流程描述协议，核心由节点（Node）和连线（Edge）组成。

```typescript
/** WFP 流程协议顶层结构 */
export interface WFPSchema {
  /** 流程唯一标识 */
  id: string
  /** 流程名称 */
  name: string
  /** 流程描述 */
  description?: string
  /** 流程类型 */
  type: 'interaction' | 'data-orchestration' | 'approval'
  /** 协议版本 */
  version: string  // e.g. '1.0.0'
  /** 流程变量定义（流程级作用域） */
  variables: WFPVariable[]
  /** 节点列表 */
  nodes: WFPNode[]
  /** 连线列表 */
  edges: WFPEdge[]
  /** 流程元数据（用于编辑器 UI） */
  meta?: {
    /** 画布视口位置 */
    viewport?: { x: number; y: number; zoom: number }
    /** 创建时间 */
    createdAt?: string
    /** 更新时间 */
    updatedAt?: string
  }
}

/** 流程变量定义 */
export interface WFPVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  defaultValue?: unknown
  /** 变量来源 */
  source?: 'input' | 'internal' | 'output'
  description?: string
}
```

### 3.2 节点类型定义

WFP 定义了 8 种核心节点类型，覆盖所有流程控制需求：

```typescript
/** 节点基础接口 */
export interface WFPNodeBase {
  /** 节点唯一标识 */
  id: string
  /** 节点类型 */
  type: WFPNodeType
  /** 节点显示名称 */
  label: string
  /** 节点在画布上的位置（编辑器用） */
  position: { x: number; y: number }
  /** 节点描述 */
  description?: string
}

export type WFPNodeType =
  | 'start'        // 开始节点
  | 'end'          // 结束节点
  | 'action'       // 动作节点
  | 'condition'    // 条件分支节点
  | 'parallel'     // 并行网关节点
  | 'wait'         // 等待/延时节点
  | 'subprocess'   // 子流程节点
  | 'loop'         // 循环节点

/** 所有节点类型的联合 */
export type WFPNode =
  | WFPStartNode
  | WFPEndNode
  | WFPActionNode
  | WFPConditionNode
  | WFPParallelNode
  | WFPWaitNode
  | WFPSubprocessNode
  | WFPLoopNode
```

#### 3.2.1 开始节点（Start）

每个流程有且仅有一个开始节点，定义流程的入口和输入参数。

```typescript
export interface WFPStartNode extends WFPNodeBase {
  type: 'start'
  /** 流程输入参数映射 */
  inputs?: {
    /** 参数名 → 表达式（从触发上下文取值） */
    [paramName: string]: string
  }
  /** 触发方式 */
  trigger?: {
    type: 'event' | 'manual' | 'schedule' | 'data-change'
    /** 事件触发：关联的组件事件 */
    eventSource?: { componentId: string; eventName: string }
    /** 数据变更触发：监听的数据源 */
    dataSource?: string
    /** 定时触发：cron 表达式 */
    schedule?: string
  }
}
```

#### 3.2.2 结束节点（End）

流程的终止点，可以有多个（对应不同的结束分支）。

```typescript
export interface WFPEndNode extends WFPNodeBase {
  type: 'end'
  /** 结束状态 */
  status?: 'success' | 'failure' | 'cancelled'
  /** 输出变量映射（将流程变量写回外部状态） */
  outputs?: {
    [targetVar: string]: string  // 外部变量名 → 流程变量表达式
  }
}
```

#### 3.2.3 动作节点（Action）

执行具体操作的节点，是流程中最常用的节点类型。

```typescript
export interface WFPActionNode extends WFPNodeBase {
  type: 'action'
  /** 动作类型 */
  actionType: WFPActionType
  /** 动作配置（根据 actionType 不同而不同） */
  config: WFPActionConfig
  /** 错误处理策略 */
  onError?: WFPErrorHandler
  /** 重试配置 */
  retry?: {
    maxAttempts: number
    delayMs: number
    backoffMultiplier?: number  // 退避倍数，默认 2
  }
}

export type WFPActionType =
  | 'api-call'        // 调用 API（引用 DataSourceDef）
  | 'set-variable'    // 设置流程变量
  | 'set-state'       // 设置页面状态（对应现有 SetStateAction）
  | 'navigate'        // 页面跳转（对应现有 NavigateAction）
  | 'show-toast'      // 显示提示（对应现有 ShowToastAction）
  | 'show-modal'      // 显示模态框
  | 'validate-form'   // 表单校验
  | 'transform-data'  // 数据转换
  | 'custom-code'     // 自定义代码片段
  | 'approval-submit' // 提交审批（审批流专用）
  | 'approval-decide' // 审批决策（审批流专用）
  | 'send-notification' // 发送通知（审批流专用）

/** 动作配置 — 根据 actionType 区分 */
export type WFPActionConfig =
  | WFPApiCallConfig
  | WFPSetVariableConfig
  | WFPSetStateConfig
  | WFPNavigateConfig
  | WFPShowToastConfig
  | WFPShowModalConfig
  | WFPValidateFormConfig
  | WFPTransformDataConfig
  | WFPCustomCodeConfig
  | WFPApprovalSubmitConfig
  | WFPApprovalDecideConfig
  | WFPSendNotificationConfig

/** API 调用配置 */
export interface WFPApiCallConfig {
  type: 'api-call'
  /** 引用现有 DataSourceDef 的 ID */
  dataSourceId: string
  /** 请求参数映射：参数名 → 表达式 */
  paramMapping?: Record<string, string>
  /** 响应数据存储到的流程变量 */
  resultVariable: string
  /** 超时时间（毫秒） */
  timeout?: number
}

/** 设置流程变量配置 */
export interface WFPSetVariableConfig {
  type: 'set-variable'
  /** 变量赋值列表 */
  assignments: Array<{
    variable: string   // 流程变量名
    expression: string // 值表达式
  }>
}

/** 设置页面状态配置（兼容现有 SetStateAction） */
export interface WFPSetStateConfig {
  type: 'set-state'
  target: string   // 页面状态变量名
  value: string    // 表达式
}

/** 页面跳转配置（兼容现有 NavigateAction） */
export interface WFPNavigateConfig {
  type: 'navigate'
  url: string
  params?: Record<string, string>
}

/** 显示提示配置（兼容现有 ShowToastAction） */
export interface WFPShowToastConfig {
  type: 'show-toast'
  title: string
  icon?: 'success' | 'error' | 'loading' | 'none'
  duration?: number
}

/** 显示模态框配置 */
export interface WFPShowModalConfig {
  type: 'show-modal'
  title: string
  content: string
  confirmText?: string
  cancelText?: string
  /** 用户选择结果存储到的流程变量 */
  resultVariable?: string
}

/** 表单校验配置 */
export interface WFPValidateFormConfig {
  type: 'validate-form'
  /** 要校验的表单状态 ID 列表（空 = 校验全部） */
  formStateIds?: string[]
  /** 校验结果存储到的流程变量 */
  resultVariable?: string
}

/** 数据转换配置 */
export interface WFPTransformDataConfig {
  type: 'transform-data'
  /** 输入变量 */
  input: string
  /** 转换表达式（支持 data-binding 表达式语法） */
  expression: string
  /** 输出变量 */
  output: string
}

/** 自定义代码配置 */
export interface WFPCustomCodeConfig {
  type: 'custom-code'
  /** JavaScript 代码片段 */
  code: string
  /** 代码可访问的流程变量 */
  inputVariables?: string[]
  /** 代码输出的流程变量 */
  outputVariables?: string[]
}

/** 审批提交配置 */
export interface WFPApprovalSubmitConfig {
  type: 'approval-submit'
  /** 审批表单数据映射 */
  formData: Record<string, string>
  /** 审批人配置 */
  approvers: WFPApproverConfig
}

/** 审批决策配置 */
export interface WFPApprovalDecideConfig {
  type: 'approval-decide'
  /** 审批人配置 */
  approvers: WFPApproverConfig
  /** 决策结果存储变量 */
  resultVariable: string
  /** 审批意见存储变量 */
  commentVariable?: string
  /** 超时处理 */
  timeout?: {
    durationHours: number
    action: 'auto-approve' | 'auto-reject' | 'escalate'
    escalateTo?: WFPApproverConfig
  }
}

/** 审批人配置 */
export interface WFPApproverConfig {
  type: 'fixed' | 'role' | 'department-head' | 'expression'
  /** 固定审批人 ID 列表 */
  userIds?: string[]
  /** 角色名称 */
  role?: string
  /** 动态表达式（返回审批人 ID） */
  expression?: string
  /** 多人审批策略 */
  strategy?: 'any' | 'all' | 'sequential'
}

/** 发送通知配置 */
export interface WFPSendNotificationConfig {
  type: 'send-notification'
  /** 通知渠道 */
  channel: 'in-app' | 'sms' | 'email' | 'wechat'
  /** 接收人表达式 */
  recipients: string
  /** 通知模板 */
  template: {
    title: string
    content: string
  }
}

/** 错误处理器 */
export interface WFPErrorHandler {
  /** 错误处理策略 */
  strategy: 'ignore' | 'retry' | 'fallback' | 'abort'
  /** 回退动作（strategy = 'fallback' 时） */
  fallbackActions?: WFPActionConfig[]
  /** 错误信息存储变量 */
  errorVariable?: string
}
```

#### 3.2.4 条件分支节点（Condition）

根据表达式结果选择不同的执行路径。

```typescript
export interface WFPConditionNode extends WFPNodeBase {
  type: 'condition'
  /** 条件模式 */
  mode: 'expression' | 'switch'
  /** expression 模式：布尔表达式，true 走 'yes' 出口，false 走 'no' 出口 */
  expression?: string
  /** switch 模式：多条件匹配 */
  cases?: Array<{
    id: string
    label: string
    expression: string  // 匹配表达式
  }>
  /** switch 模式的默认出口 ID */
  defaultCaseId?: string
}
```

#### 3.2.5 并行网关节点（Parallel）

支持多个分支同时执行，等待全部或任一完成后汇合。

```typescript
export interface WFPParallelNode extends WFPNodeBase {
  type: 'parallel'
  /** 并行模式 */
  mode: 'fork' | 'join'
  /** join 模式的等待策略 */
  joinStrategy?: 'all' | 'any'
  /** join 超时（毫秒） */
  joinTimeout?: number
}
```

#### 3.2.6 等待/延时节点（Wait）

暂停流程执行，等待指定条件满足后继续。

```typescript
export interface WFPWaitNode extends WFPNodeBase {
  type: 'wait'
  /** 等待类型 */
  waitType: 'delay' | 'event' | 'condition'
  /** 延时等待：毫秒数或表达式 */
  delayMs?: number | string
  /** 事件等待：等待的事件名 */
  eventName?: string
  /** 条件等待：轮询表达式 */
  conditionExpression?: string
  /** 条件等待：轮询间隔（毫秒） */
  pollIntervalMs?: number
  /** 超时时间（毫秒） */
  timeout?: number
}
```

#### 3.2.7 子流程节点（Subprocess）

引用另一个 WFP 流程作为子流程执行。

```typescript
export interface WFPSubprocessNode extends WFPNodeBase {
  type: 'subprocess'
  /** 引用的子流程 ID */
  workflowId: string
  /** 输入参数映射：子流程变量名 → 当前流程表达式 */
  inputMapping?: Record<string, string>
  /** 输出参数映射：当前流程变量名 → 子流程变量名 */
  outputMapping?: Record<string, string>
}
```

#### 3.2.8 循环节点（Loop）

对集合数据进行迭代处理。

```typescript
export interface WFPLoopNode extends WFPNodeBase {
  type: 'loop'
  /** 循环类型 */
  loopType: 'forEach' | 'while' | 'doWhile'
  /** forEach：迭代的数组变量 */
  collection?: string
  /** forEach：当前项变量名 */
  itemVariable?: string
  /** forEach：当前索引变量名 */
  indexVariable?: string
  /** while/doWhile：循环条件表达式 */
  conditionExpression?: string
  /** 最大迭代次数（防止死循环） */
  maxIterations?: number
  /** 循环体内的子流程 ID（内嵌子流程） */
  bodyWorkflowId?: string
}
```

### 3.3 连线定义

连线描述节点之间的执行顺序和条件。

```typescript
/** 连线定义 */
export interface WFPEdge {
  /** 连线唯一标识 */
  id: string
  /** 源节点 ID */
  sourceNodeId: string
  /** 源节点出口端口（用于条件分支） */
  sourcePort?: string  // e.g. 'yes', 'no', 'case_1', 'default'
  /** 目标节点 ID */
  targetNodeId: string
  /** 目标节点入口端口 */
  targetPort?: string
  /** 连线标签（显示在编辑器中） */
  label?: string
  /** 连线条件表达式（可选，用于动态路由） */
  condition?: string
  /** 连线样式（编辑器用） */
  style?: {
    type?: 'solid' | 'dashed'
    color?: string
  }
}
```

### 3.4 表达式集成

WFP 中的表达式复用现有 `data-binding` 包的解析器，并扩展流程上下文变量：

```typescript
/** 流程表达式上下文（扩展 ExpressionContext） */
export interface WFPExpressionContext {
  /** 流程变量 */
  $wf: Record<string, unknown>
  /** 当前节点的执行结果 */
  $result: unknown
  /** 错误信息（在 onError 中可用） */
  $error?: { message: string; code?: string }
  /** 循环上下文（在 loop 节点体内可用） */
  $loop?: {
    item: unknown
    index: number
    total: number
  }
  /** 审批上下文（在审批流中可用） */
  $approval?: {
    submitter: string
    currentApprover: string
    decision: 'approved' | 'rejected' | 'pending'
    comment: string
  }
  // 继承现有上下文
  $item?: Record<string, unknown>
  $ds?: Record<string, unknown>
  $state?: Record<string, unknown>
}
```

表达式示例：

| 表达式 | 含义 |
|--------|------|
| `{{$wf.userId}}` | 读取流程变量 userId |
| `{{$result.data.length > 0}}` | 判断上一步 API 返回数据是否非空 |
| `{{$wf.totalAmount > 10000}}` | 金额超过 10000 走不同审批路径 |
| `{{$loop.item.status === 'active'}}` | 循环中判断当前项状态 |
| `{{$error.message}}` | 获取错误信息 |

### 3.5 协议示例

一个完整的页面交互流程协议示例（按钮点击 → 表单校验 → API 提交 → 分支处理）：

```json
{
  "id": "wf_submit_order",
  "name": "提交订单流程",
  "type": "interaction",
  "version": "1.0.0",
  "variables": [
    { "name": "formValid", "type": "boolean", "defaultValue": false, "source": "internal" },
    { "name": "submitResult", "type": "object", "source": "internal" },
    { "name": "errorMsg", "type": "string", "defaultValue": "", "source": "internal" }
  ],
  "nodes": [
    {
      "id": "start_1",
      "type": "start",
      "label": "开始",
      "position": { "x": 100, "y": 200 },
      "trigger": {
        "type": "event",
        "eventSource": { "componentId": "button_submit", "eventName": "onClick" }
      }
    },
    {
      "id": "action_validate",
      "type": "action",
      "label": "校验表单",
      "position": { "x": 300, "y": 200 },
      "actionType": "validate-form",
      "config": {
        "type": "validate-form",
        "formStateIds": ["username", "phone", "address"],
        "resultVariable": "formValid"
      }
    },
    {
      "id": "cond_valid",
      "type": "condition",
      "label": "校验通过？",
      "position": { "x": 500, "y": 200 },
      "mode": "expression",
      "expression": "{{$wf.formValid}}"
    },
    {
      "id": "action_submit",
      "type": "action",
      "label": "提交订单",
      "position": { "x": 700, "y": 100 },
      "actionType": "api-call",
      "config": {
        "type": "api-call",
        "dataSourceId": "ds_create_order",
        "paramMapping": {
          "username": "{{$state.username}}",
          "phone": "{{$state.phone}}",
          "address": "{{$state.address}}"
        },
        "resultVariable": "submitResult"
      },
      "onError": {
        "strategy": "fallback",
        "errorVariable": "errorMsg",
        "fallbackActions": [
          { "type": "show-toast", "title": "网络错误，请重试", "icon": "error" }
        ]
      },
      "retry": { "maxAttempts": 2, "delayMs": 1000 }
    },
    {
      "id": "action_success",
      "type": "action",
      "label": "提交成功提示",
      "position": { "x": 900, "y": 100 },
      "actionType": "show-toast",
      "config": { "type": "show-toast", "title": "订单提交成功", "icon": "success" }
    },
    {
      "id": "action_navigate",
      "type": "action",
      "label": "跳转订单详情",
      "position": { "x": 1100, "y": 100 },
      "actionType": "navigate",
      "config": {
        "type": "navigate",
        "url": "/pages/order-detail/index",
        "params": { "orderId": "{{$wf.submitResult.data.id}}" }
      }
    },
    {
      "id": "action_fail_toast",
      "type": "action",
      "label": "校验失败提示",
      "position": { "x": 700, "y": 300 },
      "actionType": "show-toast",
      "config": { "type": "show-toast", "title": "请填写完整信息", "icon": "error" }
    },
    {
      "id": "end_success",
      "type": "end",
      "label": "成功结束",
      "position": { "x": 1300, "y": 100 },
      "status": "success"
    },
    {
      "id": "end_fail",
      "type": "end",
      "label": "失败结束",
      "position": { "x": 900, "y": 300 },
      "status": "failure"
    }
  ],
  "edges": [
    { "id": "e1", "sourceNodeId": "start_1", "targetNodeId": "action_validate" },
    { "id": "e2", "sourceNodeId": "action_validate", "targetNodeId": "cond_valid" },
    { "id": "e3", "sourceNodeId": "cond_valid", "sourcePort": "yes", "targetNodeId": "action_submit", "label": "通过" },
    { "id": "e4", "sourceNodeId": "cond_valid", "sourcePort": "no", "targetNodeId": "action_fail_toast", "label": "不通过" },
    { "id": "e5", "sourceNodeId": "action_submit", "targetNodeId": "action_success" },
    { "id": "e6", "sourceNodeId": "action_success", "targetNodeId": "action_navigate" },
    { "id": "e7", "sourceNodeId": "action_navigate", "targetNodeId": "end_success" },
    { "id": "e8", "sourceNodeId": "action_fail_toast", "targetNodeId": "end_fail" }
  ]
}
```

---

## 四、三大场景设计

### 4.1 页面交互流程

#### 场景描述

页面交互流程是最常用的场景，替代现有的线性 `Action[]` 列表。用户在编辑器中为组件事件（如按钮点击）绑定一个可视化流程，而非手动配置动作数组。

**典型用例：**
- 表单提交：校验 → 提交 → 成功跳转/失败提示
- 购物车操作：检查库存 → 加入购物车 → 更新角标 → 弹出提示
- 登录流程：校验 → 登录API → 存储token → 跳转首页

#### 协议示例（购物车加购流程）

```json
{
  "id": "wf_add_to_cart",
  "name": "加入购物车",
  "type": "interaction",
  "version": "1.0.0",
  "variables": [
    { "name": "stockInfo", "type": "object", "source": "internal" },
    { "name": "cartResult", "type": "object", "source": "internal" }
  ],
  "nodes": [
    { "id": "n1", "type": "start", "label": "开始", "position": { "x": 100, "y": 200 } },
    {
      "id": "n2", "type": "action", "label": "查询库存",
      "position": { "x": 300, "y": 200 },
      "actionType": "api-call",
      "config": {
        "type": "api-call",
        "dataSourceId": "ds_check_stock",
        "paramMapping": { "goodsId": "{{$state.currentGoodsId}}" },
        "resultVariable": "stockInfo"
      }
    },
    {
      "id": "n3", "type": "condition", "label": "有库存？",
      "position": { "x": 500, "y": 200 },
      "mode": "expression",
      "expression": "{{$wf.stockInfo.data.stock > 0}}"
    },
    {
      "id": "n4", "type": "action", "label": "调用加购API",
      "position": { "x": 700, "y": 100 },
      "actionType": "api-call",
      "config": {
        "type": "api-call",
        "dataSourceId": "ds_add_cart",
        "paramMapping": {
          "goodsId": "{{$state.currentGoodsId}}",
          "quantity": "{{$state.quantity}}"
        },
        "resultVariable": "cartResult"
      }
    },
    {
      "id": "n5", "type": "action", "label": "更新购物车数量",
      "position": { "x": 900, "y": 100 },
      "actionType": "set-state",
      "config": { "type": "set-state", "target": "cartCount", "value": "{{$wf.cartResult.data.totalCount}}" }
    },
    {
      "id": "n6", "type": "action", "label": "成功提示",
      "position": { "x": 1100, "y": 100 },
      "actionType": "show-toast",
      "config": { "type": "show-toast", "title": "已加入购物车", "icon": "success" }
    },
    {
      "id": "n7", "type": "action", "label": "无库存提示",
      "position": { "x": 700, "y": 300 },
      "actionType": "show-toast",
      "config": { "type": "show-toast", "title": "商品已售罄", "icon": "error" }
    },
    { "id": "n8", "type": "end", "label": "结束", "position": { "x": 1300, "y": 200 } }
  ],
  "edges": [
    { "id": "e1", "sourceNodeId": "n1", "targetNodeId": "n2" },
    { "id": "e2", "sourceNodeId": "n2", "targetNodeId": "n3" },
    { "id": "e3", "sourceNodeId": "n3", "sourcePort": "yes", "targetNodeId": "n4", "label": "有库存" },
    { "id": "e4", "sourceNodeId": "n3", "sourcePort": "no", "targetNodeId": "n7", "label": "无库存" },
    { "id": "e5", "sourceNodeId": "n4", "targetNodeId": "n5" },
    { "id": "e6", "sourceNodeId": "n5", "targetNodeId": "n6" },
    { "id": "e7", "sourceNodeId": "n6", "targetNodeId": "n8" },
    { "id": "e8", "sourceNodeId": "n7", "targetNodeId": "n8" }
  ]
}
```

#### 代码生成策略

页面交互流程生成为页面组件内的 **async 函数**，条件分支转为 if/else，顺序节点按执行顺序排列。

**输入协议** → **输出 Taro 代码：**

```tsx
// 生成的流程处理函数
const handleAddToCart = async () => {
  try {
    // n2: 查询库存
    const stockInfo = await Taro.request({
      url: '/api/stock/check',
      method: 'GET',
      data: { goodsId: currentGoodsId }
    })

    // n3: 有库存？
    if (stockInfo.data.data.stock > 0) {
      // n4: 调用加购API
      const cartResult = await Taro.request({
        url: '/api/cart/add',
        method: 'POST',
        data: { goodsId: currentGoodsId, quantity }
      })
      // n5: 更新购物车数量
      setCartCount(cartResult.data.data.totalCount)
      // n6: 成功提示
      Taro.showToast({ title: '已加入购物车', icon: 'success' })
    } else {
      // n7: 无库存提示
      Taro.showToast({ title: '商品已售罄', icon: 'error' })
    }
  } catch (error) {
    console.error('流程执行失败:', error)
  }
}
```

#### 与现有 Action 系统的兼容

**向后兼容策略：**

| 情况 | 处理方式 |
|------|---------|
| 组件事件绑定了 `Action[]` | 保持原有行为不变，照旧生成代码 |
| 组件事件绑定了 `ExecuteWorkflowAction` | 从 workflows 中查找对应流程，生成 async 函数 |
| 编辑器升级迁移 | 提供 `Action[] → WFP` 自动转换工具，将线性动作列表转为顺序流程图 |

**自动迁移函数签名：**

```typescript
function migrateActionsToWorkflow(
  actions: Action[],
  componentId: string,
  eventName: string
): WFPSchema
```

### 4.2 数据编排流程

#### 场景描述

数据编排流程用于页面初始化时的复杂数据加载场景，替代现有 `DataSourceDef.dependsOn` 的隐式依赖机制，改为显式的可视化数据流。

**典型用例：**
- 用户中心页：并行查询用户信息 + 订单列表 + 积分，合并后渲染
- 商品详情页：先查商品 → 再用商品分类ID查推荐列表 → 合并
- 搜索结果页：查询 → 过滤 → 排序 → 分页

#### 协议示例（用户中心页数据加载）

```json
{
  "id": "wf_user_center_data",
  "name": "用户中心数据加载",
  "type": "data-orchestration",
  "version": "1.0.0",
  "variables": [
    { "name": "userInfo", "type": "object", "source": "internal" },
    { "name": "orderList", "type": "array", "source": "internal" },
    { "name": "pointsInfo", "type": "object", "source": "internal" },
    { "name": "pageData", "type": "object", "source": "output" }
  ],
  "nodes": [
    { "id": "n1", "type": "start", "label": "页面加载", "position": { "x": 100, "y": 200 },
      "trigger": { "type": "event", "eventSource": { "componentId": "root", "eventName": "onLoad" } }
    },
    { "id": "n2", "type": "parallel", "label": "并行请求", "position": { "x": 300, "y": 200 }, "mode": "fork" },
    {
      "id": "n3", "type": "action", "label": "查询用户信息",
      "position": { "x": 500, "y": 80 },
      "actionType": "api-call",
      "config": { "type": "api-call", "dataSourceId": "ds_user_info", "resultVariable": "userInfo" }
    },
    {
      "id": "n4", "type": "action", "label": "查询订单列表",
      "position": { "x": 500, "y": 200 },
      "actionType": "api-call",
      "config": { "type": "api-call", "dataSourceId": "ds_order_list", "resultVariable": "orderList" }
    },
    {
      "id": "n5", "type": "action", "label": "查询积分",
      "position": { "x": 500, "y": 320 },
      "actionType": "api-call",
      "config": { "type": "api-call", "dataSourceId": "ds_points", "resultVariable": "pointsInfo" }
    },
    { "id": "n6", "type": "parallel", "label": "等待全部完成", "position": { "x": 700, "y": 200 }, "mode": "join", "joinStrategy": "all" },
    {
      "id": "n7", "type": "action", "label": "合并数据",
      "position": { "x": 900, "y": 200 },
      "actionType": "set-variable",
      "config": {
        "type": "set-variable",
        "assignments": [
          { "variable": "pageData", "expression": "{{ { user: $wf.userInfo.data, orders: $wf.orderList.data, points: $wf.pointsInfo.data } }}" }
        ]
      }
    },
    {
      "id": "n8", "type": "end", "label": "加载完成", "position": { "x": 1100, "y": 200 },
      "status": "success",
      "outputs": {
        "userInfo": "{{$wf.pageData.user}}",
        "orderList": "{{$wf.pageData.orders}}",
        "pointsInfo": "{{$wf.pageData.points}}"
      }
    }
  ],
  "edges": [
    { "id": "e1", "sourceNodeId": "n1", "targetNodeId": "n2" },
    { "id": "e2", "sourceNodeId": "n2", "targetNodeId": "n3" },
    { "id": "e3", "sourceNodeId": "n2", "targetNodeId": "n4" },
    { "id": "e4", "sourceNodeId": "n2", "targetNodeId": "n5" },
    { "id": "e5", "sourceNodeId": "n3", "targetNodeId": "n6" },
    { "id": "e6", "sourceNodeId": "n4", "targetNodeId": "n6" },
    { "id": "e7", "sourceNodeId": "n5", "targetNodeId": "n6" },
    { "id": "e8", "sourceNodeId": "n6", "targetNodeId": "n7" },
    { "id": "e9", "sourceNodeId": "n7", "targetNodeId": "n8" }
  ]
}
```

#### 代码生成策略

数据编排流程生成为 `useEffect` 内的 async 函数，并行节点使用 `Promise.all`。

```tsx
// 生成的数据加载代码
useEffect(() => {
  const loadData = async () => {
    try {
      // n2-n6: 并行请求，等待全部完成
      const [userInfo, orderList, pointsInfo] = await Promise.all([
        Taro.request({ url: '/api/user/info', method: 'GET' }),
        Taro.request({ url: '/api/orders', method: 'GET' }),
        Taro.request({ url: '/api/points', method: 'GET' })
      ])

      // n7: 合并数据 → n8: 输出到页面状态
      setUserInfo(userInfo.data.data)
      setOrderList(orderList.data.data)
      setPointsInfo(pointsInfo.data.data)
    } catch (error) {
      console.error('数据加载失败:', error)
    }
  }
  loadData()
}, [])
```

#### 与现有 DataSource 系统的关系

| 现有机制 | 流程编排 | 关系 |
|---------|---------|------|
| `DataSourceDef.autoFetch` | Start 节点 trigger = onLoad | 等价替代 |
| `DataSourceDef.dependsOn` | Edge 连线表达依赖 | 显式可视化替代 |
| 拓扑排序 | 图遍历执行顺序 | 能力升级 |
| 无并行能力 | Parallel fork/join | 新增能力 |

**共存策略：** 简单的单个API自动加载继续使用 `DataSourceDef.autoFetch`，复杂的多API编排使用数据编排流程。两者可在同一页面中共存。

### 4.3 业务审批流程

#### 场景描述

业务审批流程面向 OA 场景，需要后端流程引擎配合。前端编辑器用于设计审批流程，生成的代码通过 API 与后端流程引擎通信。

**典型用例：**
- 请假审批：提交 → 直属上级审批 → 金额>3天则需HR审批 → 通知
- 采购审批：提交 → 部门经理 → 金额>5万则需总监 → 财务确认
- 内容发布：提交 → 编辑审核 → 主编终审 → 发布

#### 协议示例（请假审批流程）

```json
{
  "id": "wf_leave_approval",
  "name": "请假审批流程",
  "type": "approval",
  "version": "1.0.0",
  "variables": [
    { "name": "leaveData", "type": "object", "source": "input" },
    { "name": "managerDecision", "type": "string", "source": "internal" },
    { "name": "hrDecision", "type": "string", "source": "internal" }
  ],
  "nodes": [
    { "id": "n1", "type": "start", "label": "提交申请", "position": { "x": 100, "y": 200 } },
    {
      "id": "n2", "type": "action", "label": "主管审批",
      "position": { "x": 300, "y": 200 },
      "actionType": "approval-decide",
      "config": {
        "type": "approval-decide",
        "approvers": { "type": "department-head", "strategy": "any" },
        "resultVariable": "managerDecision",
        "timeout": { "durationHours": 48, "action": "escalate", "escalateTo": { "type": "role", "role": "hr-manager" } }
      }
    },
    {
      "id": "n3", "type": "condition", "label": "主管是否通过？",
      "position": { "x": 500, "y": 200 },
      "mode": "expression",
      "expression": "{{$wf.managerDecision === 'approved'}}"
    },
    {
      "id": "n4", "type": "condition", "label": "是否超过3天？",
      "position": { "x": 700, "y": 100 },
      "mode": "expression",
      "expression": "{{$wf.leaveData.days > 3}}"
    },
    {
      "id": "n5", "type": "action", "label": "HR审批",
      "position": { "x": 900, "y": 50 },
      "actionType": "approval-decide",
      "config": {
        "type": "approval-decide",
        "approvers": { "type": "role", "role": "hr-manager", "strategy": "any" },
        "resultVariable": "hrDecision"
      }
    },
    {
      "id": "n6", "type": "action", "label": "通知申请人（通过）",
      "position": { "x": 1100, "y": 100 },
      "actionType": "send-notification",
      "config": {
        "type": "send-notification",
        "channel": "wechat",
        "recipients": "{{$wf.leaveData.applicantId}}",
        "template": { "title": "请假审批通过", "content": "您的{{$wf.leaveData.days}}天请假申请已通过" }
      }
    },
    {
      "id": "n7", "type": "action", "label": "通知申请人（拒绝）",
      "position": { "x": 700, "y": 350 },
      "actionType": "send-notification",
      "config": {
        "type": "send-notification",
        "channel": "wechat",
        "recipients": "{{$wf.leaveData.applicantId}}",
        "template": { "title": "请假审批拒绝", "content": "您的请假申请未通过" }
      }
    },
    { "id": "n8", "type": "end", "label": "审批完成", "position": { "x": 1300, "y": 200 }, "status": "success" },
    { "id": "n9", "type": "end", "label": "审批拒绝", "position": { "x": 900, "y": 350 }, "status": "failure" }
  ],
  "edges": [
    { "id": "e1", "sourceNodeId": "n1", "targetNodeId": "n2" },
    { "id": "e2", "sourceNodeId": "n2", "targetNodeId": "n3" },
    { "id": "e3", "sourceNodeId": "n3", "sourcePort": "yes", "targetNodeId": "n4", "label": "通过" },
    { "id": "e4", "sourceNodeId": "n3", "sourcePort": "no", "targetNodeId": "n7", "label": "拒绝" },
    { "id": "e5", "sourceNodeId": "n4", "sourcePort": "yes", "targetNodeId": "n5", "label": ">3天" },
    { "id": "e6", "sourceNodeId": "n4", "sourcePort": "no", "targetNodeId": "n6", "label": "≤3天" },
    { "id": "e7", "sourceNodeId": "n5", "targetNodeId": "n6" },
    { "id": "e8", "sourceNodeId": "n6", "targetNodeId": "n8" },
    { "id": "e9", "sourceNodeId": "n7", "targetNodeId": "n9" }
  ]
}
```

#### 后端流程引擎对接方案

审批流程需要后端持久化和状态管理，推荐方案：

```
┌────────────────┐    WFP JSON     ┌────────────────┐
│ ForgeStudio    │ ──────────────→ │  后端服务       │
│ (流程设计)      │                 │  (流程部署)      │
└────────────────┘                 └───────┬────────┘
                                           │
                                   ┌───────▼────────┐
                                   │  流程引擎适配器  │
                                   │  ┌────────────┐ │
                                   │  │ Flowable   │ │  方案A: 成熟引擎
                                   │  └────────────┘ │
                                   │  ┌────────────┐ │
                                   │  │ 自研轻量引擎│ │  方案B: 自研
                                   │  └────────────┘ │
                                   └────────────────┘
```

**WFP → 后端引擎的转换：**
- WFP 审批流程 JSON 通过 API 部署到后端
- 后端引擎适配器将 WFP 转换为目标引擎格式（如 Flowable BPMN XML）
- 前端生成的代码调用后端 REST API 驱动流程

#### 代码生成策略

审批流前端生成的是 API 调用代码，流程逻辑在后端执行：

```tsx
// 生成的审批提交代码
const handleSubmitLeave = async () => {
  const res = await Taro.request({
    url: '/api/workflow/start',
    method: 'POST',
    data: {
      workflowId: 'wf_leave_approval',
      variables: {
        leaveData: { applicantId: userId, days: leaveDays, reason: leaveReason }
      }
    }
  })
  if (res.data.code === 0) {
    Taro.showToast({ title: '申请已提交', icon: 'success' })
    Taro.navigateTo({ url: '/pages/approval-list/index' })
  }
}

// 审批列表页：查询待审批任务
const [approvalTasks, setApprovalTasks] = useState([])
useEffect(() => {
  Taro.request({ url: '/api/workflow/tasks', method: 'GET' })
    .then(res => setApprovalTasks(res.data.data))
}, [])

// 审批决策
const handleApprove = async (taskId: string, decision: string) => {
  await Taro.request({
    url: `/api/workflow/tasks/${taskId}/complete`,
    method: 'POST',
    data: { decision, comment: approvalComment }
  })
  Taro.showToast({ title: '审批完成', icon: 'success' })
}
```

---

## 五、可视化流程编辑器设计

### 5.1 技术选型：LogicFlow

**选择 LogicFlow 的理由：**

| 维度 | LogicFlow | bpmn.js | ReactFlow |
|------|-----------|---------|-----------|
| 轻量性 | 核心包 ~100KB | ~500KB | ~80KB |
| React 支持 | `@logicflow/react-node-registry` 原生支持 | 需要 wrapper | 原生 React |
| 自定义节点 | 简单（继承 + React 组件） | 复杂（SVG overlay） | 简单 |
| BPMN 扩展 | 插件支持 | 原生 | 无 |
| 中文社区 | 活跃（滴滴维护） | 一般 | 英文为主 |
| 插件体系 | 丰富（MiniMap, DndPanel, Menu...） | 有 | 有限 |

**核心依赖：**
```json
{
  "@logicflow/core": "^2.x",
  "@logicflow/react-node-registry": "^2.x",
  "@logicflow/extension": "^2.x"
}
```

### 5.2 编辑器 UI 布局

流程编辑器作为编辑器的一个独立面板，通过 Tab 切换或抽屉方式呈现：

```
┌──────────────────────────────────────────────────────────────────┐
│  工具栏：[返回组件编辑] [保存] [撤销] [重做] [缩放] [适配画布]     │
├────────────┬────────────────────────────────┬────────────────────┤
│            │                                │                    │
│  节点面板   │        流程画布                 │    节点属性面板     │
│  (180px)   │     (LogicFlow 画布)           │    (320px)         │
│            │                                │                    │
│ ┌────────┐ │  ┌──────┐     ┌──────┐        │  节点类型：动作     │
│ │ 控制流  │ │  │ 开始  │────→│ 校验  │        │  ───────────       │
│ │ ○ 开始  │ │  └──────┘     └──┬───┘        │  动作类型：         │
│ │ ○ 结束  │ │                  │            │  [调用API ▼]       │
│ │ ◇ 条件  │ │            ┌────▼────┐       │                    │
│ │ ═ 并行  │ │            │ 有库存？ ◇       │  API配置：          │
│ │ ↻ 循环  │ │            └─┬─────┬─┘       │  数据源: [ds_xxx ▼] │
│ ├────────┤ │         是   │     │ 否       │  参数映射：         │
│ │ 动作   │ │        ┌────▼┐  ┌▼────┐      │  ┌──────────────┐  │
│ │ ○ API  │ │        │加购  │  │提示  │      │  │ goodsId: ... │  │
│ │ ○ 提示  │ │        └────┬┘  └┬────┘      │  │ quantity: .. │  │
│ │ ○ 跳转  │ │             │    │           │  └──────────────┘  │
│ │ ○ 状态  │ │        ┌────▼────▼┐          │                    │
│ │ ○ 校验  │ │        │   结束    │          │  错误处理：         │
│ │ ○ 审批  │ │        └──────────┘          │  [忽略 ▼]          │
│ └────────┘ │                                │                    │
│            │                                │                    │
├────────────┴────────────────────────────────┴────────────────────┤
│  状态栏：节点数量 12 | 连线数量 14 | 流程类型：页面交互              │
└──────────────────────────────────────────────────────────────────┘
```

### 5.3 自定义节点设计

每种节点类型对应一个 React 组件，通过 `@logicflow/react-node-registry` 注册：

```typescript
// packages/workflow-editor/src/nodes/index.ts
import { register } from '@logicflow/react-node-registry'

// 节点注册表
export function registerWorkflowNodes(lf: LogicFlow) {
  register({ type: 'wf-start', component: StartNodeComponent }, lf)
  register({ type: 'wf-end', component: EndNodeComponent }, lf)
  register({ type: 'wf-action', component: ActionNodeComponent }, lf)
  register({ type: 'wf-condition', component: ConditionNodeComponent }, lf)
  register({ type: 'wf-parallel', component: ParallelNodeComponent }, lf)
  register({ type: 'wf-wait', component: WaitNodeComponent }, lf)
  register({ type: 'wf-subprocess', component: SubprocessNodeComponent }, lf)
  register({ type: 'wf-loop', component: LoopNodeComponent }, lf)
}
```

**节点视觉规范：**

| 节点类型 | 形状 | 颜色 | 图标 |
|---------|------|------|------|
| 开始 | 圆形 | 绿色 #52c41a | Play |
| 结束 | 圆形（双边框） | 红色 #f5222d | Stop |
| 动作 | 圆角矩形 | 蓝色 #1890ff | 根据actionType变化 |
| 条件 | 菱形 | 橙色 #fa8c16 | Question |
| 并行 | 矩形（粗边框） | 紫色 #722ed1 | Split/Merge |
| 等待 | 圆角矩形（虚线） | 灰色 #8c8c8c | Clock |
| 子流程 | 矩形（双边框） | 青色 #13c2c2 | Nested |
| 循环 | 圆角矩形（循环箭头） | 黄色 #faad14 | Loop |

### 5.4 节点属性面板

选中节点后右侧面板动态渲染对应的属性表单：

```typescript
// 节点属性面板路由
interface NodePropertyPanelProps {
  node: WFPNode
  onChange: (updates: Partial<WFPNode>) => void
}

function NodePropertyPanel({ node, onChange }: NodePropertyPanelProps) {
  switch (node.type) {
    case 'action':
      return <ActionNodePanel node={node} onChange={onChange} />
    case 'condition':
      return <ConditionNodePanel node={node} onChange={onChange} />
    case 'parallel':
      return <ParallelNodePanel node={node} onChange={onChange} />
    // ...
  }
}
```

**ActionNode 属性面板结构：**

```
┌─────────────────────────┐
│ 节点名称: [校验表单    ] │
│ 动作类型: [调用API   ▼] │
│                         │
│ ── API 配置 ──          │
│ 数据源: [ds_goods    ▼] │
│ 结果变量: [result     ] │
│                         │
│ ── 参数映射 ──          │
│ goodsId: [{{$state..}}] │
│ [+ 添加参数]            │
│                         │
│ ── 错误处理 ──          │
│ 策略: [重试后回退   ▼]  │
│ 重试次数: [2]           │
│ 重试延迟: [1000] ms     │
│                         │
│ ── 超时 ──              │
│ 超时时间: [5000] ms     │
└─────────────────────────┘
```

### 5.5 与现有编辑器的集成方式

**集成入口（三种方式）：**

1. **组件事件面板** — 在事件配置中新增「使用流程编排」选项
2. **顶部工具栏** — 新增「流程管理」按钮，打开流程列表
3. **页面设置面板** — 在页面设置中配置数据编排流程

```typescript
// 集成到现有编辑器的 store 扩展
interface EditorState {
  // ...现有字段
  /** 当前页面的流程列表 */
  workflows: WFPSchema[]
  /** 当前正在编辑的流程 ID */
  activeWorkflowId: string | null
  /** 流程编辑器面板是否可见 */
  workflowEditorVisible: boolean

  // 流程操作
  addWorkflow: (workflow: WFPSchema) => void
  updateWorkflow: (id: string, updates: Partial<WFPSchema>) => void
  removeWorkflow: (id: string) => void
  setActiveWorkflow: (id: string | null) => void
}
```

---

## 六、代码生成扩展

### 6.1 IR 扩展设计

在现有 IR 体系中新增流程相关的 IR 节点：

```typescript
// packages/codegen-core/src/ir.ts 扩展

/** 流程 IR — 一个流程生成为一个 async 函数 */
export interface IRWorkflow {
  /** 函数名 */
  functionName: string
  /** 参数列表 */
  params: IRParam[]
  /** 局部变量声明 */
  localVars: IRLocalVar[]
  /** 函数体（语句列表） */
  body: IRStatement[]
  /** 是否为 useEffect 内调用 */
  isEffect: boolean
  /** 依赖数组（isEffect=true 时） */
  effectDeps?: string[]
}

/** IR 语句类型 */
export type IRStatement =
  | IRApiCallStatement       // Taro.request(...)
  | IRSetStateStatement      // setState(value)
  | IRIfElseStatement        // if (...) { ... } else { ... }
  | IRTryCatchStatement      // try { ... } catch { ... }
  | IRPromiseAllStatement    // Promise.all([...])
  | IRShowToastStatement     // Taro.showToast(...)
  | IRNavigateStatement      // Taro.navigateTo(...)
  | IRAssignStatement        // const x = ...
  | IRForEachStatement       // array.forEach(...)
  | IRWhileStatement         // while (...) { ... }
  | IRAwaitStatement         // await ...
  | IRReturnStatement        // return ...

/** API 调用语句 */
export interface IRApiCallStatement {
  type: 'api-call'
  resultVar: string
  url: string
  method: string
  data?: Record<string, IRExpression>
  timeout?: number
}

/** 条件语句 */
export interface IRIfElseStatement {
  type: 'if-else'
  condition: IRExpression
  thenBody: IRStatement[]
  elseBody?: IRStatement[]
}

/** 并行执行语句 */
export interface IRPromiseAllStatement {
  type: 'promise-all'
  resultVars: string[]
  calls: IRApiCallStatement[]
}

/** try-catch 语句 */
export interface IRTryCatchStatement {
  type: 'try-catch'
  tryBody: IRStatement[]
  catchBody: IRStatement[]
  errorVar: string
}
```

### 6.2 WFP → IR 转换策略

```typescript
// packages/codegen-workflow/src/wfp-to-ir.ts

/**
 * 将 WFP 流程协议转换为 IR 语句列表
 * 核心算法：图的深度优先遍历 + 结构化代码生成
 */
export function transformWorkflowToIR(workflow: WFPSchema): IRWorkflow {
  const graph = buildGraph(workflow.nodes, workflow.edges)
  const startNode = workflow.nodes.find(n => n.type === 'start')

  return {
    functionName: generateFunctionName(workflow),
    params: extractParams(workflow.variables),
    localVars: extractLocalVars(workflow.variables),
    body: traverseAndGenerate(graph, startNode.id),
    isEffect: workflow.type === 'data-orchestration',
    effectDeps: workflow.type === 'data-orchestration' ? [] : undefined
  }
}

/**
 * 图遍历生成 IR 语句
 * - 顺序节点 → 顺序语句
 * - 条件节点 → IRIfElseStatement
 * - 并行 fork/join → IRPromiseAllStatement
 * - 动作节点 + onError → IRTryCatchStatement
 */
function traverseAndGenerate(
  graph: WorkflowGraph,
  nodeId: string,
  visited?: Set<string>
): IRStatement[] {
  // ... 递归遍历实现
}
```

### 6.3 生成代码示例（完整页面）

**输入：** 一个包含交互流程的 FSP 页面

**输出 Taro 代码：**

```tsx
import { View, Text, Button, Input } from '@tarojs/components'
import Taro, { useEffect, useState } from '@tarojs/taro'
import './index.scss'

export default function OrderPage() {
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [cartCount, setCartCount] = useState(0)

  // === 数据编排流程：页面数据加载 ===
  useEffect(() => {
    const loadPageData = async () => {
      try {
        const [goodsRes, reviewsRes] = await Promise.all([
          Taro.request({ url: '/api/goods/1', method: 'GET' }),
          Taro.request({ url: '/api/goods/1/reviews', method: 'GET' })
        ])
        setGoodsInfo(goodsRes.data.data)
        setReviews(reviewsRes.data.data)
      } catch (error) {
        Taro.showToast({ title: '数据加载失败', icon: 'error' })
      }
    }
    loadPageData()
  }, [])

  // === 交互流程：提交订单 ===
  const handleSubmitOrder = async () => {
    try {
      // 校验表单
      if (!username || !phone || !address) {
        Taro.showToast({ title: '请填写完整信息', icon: 'error' })
        return
      }

      // 提交订单
      const result = await Taro.request({
        url: '/api/orders',
        method: 'POST',
        data: { username, phone, address }
      })

      // 成功处理
      Taro.showToast({ title: '订单提交成功', icon: 'success' })
      Taro.navigateTo({
        url: `/pages/order-detail/index?orderId=${result.data.data.id}`
      })
    } catch (error) {
      Taro.showToast({ title: '网络错误，请重试', icon: 'error' })
    }
  }

  return (
    <View className="page">
      {/* 页面内容 */}
      <Button onClick={handleSubmitOrder}>提交订单</Button>
    </View>
  )
}
```

---

## 七、新增 Package 设计

### 7.1 packages/workflow-protocol

**职责：** WFP 流程协议的类型定义、校验、工具函数。

```
packages/workflow-protocol/
├── src/
│   ├── types.ts          # WFPSchema, WFPNode, WFPEdge 等全部类型
│   ├── validator.ts      # 流程协议校验（基于 zod）
│   ├── utils.ts          # 工具函数：createNode, findNode, addEdge...
│   ├── migration.ts      # Action[] → WFP 自动迁移工具
│   └── index.ts          # 统一导出
├── package.json
└── tsconfig.json
```

**核心工具函数：**

```typescript
// 创建流程节点
function createWorkflowNode(type: WFPNodeType, config?: Partial<WFPNode>): WFPNode

// 校验流程合法性（有且仅一个开始节点、所有节点可达、无孤立节点）
function validateWorkflow(workflow: WFPSchema): ValidationResult

// Action[] 迁移为 WFP
function migrateActionsToWorkflow(actions: Action[], meta: MigrationMeta): WFPSchema

// 拓扑排序（用于确定执行顺序）
function topologicalSort(workflow: WFPSchema): string[]
```

### 7.2 packages/workflow-editor

**职责：** 基于 LogicFlow 的可视化流程编辑器 UI 组件。

```
packages/workflow-editor/
├── src/
│   ├── WorkflowEditor.tsx     # 主编辑器组件
│   ├── nodes/                 # 自定义节点组件
│   │   ├── StartNode.tsx
│   │   ├── EndNode.tsx
│   │   ├── ActionNode.tsx
│   │   ├── ConditionNode.tsx
│   │   ├── ParallelNode.tsx
│   │   ├── WaitNode.tsx
│   │   ├── SubprocessNode.tsx
│   │   ├── LoopNode.tsx
│   │   └── register.ts       # 统一注册
│   ├── panels/                # 属性面板
│   │   ├── NodePropertyPanel.tsx
│   │   ├── ActionNodePanel.tsx
│   │   ├── ConditionNodePanel.tsx
│   │   └── ...
│   ├── toolbar/               # 工具栏
│   │   └── WorkflowToolbar.tsx
│   ├── sidebar/               # 节点拖拽面板
│   │   └── NodePalette.tsx
│   ├── hooks/                 # 自定义 hooks
│   │   ├── useWorkflowEditor.ts
│   │   └── useNodeSelection.ts
│   ├── converters/            # WFP ↔ LogicFlow 数据转换
│   │   ├── wfp-to-logicflow.ts
│   │   └── logicflow-to-wfp.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

**关键：WFP ↔ LogicFlow 数据转换**

LogicFlow 内部使用自己的数据格式，需要双向转换：

```typescript
// WFP → LogicFlow（加载时）
function wfpToLogicFlow(workflow: WFPSchema): LogicFlowGraphData {
  return {
    nodes: workflow.nodes.map(node => ({
      id: node.id,
      type: `wf-${node.type}`,
      x: node.position.x,
      y: node.position.y,
      text: node.label,
      properties: { ...node }  // 完整节点数据存入 properties
    })),
    edges: workflow.edges.map(edge => ({
      id: edge.id,
      type: 'polyline',
      sourceNodeId: edge.sourceNodeId,
      targetNodeId: edge.targetNodeId,
      text: edge.label,
      properties: { sourcePort: edge.sourcePort, targetPort: edge.targetPort }
    }))
  }
}

// LogicFlow → WFP（保存时）
function logicFlowToWfp(graphData: LogicFlowGraphData, meta: WFPMeta): WFPSchema {
  // 从 LogicFlow 节点的 properties 中恢复完整的 WFP 节点数据
  // ...
}
```

### 7.3 packages/workflow-engine

**职责：** 前端流程运行时（用于编辑器内的流程预览/调试）。

```
packages/workflow-engine/
├── src/
│   ├── engine.ts          # 流程执行引擎
│   ├── context.ts         # 执行上下文管理
│   ├── executor.ts        # 节点执行器（按类型分发）
│   ├── scheduler.ts       # 调度器（处理并行、等待）
│   └── index.ts
├── package.json
└── tsconfig.json
```

**引擎核心接口：**

```typescript
export class WorkflowEngine {
  /** 执行流程 */
  async execute(
    workflow: WFPSchema,
    initialContext: Record<string, unknown>
  ): Promise<WorkflowResult>

  /** 单步执行（调试用） */
  async stepExecute(nodeId: string): Promise<StepResult>

  /** 暂停执行 */
  pause(): void

  /** 恢复执行 */
  resume(): void

  /** 监听执行事件 */
  on(event: 'node-enter' | 'node-exit' | 'error' | 'complete', handler: Function): void
}
```

> **注意：** Phase 1 不实现完整引擎，仅用于编辑器内的流程预览高亮。完整运行时在 Phase 3 实现。

### 7.4 packages/codegen-workflow

**职责：** WFP 流程协议 → Taro 代码的转换。

```
packages/codegen-workflow/
├── src/
│   ├── transformer.ts     # WFP → IR 转换
│   ├── ir-types.ts        # 流程 IR 类型扩展
│   ├── generators/        # 各节点类型的代码生成器
│   │   ├── action-generator.ts
│   │   ├── condition-generator.ts
│   │   ├── parallel-generator.ts
│   │   ├── loop-generator.ts
│   │   └── approval-generator.ts
│   ├── graph-utils.ts     # 图遍历工具
│   └── index.ts
├── package.json
└── tsconfig.json
```

**包间依赖关系：**

```
workflow-protocol ← workflow-editor
workflow-protocol ← workflow-engine
workflow-protocol ← codegen-workflow
codegen-core      ← codegen-workflow
data-binding      ← workflow-engine
protocol          ← workflow-protocol
```

---

## 八、实施路线图

### Phase 1：页面交互流程（4-6 周）

**目标：** 替代现有线性动作列表，实现可视化交互流程编辑和代码生成。

**任务清单：**

| # | 任务 | 预估 | 交付物 |
|---|------|------|--------|
| 1.1 | 创建 `workflow-protocol` 包，定义核心类型 | 3天 | TypeScript 类型 + zod 校验 |
| 1.2 | 实现 WFP 工具函数（createNode, validate, topologicalSort） | 2天 | 工具函数 + 单元测试 |
| 1.3 | 创建 `workflow-editor` 包，集成 LogicFlow | 3天 | 基础画布 + 拖拽 |
| 1.4 | 实现 8 种自定义节点组件 | 4天 | 节点渲染 + 样式 |
| 1.5 | 实现节点属性面板（Action 类型为主） | 3天 | 动态表单 |
| 1.6 | 实现 WFP ↔ LogicFlow 数据转换 | 2天 | 双向转换器 |
| 1.7 | 集成到现有编辑器（事件面板入口） | 2天 | 编辑器集成 |
| 1.8 | 创建 `codegen-workflow` 包，实现 WFP → IR | 4天 | 转换器 |
| 1.9 | 实现交互流程的 Taro 代码生成 | 3天 | 代码生成 |
| 1.10 | Action[] → WFP 自动迁移工具 | 2天 | 迁移工具 |
| 1.11 | 端到端测试 + 文档 | 2天 | 测试 + 文档 |

**验收标准：**
- [ ] 可在编辑器中为按钮事件创建可视化流程
- [ ] 支持 5 种动作节点：API调用、提示、跳转、状态修改、表单校验
- [ ] 支持条件分支节点（if/else）
- [ ] 生成的 Taro 代码包含 async 函数、try/catch、if/else
- [ ] 现有 Action[] 可自动迁移为 WFP 流程
- [ ] 导出的 FSP JSON 包含 workflows 字段

**演示场景：**
> 打开编辑器 → 拖入表单组件和按钮 → 点击按钮事件 → 选择「流程编排」→
> 在流程编辑器中拖入节点：校验 → API调用 → 条件分支 → 成功跳转/失败提示 →
> 保存流程 → 生成 Taro 代码 → 代码包含完整的 async 函数

### Phase 2：数据编排流程（3-4 周）

**目标：** 支持页面级数据加载的可视化编排，引入并行执行。

**任务清单：**

| # | 任务 | 预估 | 交付物 |
|---|------|------|--------|
| 2.1 | 并行网关节点实现（fork/join） | 3天 | 节点 + 属性面板 |
| 2.2 | 等待/延时节点实现 | 2天 | 节点 + 属性面板 |
| 2.3 | 循环节点实现（forEach） | 3天 | 节点 + 属性面板 |
| 2.4 | 数据编排流程的代码生成（Promise.all） | 3天 | 代码生成 |
| 2.5 | 页面设置面板集成（数据编排入口） | 2天 | 编辑器集成 |
| 2.6 | 子流程节点实现 | 3天 | 流程复用 |
| 2.7 | 流程模板系统（预设常用流程模板） | 2天 | 3-5个模板 |
| 2.8 | 流程预览/调试面板 | 3天 | 运行时高亮 |

**验收标准：**
- [ ] 支持并行网关（fork + join），生成 Promise.all
- [ ] 支持循环节点（forEach），生成 array.map/forEach
- [ ] 支持子流程引用，生成独立函数调用
- [ ] 页面数据加载可通过流程编排替代 DataSource.dependsOn
- [ ] 流程模板可一键套用

**演示场景：**
> 创建用户中心页 → 打开数据编排 → 拖入并行网关 →
> 三个 API 节点并行：查用户/查订单/查积分 → 汇合节点 → 合并数据 →
> 生成代码包含 Promise.all + 状态更新

### Phase 3：业务审批流程（4-6 周）

**目标：** 支持 OA 审批流设计，对接后端流程引擎。

**任务清单：**

| # | 任务 | 预估 | 交付物 |
|---|------|------|--------|
| 3.1 | 审批节点类型实现（submit, decide, notification） | 4天 | 节点 + 面板 |
| 3.2 | 审批人配置面板（角色/部门/固定人/表达式） | 3天 | 配置 UI |
| 3.3 | 后端流程引擎适配层设计 | 3天 | 适配器接口 |
| 3.4 | WFP → Flowable BPMN XML 转换器 | 5天 | 转换器 |
| 3.5 | 审批列表/详情页组件生成 | 4天 | 代码生成 |
| 3.6 | 流程实例监控面板 | 3天 | 运行状态 UI |
| 3.7 | 前端流程引擎完整实现 | 5天 | 运行时引擎 |
| 3.8 | 端到端测试 + 文档 | 3天 | 测试 + 文档 |

**验收标准：**
- [ ] 可设计包含多级审批的审批流程
- [ ] 审批人支持固定人/角色/部门主管/动态表达式
- [ ] 生成的代码包含审批 API 调用
- [ ] WFP 可导出为 Flowable 兼容的 BPMN XML
- [ ] 流程实例可在面板中查看运行状态

**演示场景：**
> 设计请假审批流 → 提交 → 主管审批 → 金额判断 → HR审批 → 通知 →
> 生成 Taro 代码含审批提交/审批列表/审批决策页面 →
> 部署到后端引擎 → 完整审批流程可运行

---

## 九、风险评估与应对

| 风险 | 影响 | 概率 | 应对策略 |
|------|------|------|---------|
| LogicFlow 与现有编辑器样式冲突 | 中 | 中 | CSS 命名空间隔离，流程编辑器使用独立容器 |
| 复杂流程的代码生成质量 | 高 | 中 | 限制流程复杂度（最多 30 节点），复杂场景提供手动代码编辑 |
| 审批流后端引擎对接复杂 | 高 | 高 | Phase 3 再做审批流，先验证前端交互流程和数据编排 |
| WFP 协议设计不合理需重构 | 高 | 低 | Phase 1 充分验证，预留 extensions 扩展点 |
| 流程编辑器性能问题（大量节点） | 中 | 低 | LogicFlow 支持虚拟渲染，限制单个流程最大节点数 |
| 与现有 Action 系统兼容性 | 中 | 中 | 提供自动迁移工具，保留 Action[] 作为简单场景入口 |

---

## 十、附录

### 10.1 完整协议 TypeScript 类型定义

完整类型定义见第三章，汇总导出清单：

```typescript
// packages/workflow-protocol/src/index.ts
export type {
  // 顶层
  WFPSchema,
  WFPVariable,

  // 节点
  WFPNode,
  WFPNodeType,
  WFPNodeBase,
  WFPStartNode,
  WFPEndNode,
  WFPActionNode,
  WFPConditionNode,
  WFPParallelNode,
  WFPWaitNode,
  WFPSubprocessNode,
  WFPLoopNode,

  // 动作配置
  WFPActionType,
  WFPActionConfig,
  WFPApiCallConfig,
  WFPSetVariableConfig,
  WFPSetStateConfig,
  WFPNavigateConfig,
  WFPShowToastConfig,
  WFPShowModalConfig,
  WFPValidateFormConfig,
  WFPTransformDataConfig,
  WFPCustomCodeConfig,
  WFPApprovalSubmitConfig,
  WFPApprovalDecideConfig,
  WFPSendNotificationConfig,

  // 审批
  WFPApproverConfig,

  // 连线
  WFPEdge,

  // 错误处理
  WFPErrorHandler,

  // 表达式上下文
  WFPExpressionContext,

  // FSP 扩展
  WorkflowRef,
  ExecuteWorkflowAction,
}
```

### 10.2 节点类型速查表

| 节点类型 | 用途 | 入口数 | 出口数 | Phase |
|---------|------|--------|--------|-------|
| `start` | 流程入口 | 0 | 1 | 1 |
| `end` | 流程终止 | 1+ | 0 | 1 |
| `action` | 执行动作 | 1 | 1 | 1 |
| `condition` | 条件分支 | 1 | 2+（expression）或 N+（switch） | 1 |
| `parallel` | 并行/汇合 | 1（fork）或 N（join） | N（fork）或 1（join） | 2 |
| `wait` | 等待/延时 | 1 | 1 | 2 |
| `loop` | 循环迭代 | 1 | 1 | 2 |
| `subprocess` | 子流程 | 1 | 1 | 2 |

### 10.3 动作类型速查表

| 动作类型 | 用途 | 对应现有 Action | Phase |
|---------|------|----------------|-------|
| `api-call` | 调用 API | SubmitFormAction | 1 |
| `set-variable` | 设置流程变量 | — | 1 |
| `set-state` | 设置页面状态 | SetStateAction | 1 |
| `navigate` | 页面跳转 | NavigateAction | 1 |
| `show-toast` | 显示提示 | ShowToastAction | 1 |
| `show-modal` | 显示模态框 | — | 1 |
| `validate-form` | 表单校验 | — | 1 |
| `transform-data` | 数据转换 | — | 2 |
| `custom-code` | 自定义代码 | — | 2 |
| `approval-submit` | 提交审批 | — | 3 |
| `approval-decide` | 审批决策 | — | 3 |
| `send-notification` | 发送通知 | — | 3 |

### 10.4 表达式上下文速查表

| 前缀 | 含义 | 可用范围 |
|------|------|---------|
| `$wf.xxx` | 流程变量 | 流程内所有节点 |
| `$result` | 上一节点执行结果 | 动作节点之后 |
| `$error` | 错误信息 | onError 处理中 |
| `$loop.item` | 循环当前项 | 循环节点体内 |
| `$loop.index` | 循环当前索引 | 循环节点体内 |
| `$approval` | 审批上下文 | 审批流节点 |
| `$state.xxx` | 页面状态（继承） | 任意 |
| `$ds.xxx` | 数据源（继承） | 任意 |
| `$item.xxx` | 列表项（继承） | List 子组件内 |
