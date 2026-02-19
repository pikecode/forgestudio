# 开发总结：数据源系统完善与中文ID修复

**日期**: 2026-02-19
**版本**: M4 (Multi-page & Data Type Support)

---

## 概述

本次开发主要解决了中文数据源ID导致的代码生成问题，并新增了数据源类型区分功能（数组 vs 对象），完善了列表-详情页面的完整交互流程。

---

## 一、核心问题修复

### 1.1 中文变量名随机化问题 ⚠️ 高优先级

#### 问题表现
```javascript
// 首页生成的代码
const [ds_eaxod0Data, setDs_eaxod0Data] = useState([...])  // State 声明

// 但在 JSX 中使用的是
{ds_ox8vbpData.map(...)}  // ❌ 变量未定义错误
```

#### 根本原因
`transformer.ts` 中的 `sanitizeVarName()` 函数对中文数据源ID（如 "列表接口"）使用了 **`Math.random()`** 生成变量名：

```typescript
// 错误实现
if (!sanitized || /^_+$/.test(sanitized)) {
  sanitized = 'ds_' + Math.random().toString(36).substr(2, 6)  // ❌ 每次调用结果不同
}
```

#### 解决方案
使用**稳定哈希**替代随机值 (transformer.ts:44-71)：

```typescript
function sanitizeVarName(id: string): string {
  let sanitized = id.replace(/[^\w]/g, '_')

  if (/^\d/.test(sanitized)) {
    sanitized = '_' + sanitized
  }

  // 使用稳定哈希而不是随机值
  if (!sanitized || /^_+$/.test(sanitized)) {
    let hash = 0
    for (let i = 0; i < id.length; i++) {
      const char = id.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash  // Convert to 32-bit integer
    }
    sanitized = 'ds_' + Math.abs(hash).toString(36)
  }

  return sanitized
}
```

**效果**：
- "列表接口" → 始终生成 `ds_xxxxxxxx`（相同哈希）
- "详情接口" → 始终生成 `ds_yyyyyyyy`（相同哈希）

---

### 1.2 数据源引用识别失败问题

#### 问题表现
详情页生成的代码缺少数据源的 state 和 effect：

```typescript
// 生成的代码
export default function Index() {
  return (
    <View>
      <Text>{ds_i1vsfxData?.id}</Text>  // ❌ 变量未定义
    </View>
  )
}
```

#### 根本原因
`collectReferencedDataSources()` 函数使用的正则 `\w+` **无法匹配中文字符**：

```typescript
// 错误实现
const matches = value.matchAll(/\{\{\$ds\.(\w+)\./g)  // ❌ \w 不匹配中文
```

当遇到 `{{$ds.详情接口.id}}` 时，只能匹配到空字符串，导致该数据源被认为"未使用"而被过滤掉。

#### 解决方案
修改正则为 `[^.\s}]+` 来匹配任意字符 (transformer.ts:101)：

```typescript
// 正确实现
const matches = value.matchAll(/\{\{\$ds\.([^.\s}]+)\./g)  // ✅ 匹配任意字符包括中文
```

---

### 1.3 表达式 Sanitization

#### 问题
文本内容中的表达式 `{{$ds.详情接口.id}}` 没有被转换为合法变量名。

#### 解决方案
添加 `sanitizeExpression()` 函数，在 IR 生成阶段统一处理所有表达式 (transformer.ts:269-278)：

```typescript
function sanitizeExpression(expr: string): string {
  if (!expr.includes('$ds.')) return expr

  // 将 $ds.xxx 替换为 $ds.sanitized_xxx
  return expr.replace(/\$ds\.([^.}]+)/g, (match, dsId) => {
    return `$ds.${sanitizeVarName(dsId)}`
  })
}
```

**应用到**：
- Text 组件的 content 属性
- Button 组件的 text 属性
- 所有组件的属性值

---

## 二、新功能：数据源类型区分 🆕

### 2.1 功能背景

之前的系统默认所有数据源返回**数组**，但实际场景中存在两种类型：
- **列表接口**：返回数组 `[{...}, {...}]`
- **详情接口**：返回单个对象 `{id: 1, title: '...'}`

两者的处理逻辑不同，需要在协议层区分。

### 2.2 协议扩展

在 `DataSourceDef` 中添加 `dataType` 字段 (protocol/types.ts:71)：

```typescript
export interface DataSourceDef {
  id: string
  type: 'api'
  purpose: 'query' | 'mutation'
  dataType?: 'array' | 'object'  // 🆕 新增字段
  // ...
}
```

### 2.3 代码生成逻辑 (transformer.ts:167-221)

