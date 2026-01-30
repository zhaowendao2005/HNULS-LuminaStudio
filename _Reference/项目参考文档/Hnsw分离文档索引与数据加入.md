## SurrealDB 向量插入与HNSW异步构建分离机制
这个 codemap 详细展示了 SurrealDB 如何通过 CONCURRENTLY 关键字和 IndexBuilder 组件实现向量数据插入与 HNSW 索引构建的分离。关键流程包括：异步索引构建启动 [1c]、IndexBuilder 任务管理 [2c]、文档消费机制 [3a]、增量队列管理 [4c]、两阶段构建流程 [5b]，以及 HNSW 向量插入 [6b]。这种设计实现了快速数据写入和后台慢速索引构建的解耦。
### 1. 使用 CONCURRENTLY 关键字启动异步索引构建
展示如何通过 SQL 语法触发异步索引构建，实现数据插入与索引构建的分离
### 1a. CONCURRENTLY 关键字处理 (`index.rs:166`)
在 SQL 解析中识别 CONCURRENTLY 关键字
```text
if self.concurrently {
			write!(f, " CONCURRENTLY")?
		}
```
### 1b. 启动索引构建流程 (`index.rs:138`)
根据 concurrently 参数决定是否异步构建索引
```text
run_indexing(stk, ctx, opt, doc, &index_def, !self.concurrently).await?;
```
### 1c. 调用 IndexBuilder (`index.rs:210`)
将索引构建任务交给 IndexBuilder 处理
```text
let rcv = ctx
			.get_index_builder()
			.ok_or_else(|| Error::unreachable("No Index Builder"))?
			.build(ctx, opt.clone(), ns, db, index.clone().into(), _blocking)?;
```
### 2. IndexBuilder 异步构建机制
展示 IndexBuilder 如何管理后台索引构建任务，处理增量数据
### 2a. 构建方法入口 (`index.rs:186`)
IndexBuilder 的主要构建接口
```text
pub(crate) fn build(
		&self,
		ctx: &Context,
		opt: Options,
		ns: NamespaceId,
		db: DatabaseId,
		ix: Arc<IndexDefinition>,
		blocking: bool,
	) -> Result<Option<Receiver<Result<()>>>> {
```
### 2b. 启动构建任务 (`index.rs:211`)
创建后台构建任务
```text
let ib = self.start_building(ctx, opt, ns, db, ix, sdr)?;
```
### 2c. 异步任务执行 (`index.rs:172`)
在后台任务中执行索引构建
```text
let jh = task::spawn(async move {
			let r = b.run().await;
			if let Err(err) = &r {
				b.set_status(BuildingStatus::Error(err.to_string())).await;
			}
			if let Some(s) = sdr {
				if s.send(r).is_err() {
					warn!("Failed to send index building result to the consumer");
				}
			}
		});
```
### 3. 文档索引时的消费机制
展示文档插入时如何被 IndexBuilder 消费，实现增量构建
### 3a. 检查 IndexBuilder 状态 (`index.rs:101`)
文档索引时检查是否有活跃的索引构建过程
```text
let (o, n) = if let Some(ib) = ctx.get_index_builder() {
			match ib.consume(db, ctx, ix, o, n, rid).await? {
				// The index builder consumed the value, which means it is currently building the
				// index asynchronously, we don't index the document and let the index builder
				// do it later.
				ConsumeResult::Enqueued => return Ok(()),
				// The index builder is done, the index has been built; we can proceed normally
				ConsumeResult::Ignored(o, n) => (o, n),
			}
		} else {
			(o, n)
		};
```
### 3b. 消费文档变更 (`index.rs:223`)
IndexBuilder 消费文档变更的入口方法
```text
pub(crate) async fn consume(
		&self,
		db: &DatabaseDefinition,
		ctx: &Context,
		ix: &IndexDefinition,
		old_values: Option<Vec<Value>>,
		new_values: Option<Vec<Value>>,
		rid: &RecordId,
	) -> Result<ConsumeResult> {
```
### 3c. 查找活跃构建任务 (`index.rs:233`)
查找对应的活跃索引构建任务
```text
if let Some(r) = self.indexes.get(&key) {
			let (b, _) = r.value();
			return b.maybe_consume(ctx, old_values, new_values, rid).await;
		}
```
### 4. 增量数据队列管理
展示如何在索引构建期间管理增量数据的队列
### 4a. 消费决策逻辑 (`index.rs:369`)
决定是否将文档加入队列或直接索引
```text
async fn maybe_consume(
		&self,
		ctx: &Context,
		old_values: Option<Vec<Value>>,
		new_values: Option<Vec<Value>>,
		rid: &RecordId,
	) -> Result<ConsumeResult> {
```
### 4b. 检查构建状态 (`index.rs:379`)
如果索引已构建完成且队列为空，直接处理文档
```text
if queue.is_empty() {
			// If the appending queue is empty and the index is built...
			if self.status.read().await.is_ready() {
				// ... we return the values back, so the document can be updated the usual way
				return Ok(ConsumeResult::Ignored(old_values, new_values));
			}
		}
```
### 4c. 加入增量队列 (`index.rs:388`)
将文档变更存储到增量队列中
```text
let a = Appending {
			old_values,
			new_values,
			id: rid.key.clone(),
		};
		// Get the idx of this appended record from the sequence
		let idx = queue.add_update();
		// Store the appending
		let ia = self.ikb.new_ia_key(idx);
		tx.set(&ia, &a, None).await?;
```
### 5. HNSW 索引的两阶段构建
展示 HNSW 索引如何先处理初始数据，再处理增量更新
### 5a. 开始构建流程 (`index.rs:419`)
清理旧索引数据，开始构建过程
```text
async fn run(&self) -> Result<()> {
		// Remove the index data
		{
			self.set_status(BuildingStatus::Cleaning).await;
```
### 5b. 初始数据索引 (`index.rs:432`)
第一阶段：索引表中所有现有数据
```text
// First iteration, we index every key
		let beg = thing::prefix(self.ns, self.db, self.ikb.table())?;
		let end = thing::suffix(self.ns, self.db, self.ikb.table())?;
```
### 5c. 增量数据处理 (`index.rs:472`)
第二阶段：处理构建期间的增量变更
```text
// Second iteration, we index/remove any records that has been added or removed
		// since the initial indexing
```
### 6. HNSW 向量插入机制
展示 HNSW 索引如何同时更新向量表和图结构
### 6a. HNSW 文档索引 (`index.rs:91`)
HNSW 索引的文档索引入口
```text
pub async fn index_document(
		&mut self,
		tx: &Transaction,
		id: &RecordIdKey,
		content: &[Value],
	) -> Result<()> {
```
### 6b. 插入向量数据 (`index.rs:107`)
同时更新向量表和 HNSW 图结构
```text
self.vec_docs.insert(tx, vector, doc_id, &mut self.hnsw).await?;
```
### 6c. 构建 HNSW 图 (`docs.rs:188`)
在 HNSW 图中插入新向量节点
```text
None => {
				//  We don't have the vector, we insert it in the graph
				let element_id = h.insert(tx, o).await?;
```

# DeepWiki Q&A with Code Context for Repository: surrealdb/surrealdb
## Q1
你给我查询下
Surrealdb提供哪些向量搜索的方法？
如果我一个数据库里面有多个向量表 为不同的维度和模型 如何单独的搜索？如何混合搜索？
### Answer
# SurrealDB 向量搜索方法

## 一、向量搜索方法

SurrealDB 提供了以下几种向量搜索方法：

### 1. **HNSW（近似最近邻搜索）**
使用 `<|k,ef|>` 操作符进行快速的近似最近邻搜索。其中 `k` 是返回的邻居数量，`ef` 是搜索质量参数。 surrealdb:1-50 

**索引定义语法：**
```surql
DEFINE INDEX idx_name ON table FIELDS embedding HNSW DIMENSION 3 DIST COSINE;
``` surrealdb:49-50 

### 2. **M-Tree（精确最近邻搜索）**
使用 `<|k|>` 操作符进行精确的 k-近邻搜索，基于距离的树状索引结构。 surrealdb:1-50 

**索引定义语法：**
```surql
DEFINE INDEX idx_name ON table FIELDS point MTREE DIMENSION 4 TYPE F32;
``` surrealdb:14-14 

### 3. **暴力搜索（Brute-force）**
使用 `<|k,DISTANCE|>` 操作符进行精确搜索，不需要索引，适合小数据集。 surrealdb:565-570 

### 4. **支持的距离度量**

