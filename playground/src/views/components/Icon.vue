<script setup lang="ts">
const props = withDefaults(defineProps<{ name: string, size?: number }>(), {
  size: 18,
})
const paths: Record<string, string> = {
  code: 'm8 8-4 4 4 4m8-8 4 4-4 4m-3-11-2 22',
  play: 'm8 5 11 7-11 7V5Z',
  fix: 'm4 20 12-12m-1-3 4 4m-1-7 1 3 3 1M5 3v4M3 5h4m12 10v4m-2-2h4',
  copy: 'M9 9h11v11H9zM15 9V4H4v11h5',
  reset: 'M3 10a9 9 0 1 1 2 8M3 4v6h6',
  share: 'M12 16V3m-5 5 5-5 5 5M5 13v7h14v-7',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  external: 'M14 3h7v7m0-7L10 14M10 4H4v16h16v-6',
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Zm5-1 5 5',
  book: 'M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1m0-15c3-2 6-2 9-1v15c-3-1-6-1-9 1V5Z',
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12M6 18 18 6',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1',
  moon: 'M21 13A9 9 0 0 1 11 3 9 9 0 1 0 21 13Z',
  terminal: 'm5 6 5 5-5 5m8 1h6',
  rules: 'M9 5h12M9 12h12M9 19h12M3 5h1m-1 7h1m-1 7h1',
  info: 'M12 16v-5m0-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  github:
    'M9 19c-5 1-5-2-7-2m14 5v-4c0-1-.3-2-1-2.5 3-.3 6-1.4 6-6a5 5 0 0 0-1.4-3.5c.4-1 .4-2.3-.1-3.5-1.5 0-3 1-4 1.5a12 12 0 0 0-7 0C7 3.5 5.5 2.5 4 2.5c-.5 1.2-.5 2.5-.1 3.5A5 5 0 0 0 2.5 9.5c0 4.6 3 5.7 6 6-.7.5-1 1.5-1 2.5v4',
}
</script>

<template>
  <svg
    :width="props.size"
    :height="props.size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.65"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[props.name] ?? paths.code" />
  </svg>
</template>
