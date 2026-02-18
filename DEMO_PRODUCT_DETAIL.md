# M2 演示场景：商品详情页

## 演示目标

展示 ForgeStudio 的完整功能，包括：
- 组件库使用
- 数据源绑定
- 表单提交
- 事件处理
- 条件渲染
- 循环渲染

## 访问编辑器

打开浏览器访问：http://localhost:5180/

## 构建步骤

### 1. 创建数据源

在右侧面板的"数据源"标签中，添加以下数据源：

**数据源 1：商品信息**
- ID: `product`
- 名称: 商品信息
- URL: `/api/products/1`
- 方法: GET
- 自动获取: ✅
- Mock 数据:
```json
{
  "id": 1,
  "name": "iPhone 15 Pro",
  "price": 7999,
  "image": "https://via.placeholder.com/300x300",
  "description": "全新 A17 Pro 芯片，钛金属设计，专业级摄像系统",
  "stock": 50
}
```

**数据源 2：用户评论**
- ID: `reviews`
- 名称: 用户评论
- URL: `https://jsonplaceholder.typicode.com/comments?postId=1`
- 方法: GET
- 自动获取: ✅
- Mock 数据: （点击"测试接口"自动获取）

### 2. 创建状态变量

在"状态管理"标签中，添加以下状态：

- `quantity` (number) - 默认值: 1
- `showReviews` (boolean) - 默认值: true
- `buyerName` (string) - 默认值: ''
- `buyerPhone` (string) - 默认值: ''

### 3. 构建页面结构

从左侧组件面板拖拽组件到画布：

#### 3.1 商品信息区域

1. **ScrollView** (根容器)
   - 样式: height: 100vh, backgroundColor: #f5f5f5

2. **View** (商品卡片)
   - 样式: backgroundColor: #fff, padding: 16px, margin: 16px, borderRadius: 8px

3. **Image** (商品图片)
   - 属性: src = `{{productData[0].image}}`
   - 样式: width: 100%, height: 300px

4. **Text** (商品名称)
   - 内容: `{{productData[0].name}}`
   - 样式: fontSize: 20px, fontWeight: bold, marginTop: 12px

5. **Text** (商品价格)
   - 内容: `¥{{productData[0].price}}`
   - 样式: fontSize: 24px, color: #ff4d4f, marginTop: 8px

6. **Text** (商品描述)
   - 内容: `{{productData[0].description}}`
   - 样式: fontSize: 14px, color: #666, marginTop: 12px

#### 3.2 评论区域

7. **View** (评论容器)
   - 样式: backgroundColor: #fff, padding: 16px, margin: 16px, borderRadius: 8px

8. **View** (评论标题行)
   - 样式: display: flex, justifyContent: space-between, alignItems: center

9. **Text** (评论标题)
   - 内容: "用户评论"
   - 样式: fontSize: 16px, fontWeight: bold

10. **Switch** (显示/隐藏评论)
    - 属性: checked = `{{showReviews}}`
    - 事件: onChange → setState → target: showReviews, value: e.detail.value

11. **List** (评论列表)
    - 循环: dataVar = reviewsData, itemVar = review
    - 条件: expression = `showReviews`
    - 样式: marginTop: 12px

12. **Card** (评论卡片 - List 的子组件)
    - 样式: marginBottom: 8px

13. **Text** (评论者 - Card 的子组件)
    - 内容: `{{$item.email}}`
    - 样式: fontSize: 14px, fontWeight: bold

14. **Text** (评论内容 - Card 的子组件)
    - 内容: `{{$item.body}}`
    - 样式: fontSize: 12px, color: #666, marginTop: 4px

#### 3.3 购买表单

15. **Form** (购买表单)
    - 样式: backgroundColor: #fff, padding: 16px, margin: 16px, borderRadius: 8px
    - 事件: onSubmit → submitForm
      - URL: https://jsonplaceholder.typicode.com/posts
      - 方法: POST
      - 字段: ✅ buyerName, ✅ buyerPhone, ✅ quantity
      - 成功提示: 订单提交成功！
      - 失败提示: 订单提交失败，请重试

16. **Text** (表单标题 - Form 的子组件)
    - 内容: "立即购买"
    - 样式: fontSize: 16px, fontWeight: bold, marginBottom: 12px

17. **Input** (姓名输入 - Form 的子组件)
    - 属性: placeholder = "请输入姓名"
    - 样式: marginBottom: 12px
    - 事件: onChange → setState → target: buyerName, value: e.detail.value

18. **Input** (电话输入 - Form 的子组件)
    - 属性: placeholder = "请输入电话", type = "number"
    - 样式: marginBottom: 12px
    - 事件: onChange → setState → target: buyerPhone, value: e.detail.value

19. **View** (数量选择行 - Form 的子组件)
    - 样式: display: flex, alignItems: center, marginBottom: 12px

20. **Text** (数量标签 - View 的子组件)
    - 内容: "数量："
    - 样式: fontSize: 14px, marginRight: 8px

21. **Button** (减少按钮 - View 的子组件)
    - 内容: "-"
    - 属性: size = small
    - 事件: onClick → setState → target: quantity, value: Math.max(1, quantity - 1)

22. **Text** (数量显示 - View 的子组件)
    - 内容: `{{quantity}}`
    - 样式: fontSize: 16px, margin: 0 12px

23. **Button** (增加按钮 - View 的子组件)
    - 内容: "+"
    - 属性: size = small
    - 事件: onClick → setState → target: quantity, value: quantity + 1

24. **Button** (提交按钮 - Form 的子组件)
    - 内容: "提交订单"
    - 属性: type = primary
    - 样式: width: 100%

## 测试功能

1. **数据绑定**: 查看商品信息是否正确显示
2. **评论列表**: 切换 Switch 查看评论显示/隐藏
3. **数量调整**: 点击 +/- 按钮调整购买数量
4. **表单提交**: 填写信息后点击"提交订单"
5. **代码生成**: 点击"代码预览"查看生成的 Taro 代码
6. **导出项目**: 点击"下载代码"获取完整项目

## 预期效果

- 页面加载时自动获取商品信息和评论数据
- 用户可以切换评论显示状态
- 用户可以调整购买数量
- 填写表单后提交订单，显示成功/失败提示
- 生成的代码包含完整的状态管理、事件处理和数据绑定逻辑

## 技术亮点

✅ 多数据源管理（商品 + 评论）
✅ 复杂表达式绑定（`{{productData[0].name}}`）
✅ 条件渲染（评论区域）
✅ 循环渲染（评论列表）
✅ 表单状态管理（3个表单字段）
✅ 事件处理（Switch、Button、Input、Form）
✅ 表单提交（收集多个字段并发送请求）
✅ 完整的 Taro 代码生成