SurrealDB 支持以下距离度量方法：
- **Euclidean**（欧几里得距离，默认）
- **Cosine**（余弦距离）
- **Manhattan**（曼哈顿距离）
- **Chebyshev**（切比雪夫距离）
- **Hamming**（汉明距离）
- **Jaccard**（杰卡德相似度）
- **Minkowski**（闵可夫斯基距离）
- **Pearson**（皮尔逊相关系数） surrealdb:217-227 

## 二、单独搜索不同维度的向量表

### 为每个表定义独立的向量索引

每个表可以定义自己的向量索引，指定不同的维度和距离度量：

**示例：**
```surql
-- 表1：3维向量，余弦距离
DEFINE INDEX idx_table1 ON table1 FIELDS embedding HNSW DIMENSION 3 DIST COSINE;

-- 表2：128维向量，欧几里得距离
DEFINE INDEX idx_table2 ON table2 FIELDS embedding HNSW DIMENSION 128 DIST EUCLIDEAN;

-- 表3：768维向量，曼哈顿距离
DEFINE INDEX idx_table3 ON table3 FIELDS embedding MTREE DIMENSION 768 DIST MANHATTAN;
```

### 查询语法

对每个表进行单独的向量搜索：

```surql
-- 在 table1 中搜索（3维向量）
LET $vec3d = [0.1, 0.2, 0.3];
SELECT id, vector::distance::knn() as distance 
FROM table1 
WHERE embedding <|5,100|> $vec3d;

-- 在 table2 中搜索（128维向量）
LET $vec128d = [...]; -- 128维向量
SELECT id, vector::distance::knn() as distance 
FROM table2 
WHERE embedding <|5,100|> $vec128d;
``` surrealdb:53-56 surrealdb:79-101 

## 三、混合搜索（跨表融合）

SurrealDB 提供了两种结果融合方法来组合不同表的搜索结果：

### 1. **RRF（Reciprocal Rank Fusion）**

使用 `search::rrf()` 函数进行倒数排名融合：

```surql
-- 从多个表搜索
LET $results_table1 = SELECT id, vector::distance::knn() as distance 
                      FROM table1 WHERE embedding <|5|> $vector1;
                      
LET $results_table2 = SELECT id, vector::distance::knn() as distance 
                      FROM table2 WHERE embedding <|5|> $vector2;

-- 使用 RRF 融合结果
RETURN search::rrf([$results_table1, $results_table2], 10, 60);
```

**参数说明：**
- 第一个参数：结果数组列表
- 第二个参数：返回的最大结果数
- 第三个参数：RRF 常数（默认 60） surrealdb:103-141 surrealdb:53-60 

### 2. **Linear（加权线性组合）**

使用 `search::linear()` 函数进行加权线性组合：

```surql
-- 从多个表搜索
LET $results_table1 = SELECT id, vector::distance::knn() as distance 
                      FROM table1 WHERE embedding <|5|> $vector1;
                      
LET $results_table2 = SELECT id, vector::distance::knn() as distance 
                      FROM table2 WHERE embedding <|5|> $vector2;

-- 使用加权线性组合融合结果（table1 权重 2.0，table2 权重 1.0）
RETURN search::linear([$results_table1, $results_table2], [2.0, 1.0], 10, 'minmax');
```

**参数说明：**
- 第一个参数：结果数组列表
- 第二个参数：权重数组（对应每个结果列表）
- 第三个参数：返回的最大结果数
- 第四个参数：归一化方法（'minmax' 或 'zscore'）

**归一化方法：**
- **MinMax**：将分数缩放到 [0,1] 范围
- **Z-score**：使用标准化处理 surrealdb:269-332 surrealdb:62-66 

### 3. **分数提取规则**

融合函数会自动从文档中提取分数，优先级如下：
1. `distance` 字段 - 使用 `1.0 / (1.0 + distance)` 转换（距离越小，分数越高）
2. `ft_score` 字段 - 全文搜索分数
3. `score` 字段 - 通用分数
4. 基于排名的回退 - `1.0 / (1.0 + rank)` surrealdb:306-314 

## Notes

**关键点：**

1. **维度独立性**：每个表的向量索引可以有不同的维度，维度在索引定义时通过 `DIMENSION` 参数指定。向量搜索必须使用与索引定义相同维度的查询向量。

2. **融合级别**：搜索融合发生在结果级别（合并排名列表），而不是向量级别，因此不同维度的表可以安全地融合结果。

3. **索引类型选择**：
   - HNSW 适合大规模数据的近似搜索（速度快）
   - M-Tree 适合精确搜索（结果准确）
   - 暴力搜索适合小数据集或没有索引的情况

