<template>
  <div v-if="type === 'dashboard'" class="absolute inset-0 overflow-hidden pointer-events-none z-0">
    <!-- Cellular Matrix -->
    <div class="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] opacity-20 animate-float-slow">
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <path fill="#10b981" d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.6,-46.6C91.4,-34.1,98.1,-19.2,95.8,-4.9C93.5,9.4,82.2,23.1,70.9,34.4C59.6,45.7,48.3,54.6,36.3,61.9C24.3,69.2,11.6,74.9,-1.9,78.2C-15.4,81.5,-30.5,82.4,-44.1,76.5C-57.7,70.6,-69.8,57.9,-78.6,43.5C-87.4,29.1,-92.9,13,-91.2,-2.4C-89.5,-17.8,-80.6,-32.5,-69.7,-44.6C-58.8,-56.7,-45.9,-66.2,-32.2,-73.7C-18.5,-81.2,-4,-86.7,10.2,-86.3L20.4,-85.9" transform="translate(100 100) scale(1.1)" />
      </svg>
    </div>
    
    <div class="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] opacity-10 animate-float-reverse">
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <path fill="#0d9488" d="M41.7,-65.4C53.5,-56.1,62.3,-43.3,68.9,-29.4C75.5,-15.5,79.9,-0.5,77.3,13.2C74.7,26.9,65.1,39.3,53.8,49.2C42.5,59.1,29.5,66.5,15.6,69.2C1.7,71.9,-13.1,69.9,-27.1,64.2C-41.1,58.5,-54.3,49.1,-63.9,37C-73.5,24.9,-79.5,10.1,-78.3,-4.2C-77.1,-18.5,-68.7,-32.3,-57.4,-42.9C-46.1,-53.5,-31.9,-60.9,-17.9,-63.8C-3.9,-66.7,9.1,-65.1,20.1,-61.5L29.9,-74.7" transform="translate(100 100)" />
      </svg>
    </div>

    <!-- Floating Polygons -->
    <div class="absolute top-[20%] right-[20%] w-32 h-32 bg-emerald-100/30 rotate-12 rounded-3xl animate-pulse-slow backdrop-blur-3xl blur-2xl"></div>
    <div class="absolute top-[60%] left-[10%] w-48 h-48 bg-teal-100/30 -rotate-12 rounded-full animate-float blur-3xl"></div>
  </div>

  <div v-else-if="type === 'reader'" class="absolute inset-0 overflow-hidden pointer-events-none z-0">
    <!-- DNA Strand -->
    <svg class="absolute right-0 top-0 h-full w-1/3 opacity-20" viewBox="0 0 100 400" preserveAspectRatio="none">
      <path d="M50 0 C 80 100, 20 200, 50 400" stroke="url(#grad1)" stroke-width="2" fill="none" class="animate-dash" />
      <path d="M60 0 C 90 100, 30 200, 60 400" stroke="url(#grad1)" stroke-width="2" fill="none" class="animate-dash" style="animation-delay: 1s" />
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#10b981; stop-opacity:0" />
          <stop offset="50%" style="stop-color:#10b981; stop-opacity:0.5" />
          <stop offset="100%" style="stop-color:#10b981; stop-opacity:0" />
        </linearGradient>
      </defs>
    </svg>
    <div class="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-emerald-50/20"></div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  type: 'dashboard' | 'reader' | 'graph'
}>()
</script>

<style scoped>
@keyframes float-slow {
  0% { transform: translate(0, 0) rotate(0deg); }
  50% { transform: translate(10px, -15px) rotate(2deg); }
  100% { transform: translate(0, 0) rotate(0deg); }
}
@keyframes float-reverse {
  0% { transform: translate(0, 0) rotate(0deg); }
  50% { transform: translate(-10px, 15px) rotate(-2deg); }
  100% { transform: translate(0, 0) rotate(0deg); }
}
@keyframes float {
  0% { transform: translate(0, 0); }
  50% { transform: translate(0, -10px); }
  100% { transform: translate(0, 0); }
}
@keyframes dash {
  to { stroke-dashoffset: -1000; }
}
.animate-float-slow {
  animation: float-slow 8s ease-in-out infinite;
}
.animate-float-reverse {
  animation: float-reverse 10s ease-in-out infinite;
}
.animate-float {
  animation: float 3s ease-in-out infinite;
}
.animate-dash {
  stroke-dasharray: 10;
  animation: dash 20s linear infinite;
}
</style>
