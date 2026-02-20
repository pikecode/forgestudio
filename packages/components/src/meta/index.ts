import type { ComponentMeta } from '@forgestudio/protocol'

export const PageMeta: ComponentMeta = {
  name: 'Page',
  title: '页面',
  icon: 'file',
  category: 'layout',
  allowChildren: true,
  defaultProps: { title: '页面' },
  defaultStyles: { minHeight: 600, backgroundColor: '#ffffff' },
  propsSchema: [
    { name: 'title', title: '页面标题', type: 'string', default: '页面' },
  ],
}

export const ViewMeta: ComponentMeta = {
  name: 'View',
  title: '容器',
  icon: 'square',
  category: 'layout',
  allowChildren: true,
  defaultProps: {},
  defaultStyles: { padding: 8 },
  propsSchema: [],
}

export const TextMeta: ComponentMeta = {
  name: 'Text',
  title: '文本',
  icon: 'type',
  category: 'basic',
  allowChildren: false,
  defaultProps: { content: '文本内容' },
  defaultStyles: { fontSize: 14, color: '#333333' },
  propsSchema: [
    { name: 'content', title: '文本内容', type: 'string', default: '文本内容' },
    { name: 'fontSize', title: '字号', type: 'number', default: 14 },
    { name: 'color', title: '颜色', type: 'color', default: '#333333' },
    {
      name: 'fontWeight',
      title: '字重',
      type: 'enum',
      default: 'normal',
      options: [
        { label: '正常', value: 'normal' },
        { label: '粗体', value: 'bold' },
      ],
    },
  ],
}

export const ImageMeta: ComponentMeta = {
  name: 'Image',
  title: '图片',
  icon: 'image',
  category: 'basic',
  allowChildren: false,
  defaultProps: { src: '', fit: 'cover' },
  defaultStyles: { width: 200, height: 200 },
  propsSchema: [
    { name: 'src', title: '图片地址', type: 'string', default: '' },
    {
      name: 'fit',
      title: '填充模式',
      type: 'enum',
      default: 'cover',
      options: [
        { label: '包含', value: 'contain' },
        { label: '覆盖', value: 'cover' },
        { label: '拉伸', value: 'fill' },
        { label: '宽度适应', value: 'width' },
      ],
    },
    { name: 'borderRadius', title: '圆角', type: 'number', default: 0 },
  ],
}

export const ButtonMeta: ComponentMeta = {
  name: 'Button',
  title: '按钮',
  icon: 'mouse-pointer',
  category: 'basic',
  allowChildren: false,
  defaultProps: { text: '按钮', type: 'default', size: 'default' },
  defaultStyles: {},
  supportedEvents: ['onClick'],
  propsSchema: [
    { name: 'text', title: '按钮文字', type: 'string', default: '按钮' },
    {
      name: 'type',
      title: '类型',
      type: 'enum',
      default: 'default',
      options: [
        { label: '默认', value: 'default' },
        { label: '主要', value: 'primary' },
        { label: '警告', value: 'warn' },
      ],
    },
    {
      name: 'size',
      title: '尺寸',
      type: 'enum',
      default: 'default',
      options: [
        { label: '默认', value: 'default' },
        { label: '小', value: 'mini' },
      ],
    },
  ],
}

export const InputMeta: ComponentMeta = {
  name: 'Input',
  title: '输入框',
  icon: 'text-cursor',
  category: 'basic',
  allowChildren: false,
  defaultProps: { placeholder: '请输入', type: 'text', value: '', name: '' },
  defaultStyles: {},
  supportedEvents: ['onChange'],
  propsSchema: [
    { name: 'name', title: '字段名', type: 'string', default: '' },
    { name: 'value', title: '绑定值', type: 'string', default: '' },
    { name: 'placeholder', title: '占位文字', type: 'string', default: '请输入' },
    {
      name: 'type',
      title: '输入类型',
      type: 'enum',
      default: 'text',
      options: [
        { label: '文本', value: 'text' },
        { label: '数字', value: 'number' },
        { label: '密码', value: 'password' },
      ],
    },
    { name: 'maxLength', title: '最大长度', type: 'number', default: 140 },
  ],
}