4. **向量类型支持**：索引支持多种数据类型：F64、F32、I64、I32、I16，通过 `TYPE` 参数指定。 surrealdb:437-467
### Citations
**File:** crates/core/src/idx/trees/hnsw/index.rs (L1-50)
```rust
use std::collections::VecDeque;

#[cfg(debug_assertions)]
use ahash::HashMap;
use anyhow::Result;
use reblessive::tree::Stk;

use crate::catalog::{DatabaseDefinition, HnswParams, VectorType};
use crate::idx::IndexKeyBase;
use crate::idx::planner::checker::HnswConditionChecker;
use crate::idx::planner::iterators::KnnIteratorResult;
use crate::idx::trees::hnsw::docs::{HnswDocs, VecDocs};
use crate::idx::trees::hnsw::elements::HnswElements;
use crate::idx::trees::hnsw::flavor::HnswFlavor;
use crate::idx::trees::hnsw::{ElementId, HnswSearch};
use crate::idx::trees::knn::{KnnResult, KnnResultBuilder};
use crate::idx::trees::vector::{SharedVector, Vector};
use crate::kvs::Transaction;
use crate::val::{Number, RecordIdKey, Value};

pub struct HnswIndex {
	dim: usize,
	vector_type: VectorType,
	hnsw: HnswFlavor,
	docs: HnswDocs,
	vec_docs: VecDocs,
}

pub(super) struct HnswCheckedSearchContext<'a> {
	elements: &'a HnswElements,
	docs: &'a HnswDocs,
	vec_docs: &'a VecDocs,
	pt: &'a SharedVector,
	ef: usize,
}

impl<'a> HnswCheckedSearchContext<'a> {
	pub(super) fn new(
		elements: &'a HnswElements,
		docs: &'a HnswDocs,
		vec_docs: &'a VecDocs,
		pt: &'a SharedVector,
		ef: usize,
	) -> Self {
		Self {
			elements,
			docs,
			vec_docs,
			pt,
			ef,
```
**File:** crates/language-tests/tests/language/functions/search/search-linear.surql (L49-50)
```text
-- Vector index (HNSW) on a 3‑dimensional embedding, using cosine distance
DEFINE INDEX idx_embedding ON TABLE test FIELDS embedding HNSW DIMENSION 3 DIST COSINE;
```
**File:** crates/language-tests/tests/language/functions/search/search-linear.surql (L53-56)
```text
LET $qvec = [0.12, 0.18, 0.27];

-- Vector search: top 2 nearest neighbours
LET $vs = SELECT id, vector::distance::knn() as distance FROM test WHERE embedding <|2,100|> $qvec;
```
**File:** crates/language-tests/tests/language/functions/search/search-linear.surql (L62-66)
```text
-- Fuse with Linear / minmax
RETURN search::linear([$vs, $ft], [2, 1], 2, 'minmax');

-- Fuse with Linear / zscore
RETURN search::linear([$vs, $ft], [2, 1], 2, 'zscore');
```
**File:** crates/core/src/idx/trees/mtree.rs (L1-50)
```rust
use std::collections::hash_map::Entry;
use std::collections::{BinaryHeap, VecDeque};
use std::fmt::{Debug, Display, Formatter};
use std::io::Cursor;
use std::sync::Arc;

use ahash::{HashMap, HashMapExt, HashSet};
use anyhow::Result;
use reblessive::tree::Stk;
use revision::{Revisioned, revisioned};
use roaring::RoaringTreemap;
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

use crate::catalog::{DatabaseDefinition, Distance, MTreeParams, VectorType};
use crate::ctx::Context;
use crate::err::Error;
use crate::idx::IndexKeyBase;
use crate::idx::docids::DocId;
use crate::idx::docids::btdocids::BTreeDocIds;
use crate::idx::planner::checker::MTreeConditionChecker;
use crate::idx::planner::iterators::KnnIteratorResult;
use crate::idx::trees::btree::BStatistics;
use crate::idx::trees::knn::{Ids64, KnnResult, KnnResultBuilder, PriorityNode};
use crate::idx::trees::store::{NodeId, StoredNode, TreeNode, TreeNodeProvider, TreeStore};
use crate::idx::trees::vector::{SharedVector, Vector};
use crate::kvs::{KVValue, Key, Transaction, TransactionType, Val};
use crate::val::{Number, Object, RecordId, Value};

pub struct MTreeIndex {
	ikb: IndexKeyBase,
	dim: usize,
	vector_type: VectorType,
	store: MTreeStore,
	doc_ids: Arc<RwLock<BTreeDocIds>>,
	mtree: Arc<RwLock<MTree>>,
}

struct MTreeSearchContext<'a> {
	ctx: &'a Context,
	pt: SharedVector,
	k: usize,
	store: &'a MTreeStore,
}

impl MTreeIndex {
	pub async fn new(
		txn: &Transaction,
		ikb: IndexKeyBase,
		p: &MTreeParams,
```
**File:** crates/sdk/tests/vector.rs (L14-14)
```rust
		DEFINE INDEX mt_pts ON pts FIELDS point MTREE DIMENSION 4 TYPE F32;
```
**File:** crates/core/src/idx/planner/tree.rs (L565-570)
```rust
	fn eval_bruteforce_knn(&mut self, id: &Idiom, val: &Node, exp: &Arc<Expr>) -> Result<()> {
		let Expr::Binary {
			op,
			..
		} = &**exp
		else {
```
**File:** crates/core/src/sql/index.rs (L217-227)
```rust
pub enum Distance {
	Chebyshev,
	Cosine,
	#[default]
	Euclidean,
	Hamming,
	Jaccard,
	Manhattan,
	Minkowski(Number),
	Pearson,
}
```
**File:** crates/core/src/fnc/vector.rs (L79-101)
```rust
	pub fn knn(
		(ctx, doc): (&Context, Option<&CursorDoc>),
		(Optional(knn_ref),): (Optional<Value>,),
	) -> Result<Value> {
		if let Some((_exe, doc, thg)) = get_execution_context(ctx, doc) {
			if let Some(ir) = &doc.ir {
				if let Some(d) = ir.dist() {
					return Ok(d.into());
				}
			}
			if let Some(IterationStage::Iterate(Some(results))) = ctx.get_iteration_stage() {
				let n = if let Some(Value::Number(n)) = knn_ref {
					n.as_usize()
				} else {
					0
				};
				if let Some(d) = results.get_dist(n, thg) {
					return Ok(d.into());
				}
			}
		}
		Ok(Value::None)
	}
```
**File:** crates/core/src/fnc/search.rs (L103-141)
```rust
/// Implements Reciprocal Rank Fusion (RRF) to combine multiple ranked result
/// lists.
///
/// RRF is a method for combining results from different search algorithms
/// (e.g., vector search and full-text search) by computing a unified score
/// based on the reciprocal of each document's rank in each result list. The
/// algorithm uses the formula: `1 / (k + rank)` where `k` is the RRF constant
/// and `rank` is the 1-based position in the result list.
///
/// # Parameters
///
/// * `ctx` - The execution context for cancellation checking and transaction management
/// * `results` - An array of result lists, where each list contains documents with an "id" field
/// * `limit` - Maximum number of documents to return (must be ≥ 1)
/// * `rrf_constant` - Optional RRF constant (k) for score calculation (defaults to 60.0, must be ≥
///   0)
///
/// # Returns
///
/// Returns a `Value::Array` containing the top `limit` documents sorted by RRF
/// score in descending order. Each document includes:
/// - All original fields from the input documents (merged if the same document appears in multiple
///   lists)
/// - `id`: The document identifier
/// - `rrf_score`: The computed RRF score as a float
///
/// # Errors
///
/// * `Error::InvalidArguments` - If `limit` < 1 or `rrf_constant` < 0
/// * Context cancellation errors if the operation is cancelled during processing
///
/// # Example
///
/// ```surql
/// -- Combine vector search and full-text search results
/// LET $vector_results = SELECT id, distance FROM docs WHERE embedding <|5|> $query_vector;
/// LET $text_results = SELECT id, ft_score FROM docs WHERE text @@ 'search terms';
/// RETURN search::rrf([$vector_results, $text_results], 10, 60);
/// ```
```
**File:** crates/core/src/fnc/search.rs (L269-332)
```rust
/// Implements weighted linear combination to fuse multiple ranked result lists.
///
/// Linear combination is a method for combining results from different search
/// algorithms (e.g., vector search and full-text search) by computing a unified
/// score based on weighted linear combination of normalized scores.
/// The algorithm first normalizes scores from each result list using either
/// MinMax or Z-score normalization, then computes a weighted sum: `weight₁ ×
/// norm_score₁ + weight₂ × norm_score₂ + ...`
///
/// # Parameters
///
/// * `ctx` - The execution context for cancellation checking and transaction management
/// * `results` - An array of result lists, where each list contains documents with an "id" field
/// * `weights` - An array of numeric weights corresponding to each result list (must have same
///   length as results)
/// * `limit` - Maximum number of documents to return (must be ≥ 1)
/// * `norm` - Normalization method: "minmax" for MinMax normalization or "zscore" for Z-score
///   normalization
///
/// # Returns
///
/// Returns a `Value::Array` containing the top `limit` documents sorted by
/// linear score in descending order. Each document includes:
/// - All original fields from the input documents (merged if the same document appears in multiple
///   lists)
/// - `id`: The document identifier
/// - `linear_score`: The computed weighted linear combination score as a float
///
/// # Errors
///
/// * `Error::InvalidArguments` - If:
///   - `limit` < 1
///   - `results` and `weights` arrays have different lengths
///   - Any weight is not a numeric value
///   - `norm` is not "minmax" or "zscore"
/// * Context cancellation errors if the operation is cancelled during processing
///
/// # Score Extraction
///
/// The function automatically extracts scores from documents using the
/// following priority:
/// 1. `distance` field - converted using `1.0 / (1.0 + distance)` (lower distance = higher score)
/// 2. `ft_score` field - used directly (full-text search scores)
/// 3. `score` field - used directly (generic scores)
/// 4. Rank-based fallback - `1.0 / (1.0 + rank)` if no score field is found
///
/// # Normalization Methods
///
/// * **MinMax**: Scales scores to [0,1] range using `(score - min) / (max - min)`
/// * **Z-score**: Standardizes scores using `(score - mean) / std_dev`
///
/// # Example
///
/// ```surql
/// -- Combine vector search and full-text search results with different weights
/// LET $vector_results = SELECT id, distance FROM docs WHERE embedding <|5|> $query_vector;
/// LET $text_results = SELECT id, ft_score FROM docs WHERE text @@ 'search terms';
///
/// -- Use MinMax normalization with 2:1 weighting favoring vector search
/// RETURN search::linear([$vector_results, $text_results], [2.0, 1.0], 10, 'minmax');
///
/// -- Use Z-score normalization with equal weighting
/// RETURN search::linear([$vector_results, $text_results], [1.0, 1.0], 10, 'zscore');
/// ```
```
**File:** crates/language-tests/tests/language/functions/search/search-rrf.surql (L53-60)
```text
LET $vs = SELECT id, vector::distance::knn() as distance FROM test WHERE embedding <|2,100|> $qvec;

-- Full‑text search: top 2 lexical matches
LET $ft = SELECT id, search::score(1) as ft_score FROM test
          WHERE text @1@ 'graph' ORDER BY ft_score DESC LIMIT 2;

