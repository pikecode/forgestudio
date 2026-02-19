# M1 执行计划与阶段成果

> **M1 目标**：跑通「拖拽搭建 → 数据绑定 → 协议生成 → Taro 代码输出」完整链路
> **总时长**：预计 2-3 个月
> **团队配置**：3-4 人（1 技术负责人 + 2 前端 + 1 后端）

---

## 阶段总览

| 阶段 | 时长 | 核心成果 | 可演示内容 |
|------|------|---------|-----------|
| M1.1 | 3-4 周 | 协议 + 静态编辑器 | 拖拽搭建静态页面，导出 JSON |
| M1.2 | 2-3 周 | 静态代码生成 | 静态页面 → 可运行 Taro 项目 |
| M1.3 | 3-4 周 | 数据绑定 + 动态组件 | 配置 API，编辑器内 Mock 预览 |
| M1.4 | 2-3 周 | 动态代码生成 | 完整链路：拖拽 → 绑定 → 生成 → 运行 |

---

## M1.1：协议定义 + 静态编辑器

### 时间安排
- **预计时长**：3-4 周
- **并行开发**：协议设计（1 周）→ 编辑器开发（2-3 周）

### 开发任务（7 个）

**Week 1：工程基础 + 协议设计**
- [ ] T1: 初始化 Monorepo（Turborepo + pnpm）
- [ ] T2: 定义 FSP 协议 TypeScript 类型
- [ ] T2: 编写 JSON Schema 校验
- [ ] T2: 协议工具函数（createNode、findNodeById 等）

**Week 2-3：编辑器核心**
- [ ] T3: 实现 Zustand Store（EditorState）
- [ ] T4: 三栏布局（组件面板 + 画布 + 属性面板）
- [ ] T4: 基于 dnd-kit 实现拖拽
- [ ] T5: 属性面板（5 种 Setter）
- [ ] T6: 注册 6 个基础组件
- [ ] T7: 渲染器（编辑态预览）

**Week 4：测试 + 优化**
- [ ] 端到端测试
- [ ] 导入/导出功能
- [ ] UI 优化和 bug 修复

### 阶段成果输出

**1. 代码交付物**
```
packages/
├── protocol/
│   ├── src/types.ts           # FSP 协议类型定义
│   ├── src/schema.json        # JSON Schema 校验
│   ├── src/utils.ts           # 协议工具函数
│   └── package.json
├── editor-core/
│   ├── src/store.ts           # Zustand Store
│   └── package.json
├── editor-ui/
│   ├── src/Layout.tsx         # 三栏布局
│   ├── src/Canvas.tsx         # 画布组件
│   ├── src/ComponentPanel.tsx # 组件面板
│   └── package.json
├── props-panel/
│   ├── src/PropsPanel.tsx     # 属性面板
│   ├── src/setters/           # 5 种 Setter
│   └── package.json
├── components/
│   ├── src/meta/              # 6 个组件的 Meta 定义
│   └── package.json
└── renderer/
    ├── src/Renderer.tsx       # 渲染器
    └── package.json

apps/web/                      # 编辑器 Web 应用
```

**2. 可运行的编辑器**
- 访问 `http://localhost:5173` 打开编辑器
- 左侧组件面板显示 6 个组件（Page、View、Text、Image、Button、Input）
- 可拖拽组件到画布
- 选中组件后右侧显示属性面板
- 修改属性后画布实时更新

**3. 协议 JSON 示例**
```json
{
  "version": "1.0.0",
  "meta": { "name": "示例页面" },
  "componentTree": {
    "id": "root",
    "component": "Page",
    "props": { "title": "示例" },
    "styles": {},
    "children": [
      {
        "id": "text_1",
        "component": "Text",
        "props": { "content": "Hello ForgeStudio" },
        "styles": { "fontSize": 32, "color": "#333" }
      }
    ]
  }
}
```

**4. 演示视频**
- 录制 2-3 分钟演示视频
- 展示拖拽、配置、预览、导出流程

