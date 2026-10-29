/** 仅饼图实际显示时注册其图形，避免总览预加载柱状图和坐标轴。 */
import { PieChart } from 'echarts/charts'
import { use } from 'echarts/core'

export function register() {
  use(PieChart)
}