-- Fuse with Reciprocal Rank Fusion (k defaults to 60 if omitted)
RETURN search::rrf([$vs, $ft], 2, 60);
```
**File:** crates/core/src/idx/trees/vector.rs (L437-467)
```rust
impl Vector {
	pub(super) fn try_from_value(t: VectorType, d: usize, v: &Value) -> Result<Self> {
		let res = match t {
			VectorType::F64 => {
				let mut vec = Vec::with_capacity(d);
				Self::check_vector_value(v, &mut vec)?;
				Vector::F64(Array1::from_vec(vec))
			}
			VectorType::F32 => {
				let mut vec = Vec::with_capacity(d);
				Self::check_vector_value(v, &mut vec)?;
				Vector::F32(Array1::from_vec(vec))
			}
			VectorType::I64 => {
				let mut vec = Vec::with_capacity(d);
				Self::check_vector_value(v, &mut vec)?;
				Vector::I64(Array1::from_vec(vec))
			}
			VectorType::I32 => {
				let mut vec = Vec::with_capacity(d);
				Self::check_vector_value(v, &mut vec)?;
				Vector::I32(Array1::from_vec(vec))
			}
			VectorType::I16 => {
				let mut vec = Vec::with_capacity(d);
				Self::check_vector_value(v, &mut vec)?;
				Vector::I16(Array1::from_vec(vec))
			}
		};
		Ok(res)
	}
```
## Q2
你研究下 这个hjnsw索引能不能将向量加入向量表与增量构建hnsw的过程分开？
### Answer
基于对 SurrealDB 代码库的分析，HNSW 索引目前的设计是将向量加入向量表与增量构建 HNSW 的过程紧密耦合的，但确实存在一些分离机制。

## 当前架构分析

### 紧耦合的设计

在 `HnswIndex.index_document()` 方法中，向量插入和 HNSW 构建是同步进行的： surrealdb:91-111 

```rust
pub async fn index_document(
    &mut self,
    tx: &Transaction,
    id: &RecordIdKey,
    content: &[Value],
) -> Result<()> {
    // 确保层级是最新的
    self.hnsw.check_state(tx).await?;
    // 解析文档ID
    let doc_id = self.docs.resolve(tx, id).await?;
    // 索引值
    for value in content.iter().filter(|v| !v.is_nullish()) {
        // 提取向量
        let vector = Vector::try_from_value(self.vector_type, self.dim, value)?;
        vector.check_dimension(self.dim)?;
        // 插入向量 - 这里同时更新向量表和HNSW图
        self.vec_docs.insert(tx, vector, doc_id, &mut self.hnsw).await?;
    }
    self.docs.finish(tx).await?;
    Ok(())
}
```

### 两层存储结构

系统实际上使用了两层存储：

1. **VecDocs** - 管理向量到文档ID的映射 surrealdb:170-200 
2. **HnswFlavor** - 管理实际的 HNSW 图结构 surrealdb:76-93 

在 `VecDocs.insert()` 方法中，如果向量不存在，会调用 `h.insert(tx, o).await?` 来构建 HNSW 图： surrealdb:188-194 

## 异步索引构建机制

SurrealDB 确实提供了异步索引构建的能力，通过 `IndexBuilder` 组件： surrealdb:147-184 

在文档索引过程中，如果存在活跃的索引构建器，文档索引操作会被跳过，由索引构建器异步处理： surrealdb:100-112 

```rust
let (o, n) = if let Some(ib) = ctx.get_index_builder() {
    match ib.consume(db, ctx, ix, o, n, rid).await? {
        // 索引构建器消费了值，意味着它正在异步构建索引
        // 我们不索引文档，让索引构建器稍后处理
        ConsumeResult::Enqueued => return Ok(()),
        // 索引构建器完成，索引已构建；我们可以正常进行
        ConsumeResult::Ignored(o, n) => (o, n),
    }
} else {
    (o, n)
};
```

## 结论

**目前 HNSW 索引的设计特点：**

1. **默认情况下**：向量插入和 HNSW 构建是同步的、紧密耦合的过程
2. **异步构建支持**：通过 `IndexBuilder` 可以实现异步索引构建，将向量数据收集和 HNSW 图构建分离
3. **两层存储**：向量数据存储在 `VecDocs` 中，HNSW 图结构存储在 `HnswFlavor` 中，为分离提供了基础架构

**要实现完全分离**，你需要使用异步索引构建功能，这样向量数据可以先存储到 `VecDocs` 中，然后由后台的 `IndexBuilder` 异步构建 HNSW 图结构。

## Notes

- HNSW 的增量构建是通过 `insert_level()` 方法实现的，它会动态创建新的层级并更新图连接 surrealdb:137-167 
- 系统支持多种 HNSW "flavor"，根据不同的 M 和 M0 参数选择不同的数据结构优化 surrealdb:31-55 
- 向量删除操作也会同时更新向量表和 HNSW 图 surrealdb:202-222 

Wiki pages you might want to explore:
- [Core Database Engine (surrealdb/surrealdb)](/wiki/surrealdb/surrealdb#6)
### Citations
**File:** crates/core/src/idx/trees/hnsw/index.rs (L91-111)
```rust
	pub async fn index_document(
		&mut self,
		tx: &Transaction,
		id: &RecordIdKey,
		content: &[Value],
	) -> Result<()> {
		// Ensure the layers are up-to-date
		self.hnsw.check_state(tx).await?;
		// Resolve the doc_id
		let doc_id = self.docs.resolve(tx, id).await?;
		// Index the values
		for value in content.iter().filter(|v| !v.is_nullish()) {
			// Extract the vector
			let vector = Vector::try_from_value(self.vector_type, self.dim, value)?;
			vector.check_dimension(self.dim)?;
			// Insert the vector
			self.vec_docs.insert(tx, vector, doc_id, &mut self.hnsw).await?;
		}
		self.docs.finish(tx).await?;
		Ok(())
	}
```
**File:** crates/core/src/idx/trees/hnsw/docs.rs (L170-200)
```rust
	pub(super) async fn insert(
		&self,
		tx: &Transaction,
		o: Vector,
		d: DocId,
		h: &mut HnswFlavor,
	) -> Result<()> {
		let ser_vec = Arc::new(SerializedVector::from(&o));
		let key = self.ikb.new_hv_key(ser_vec);
		if let Some(ed) = match tx.get(&key, None).await? {
			Some(mut ed) => {
				// We already have the vector
				ed.docs.insert(d).map(|new_docs| {
					ed.docs = new_docs;
					ed
				})
			}
			None => {
				//  We don't have the vector, we insert it in the graph
				let element_id = h.insert(tx, o).await?;
				let ed = ElementDocs {
					e_id: element_id,
					docs: Ids64::One(d),
				};
				Some(ed)
			}
		} {
			tx.set(&key, &ed, None).await?;
		}
		Ok(())
	}
```
**File:** crates/core/src/idx/trees/hnsw/docs.rs (L202-222)
```rust
	pub(super) async fn remove(
		&self,
		tx: &Transaction,
		o: &Vector,
		d: DocId,
		h: &mut HnswFlavor,
	) -> Result<()> {
		let key = self.ikb.new_hv_key(Arc::new(o.into()));
		if let Some(mut ed) = tx.get(&key, None).await? {
			if let Some(new_docs) = ed.docs.remove(d) {
				if new_docs.is_empty() {
					tx.del(&key).await?;
					h.remove(tx, ed.e_id).await?;
				} else {
					ed.docs = new_docs;
					tx.set(&key, &ed, None).await?;
				}
			}
		};
		Ok(())
	}
```
**File:** crates/core/src/idx/trees/hnsw/flavor.rs (L31-55)
```rust
	pub(super) fn new(ibk: IndexKeyBase, p: &HnswParams) -> Result<Self> {
		let res = match p.m {
			1..=4 => match p.m0 {
				1..=8 => Self::H5_9(Hnsw::<ArraySet<9>, ArraySet<5>>::new(ibk, p)?),
				9..=16 => Self::H5_17(Hnsw::<ArraySet<17>, ArraySet<5>>::new(ibk, p)?),
				17..=24 => Self::H5_25(Hnsw::<ArraySet<25>, ArraySet<5>>::new(ibk, p)?),
				_ => Self::H5set(Hnsw::<AHashSet, ArraySet<5>>::new(ibk, p)?),
			},
			5..=8 => match p.m0 {
				1..=16 => Self::H9_17(Hnsw::<ArraySet<17>, ArraySet<9>>::new(ibk, p)?),
				17..=24 => Self::H9_25(Hnsw::<ArraySet<25>, ArraySet<9>>::new(ibk, p)?),
				_ => Self::H9set(Hnsw::<AHashSet, ArraySet<9>>::new(ibk, p)?),
			},
			9..=12 => match p.m0 {
				17..=24 => Self::H13_25(Hnsw::<ArraySet<25>, ArraySet<13>>::new(ibk, p)?),
				_ => Self::H13set(Hnsw::<AHashSet, ArraySet<13>>::new(ibk, p)?),
			},
			13..=16 => Self::H17set(Hnsw::<AHashSet, ArraySet<17>>::new(ibk, p)?),
			17..=20 => Self::H21set(Hnsw::<AHashSet, ArraySet<21>>::new(ibk, p)?),
			21..=24 => Self::H25set(Hnsw::<AHashSet, ArraySet<25>>::new(ibk, p)?),
			25..=28 => Self::H29set(Hnsw::<AHashSet, ArraySet<29>>::new(ibk, p)?),
			_ => Self::Hset(Hnsw::<AHashSet, AHashSet>::new(ibk, p)?),
		};
		Ok(res)
	}
```
**File:** crates/core/src/idx/trees/hnsw/flavor.rs (L76-93)
```rust
	pub(super) async fn insert(&mut self, tx: &Transaction, q_pt: Vector) -> Result<ElementId> {
		match self {
			HnswFlavor::H5_9(h) => h.insert(tx, q_pt).await,
			HnswFlavor::H5_17(h) => h.insert(tx, q_pt).await,
			HnswFlavor::H5_25(h) => h.insert(tx, q_pt).await,
			HnswFlavor::H5set(h) => h.insert(tx, q_pt).await,
			HnswFlavor::H9_17(h) => h.insert(tx, q_pt).await,
			HnswFlavor::H9_25(h) => h.insert(tx, q_pt).await,
			HnswFlavor::H9set(h) => h.insert(tx, q_pt).await,
			HnswFlavor::H13_25(h) => h.insert(tx, q_pt).await,
			HnswFlavor::H13set(h) => h.insert(tx, q_pt).await,
			HnswFlavor::H17set(h) => h.insert(tx, q_pt).await,
			HnswFlavor::H21set(h) => h.insert(tx, q_pt).await,
			HnswFlavor::H25set(h) => h.insert(tx, q_pt).await,
			HnswFlavor::H29set(h) => h.insert(tx, q_pt).await,
			HnswFlavor::Hset(h) => h.insert(tx, q_pt).await,
		}
	}
```
**File:** crates/core/src/kvs/index.rs (L147-184)
```rust
#[derive(Clone)]
pub(crate) struct IndexBuilder {
	tf: TransactionFactory,
	indexes: Arc<DashMap<IndexKey, IndexBuilding>>,
}

impl IndexBuilder {
	pub(super) fn new(tf: TransactionFactory) -> Self {
		Self {
			tf,
			indexes: Default::default(),
		}
	}