export const ListMeta: ComponentMeta = {
  name: 'List',
  title: '列表',
  icon: 'list',
  category: 'data',
  allowChildren: true,
  defaultProps: { dataSourceId: '' },
  defaultStyles: { display: 'flex', flexDirection: 'column', gap: 8 },
  propsSchema: [
    { name: 'dataSourceId', title: '数据源', type: 'string', default: '' },
  ],
}

export const CardMeta: ComponentMeta = {
  name: 'Card',
  title: '卡片',
  icon: 'credit-card',
  category: 'data',
  allowChildren: true,
  defaultProps: { title: '' },
  defaultStyles: {
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  propsSchema: [
    { name: 'title', title: '标题', type: 'string', default: '' },
    { name: 'backgroundColor', title: '背景色', type: 'color', default: '#ffffff' },
    { name: 'borderRadius', title: '圆角', type: 'number', default: 8 },
  ],
}

export const SwitchMeta: ComponentMeta = {
  name: 'Switch',
  title: '开关',
  icon: 'toggle-right',
  category: 'basic',
  allowChildren: false,
  defaultProps: { checked: false },
  defaultStyles: {},
  supportedEvents: ['onChange'],
  propsSchema: [
    { name: 'checked', title: '是否选中', type: 'boolean', default: false },
  ],
}

export const TextareaMeta: ComponentMeta = {
  name: 'Textarea',
  title: '多行输入',
  icon: 'align-left',
  category: 'basic',
  allowChildren: false,
  defaultProps: { placeholder: '请输入', maxLength: 200, value: '' },
  defaultStyles: {},
  supportedEvents: ['onChange'],
  propsSchema: [
    { name: 'value', title: '绑定值', type: 'string', default: '' },
    { name: 'placeholder', title: '占位文字', type: 'string', default: '请输入' },
    { name: 'maxLength', title: '最大长度', type: 'number', default: 200 },
  ],
}

export const ScrollViewMeta: ComponentMeta = {
  name: 'ScrollView',
  title: '滚动容器',
  icon: 'scroll',
  category: 'layout',
  allowChildren: true,
  defaultProps: { scrollY: true, scrollX: false },
  defaultStyles: { height: 300 },
  propsSchema: [
    { name: 'scrollY', title: '纵向滚动', type: 'boolean', default: true },
    { name: 'scrollX', title: '横向滚动', type: 'boolean', default: false },
    { name: 'height', title: '高度', type: 'number', default: 300 },
  ],
}

export const FormMeta: ComponentMeta = {
  name: 'Form',
  title: '表单',
  icon: 'file-text',
  category: 'data',
  allowChildren: true,
  defaultProps: { dataSourceId: '' },
  defaultStyles: { padding: 12 },
  supportedEvents: ['onSubmit'],
  propsSchema: [
    { name: 'dataSourceId', title: '提交数据源', type: 'string', default: '' },
  ],
}

export const SwiperMeta: ComponentMeta = {
  name: 'Swiper',
  title: '轮播',
  icon: 'layers',
  category: 'layout',
  allowChildren: true,
  allowedChildComponents: ['SwiperItem'],
  defaultProps: { autoplay: false, interval: 3000, circular: false },
  defaultStyles: { height: 200 },
  propsSchema: [
    { name: 'autoplay', title: '自动播放', type: 'boolean', default: false },
    { name: 'interval', title: '间隔时间(ms)', type: 'number', default: 3000 },
    { name: 'circular', title: '循环播放', type: 'boolean', default: false },
    { name: 'height', title: '高度', type: 'number', default: 200 },
  ],
}

export const SwiperItemMeta: ComponentMeta = {
  name: 'SwiperItem',
  title: '轮播项',
  icon: 'square',
  category: 'layout',
  allowChildren: true,
  defaultProps: {},
  defaultStyles: { width: '100%', height: '100%' },
  propsSchema: [],
}

export const ModalMeta: ComponentMeta = {
  name: 'Modal',
  title: '弹窗',
  icon: 'message-square',
  category: 'layout',
  allowChildren: true,
  defaultProps: { title: '提示', visible: false },
  defaultStyles: {},
  propsSchema: [
    { name: 'title', title: '标题', type: 'string', default: '提示' },
    { name: 'visible', title: '是否显示', type: 'boolean', default: false },
  ],
}

