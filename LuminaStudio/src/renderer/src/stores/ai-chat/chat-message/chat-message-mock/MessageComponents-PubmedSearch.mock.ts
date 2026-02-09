import type { ChatMessage } from '../types'
import type { MessageComponentMockCase } from './types'

// ==================== Mock Data ====================
const MOCK_PUBMED_RESULT = {
  tool_name: 'PubMed Retriever',
  status: 'success',
  latency: '1.2s',
  search_params: {
    database: 'pubmed',
    query: 'CRISPR-Cas9[Title/Abstract] AND gene therapy[Title/Abstract] AND 2023[pdat]',
    ret_max: 5,
    total_found: 1240
  },
  items: [
    {
      uid: '37289562',
      title: 'Ex vivo CRISPR-Cas9 gene editing for sickle cell disease.',
      source: 'N Engl J Med',
      pub_date: '2023',
      volume: '388',
      issue: '26',
      authors: ['Frangoul H', 'Locatelli F', 'Sharma A', 'et al.'],
      abstract:
        'BACKGROUND: Sickle cell disease is a genetic disorder caused by a mutation in the beta-globin gene... METHODS: We administered ex vivo CRISPR-Cas9-edited CD34+ hematopoietic stem and progenitor cells... RESULTS: A total of 31 patients received the therapy. All patients had engraftment... CONCLUSIONS: Ex vivo CRISPR-Cas9-edited therapy eliminated vaso-occlusive episodes in patients with severe sickle cell disease.',
      doi: '10.1056/NEJMoa2301234',
      fullTextAvailable: true
    },
    {
      uid: '37581234',
      title: 'Safety and Efficacy of CRISPR-Cas9 Editing for Transthyretin Amyloidosis.',
      source: 'Science',
      pub_date: '2023',
      volume: '381',
      issue: '6658',
      authors: ['Gillmore JD', 'Gane E', 'Taubel J', 'et al.'],
      abstract:
        'Transthyretin amyloidosis is a progressive, fatal disease caused by accumulation of misfolded transthyretin protein. We report interim data from a phase 1 trial of NTLA-2001, an in vivo gene-editing therapeutic agent based on CRISPR-Cas9... Administration of NTLA-2001 was associated with dose-dependent reductions in serum transthyretin protein concentrations.',
      doi: '10.1126/science.ade1234',
      fullTextAvailable: false
    },
    {
      uid: '36912345',
      title: 'Off-target effects in CRISPR-Cas9 gene editing: A new perspective.',
      source: 'Nature Biotechnology',
      pub_date: '2023',
      volume: '41',
      issue: '3',
      authors: ['Zhang Y', 'Liu X', 'Wang L'],
      abstract:
        'The clinical application of CRISPR-Cas9 requires high specificity. Here we present a comprehensive analysis of off-target effects using a newly developed detection method...',
      doi: '10.1038/s41587-023-01678-z',
      fullTextAvailable: true
    }
  ]
}

// ==================== Mock Case ====================
const PubmedSearchMockCase: MessageComponentMockCase = {
  id: 'pubmed-search',
  label: 'PubMed 文献检索',
  description: 'PubMed 文献检索节点组件 - 展示 NCBI 文献检索结果',
  order: 100,
  buildMessages: (): ChatMessage[] => {
    return [
      {
        id: 'msg-pubmed-demo',
        role: 'assistant',
        blocks: [
          {
            type: 'text',
            content: '我帮你检索了 PubMed 数据库中关于 CRISPR-Cas9 基因治疗的最新文献：'
          },
          {
            type: 'node',
            start: {
              nodeId: 'pubmed-search-node-1',
              nodeKind: 'pubmed_search',
              inputs: {
                query:
                  'CRISPR-Cas9[Title/Abstract] AND gene therapy[Title/Abstract] AND 2023[pdat]',
                ret_max: 5
              }
            },
            result: {
              outputs: {
                result: MOCK_PUBMED_RESULT
              }
            }
          },
          {
            type: 'text',
            content:
              '以上是检索到的前 5 篇文献。你可以点击 "View Abstract" 查看详细摘要，或通过 "Add to KB" 将文献添加到知识库中。'
          }
        ],
        isStreaming: false,
        createdAt: new Date().toISOString(),
        status: 'final'
      }
    ]
  }
}

export default PubmedSearchMockCase