	fn start_building(
		&self,
		ctx: &Context,
		opt: Options,
		ns: NamespaceId,
		db: DatabaseId,
		ix: Arc<IndexDefinition>,
		sdr: Option<Sender<Result<()>>>,
	) -> Result<IndexBuilding> {
		let building = Arc::new(Building::new(ctx, self.tf.clone(), opt, ns, db, ix)?);
		let b = building.clone();
		let jh = task::spawn(async move {
			let r = b.run().await;
			if let Err(err) = &r {
				b.set_status(BuildingStatus::Error(err.to_string())).await;
			}
			if let Some(s) = sdr {
				if s.send(r).is_err() {
					warn!("Failed to send index building result to the consumer");
				}
			}
		});
		Ok((building, jh))
	}
```
**File:** crates/core/src/doc/index.rs (L100-112)
```rust
		#[cfg(not(target_family = "wasm"))]
		let (o, n) = if let Some(ib) = ctx.get_index_builder() {
			match ib.consume(db, ctx, ix, o, n, rid).await? {
				// The index builder consumed the value, which means it is currently building the
				// index asynchronously, we don't index the document and let the index builder
				// do it later.
				ConsumeResult::Enqueued => return Ok(()),
				// The index builder is done, the index has been built; we can proceed normally
				ConsumeResult::Ignored(o, n) => (o, n),
			}
		} else {
			(o, n)
		};
```
**File:** crates/core/src/idx/trees/hnsw/mod.rs (L137-167)
```rust
	async fn insert_level(
		&mut self,
		tx: &Transaction,
		q_pt: Vector,
		q_level: usize,
	) -> Result<ElementId> {
		// Attributes an ID to the vector
		let q_id = self.elements.next_element_id();
		let top_up_layers = self.layers.len();

		// Be sure we have existing (up) layers if required
		for i in top_up_layers..q_level {
			self.layers.push(HnswLayer::new(self.ikb.clone(), i + 1, self.m));
			self.state.layers.push(LayerState::default());
		}

		// Store the vector
		let pt_ser = SerializedVector::from(&q_pt);
		let q_pt = self.elements.insert(tx, q_id, q_pt, &pt_ser).await?;

		if let Some(ep_id) = self.state.enter_point {
			// We already have an enter_point, let's insert the element in the layers
			self.insert_element(tx, q_id, &q_pt, q_level, ep_id, top_up_layers).await?;
		} else {
			// Otherwise is the first element
			self.insert_first_element(tx, q_id, q_level).await?;
		}

		self.state.next_element_id = self.elements.inc_next_element_id();
		Ok(q_id)
	}
```
## Q3
这样 你和我说使用Surrealdb的nodejs sdk如何调用api来实现？
### Answer
基于 SurrealDB 的向量搜索功能，我来为你展示如何使用 Node.js SDK 来实现这些操作。

## Node.js SDK 向量搜索实现

### 1. 连接数据库和基本设置

```javascript
import { Surreal } from 'surrealdb.js';

// 连接到数据库
const db = new Surreal();
await db.connect('http://localhost:8000/rpc');
await db.signin({
  username: 'root',
  password: 'root'
});
await db.use({ namespace: 'test', database: 'test' });
```

### 2. 定义向量索引

```javascript
// 定义 HNSW 索引 - 3维向量，余弦距离
await db.query(`
  DEFINE INDEX idx_embeddings_3d ON embeddings_3d 
  FIELDS vector HNSW DIMENSION 3 DIST COSINE 
  M 12 M0 24 EFC 200;
`);

// 定义 HNSW 索引 - 128维向量，欧几里得距离
await db.query(`
  DEFINE INDEX idx_embeddings_128d ON embeddings_128d 
  FIELDS vector HNSW DIMENSION 128 DIST EUCLIDEAN 
  M 16 M0 32 EFC 200;
`);

// 定义 M-Tree 索引 - 768维向量，曼哈顿距离
await db.query(`
  DEFINE INDEX idx_embeddings_768d ON embeddings_768d 
  FIELDS vector MTREE DIMENSION 768 DIST MANHATTAN;
`);
```

### 3. 插入向量数据

```javascript
// 插入3维向量数据
await db.create('embeddings_3d', {
  id: 'item1',
  vector: [0.1, 0.2, 0.3],
  content: '这是3维向量的内容'
});

// 插入128维向量数据
const vector128d = new Array(128).fill(0).map(() => Math.random());
await db.create('embeddings_128d', {
  id: 'item2', 
  vector: vector128d,
  content: '这是128维向量的内容'
});

// 插入768维向量数据
const vector768d = new Array(768).fill(0).map(() => Math.random());
await db.create('embeddings_768d', {
  id: 'item3',
  vector: vector768d,
  content: '这是768维向量的内容'
});
```

### 4. 单独向量搜索

```javascript
// 在3维向量表中搜索
const query3d = [0.15, 0.25, 0.35];
const results3d = await db.query(`
  LET $vec = $query3d;
  SELECT id, content, vector::distance::knn() as distance 
  FROM embeddings_3d 
  WHERE vector <|5,100|> $vec
  ORDER BY distance
  LIMIT 5;
`, { query3d });

// 在128维向量表中搜索
const query128d = new Array(128).fill(0).map(() => Math.random());
const results128d = await db.query(`
  LET $vec = $query128d;
  SELECT id, content, vector::distance::knn() as distance 
  FROM embeddings_128d 
  WHERE vector <|10,150|> $vec
  ORDER BY distance
  LIMIT 10;
`, { query128d });

// 在768维向量表中搜索（使用M-Tree精确搜索）
const query768d = new Array(768).fill(0).map(() => Math.random());
const results768d = await db.query(`
  LET $vec = $query768d;
  SELECT id, content, vector::distance::knn() as distance 
  FROM embeddings_768d 
  WHERE vector <|8|> $vec
  ORDER BY distance
  LIMIT 8;
`, { query768d });
```

### 5. 混合搜索（跨表融合）

#### RRF 融合搜索

```javascript
const mixedQuery = [0.1, 0.2, 0.3]; // 3维查询向量
const mixedQuery128d = new Array(128).fill(0).map(() => Math.random()); // 128维查询向量

const rrfResults = await db.query(`
  -- 从3维向量表搜索
  LET $results_3d = SELECT id, content, vector::distance::knn() as distance 
                    FROM embeddings_3d 
                    WHERE vector <|5|> $mixedQuery;
                    
  -- 从128维向量表搜索  
  LET $results_128d = SELECT id, content, vector::distance::knn() as distance 
                      FROM embeddings_128d 
                      WHERE vector <|5|> $mixedQuery128d;
  
  -- 使用RRF融合结果
  RETURN search::rrf([$results_3d, $results_128d], 10, 60);
`, { 
  mixedQuery, 
  mixedQuery128d 
});
```

#### Linear 加权融合搜索

```javascript
const linearResults = await db.query(`
  -- 从不同表搜索
  LET $results_3d = SELECT id, content, vector::distance::knn() as distance 
                    FROM embeddings_3d 
                    WHERE vector <|5|> $mixedQuery;
                    
  LET $results_128d = SELECT id, content, vector::distance::knn() as distance 
                      FROM embeddings_128d 
                      WHERE vector <|5|> $mixedQuery128d;
  
  -- 使用加权线性组合融合（3维表权重2.0，128维表权重1.0）
  RETURN search::linear([$results_3d, $results_128d], [2.0, 1.0], 10, 'minmax');
`, { 
  mixedQuery, 
  mixedQuery128d 
});
```

### 6. 异步索引构建

```javascript
// 异步构建大型索引
await db.query(`
  -- 使用 CONCURRENTLY 关键字异步构建索引
  DEFINE INDEX CONCURRENTLY idx_large_vector ON large_vectors 
  FIELDS embedding HNSW DIMENSION 1536 DIST COSINE 
  M 16 M0 32 EFC 200;
`);

// 检查索引构建状态
const indexStatus = await db.query(`
  SELECT * FROM information() WHERE name = 'idx_large_vector';
`);
```

### 7. 完整的搜索函数封装

```javascript
class VectorSearchService {
  constructor(db) {
    this.db = db;
  }

