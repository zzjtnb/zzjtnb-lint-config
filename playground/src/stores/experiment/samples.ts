/** 工作台示例源码，由编辑、工作区与引擎预热共同读取。 */
export const samples: Record<string, string> = {
  ts: '// 修改规则，观察实际诊断\nconst greeting = \'Hello, lint lab\';\nconsole.log(greeting);\n',
  js: 'var greeting = \'Hello\';\nconsole.log(greeting);\n',
  vue: '<script setup lang="ts">\nconst greeting = "Hello";\n</script>\n\n<template>\n  <div>{{ greeting }}</div>\n</template>\n\n<style scoped>\na { color: #ffffff; }\n</style>\n',
  css: 'a {\n  color: #ffffff;\n  background: #ggg;\n}\n',
  scss: '$color: #ffffff;\na { color: $color; }\n',
  html: '<style>\na { color: #ffffff; }\n</style>\n',
  md: '# Title\n\ntext   \n',
  json: '{"name":"sample", "enabled":true}\n',
  yaml: 'name: "sample"\nitems: [one,two]\n',
  toml: 'name = "sample"\nitems = [1,2]\n',
}
