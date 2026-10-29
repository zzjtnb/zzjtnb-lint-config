/** 性能排行使用的柱状图与坐标轴，独立于总览饼图加载。 */
import { BarChart } from 'echarts/charts'
import { GridComponent } from 'echarts/components'
import { use } from 'echarts/core'

export function register() {
  use([BarChart, GridComponent])
}