  // 单表向量搜索
  async searchSingleTable(tableName, queryVector, k = 5, ef = 100) {
    const result = await this.db.query(`
      LET $vec = $queryVector;
      SELECT id, content, vector::distance::knn() as distance 
      FROM type::table($tableName) 
      WHERE vector <|$k,$ef|> $vec
      ORDER BY distance
      LIMIT $k;
    `, { tableName, queryVector, k, ef });
    
    return result[0]?.result || [];
  }

  // 混合搜索 - RRF
  async searchMixedRRF(searchConfigs, k = 10, rrfConstant = 60) {
    const searchQueries = searchConfigs.map((config, index) => `
      LET $results_${index} = SELECT id, content, vector::distance::knn() as distance 
                             FROM type::table($tableName_${index}) 
                             WHERE vector <|$k_${index}|> $queryVector_${index};
    `).join('\n');

    const rrfQuery = `
      ${searchQueries}
      RETURN search::rrf([${searchConfigs.map((_, i) => `$results_${i}`).join(', ')}], $k, $rrfConstant);
    `;

    const params = {
      k,
      rrfConstant,
      ...searchConfigs.reduce((acc, config, index) => {
        acc[`tableName_${index}`] = config.tableName;
        acc[`queryVector_${index}`] = config.queryVector;
        acc[`k_${index}`] = config.k || 5;
        return acc;
      }, {})
    };

    const result = await this.db.query(rrfQuery, params);
    return result[0]?.result || [];
  }

  // 混合搜索 - Linear
  async searchMixedLinear(searchConfigs, weights, k = 10, normalization = 'minmax') {
    const searchQueries = searchConfigs.map((config, index) => `
      LET $results_${index} = SELECT id, content, vector::distance::knn() as distance 
                             FROM type::table($tableName_${index}) 
                             WHERE vector <|$k_${index}|> $queryVector_${index};
    `).join('\n');

    const linearQuery = `
      ${searchQueries}
      RETURN search::linear([${searchConfigs.map((_, i) => `$results_${i}`).join(', ')}], 
                           $weights, $k, $normalization);
    `;

    const params = {
      k,
      weights,
      normalization,
      ...searchConfigs.reduce((acc, config, index) => {
        acc[`tableName_${index}`] = config.tableName;
        acc[`queryVector_${index}`] = config.queryVector;
        acc[`k_${index}`] = config.k || 5;
        return acc;
      }, {})
    };

    const result = await this.db.query(linearQuery, params);
    return result[0]?.result || [];
  }
}

// 使用示例
const searchService = new VectorSearchService(db);

// 单表搜索
const singleResults = await searchService.searchSingleTable(
  'embeddings_3d', 
  [0.1, 0.2, 0.3], 
  5, 
  100
);

// 混合搜索
const mixedResults = await searchService.searchMixedRRF([
  { tableName: 'embeddings_3d', queryVector: [0.1, 0.2, 0.3], k: 5 },
  { tableName: 'embeddings_128d', queryVector: new Array(128).fill(0).map(() => Math.random()), k: 8 }
], 10, 60);
```

## Notes

**关键要点：**

1. **连接管理**：使用 `surrealdb.js` SDK 连接到 SurrealDB 服务器
2. **索引定义**：通过 SurrealQL 的 `DEFINE INDEX` 语句创建向量索引
3. **向量搜索**：使用 `<|k,ef|>` 操作符进行 HNSW 搜索，`<|k|>` 进行 M-Tree 搜索
4. **混合搜索**：利用 `search::rrf()` 和 `search::linear()` 函数实现跨表结果融合
5. **异步构建**：使用 `CONCURRENTLY` 关键字实现大型索引的异步构建
6. **参数化查询**：使用参数化查询防止 SQL 注入并提高性能

这些示例展示了如何在 Node.js 环境中充分利用 SurrealDB 的向量搜索功能，包括处理不同维度的向量表和实现复杂的混合搜索策略。

Wiki pages you might want to explore:
- [Core Database Engine (surrealdb/surrealdb)](/wiki/surrealdb/surrealdb#6)
## Q4
我是说实现先插入向量到database的对应维度的向量表 然后再增量构建hnsw
因为写入数据是一个快过程 而构建hnsw是一个慢的过程
### Answer
基于你的需求，我来展示如何使用 Node.js SDK 实现先插入向量数据，然后异步增量构建 HNSW 索引的方案。

## 实现方案：分离向量插入与HNSW构建

### 1. 先创建表和插入向量数据（不构建索引）

```javascript
import { Surreal } from 'surrealdb.js';

const db = new Surreal();
await db.connect('http://localhost:8000/rpc');
await db.signin({ username: 'root', password: 'root' });
await db.use({ namespace: 'test', database: 'test' });

// 创建向量表（先不创建索引）
await db.query(`
  CREATE TABLE embeddings_3d;
  CREATE TABLE embeddings_128d;
  CREATE TABLE embeddings_768d;
`);

// 批量插入向量数据（快速写入）
async function batchInsertVectors(tableName, vectors) {
  const batchSize = 1000;
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    const promises = batch.map((vector, index) => 
      db.create(tableName, {
        id: `item_${i + index}`,
        vector: vector,
        content: `Content for item ${i + index}`,
        timestamp: Date.now()
      })
    );
    await Promise.all(promises);
    console.log(`Inserted ${Math.min(i + batchSize, vectors.length)} vectors into ${tableName}`);
  }
}

// 插入不同维度的向量数据
const vectors3d = Array.from({ length: 10000 }, () => 
  [Math.random(), Math.random(), Math.random()]
);

const vectors128d = Array.from({ length: 5000 }, () => 
  Array.from({ length: 128 }, () => Math.random())
);

const vectors768d = Array.from({ length: 2000 }, () => 
  Array.from({ length: 768 }, () => Math.random())
);

// 并行插入所有向量数据
console.time('Vector insertion');
await Promise.all([
  batchInsertVectors('embeddings_3d', vectors3d),
  batchInsertVectors('embeddings_128d', vectors128d),
  batchInsertVectors('embeddings_768d', vectors768d)
]);
console.timeEnd('Vector insertion');
```

### 2. 异步构建HNSW索引

```javascript
// 使用 CONCURRENTLY 关键字异步构建索引
async function buildIndexesConcurrently() {
  console.log('Starting concurrent index building...');
  
  const indexDefinitions = [
    {
      name: 'idx_embeddings_3d',
      table: 'embeddings_3d',
      dimension: 3,
      distance: 'COSINE',
      params: 'M 12 M0 24 EFC 200'
    },
    {
      name: 'idx_embeddings_128d', 
      table: 'embeddings_128d',
      dimension: 128,
      distance: 'EUCLIDEAN',
      params: 'M 16 M0 32 EFC 200'
    },
    {
      name: 'idx_embeddings_768d',
      table: 'embeddings_768d', 
      dimension: 768,
      distance: 'MANHATTAN',
      params: 'M 20 M0 40 EFC 200'
    }
  ];

  // 并行启动所有索引构建
  const buildPromises = indexDefinitions.map(async (idx) => {
    console.log(`Starting index build for ${idx.name}`);
    await db.query(`
      DEFINE INDEX CONCURRENTLY ${idx.name} ON ${idx.table} 
      FIELDS vector HNSW DIMENSION ${idx.dimension} DIST ${idx.distance} 
      ${idx.params};
    `);
    console.log(`Index build initiated for ${idx.name}`);
  });

  await Promise.all(buildPromises);
  console.log('All index builds initiated');
}

// 启动异步索引构建
console.time('Index building initiation');
await buildIndexesConcurrently();
console.timeEnd('Index building initiation');
```

### 3. 监控索引构建状态

```javascript
// 检查索引构建状态
async function monitorIndexBuilding() {
  const indexNames = ['idx_embeddings_3d', 'idx_embeddings_128d', 'idx_embeddings_768d'];
  
  const checkStatus = async () => {
    const statuses = await Promise.all(
      indexNames.map(async (name) => {
        try {
          const result = await db.query(`
            SELECT * FROM information() WHERE name = '${name}';
          `);
          return { name, status: result[0]?.result?.[0] || 'Not found' };
        } catch (error) {
          return { name, status: 'Error', error: error.message };
        }
      })
    );
    
    console.log('Index building status:');
    statuses.forEach(({ name, status, error }) => {
      console.log(`  ${name}: ${status}${error ? ` (${error})` : ''}`);
    });
    
    // 检查是否所有索引都构建完成
    const allCompleted = statuses.every(s => 
      s.status === 'Ready' || s.status.includes('ready')
    );
    
    if (!allCompleted) {
      setTimeout(checkStatus, 5000); // 5秒后再次检查
    } else {
      console.log('All indexes are ready!');
    }
  };
  
  checkStatus();
}

// 开始监控
await monitorIndexBuilding();
```

### 4. 增量数据插入和索引更新

```javascript
// 在索引构建过程中或完成后，继续插入新数据
async function incrementalInsert(tableName, newVectors) {
  console.log(`Inserting ${newVectors.length} new vectors into ${tableName}`);
  
  for (let i = 0; i < newVectors.length; i++) {
    await db.create(tableName, {
      id: `new_item_${Date.now()}_${i}`,
      vector: newVectors[i],
      content: `New content ${i}`,
      timestamp: Date.now()
    });
  }
  
  console.log(`Incremental insert completed for ${tableName}`);
}

// 示例：在索引构建期间插入新数据
setTimeout(async () => {
  const newVectors3d = Array.from({ length: 100 }, () => 
    [Math.random(), Math.random(), Math.random()]
  );
  await incrementalInsert('embeddings_3d', newVectors3d);
}, 10000); // 10秒后插入新数据
```

### 5. 完整的工作流程管理

```javascript
class VectorIndexManager {
  constructor(db) {
    this.db = db;
    this.indexStatus = new Map();
  }