### 验收标准
- [ ] 可拖拽 6 个组件到画布
- [ ] 属性修改后画布实时更新（< 100ms 延迟）
- [ ] 导出的 JSON 通过 Schema 校验
- [ ] 导入 JSON 可完整还原编辑器状态
- [ ] 无明显 UI bug，操作流畅

---

## M1.2：静态页面代码生成

### 时间安排
- **预计时长**：2-3 周
- **并行开发**：codegen-core（1 周）+ codegen-taro（1 周）+ 编辑器集成（1 周）

### 开发任务（3 个）

**Week 1：代码生成核心**
- [ ] T1: 定义 IR（中间表示）类型
- [ ] T1: 实现协议解析器（FSPSchema → IRPage）
- [ ] T1: 定义代码生成插件接口

**Week 2：Taro 生成插件**
- [ ] T2: 实现组件映射表（FSP → Taro）
- [ ] T2: IR → TSX 代码生成（基于 Babel）
- [ ] T2: IR → SCSS 样式生成
- [ ] T2: 生成 Taro 项目脚手架文件

**Week 3：编辑器集成**
- [ ] T3: 工具栏新增「生成代码」按钮
- [ ] T3: 代码预览面板（Monaco Editor）
- [ ] T3: 项目下载功能（JSZip）
- [ ] T3: 测试和优化

### 阶段成果输出

**1. 代码交付物**
```
packages/
├── codegen-core/
│   ├── src/ir.ts              # IR 类型定义
│   ├── src/parser.ts          # 协议解析器
│   ├── src/plugin.ts          # 插件接口
│   └── package.json
└── codegen-taro/
    ├── src/generator.ts       # Taro 代码生成器
    ├── src/mapping.ts         # 组件映射表
    ├── src/templates/         # 项目模板文件
    └── package.json
```

**2. 生成的 Taro 项目示例**
```
output-taro-project/
├── package.json               # 含 @tarojs/cli 等依赖
├── tsconfig.json
├── config/index.ts            # Taro 构建配置
├── src/
│   ├── app.ts
│   ├── app.config.ts
│   ├── app.scss
│   └── pages/
│       └── index/
│           ├── index.tsx      # 生成的页面代码
│           ├── index.scss     # 生成的样式
│           └── index.config.ts
└── project.config.json
```

**3. 生成代码示例**

输入协议：
```json
{
  "componentTree": {
    "id": "root",
    "component": "Page",
    "children": [
      {
        "id": "text_1",
        "component": "Text",
        "props": { "content": "Hello" },
        "styles": { "fontSize": 32, "color": "#333" }
      }
    ]
  }
}
```

输出 TSX：
```tsx
import { View, Text } from '@tarojs/components'
import './index.scss'

export default function Index() {
  return (
    <View className="page">
      <Text className="text_1">Hello</Text>
    </View>
  )
}
```

输出 SCSS：
```scss
.page {
  min-height: 100vh;
}
.text_1 {
  font-size: 32px;
  color: #333;
}
```

**4. 演示视频**
- 在编辑器中搭建一个简单页面
- 点击「生成 Taro 代码」
- 展示生成的代码
- 下载项目，运行 `npm install && npm run dev:weapp`
- 在微信开发者工具中展示运行效果

### 验收标准
- [ ] 生成的 Taro 项目可直接运行（微信小程序 + H5）
- [ ] 生成代码通过 ESLint 检查
- [ ] 生成页面视觉效果与编辑器预览一致（误差 < 5%）
- [ ] 支持 6 个基础组件的代码生成
- [ ] 代码可读性良好（有注释、格式规范）

---

## M1.3：数据绑定 + 动态组件

### 时间安排
- **预计时长**：3-4 周
- **并行开发**：协议升级（1 周）+ 表达式引擎（1 周）+ UI 开发（2 周）

### 开发任务（5 个）

