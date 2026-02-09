import React, { useState } from 'react';
import { 
  BookOpen, 
  Database, 
  ExternalLink, 
  Plus, 
  Check, 
  X, 
  FlaskConical, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Search,
  FileText
} from 'lucide-react';

// --- 模拟数据 (Mock Data) ---
// 在真实场景中，这部分数据来源于您的 LangChain Tool 的返回值
// 包含了 ESearch 找到 ID 后，通过 ESummary 获取的元数据
const MOCK_TOOL_OUTPUT = {
  tool_name: "PubMed Retriever",
  status: "success",
  latency: "1.2s",
  search_params: {
    database: "pubmed",
    query: "CRISPR-Cas9[Title/Abstract] AND gene therapy[Title/Abstract] AND 2023[pdat]",
    ret_max: 5,
    total_found: 1240
  },
  items: [
    {
      uid: "37289562",
      title: "Ex vivo CRISPR-Cas9 gene editing for sickle cell disease.",
      source: "N Engl J Med",
      pub_date: "2023",
      volume: "388",
      issue: "26",
      authors: ["Frangoul H", "Locatelli F", "Sharma A", "et al."],
      abstract: "BACKGROUND: Sickle cell disease is a genetic disorder caused by a mutation in the beta-globin gene... METHODS: We administered ex vivo CRISPR-Cas9-edited CD34+ hematopoietic stem and progenitor cells... RESULTS: A total of 31 patients received the therapy. All patients had engraftment... CONCLUSIONS: Ex vivo CRISPR-Cas9-edited therapy eliminated vaso-occlusive episodes in patients with severe sickle cell disease.",
      doi: "10.1056/NEJMoa2301234"
    },
    {
      uid: "37581234",
      title: "Safety and Efficacy of CRISPR-Cas9 Editing for Transthyretin Amyloidosis.",
      source: "Science",
      pub_date: "2023",
      volume: "381",
      issue: "6658",
      authors: ["Gillmore JD", "Gane E", "Taubel J", "et al."],
      abstract: "Transthyretin amyloidosis is a progressive, fatal disease caused by accumulation of misfolded transthyretin protein. We report interim data from a phase 1 trial of NTLA-2001, an in vivo gene-editing therapeutic agent based on CRISPR-Cas9... Administration of NTLA-2001 was associated with dose-dependent reductions in serum transthyretin protein concentrations.",
      doi: "10.1126/science.ade1234"
    },
    {
      uid: "36912345",
      title: "Off-target effects in CRISPR-Cas9 gene editing: A new perspective.",
      source: "Nature Biotechnology",
      pub_date: "2023",
      volume: "41",
      issue: "3",
      authors: ["Zhang Y", "Liu X", "Wang L"],
      abstract: "The clinical application of CRISPR-Cas9 requires high specificity. Here we present a comprehensive analysis of off-target effects using a newly developed detection method...",
      doi: "10.1038/s41587-023-01678-z"
    }
  ]
};