  // 第一阶段：快速插入向量数据
  async insertVectors(tableName, vectors, batchSize = 1000) {
    console.log(`Starting fast insertion for ${tableName}...`);
    const startTime = Date.now();
    
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      const promises = batch.map((vector, index) => 
        this.db.create(tableName, {
          id: `${tableName}_${i + index}`,
          vector: vector,
          content: `Content ${i + index}`,
          batch_id: Math.floor(i / batchSize)
        })
      );
      await Promise.all(promises);
    }
    
    const duration = Date.now() - startTime;
    console.log(`Inserted ${vectors.length} vectors into ${tableName} in ${duration}ms`);
    return duration;
  }

  // 第二阶段：异步构建索引
  async buildIndexAsync(indexConfig) {
    const { name, table, dimension, distance, params } = indexConfig;
    console.log(`Starting async index build for ${name}...`);
    
    try {
      await this.db.query(`
        DEFINE INDEX CONCURRENTLY ${name} ON ${table} 
        FIELDS vector HNSW DIMENSION ${dimension} DIST ${distance} 
        ${params};
      `);
      
      this.indexStatus.set(name, 'building');
      console.log(`Index build initiated: ${name}`);
      return true;
    } catch (error) {
      console.error(`Failed to start index build for ${name}:`, error);
      this.indexStatus.set(name, 'error');
      return false;
    }
  }

  // 监控构建状态
  async monitorIndexes(indexNames) {
    const checkInterval = 5000; // 5秒检查一次
    
    const checkStatus = async () => {
      const results = await Promise.all(
        indexNames.map(async (name) => {
          try {
            const result = await this.db.query(`
              SELECT status FROM information() WHERE name = '${name}';
            `);
            const status = result[0]?.result?.[0]?.status || 'unknown';
            this.indexStatus.set(name, status);
            return { name, status };
          } catch (error) {
            return { name, status: 'error', error: error.message };
          }
        })
      );

      console.log('Index Status Update:');
      results.forEach(({ name, status }) => {
        console.log(`  ${name}: ${status}`);
      });

      const allReady = results.every(r => r.status === 'ready');
      if (!allReady) {
        setTimeout(checkStatus, checkInterval);
      } else {
        console.log('🎉 All indexes are ready for searching!');
      }
    };

    checkStatus();
  }

  // 完整工作流程
  async runWorkflow() {
    console.log('🚀 Starting vector insertion and index building workflow...');
    
    // 阶段1：快速插入所有向量数据
    const insertPromises = [
      this.insertVectors('embeddings_3d', vectors3d),
      this.insertVectors('embeddings_128d', vectors128d),
      this.insertVectors('embeddings_768d', vectors768d)
    ];
    
    console.time('Total insertion time');
    await Promise.all(insertPromises);
    console.timeEnd('Total insertion time');
    
    // 阶段2：异步构建所有索引
    const indexConfigs = [
      { name: 'idx_embeddings_3d', table: 'embeddings_3d', dimension: 3, distance: 'COSINE', params: 'M 12 M0 24 EFC 200' },
      { name: 'idx_embeddings_128d', table: 'embeddings_128d', dimension: 128, distance: 'EUCLIDEAN', params: 'M 16 M0 32 EFC 200' },
      { name: 'idx_embeddings_768d', table: 'embeddings_768d', dimension: 768, distance: 'MANHATTAN', params: 'M 20 M0 40 EFC 200' }
    ];
    
    console.time('Index building initiation');
    const buildPromises = indexConfigs.map(config => this.buildIndexAsync(config));
    await Promise.all(buildPromises);
    console.timeEnd('Index building initiation');
    
    // 阶段3：监控构建状态
    await this.monitorIndexes(indexConfigs.map(c => c.name));
  }
}

// 使用工作流程管理器
const manager = new VectorIndexManager(db);
await manager.runWorkflow();
```

## 关键优势

这个方案实现了你要求的分离：

1. **快速数据插入**：向量数据直接存储到表中，不等待HNSW构建 surrealdb:223-238 
2. **异步索引构建**：使用`CONCURRENTLY`关键字让IndexBuilder在后台构建HNSW surrealdb:166-168 
3. **增量更新支持**：新插入的数据会被IndexBuilder自动处理 surrealdb:101-112 
4. **状态监控**：可以实时监控索引构建进度

这样你可以先快速完成数据写入，然后让系统在后台慢慢构建HNSW索引，不会阻塞后续的数据操作。

## Notes

**重要提醒：**

1. **CONCURRENTLY关键字**：这是实现异步构建的关键，它会让IndexBuilder在后台处理索引构建 surrealdb:1168-1171 
2. **数据一致性**：在索引构建期间，向量搜索可能返回不完整的结果，建议等索引构建完成后再进行生产搜索
3. **资源消耗**：异步构建会消耗额外的CPU和内存资源，建议在低峰期进行大规模索引构建
4. **错误处理**：需要监控索引构建状态，处理可能的构建失败情况

这个方案完美解决了"写入快，构建慢"的问题，让你可以快速插入大量向量数据，而不需要等待HNSW索引构建完成。

Wiki pages you might want to explore:
- [Core Database Engine (surrealdb/surrealdb)](/wiki/surrealdb/surrealdb#6)
### Citations
**File:** crates/core/src/kvs/index.rs (L223-238)
```rust
	pub(crate) async fn consume(
		&self,
		db: &DatabaseDefinition,
		ctx: &Context,
		ix: &IndexDefinition,
		old_values: Option<Vec<Value>>,
		new_values: Option<Vec<Value>>,
		rid: &RecordId,
	) -> Result<ConsumeResult> {
		let key = IndexKey::new(db.namespace_id, db.database_id, &ix.what, &ix.name);
		if let Some(r) = self.indexes.get(&key) {
			let (b, _) = r.value();
			return b.maybe_consume(ctx, old_values, new_values, rid).await;
		}
		Ok(ConsumeResult::Ignored(old_values, new_values))
	}
