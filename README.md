# ForgeStudio

ForgeStudio 是一个面向 Taro 小程序的低代码可视化页面构建平台。

## 🚀 快速开始

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
cd apps/web && pnpm dev
```

访问 http://localhost:5173/ 打开编辑器。

### 体验演示

导入 `demo-product-detail.json` 查看完整的商品详情页演示。

详细步骤请参考 [快速开始指南](./QUICK_START.md)。

## 📚 文档

- [快速开始](./QUICK_START.md) - 5分钟快速体验
- [演示场景：商品详情页](./DEMO_PRODUCT_DETAIL.md) - 完整功能演示

## ✨ 核心功能

### M1.1 - 协议 + 静态编辑器 ✅
- FSP (ForgeStudio Protocol) 类型定义
- 8 个内置组件（Page, View, Text, Image, Button, Input, List, Card）
- 拖拽式编辑器（三栏布局）
- 导入/导出 JSON schema

### M1.2 - 代码生成 ✅
- IR (中间表示) 层
- Taro 4.x 项目生成（15个脚手架文件）
- 代码预览面板（语法高亮）
- ZIP 下载功能

### M1.3 - 数据绑定 ✅
- 表达式解析器（支持 `{{$item.field}}` 语法）
- List/Card 组件循环渲染
- 数据源管理 UI（CRUD 操作）
- Mock 数据预览（3条数据展示）
- API 自动获取（通用格式支持）
- Vite 代理（ReqRes/DummyJSON/JSONPlaceholder）
- "测试接口"按钮自动填充 mockData

### M1.4 - 事件处理 ✅
- 协议扩展（ComponentNode 的 `events` 字段）
- Action 类型：navigate, showToast, setState
- Button onClick 和 Input onChange 事件支持
- PropsPanel 事件配置 UI
- Transformer 生成事件处理函数
- 代码生成输出事件处理器和 JSX 绑定
- 修复 Taro 导入问题

### M1.5 - 高级组件与表达式 ✅
- 扩展组件库（6个新组件）：
  - **Switch** - 开关组件
  - **Textarea** - 多行文本输入
  - **ScrollView** - 滚动容器
  - **Form** - 表单容器（支持 onSubmit）
  - **Swiper/SwiperItem** - 轮播组件
  - **Modal** - 弹窗组件
- 条件和绑定中的复杂表达式支持
- 所有组件完整集成：元数据、注册表、Taro 映射、属性映射、编辑器渲染

### M1.6 - 表单提交与数据收集 ✅
- 新增 `submitForm` Action 类型
- Form 组件支持 `onSubmit` 事件
- 表单字段跟踪和数据收集机制
- 表单状态管理（Input/Textarea/Switch）
- 表单提交处理器（收集所有字段值）
- 验证支持
- 表单重置功能

### M2 - 多数据源与依赖 ✅
- 多数据源管理
- 数据源依赖关系
- ExpressionSetter 可视化字段选择器
- 优化代码生成器（完整事件和状态管理）
- 演示场景：商品详情页

## 🏗️ 项目结构

```
forgestudio/
├── packages/
│   ├── protocol/          # FSP 类型定义
│   ├── components/        # 组件注册表（16个组件）
│   ├── editor/            # 编辑器 UI（支持所有组件的 Renderer）
│   ├── codegen-core/      # IR + 插件接口
│   ├── codegen-taro/      # Taro 代码生成器
│   └── data-binding/      # 表达式解析器/求值器
├── apps/
│   └── web/               # Vite + React 编辑器宿主
├── demo-product-detail.json  # 演示场景 JSON
├── QUICK_START.md         # 快速开始指南
└── DEMO_PRODUCT_DETAIL.md # 演示场景文档
```

## 🎯 演示场景

### 商品详情页

完整展示 ForgeStudio 的所有核心功能：

- ✅ 商品信息展示（数据绑定）
- ✅ 用户评论列表（循环渲染 + 条件渲染）
- ✅ 购买表单（表单提交 + 状态管理）
- ✅ 交互功能（Switch、Button、Input 事件）

**快速体验**：导入 `demo-product-detail.json` 即可查看完整演示。

## 🔧 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite 5 + Turbo
- **目标框架**: Taro 4.x
- **包管理**: pnpm + monorepo
- **代码生成**: 字符串模板（最小化 IR 层）

## 📦 构建

```bash
pnpm build
```

构建所有包，输出到各自的 `dist` 目录。

## 🧪 开发

```bash
# 启动编辑器
cd apps/web && pnpm dev

# 构建特定包
npx turbo build --filter=@forgestudio/codegen-core
```

## 📊 构建状态

- ✅ 所有包编译成功
- ✅ TypeScript 0 错误
- ✅ Vite bundle: ~405KB JS + 6.66KB CSS
- ✅ 开发服务器: http://localhost:5173/

## 🎉 里程碑

- [x] M1.1 - 协议 + 静态编辑器
- [x] M1.2 - 代码生成
- [x] M1.3 - 数据绑定
- [x] M1.4 - 事件处理
- [x] M1.5 - 高级组件与表达式
- [x] M1.6 - 表单提交与数据收集
- [x] M2 - 多数据源与依赖 + 演示场景

## 📝 License

MIT