**Week 1：协议和引擎**
- [ ] T1: 扩展 FSPSchema（新增 dataSources）
- [ ] T1: 扩展 ComponentNode（新增 loop）
- [ ] T2: 实现表达式解析器
- [ ] T2: 实现表达式求值器

**Week 2-3：UI 和组件**
- [ ] T3: 数据源管理面板
- [ ] T3: Mock 数据编辑器
- [ ] T4: List 组件实现
- [ ] T4: Card 组件实现
- [ ] T5: ExpressionSetter（简化版）

**Week 4：集成和测试**
- [ ] 渲染器升级（支持 loop 循环）
- [ ] 端到端测试
- [ ] UI 优化

### 阶段成果输出

**1. 代码交付物**
```
packages/
├── protocol/
│   └── src/types.ts           # 新增 DataSourceDef、loop 定义
├── data-binding/
│   ├── src/parser.ts          # 表达式解析器
│   ├── src/evaluator.ts       # 表达式求值器
│   └── package.json
├── components/
│   ├── src/meta/List.ts       # List 组件 Meta
│   └── src/meta/Card.ts       # Card 组件 Meta
└── editor-ui/
    └── src/DataSourcePanel.tsx # 数据源管理面板
```

**2. 协议 JSON 示例（含数据绑定）**
```json
{
  "version": "1.0.0",
  "dataSources": [
    {
      "id": "ds_goods",
      "type": "api",
      "options": { "url": "/api/goods", "method": "GET" },
      "autoFetch": true,
      "mockData": {
        "data": [
          { "id": 1, "image": "https://...", "title": "商品1", "price": 99 },
          { "id": 2, "image": "https://...", "title": "商品2", "price": 199 }
        ]
      }
    }
  ],
  "componentTree": {
    "id": "root",
    "component": "Page",
    "children": [
      {
        "id": "list_1",
        "component": "List",
        "loop": { "dataSourceId": "ds_goods" },
        "children": [
          {
            "id": "card_1",
            "component": "Card",
            "children": [
              {
                "id": "img_1",
                "component": "Image",
                "props": { "src": "{{$item.image}}" }
              },
              {
                "id": "text_1",
                "component": "Text",
                "props": { "content": "{{$item.title}}" }
              }
            ]
          }
        ]
      }
    ]
  }
}
```

**3. 编辑器新功能**
- 属性面板新增「数据源」Tab
- 可添加/编辑/删除数据源
- 可填写 Mock 数据（JSON 格式）
- List 组件可选择绑定的数据源
- 属性值可输入表达式（如 `{{$item.title}}`）
- 画布中用 Mock 数据循环渲染 3 条

**4. 演示视频**
- 拖入 List 组件
- 配置数据源 `GET /api/goods`
- 填写 Mock 数据（3 条商品）
- List 内拖入 Card，Card 内拖入 Image 和 Text
- 绑定 `{{$item.image}}`、`{{$item.title}}`、`{{$item.price}}`
- 画布中显示 3 条商品卡片

### 验收标准
- [ ] 可配置 API 数据源并填写 Mock 数据
- [ ] List 组件绑定数据源后，画布用 Mock 数据循环渲染
- [ ] Card 内子组件可通过 `{{$item.xxx}}` 绑定字段
- [ ] 表达式绑定在编辑器中正确显示
- [ ] 导出的 FSP JSON 包含 dataSources 和 loop 定义

---

## M1.4：动态代码生成（完整链路）

### 时间安排
- **预计时长**：2-3 周
- **并行开发**：生成器升级（1.5 周）+ Mock API（0.5 周）+ 测试（1 周）

### 开发任务（5 个）

**Week 1：生成器升级**
- [ ] T1: IR 扩展（新增 effects、stateVars）
- [ ] T2: 协议解析器升级（解析 dataSources）
- [ ] T3: Taro 生成器升级（生成 useState、useEffect）
- [ ] T3: 生成 API 请求代码
- [ ] T3: 生成 List 的 map 循环