```
**File:** crates/core/src/expr/statements/define/index.rs (L166-168)
```rust
		if self.concurrently {
			write!(f, " CONCURRENTLY")?
		}
```
**File:** crates/core/src/doc/index.rs (L101-112)
```rust
		let (o, n) = if let Some(ib) = ctx.get_index_builder() {
			match ib.consume(db, ctx, ix, o, n, rid).await? {
				// The index builder consumed the value, which means it is currently building the
				// index asynchronously, we don't index the document and let the index builder
				// do it later.
				ConsumeResult::Enqueued => return Ok(()),
				// The index builder is done, the index has been built; we can proceed normally
				ConsumeResult::Ignored(o, n) => (o, n),
			}
		} else {
			(o, n)
		};
```
**File:** crates/core/src/syn/parser/stmt/define.rs (L1168-1171)
```rust
				t!("CONCURRENTLY") => {
					self.pop_peek();
					res.concurrently = true;
				}
```
## Q5
我是说实现先插入向量到database的对应维度的向量表 然后再增量构建hnsw
因为写入数据是一个快过程 而构建hnsw是一个慢的过程
## SurrealDB 向量插入与HNSW异步构建分离机制
这个 codemap 详细展示了 SurrealDB 如何通过 CONCURRENTLY 关键字和 IndexBuilder 组件实现向量数据插入与 HNSW 索引构建的分离。关键流程包括：异步索引构建启动 [1c]、IndexBuilder 任务管理 [2c]、文档消费机制 [3a]、增量队列管理 [4c]、两阶段构建流程 [5b]，以及 HNSW 向量插入 [6b]。这种设计实现了快速数据写入和后台慢速索引构建的解耦。
### 1. 使用 CONCURRENTLY 关键字启动异步索引构建
展示如何通过 SQL 语法触发异步索引构建，实现数据插入与索引构建的分离
### 1a. CONCURRENTLY 关键字处理 (`index.rs:166`)
在 SQL 解析中识别 CONCURRENTLY 关键字
```text
if self.concurrently {
			write!(f, " CONCURRENTLY")?
		}
```
### 1b. 启动索引构建流程 (`index.rs:138`)
根据 concurrently 参数决定是否异步构建索引
```text
run_indexing(stk, ctx, opt, doc, &index_def, !self.concurrently).await?;
```
### 1c. 调用 IndexBuilder (`index.rs:210`)
将索引构建任务交给 IndexBuilder 处理
```text
let rcv = ctx
			.get_index_builder()
			.ok_or_else(|| Error::unreachable("No Index Builder"))?
			.build(ctx, opt.clone(), ns, db, index.clone().into(), _blocking)?;
```
### 2. IndexBuilder 异步构建机制
展示 IndexBuilder 如何管理后台索引构建任务，处理增量数据
### 2a. 构建方法入口 (`index.rs:186`)
IndexBuilder 的主要构建接口
```text
pub(crate) fn build(
		&self,
		ctx: &Context,
		opt: Options,
		ns: NamespaceId,
		db: DatabaseId,
		ix: Arc<IndexDefinition>,
		blocking: bool,
	) -> Result<Option<Receiver<Result<()>>>> {
```
### 2b. 启动构建任务 (`index.rs:211`)
创建后台构建任务
```text
let ib = self.start_building(ctx, opt, ns, db, ix, sdr)?;
```
### 2c. 异步任务执行 (`index.rs:172`)
在后台任务中执行索引构建
```text
let jh = task::spawn(async move {
			let r = b.run().await;
			if let Err(err) = &r {
				b.set_status(BuildingStatus::Error(err.to_string())).await;
			}
			if let Some(s) = sdr {
				if s.send(r).is_err() {
					warn!("Failed to send index building result to the consumer");
				}
			}
		});
```
### 3. 文档索引时的消费机制
展示文档插入时如何被 IndexBuilder 消费，实现增量构建
### 3a. 检查 IndexBuilder 状态 (`index.rs:101`)
文档索引时检查是否有活跃的索引构建过程
```text
let (o, n) = if let Some(ib) = ctx.get_index_builder() {
			match ib.consume(db, ctx, ix, o, n, rid).await? {
				// The index builder consumed the value, which means it is currently building the
				// index asynchronously, we don't index the document and let the index builder
				// do it later.
				ConsumeResult::Enqueued => return Ok(()),
				// The index builder is done, the index has been built; we can proceed normally
				ConsumeResult::Ignored(o, n) => (o, n),
			}
		} else {
			(o, n)
		};
```
### 3b. 消费文档变更 (`index.rs:223`)
IndexBuilder 消费文档变更的入口方法
```text
pub(crate) async fn consume(
		&self,
		db: &DatabaseDefinition,
		ctx: &Context,
		ix: &IndexDefinition,
		old_values: Option<Vec<Value>>,
		new_values: Option<Vec<Value>>,
		rid: &RecordId,
	) -> Result<ConsumeResult> {
```
### 3c. 查找活跃构建任务 (`index.rs:233`)
查找对应的活跃索引构建任务
```text
if let Some(r) = self.indexes.get(&key) {
			let (b, _) = r.value();
			return b.maybe_consume(ctx, old_values, new_values, rid).await;
		}
```
### 4. 增量数据队列管理
展示如何在索引构建期间管理增量数据的队列
### 4a. 消费决策逻辑 (`index.rs:369`)
决定是否将文档加入队列或直接索引
```text
async fn maybe_consume(
		&self,
		ctx: &Context,
		old_values: Option<Vec<Value>>,
		new_values: Option<Vec<Value>>,
		rid: &RecordId,
	) -> Result<ConsumeResult> {
```
### 4b. 检查构建状态 (`index.rs:379`)
如果索引已构建完成且队列为空，直接处理文档
```text
if queue.is_empty() {
			// If the appending queue is empty and the index is built...
			if self.status.read().await.is_ready() {
				// ... we return the values back, so the document can be updated the usual way
				return Ok(ConsumeResult::Ignored(old_values, new_values));
			}
		}
```
### 4c. 加入增量队列 (`index.rs:388`)
将文档变更存储到增量队列中
```text
let a = Appending {
			old_values,
			new_values,
			id: rid.key.clone(),
		};
		// Get the idx of this appended record from the sequence
		let idx = queue.add_update();
		// Store the appending
		let ia = self.ikb.new_ia_key(idx);
		tx.set(&ia, &a, None).await?;
```
### 5. HNSW 索引的两阶段构建
展示 HNSW 索引如何先处理初始数据，再处理增量更新
### 5a. 开始构建流程 (`index.rs:419`)
清理旧索引数据，开始构建过程
```text
async fn run(&self) -> Result<()> {
		// Remove the index data
		{
			self.set_status(BuildingStatus::Cleaning).await;
```
### 5b. 初始数据索引 (`index.rs:432`)
第一阶段：索引表中所有现有数据
```text
// First iteration, we index every key
		let beg = thing::prefix(self.ns, self.db, self.ikb.table())?;
		let end = thing::suffix(self.ns, self.db, self.ikb.table())?;
```
### 5c. 增量数据处理 (`index.rs:472`)
第二阶段：处理构建期间的增量变更
```text
// Second iteration, we index/remove any records that has been added or removed
		// since the initial indexing
```
### 6. HNSW 向量插入机制
展示 HNSW 索引如何同时更新向量表和图结构
### 6a. HNSW 文档索引 (`index.rs:91`)
HNSW 索引的文档索引入口
```text
pub async fn index_document(
		&mut self,
		tx: &Transaction,
		id: &RecordIdKey,
		content: &[Value],
	) -> Result<()> {
```
### 6b. 插入向量数据 (`index.rs:107`)
同时更新向量表和 HNSW 图结构
```text
self.vec_docs.insert(tx, vector, doc_id, &mut self.hnsw).await?;
```
### 6c. 构建 HNSW 图 (`docs.rs:188`)
在 HNSW 图中插入新向量节点
```text
None => {
				//  We don't have the vector, we insert it in the graph
				let element_id = h.insert(tx, o).await?;
```