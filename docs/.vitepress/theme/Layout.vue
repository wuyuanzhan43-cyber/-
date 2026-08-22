<script setup>
import DefaultTheme from 'vitepress/theme'
import SidebarProgress from './components/SidebarProgress.vue'

const { Layout: DefaultLayout } = DefaultTheme
</script>

<template>
  <DefaultLayout>
    <!-- 在侧边栏导航上方插入「学习进度」面板（目录树高亮/点亮） -->
    <template #sidebar-nav-before>
      <SidebarProgress />
    </template>
  </DefaultLayout>
</template>