**Week 2：Mock API + 测试**
- [ ] T4: 创建 Mock API 服务（Express 或 MSW）
- [ ] T5: 端到端验证（编辑器 → 生成 → 运行）
- [ ] T5: 录制完整演示视频

**Week 3：优化和文档**
- [ ] 代码优化和 bug 修复
- [ ] 编写使用文档
- [ ] 准备演示材料

### 阶段成果输出

**1. 代码交付物**
```
packages/
├── codegen-core/
│   └── src/parser.ts          # 升级：解析 dataSources
├── codegen-taro/
│   └── src/generator.ts       # 升级：生成动态代码
└── mock-api/
    ├── server.js              # Express Mock API 服务
    └── data/goods.json        # 示例数据
```

**2. 生成的动态 Taro 代码示例**

输入协议（含数据源）：
```json
{
  "dataSources": [
    { "id": "ds_goods", "type": "api",
      "options": { "url": "/api/goods", "method": "GET" },
      "autoFetch": true }
  ],
  "componentTree": {
    "id": "list_1",
    "component": "List",
    "loop": { "dataSourceId": "ds_goods" },
    "children": [
      { "id": "text_1", "component": "Text",
        "props": { "content": "{{$item.title}}" } }
    ]
  }
}
```

输出 TSX：
```tsx
import { View, Text } from '@tarojs/components'
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
        <View key={index} className="list_1">
          <Text className="text_1">{item.title}</Text>
        </View>
      ))}
    </View>
  )
}
```

**3. Mock API 服务**
```bash
# 启动 Mock API
cd packages/mock-api
npm install
npm start
# 访问 http://localhost:3001/api/goods
```

返回数据：
```json
{
  "code": 0,
  "data": [
    { "id": 1, "image": "https://...", "title": "商品1", "price": 99 },
    { "id": 2, "image": "https://...", "title": "商品2", "price": 199 },
    { "id": 3, "image": "https://...", "title": "商品3", "price": 299 }
  ]
}
```

**4. 完整演示视频（5-8 分钟）**

演示脚本：
1. **开场**（30 秒）
   - 介绍 ForgeStudio 和 M1 目标

2. **编辑器操作**（2 分钟）
   - 打开编辑器
   - 拖入 Image 作为 Banner
   - 拖入 List 组件
   - 配置数据源 `GET /api/goods`
   - 填写 Mock 数据
   - List 内拖入 Card
   - Card 内拖入 Image、Text（标题）、Text（价格）
   - 绑定表达式：`{{$item.image}}`、`{{$item.title}}`、`{{$item.price}}`
   - 画布中显示 3 条商品卡片

3. **代码生成**（1 分钟）
   - 点击「生成 Taro 代码」
   - 展示生成的 TSX 代码（含 useState、useEffect、map）
   - 展示生成的 SCSS 代码
   - 下载项目

4. **运行验证**（2 分钟）
   - 解压项目
   - `npm install`
   - 启动 Mock API 服务
   - `npm run dev:weapp`
   - 微信开发者工具中展示运行效果
   - 页面从 API 拉取数据并渲染列表
   - 展示 H5 模式运行效果

5. **总结**（30 秒）
   - M1 完整链路跑通
   - 下一步：M2 增强数据能力和事件交互

**5. 文档交付**
- [ ] 用户使用手册（如何使用编辑器）
- [ ] 开发者文档（如何扩展组件）
- [ ] API 文档（协议规范）
- [ ] 演示 PPT（用于合作方展示）

### 验收标准
- [ ] 生成的 Taro 项目包含 API 请求代码
- [ ] 生成的代码可从真实 API 拉取数据并渲染
- [ ] List 组件生成正确的 map 循环代码
- [ ] 完整链路可演示：拖拽 → 绑定 → 生成 → 运行
- [ ] 演示视频录制完成，画质清晰，讲解流畅
- [ ] 微信小程序和 H5 两个平台均可正常运行

---

## M1 整体交付清单

