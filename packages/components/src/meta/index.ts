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
  defaultProps: { placeholder: '请输入', type: 'text' },
  defaultStyles: {},
  propsSchema: [
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
