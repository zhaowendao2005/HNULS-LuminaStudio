<template>
  <div class="ls-reader flex h-full gap-6 relative">
    <OrganicBackground type="reader" />
    
    <!-- PDF Area -->
    <div class="flex-1 bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative z-10 transition-all duration-300 hover:shadow-md">
      <div class="h-12 border-b border-slate-100 flex items-center px-4 justify-between bg-white/50">
        <span class="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          CRISPR-Cas9 Gene Editing Mechanisms.pdf
        </span>
        <div class="flex gap-2 text-slate-400 flex-shrink-0">
          <svg class="w-4 h-4 flex-shrink-0 hover:text-emerald-600 cursor-pointer transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <svg class="w-4 h-4 flex-shrink-0 hover:text-emerald-600 cursor-pointer transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </div>
      </div>
      <div class="flex-1 p-10 overflow-y-auto font-serif text-slate-800 leading-relaxed text-lg" @click="showAskTooltip = false">
        <h1 class="text-3xl font-bold mb-4 font-sans text-slate-900">Abstract</h1>
        <p class="mb-6 text-slate-600">
          The CRISPR-Cas9 system has revolutionized genomic engineering. Originating from the adaptive immune system of Streptococcus pyogenes, this mechanism allows for precise cleavage of DNA sequences.
        </p>
        <p 
          class="mb-6 p-1 hover:bg-emerald-50/80 cursor-text transition-colors rounded relative selection:bg-emerald-200"
          @click.stop="handleTextSelect"
        >
          Cas9 is a dual-RNA-guided DNA endonuclease that uses base pairing to recognize and cleave target DNAs. <span class="text-emerald-400 text-sm ml-2 font-sans opacity-60">[Select Text]</span>
        </p>
        <p class="mb-6 text-slate-600">
          Structural studies have revealed the distinct conformational states of Cas9 during the process of DNA interrogation and cleavage, highlighting the role of the PAM sequence in target recognition.
        </p>
        
        <!-- Ask Tooltip -->
        <div 
          v-if="showAskTooltip"
          class="absolute bg-slate-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-xl cursor-pointer flex items-center gap-2 animate-bounce-short z-20 hover:bg-emerald-900 transition-colors"
          style="top: 220px; left: 120px"
          @click.stop="chatOpen = true; showAskTooltip = false"
        >
          <svg class="w-[14px] h-[14px] flex-shrink-0 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 3v18m9-9H3m15.364 6.364L6.636 6.636m12.728 0L6.636 19.364"/>
          </svg>
          Analyze with Lumina
        </div>
      </div>
    </div>

    <!-- AI Sidebar -->
    <AIChatPanel v-if="chatOpen" :selected-text="selectedText" @close="chatOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import OrganicBackground from '../components/OrganicBackground.vue'
import AIChatPanel from './AIChatPanel.vue'

const selectedText = ref<string | null>(null)
const showAskTooltip = ref(false)
const chatOpen = ref(true)

const handleTextSelect = () => {
  selectedText.value = "Cas9 is a dual-RNA-guided DNA endonuclease that uses base pairing to recognize and cleave target DNAs."
  showAskTooltip.value = true
}
</script>

<style scoped>
@keyframes bounce-short {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}
.animate-bounce-short {
  animation: bounce-short 0.6s ease-in-out 2;
}
</style>
