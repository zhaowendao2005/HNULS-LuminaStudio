<template>
  <div class="nc_NormalChat_DevPage_a8d3 flex-1 overflow-y-auto px-4 py-4">
    <div class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-amber-800">ChatFlow Dev</p>
          <p class="mt-2 text-xs leading-6 text-amber-700">
            Normal Chat 的前端固定回放 mock 已从主链解耦。此页面保留为占位，不再触发任何 mock
            场景或模拟执行。
          </p>
        </div>
        <span class="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-amber-700">
          Deprecated
        </span>
      </div>

      <div class="mt-4 rounded-xl border border-dashed border-amber-200 bg-white px-4 py-3">
        <p class="text-[12px] leading-6 text-slate-600">
          如需调试真实链路，请直接使用 normal-chat 主界面发送消息，并在 detail 面板中检查 task /
          model calls / action runs。
        </p>
      </div>
    </div>
  </div>
</template>