#### 数组类型 (`dataType: 'array'`)
```typescript
const [listData, setListData] = useState<any[]>([...])

useEffect(() => {
  Taro.request({ url: 'https://api.com/products', method: 'GET' })
    .then(res => {
      const list = extractList(res.data)  // 提取数组
      if (list.length) setListData(list)
    })
    .catch(err => console.error('Failed to fetch:', err))
}, [])
```

#### 对象类型 (`dataType: 'object'`)
```typescript
const [detailData, setDetailData] = useState<any>(sampleData[0] || {})

useEffect(() => {
  const params = Taro.getCurrentInstance().router?.params || {}
  Taro.request({ url: `https://api.com/products/${params.id}`, method: 'GET' })
    .then(res => {
      if (res.data) setDetailData(res.data)  // 直接设置对象
    })
    .catch(err => console.error('Failed to fetch:', err))
}, [])
```

**关键差异**：
| 特性 | 数组类型 | 对象类型 |
|-----|---------|---------|
| State 类型 | `any[]` | `any` |
| 默认值 | `sampleData` | `sampleData[0]` |
| 响应处理 | `extractList(res.data)` | `res.data` |
| 条件判断 | `if (list.length)` | `if (res.data)` |
| Helper 函数 | 需要 `extractList` | 不需要 |

### 2.4 依赖检查优化

当数据源依赖对象类型的数据源时，检查逻辑也需要调整 (transformer.ts:184-193)：

```typescript
// 数组类型依赖：检查 length > 0
if (depDs?.dataType === 'array') {
  depCheck = `${depVarName}.length > 0`
}

// 对象类型依赖：检查对象是否存在
if (depDs?.dataType === 'object') {
  depCheck = depVarName
}
```

### 2.5 模板配置 (datasource-templates.ts)

| 模板 | dataType | 说明 |
|-----|----------|-----|
| 列表接口 | `array` | 用于列表展示 |
| 详情接口 | `object` | 🆕 用于详情展示，需要 ID 参数 |
| 提交接口 | `array` | POST 表单提交 |
| 自定义 | `array` | 默认数组类型 |

---

## 三、列表-详情完整流程 ✅

### 3.1 流程概览

```
┌─────────────┐      点击行项目       ┌─────────────┐
│  首页列表    │ ──────────────────→  │  详情页面    │
│ (List Page)  │  传递 id 参数         │ (Detail)     │
└─────────────┘                       └─────────────┘
      ↓                                      ↓
  GET /api/products              GET /api/products/:id
  返回数组 [{...}, {...}]           返回对象 {id, title, ...}
```

### 3.2 首页配置

**列表数据源**：
- 模板：列表接口
- dataType: `array`
- URL: `https://jsonplaceholder.typicode.com/todos`

**导航按钮事件**：
- 类型：Navigate
- 目标页面：`/pages/detail/index`
- 参数：`id = {{$item.id}}`

### 3.3 详情页配置

**详情数据源**：
- 模板：详情接口
- dataType: `object`  🆕
- URL: `https://jsonplaceholder.typicode.com/todos/{{$param.id}}`

**页面参数**：
- 自动检测到 `$param.id`
- 在 preview 时提供 mock 值

### 3.4 生成的代码示例

**首页 (index.tsx)**：
```typescript
const [ds_abc123Data, setDs_abc123Data] = useState<any[]>([...])

const handleOnClick1 = (item: any) => {
  Taro.navigateTo({ url: `/pages/detail/index?id=${item.id}` })
}

useEffect(() => {
  Taro.request({ url: 'https://jsonplaceholder.typicode.com/todos', method: 'GET' })
    .then(res => {
      const list = extractList(res.data)
      if (list.length) setDs_abc123Data(list)
    })
}, [])

return (
  <View>
    {ds_abc123Data.map((item, index) => (
      <View key={index}>
        <Text>{item.title}</Text>
        <Button onClick={() => handleOnClick1(item)}>查看详情</Button>
      </View>
    ))}
  </View>
)
```

**详情页 (detail/index.tsx)**：
```typescript
const [ds_xyz789Data, setDs_xyz789Data] = useState<any>({})  // 🆕 对象类型

useEffect(() => {
  const params = Taro.getCurrentInstance().router?.params || {}
  Taro.request({
    url: `https://jsonplaceholder.typicode.com/todos/${params.id}`,
    method: 'GET'
  })
    .then(res => {
      if (res.data) setDs_xyz789Data(res.data)  // 🆕 直接设置对象
    })
    .catch(err => console.error('Failed to fetch:', err))
}, [])

return (
  <View>
    <Text>{ds_xyz789Data?.id}</Text>
    <Text>{ds_xyz789Data?.title}</Text>
  </View>
)
```

---

## 四、向后兼容性

### 4.1 协议兼容

- `dataType` 字段为可选（`?`），默认值为 `'array'`
- 旧的数据源配置会自动使用数组类型逻辑

### 4.2 代码兼容

编辑器 UI 在处理旧数据时添加了兼容逻辑：

```typescript
// DataSourcePanel.tsx
dataType: ds.dataType || 'array'  // 向后兼容

