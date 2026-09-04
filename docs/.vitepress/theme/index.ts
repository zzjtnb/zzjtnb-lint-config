// https://vitepress.dev/zh/guide/extending-default-theme
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import 'virtual:group-icons.css'
import './styles/variables.scss'
import './styles/custom.scss'

export default {
  extends: DefaultTheme,
} satisfies Theme