// --- 子组件：详情模态框 (Modal) ---
const AbstractModal = ({ paper, onClose }) => {
  if (!paper) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-slate-50">
          <div>
             <h3 className="font-serif text-lg font-bold text-slate-800 leading-tight pr-4">
              {paper.title}
            </h3>
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 font-mono">
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                PMID: {paper.uid}
              </span>
              <span>{paper.doi}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-6 overflow-y-auto">
          <div className="mb-4 text-sm text-slate-600 italic border-l-4 border-blue-400 pl-3">
            {paper.authors.join(", ")} • <span className="font-semibold">{paper.source}</span> ({paper.pub_date})
          </div>
          
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Abstract</h4>
          <p className="text-slate-700 leading-relaxed text-sm text-justify whitespace-pre-line">
            {paper.abstract}
          </p>

          <div className="mt-6 pt-4 border-t border-dashed border-gray-200 flex justify-end">
            <a 
              href={`https://pubmed.ncbi.nlm.nih.gov/${paper.uid}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
            >
              Read Full Text on NCBI <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 主组件 ---
const PubMedCard = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedPaper, setSelectedPaper] = useState(null);
  
  // 模拟 "加入知识库" 的状态追踪
  const [addedIds, setAddedIds] = useState(new Set());

  const handleToggleAdd = (uid, e) => {
    e.stopPropagation();
    const newSet = new Set(addedIds);
    if (newSet.has(uid)) {
      newSet.delete(uid);
    } else {
      newSet.add(uid);
    }
    setAddedIds(newSet);
  };

  return (
    <div className="max-w-3xl mx-auto font-sans antialiased text-slate-800 my-8">
      
      {/* 外部卡片容器 */}
      <div className="border border-slate-200 rounded-xl shadow-sm bg-white overflow-hidden transition-all duration-300 hover:shadow-md">
        
        {/* --- Header: 工具调用状态 --- */}
        <div 
          className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center cursor-pointer select-none"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            {/* 状态图标 */}
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 border border-blue-200">
                <FlaskConical size={18} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-700">{MOCK_TOOL_OUTPUT.tool_name}</h2>
                <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full font-mono">
                  {MOCK_TOOL_OUTPUT.latency}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                <Database size={10} /> 
                {MOCK_TOOL_OUTPUT.search_params.database} 
                <span className="mx-1 text-slate-300">|</span> 
                <span>Found {MOCK_TOOL_OUTPUT.search_params.total_found} results</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 检索词展示 Badge */}
            <div className="hidden sm:flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded text-xs text-slate-600 max-w-[200px]">
              <Search size={10} className="text-slate-400" />
              <span className="truncate font-mono">{MOCK_TOOL_OUTPUT.search_params.query}</span>
            </div>
            {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </div>
        </div>

        {/* --- Body: 结果列表 --- */}
        {isExpanded && (
          <div className="divide-y divide-slate-100">
            {MOCK_TOOL_OUTPUT.items.map((paper) => {
              const isAdded = addedIds.has(paper.uid);

              return (
                <div 
                  key={paper.uid} 
                  className="p-4 hover:bg-slate-50/80 transition-colors group relative"
                >
                  <div className="flex gap-4">
                    {/* 左侧：序号/图标 */}
                    <div className="pt-1 flex-shrink-0">
                      <div className="w-6 h-6 rounded bg-slate-100 text-slate-400 flex items-center justify-center text-xs font-mono">
                        {MOCK_TOOL_OUTPUT.items.indexOf(paper) + 1}
                      </div>
                    </div>

                    {/* 右侧：内容 */}
                    <div className="flex-1 min-w-0">
                      {/* 标题 */}
                      <div className="flex justify-between items-start gap-2">
                        <h3 
                          className="text-base font-semibold text-blue-900 leading-snug cursor-pointer hover:text-blue-700 hover:underline decoration-blue-300 underline-offset-2"
                          onClick={() => setSelectedPaper(paper)}
                        >
                          {paper.title}
                        </h3>
                      </div>

                      {/* 元数据 */}
                      <div className="mt-2 flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 font-medium">
                        <span className="font-serif italic text-slate-700 bg-slate-100 px-1.5 rounded">
                          {paper.source}
                        </span>
                        <span className="text-slate-400">|</span>
                        <span>{paper.pub_date}</span>
                        <span className="text-slate-400">|</span>
                        <span className="truncate max-w-[150px]">{paper.authors[0]} et al.</span>
                        <span className="text-slate-400">|</span>
                        <span className="font-mono text-slate-400 select-all">PMID: {paper.uid}</span>
                      </div>
                      
                      {/* 操作栏 (Bottom Action Bar) */}
                      <div className="mt-3 flex items-center gap-2">
                        {/* 查看详情按钮 */}
                        <button 
                          onClick={() => setSelectedPaper(paper)}
                          className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 px-2.5 py-1.5 rounded-md hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                        >
                          <BookOpen size={14} />
                          View Abstract
                        </button>

                        {/* RAG 功能：加入知识库 */}
                        <button 
                          onClick={(e) => handleToggleAdd(paper.uid, e)}
                          className={`
                            flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md transition-all shadow-sm
                            ${isAdded 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-800'}
                          `}
                        >
                          {isAdded ? (
                            <>
                              <Check size={14} />
                              Added to Context
                            </>
                          ) : (
                            <>
                              <Plus size={14} />
                              Add to KB
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* --- Footer: 提示信息 --- */}
        {isExpanded && (
          <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between">
            <span>Data provided by NCBI E-utilities API</span>
            <span>Displaying top {MOCK_TOOL_OUTPUT.search_params.ret_max} of {MOCK_TOOL_OUTPUT.search_params.total_found}</span>
          </div>
        )}
      </div>

      {/* 模态框挂载 */}
      {selectedPaper && (
        <AbstractModal 
          paper={selectedPaper} 
          onClose={() => setSelectedPaper(null)} 
        />
      )}
    </div>
  );
};

// 导出主组件
export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">PubMed Tool Integration Demo</h1>
        <p className="text-gray-500 text-sm mt-2">Simulating LangChain tool output for biomedical research</p>
      </div>
      <div className="w-full max-w-4xl">
        <PubMedCard />
      </div>
    </div>
  );
}