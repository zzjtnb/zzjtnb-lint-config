import { createRouter, createWebHashHistory } from 'vue-router'
import Workbench from '../layouts/Workbench.vue'

const positions = new Map<string, { left: number, top: number }>()
// Hash 地址无需静态托管提供服务器路由回退，子页面按需加载。
const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, _from, saved) { return saved ?? positions.get(to.path) ?? { left: 0, top: 0 } },
  routes: [
    {
      path: '/:tool(eslint|stylelint|markdownlint)',
      component: Workbench,
      children: [
        {
          path: '',
          redirect: to => ({ name: 'overview', params: to.params }),
        },
        {
          path: 'overview',
          name: 'overview',
          component: () => import('../views/overview/index.vue'),
        },
        {
          path: 'rules',
          name: 'rules',
          component: () => import('../views/rules/index.vue'),
        },
        {
          path: 'files',
          name: 'files',
          component: () => import('../views/files/index.vue'),
        },
        {
          path: 'experiment',
          name: 'experiment',
          component: () => import('../views/experiment/index.vue'),
        },
        {
          path: 'stats',
          name: 'stats',
          component: () => import('../views/stats/index.vue'),
        },
        {
          path: 'setup',
          name: 'setup',
          component: () => import('../views/setup/index.vue'),
        },
      ],
    },
    {
      path: '/:page(overview|rules|files|experiment|stats|setup)',
      redirect: to => ({ path: `/eslint/${to.params.page}`, query: to.query, hash: to.hash }),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/eslint/overview',
    },
  ],
})

router.beforeEach((_to, from) => {
  positions.set(from.path, { left: window.scrollX, top: window.scrollY })
})

export default router