// DataSourceWizard.tsx
dataType: template.dataType || 'array'  // 默认数组类型
```

### 4.3 导入/导出兼容

导入旧数据源时，自动补充默认值：

```typescript
addDataSource({
  // ...
  dataType: ds.dataType || 'array',  // 兼容旧数据
  sampleData: (ds as any).mockData || ds.sampleData,  // 兼容 mockData 字段
})
```

---

## 五、文件变更清单

### 协议层
- ✅ `packages/protocol/src/types.ts` - 添加 `dataType` 字段

### 代码生成层
- ✅ `packages/codegen-core/src/transformer.ts`
  - 修复 `sanitizeVarName()` - 稳定哈希
  - 修复 `collectReferencedDataSources()` - 支持中文
  - 新增 `sanitizeExpression()` - 表达式预处理
  - 扩展数据源处理逻辑 - 区分数组/对象类型

### 编辑器 UI 层
- ✅ `packages/editor/src/datasource-templates.ts`
  - 添加 `dataType` 字段到模板配置
  - 详情模板设置为 `object` 类型
- ✅ `packages/editor/src/components/DataSourcePanel.tsx`
  - 表单添加 `dataType` 字段
  - 导入/导出兼容处理
- ✅ `packages/editor/src/components/DataSourceWizard.tsx`
  - 提交数据包含 `dataType`

---

## 六、测试验证

### 6.1 手动测试步骤

1. **删除旧数据源**（避免缓存干扰）
2. **创建列表数据源**：
   - 选择"列表接口"模板
   - URL: `https://jsonplaceholder.typicode.com/todos`
   - 验证 `dataType: 'array'`
3. **创建详情数据源**：
   - 选择"详情接口"模板
   - URL: `https://jsonplaceholder.typicode.com/todos/{{$param.id}}`
   - 验证 `dataType: 'object'`
4. **配置导航**：
   - 列表按钮添加 Navigate 事件
   - 参数：`id = {{$item.id}}`
5. **导出代码并编译**

### 6.2 预期结果

- ✅ 无中文变量名
- ✅ 变量名在声明和使用处一致
- ✅ 详情页生成 `any` 类型（而不是 `any[]`）
- ✅ 详情页不使用 `extractList` 和 `list.length` 判断
- ✅ 代码可正常编译运行
- ✅ 列表点击可跳转到详情页
- ✅ 详情页可接收并使用 ID 参数

---

## 七、已知问题与限制

### 7.1 哈希冲突风险 ⚠️

当前使用简单哈希算法，理论上存在冲突风险（极低概率）。如需更严格保证唯一性，可考虑：
- 使用更强的哈希算法（如 SHA-256 的前 8 位）
- 或添加序号后缀防冲突

### 7.2 Preview 模拟限制

编辑器预览时对 `$param` 的模拟较简单：
- ID 参数默认为 `'1'`
- 其他参数为 `'mock_paramName'`

实际场景中可能需要更灵活的 mock 机制。

### 7.3 混合类型嵌套

当前不支持：
- 数组中嵌套对象 `{ data: { list: [...] } }`
- 对象中嵌套数组 `{ id: 1, items: [...] }`

这些场景仍需手动调整代码或扩展 `extractList` 逻辑。

---

## 八、下一步计划

### 8.1 短期优化 (P0)
- [ ] 添加数据源类型切换 UI（数组 ↔ 对象）
- [ ] 完善错误提示（变量名冲突、参数缺失等）
- [ ] 支持更复杂的 URL 参数场景（多个参数、可选参数）

### 8.2 中期规划 (P1)
- [ ] 数据源响应结构可视化编辑器
- [ ] Mock 数据高级编辑器（支持函数生成）
- [ ] 数据源测试面板优化（显示完整请求/响应）

### 8.3 长期展望 (P2)
- [ ] 支持 GraphQL 数据源
- [ ] 支持本地数据源（localStorage、IndexedDB）
- [ ] 数据源版本管理和回滚

---

## 九、相关资源

### 文档链接
- [协议文档](../packages/protocol/README.md)
- [代码生成指南](../packages/codegen-core/README.md)
- [Taro 插件文档](../packages/codegen-taro/README.md)

### API 测试资源
- JSONPlaceholder: https://jsonplaceholder.typicode.com/
- DummyJSON: https://dummyjson.com/
- ReqRes: https://reqres.in/

---

**总结**：本次开发解决了中文数据源导致的严重 bug，并新增了数据源类型区分功能，使得列表-详情这一常见场景能够完整支持。系统的健壮性和实用性得到显著提升。