### 代码仓库
```
forgestudio/
├── packages/
│   ├── protocol/              ✅ 协议定义与校验
│   ├── editor-core/           ✅ 编辑器状态管理
│   ├── editor-ui/             ✅ 编辑器 UI
│   ├── renderer/              ✅ 协议渲染器
│   ├── props-panel/           ✅ 属性面板
│   ├── data-binding/          ✅ 数据绑定引擎
│   ├── components/            ✅ 8 个内置组件
│   ├── codegen-core/          ✅ 代码生成核心
│   ├── codegen-taro/          ✅ Taro 生成插件
│   ├── mock-api/              ✅ Mock API 服务
│   └── shared/                ✅ 公共工具
├── apps/
│   └── web/                   ✅ 编辑器 Web 应用
├── docs/
│   ├── user-guide.md          ✅ 用户手册
│   ├── developer-guide.md     ✅ 开发者文档
│   └── protocol-spec.md       ✅ 协议规范
├── PLANNING.md                ✅ 技术规划文档
├── PARTNERSHIP_PROPOSAL.md    ✅ 合作方案
└── M1_ROADMAP.md              ✅ 本文档
```

### 演示材料
- [ ] M1.1 演示视频（2-3 分钟）
- [ ] M1.2 演示视频（2-3 分钟）
- [ ] M1.3 演示视频（2-3 分钟）
- [ ] M1.4 完整演示视频（5-8 分钟）
- [ ] 演示 PPT（15-20 页）
- [ ] 演示用的示例项目（可直接运行）

### 文档
- [ ] FSP 协议规范 v1.0
- [ ] 用户使用手册
- [ ] 开发者扩展指南
- [ ] API 参考文档
- [ ] 常见问题 FAQ

### 可运行的产品
- [ ] 编辑器 Web 应用（可在线访问）
- [ ] 生成的 Taro 示例项目（微信小程序 + H5）
- [ ] Mock API 服务（可独立运行）

---

## 进度跟踪

### 当前状态
- **当前阶段**：准备启动 M1.1
- **团队状态**：待组建
- **开始日期**：待定
- **预计完成**：启动后 2-3 个月

### 里程碑检查点

**M1.1 完成检查点**（Week 4）
- [ ] 代码 Review 通过
- [ ] 所有验收标准达成
- [ ] 演示视频录制完成
- [ ] 团队内部演示通过

**M1.2 完成检查点**（Week 7）
- [ ] 生成的代码可运行
- [ ] 代码质量检查通过
- [ ] 演示视频录制完成

**M1.3 完成检查点**（Week 11）
- [ ] 数据绑定功能完整
- [ ] Mock 数据预览正常
- [ ] 演示视频录制完成

**M1.4 完成检查点**（Week 14）
- [ ] 完整链路跑通
- [ ] 所有文档完成
- [ ] 向合作方演示通过
- [ ] **M1 正式交付**

---

## 风险与应对

| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|---------|
| 拖拽引擎实现复杂度超预期 | 中 | 高 | 使用成熟的 dnd-kit 库，预留 1 周缓冲 |
| 代码生成质量不达预期 | 中 | 高 | M1.2 充分测试，必要时简化生成逻辑 |
| 表达式引擎性能问题 | 低 | 中 | 使用简单的字符串替换，M2 再优化 |
| 团队人员不到位 | 中 | 高 | 提前招聘，核心成员兼职启动 |
| 时间延期 | 中 | 中 | 每个子阶段预留 20% 缓冲时间 |

---

## 下一步行动

### 立即行动（本周）
- [ ] 确认团队成员
- [ ] 搭建开发环境
- [ ] 创建 GitHub 仓库
- [ ] 启动 M1.1 开发

### 本月目标
- [ ] 完成 M1.1（协议 + 静态编辑器）
- [ ] 录制 M1.1 演示视频
- [ ] 向合作方展示初步成果

---

**文档维护**：本文档随 M1 开发进度持续更新
**最后更新**：2026-02-09
