<template>
  <section
    class="nc-chat-main-root-a9k2 nc-normalchat-theme-a9k2 flex-1 min-w-0 overflow-hidden rounded-2xl"
  >
    <ChatMainViewport />
  </section>
</template>

<script setup lang="ts">
import ChatMainViewport from './components/ChatMainViewport.vue'
</script>

<style scoped lang="scss">
@use '../normal-chat-theme.scss' as *;
</style>
