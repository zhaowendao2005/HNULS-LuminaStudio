<template>
  <div class="ls-dashboard relative space-y-8 animate-fade-in-up">
    <!-- Background -->
    <OrganicBackground type="dashboard" />
    
    <!-- Content -->
    <div class="relative z-10">
      <!-- Header -->
      <div class="flex justify-between items-end">
        <div>
          <h2 class="text-3xl font-bold text-slate-800">Bio-Research Overview</h2>
          <p class="text-slate-500 mt-2 flex items-center gap-2">
            <span class="flex h-3 w-3 relative">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            System Online • Nexus Core v3.0 (Life Sciences)
          </p>
        </div>
        <div class="flex gap-3">
          <button class="px-4 py-2 bg-white/60 backdrop-blur border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-white hover:border-emerald-200 transition-all shadow-sm">
            Import FASTA/PDF
          </button>
          <button class="px-4 py-2 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-slate-900/20 transition-all flex items-center gap-2 flex-shrink-0">
            <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Experiment
          </button>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <StatCard v-for="stat in stats" :key="stat.label" :stat="stat" />
      </div>

      <!-- Recent Papers -->
      <div class="bg-white/80 backdrop-blur-md rounded-2xl border border-emerald-100/50 shadow-sm overflow-hidden mt-8">
        <div class="p-6 border-b border-emerald-50 flex justify-between items-center bg-emerald-50/30">
          <h3 class="font-bold text-lg text-slate-800 flex items-center gap-2 flex-shrink-0">
            <svg class="w-[18px] h-[18px] flex-shrink-0 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            Recent Literature
          </h3>
          <button class="text-sm text-emerald-600 hover:text-emerald-700 font-medium">View Library</button>
        </div>
        <div class="divide-y divide-emerald-50">
          <PaperItem v-for="paper in recentPapers" :key="paper.id" :paper="paper" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import OrganicBackground from '../components/OrganicBackground.vue'
import StatCard from './StatCard.vue'
import PaperItem from './PaperItem.vue'

const stats = ref([
  { label: "Total Papers", value: "1,284", unit: "Docs", trend: "+12%", icon: "file", color: "text-emerald-600", bg: "bg-emerald-50" },
  { label: "Bio-Entities", value: "12.9k", unit: "Nodes", trend: "+5%", icon: "dna", color: "text-teal-600", bg: "bg-teal-50" },
  { label: "AI Insights", value: "840", unit: "Chats", trend: "+84", icon: "sparkles", color: "text-lime-600", bg: "bg-lime-50" },
])

const recentPapers = ref([
  { id: 1, title: "CRISPR-Cas9 Gene Editing Mechanisms", authors: "Doudna et al.", journal: "Science 2014", status: "Read", added: "2 hours ago" },
  { id: 2, title: "AlphaFold: Protein Structure Prediction", authors: "Jumper et al.", journal: "Nature 2021", status: "Reading", added: "5 hours ago" },
  { id: 3, title: "mRNA Vaccine Technology Overview", authors: "Karikó et al.", journal: "Immunity 2020", status: "New", added: "1 day ago" },
])
</script>

<style scoped>
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in-up {
  animation: fade-in-up 0.6s ease-out;
}
</style>
