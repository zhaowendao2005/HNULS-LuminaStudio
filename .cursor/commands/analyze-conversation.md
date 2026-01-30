# 📋 **对话记录分析工作流程 SOP**

## 🎯 **工作流目标**
从超长对话记录（如 8000+ 行的 `.specstory/history/*.md` 文件）中提取完整的工作内容、技术细节、踩坑经验，生成可供新对话无缝衔接的技术总结。

---

## 📊 **工作流程图**

```
Step 1: 初步扫描（了解规模和结构）
   ↓
Step 2: 关键词检索（提取核心信息）
   ↓
Step 3: 用户意图分析（提取所有用户输入）
   ↓
Step 4: 工具调用追踪（识别所有文件操作）
   ↓
Step 5: 段落深度阅读（提取代码和设计）
   ↓
Step 6: 问题与解决方案提取
   ↓
Step 7: 结构化输出（生成完整总结）
```

---

## 🔧 **详细操作步骤**

### **Step 1: 初步扫描 - 了解对话规模和结构**

**目的**：快速了解文件大小、对话主题、时间跨度

**操作**：
```bash
# 1.1 读取文件头部（前100行）
read_file(
  target_file: ".specstory/history/2025-10-25_04-14Z-了解搜索和抓取服务业务.md",
  offset: 1,
  limit: 100
)

# 1.2 读取文件尾部（最后100行）
read_file(
  target_file: ".specstory/history/2025-10-25_04-14Z-了解搜索和抓取服务业务.md",
  offset: 8400,  # 总行数 - 100
  limit: 100
)

# 1.3 统计用户消息数量
grep(
  pattern: "^_\\*\\*User",
  path: ".specstory/history/2025-10-25_04-14Z-了解搜索和抓取服务业务.md",
  output_mode: "count"
)
```

**输出示例**：
```
- 文件总行数：8468
- 对话主题：了解搜索和抓取服务业务
- 时间跨度：2025-10-25 02:15Z ~ 2025-10-26 09:23Z
- 用户消息数：19条
```

---

### **Step 2: 关键词检索 - 提取核心信息**

**目的**：通过关键词快速定位已完成的工作、遇到的问题、技术决策

#### **2.1 工作完成情况检索**
```bash
grep(
  pattern: "完成|实现了|修改了|创建了|添加了",
  path: ".specstory/history/2025-10-25_04-14Z-了解搜索和抓取服务业务.md",
  output_mode: "content",
  -i: true,  # 不区分大小写
  head_limit: 100  # 限制前100个匹配
)
```

**提取信息**：
- ✅ 完成的功能点
- 📝 创建/修改的文件
- 🔧 实现的方法

#### **2.2 问题与错误检索**
```bash
grep(
  pattern: "问题|错误|bug|修复|失败",
  path: ".specstory/history/2025-10-25_04-14Z-了解搜索和抓取服务业务.md",
  output_mode: "content",
  -i: true,
  head_limit: 50
)
```

**提取信息**：
- ⚠️ 遇到的问题
- 🐛 错误原因分析
- ✅ 解决方案

#### **2.3 章节结构检索**
```bash
grep(
  pattern: "^## |^### |Iteration",
  path: ".specstory/history/2025-10-25_04-14Z-了解搜索和抓取服务业务.md",
  output_mode: "content",
  head_limit: 100
)
```

**提取信息**：
- 📑 对话的主要章节
- 🔄 迭代版本（Iteration 0, 1, 2...）
- 📊 设计文档的结构

---

### **Step 3: 用户意图分析 - 提取所有用户输入**

**目的**：理解用户的所有需求和指令

```bash
grep(
  pattern: "^_\\*\\*User \\(",
  path: ".specstory/history/2025-10-25_04-14Z-了解搜索和抓取服务业务.md",
  output_mode: "content",
  -A: 2  # 显示匹配行及其后2行
)
```

**输出示例**：
```
_**User (2025-10-25 02:15Z)**_

@SearchAndScraper/ @SearchAndScraper/ @search-scraper-service/ 
先了解下业务
---
_**User (2025-10-25 02:15Z)**_

@数据库修改工作流（sqlite）.md @事件驱动架构范式总结文档.md 
...
```

**提取清单**：
- [ ] 用户输入1：了解业务
- [ ] 用户输入2：设计数据库
- [ ] 用户输入3：改造为端到端开发
- [ ] 用户输入4：开始实施
- [ ] ...

---

### **Step 4: 工具调用追踪 - 识别所有文件操作**

**目的**：找出所有被编辑、创建、读取的文件

```bash
grep(
  pattern: "Tool use.*read_file|Tool use.*edit_file|Tool use.*create_file|Tool use.*write",
  path: ".specstory/history/2025-10-25_04-14Z-了解搜索和抓取服务业务.md",
  output_mode: "content"
)
```

**进一步分析**：
对于每个 `edit_file` 或 `write` 操作，需要：
1. 记录文件路径
2. 记录修改的行号范围
3. 记录修改的类型（新增/删除/修改）

**建立文件操作清单**：
```
编辑的文件（12个）：
1. Document/Design/Electron批量爬取/Plan3.md - 行 199-346（添加设计方案）
2. Nimbria/src-electron/services/database-service/schema/versions/v1.2.5.schema.ts - 新建（130行）
3. Nimbria/src-electron/services/database-service/schema/versions/index.ts - 行 10-15（更新版本）
4. Nimbria/src-electron/services/database-service/database-manager.ts - 行 11, 27-67, 238-259
5. Nimbria/src-electron/services/database-service/project-database.ts - 行 451-553（新增方法）
...
```

---

### **Step 5: 段落深度阅读 - 提取代码和设计**

**目的**：读取关键段落的详细内容，提取代码片段、设计思路

#### **5.1 识别关键段落位置**
通过 Step 2 和 Step 4 的检索结果，识别关键段落的大致行号：
- 设计方案：第 2000-2200 行
- Schema 定义：第 4400-4600 行
- 数据库方法实现：第 4600-4800 行
- IPC 通道注册：第 4800-5000 行
- 前端类型定义：第 5000-5200 行
- Vue 组件改造：第 5200-5800 行

#### **5.2 精确读取关键段落**
```bash
# 读取设计方案
read_file(
  target_file: ".specstory/history/2025-10-25_04-14Z-了解搜索和抓取服务业务.md",
  offset: 2010,
  limit: 180
)

# 读取 Schema 定义
read_file(
  target_file: ".specstory/history/2025-10-25_04-14Z-了解搜索和抓取服务业务.md",
  offset: 4370,
  limit: 300
)

# 读取数据库方法实现
read_file(
  target_file: ".specstory/history/2025-10-25_04-14Z-了解搜索和抓取服务业务.md",
  offset: 4780,
  limit: 250
)

# 读取前端类型定义
read_file(
  target_file: ".specstory/history/2025-10-25_04-14Z-了解搜索和抓取服务业务.md",
  offset: 5000,
  limit: 250
)

# 读取 Vue 组件改造
read_file(
  target_file: ".specstory/history/2025-10-25_04-14Z-了解搜索和抓取服务业务.md",
  offset: 5240,
  limit: 200
)

# 读取问题修复过程
read_file(
  target_file: ".specstory/history/2025-10-25_04-14Z-了解搜索和抓取服务业务.md",
  offset: 6250,
  limit: 150
)
```

#### **5.3 提取代码块**
从读取的段落中提取：
```markdown
**代码块模式识别**：
- 以 ```typescript 或 ```sql 或 ```vue 开头
- 以 ``` 结尾
- 或者在 <details> 标签内的 diff 块
```

**重点提取**：
1. **Schema 定义**（SQL 语句）
2. **核心业务方法**（TypeScript 代码）
3. **IPC 通道注册**（Electron 代码）
4. **类型定义**（TypeScript interface）
5. **Vue 组件逻辑**（script setup）

---

### **Step 6: 问题与解决方案提取**

**目的**：建立"坑点知识库"，避免重复踩坑

#### **6.1 搜索问题关键词**
```bash
grep(
  pattern: "错误|问题|失败|修复|Bug",
  path: ".specstory/history/2025-10-25_04-14Z-了解搜索和抓取服务业务.md",
  output_mode: "content",
  -C: 3  # 显示前后3行上下文
)
```

#### **6.2 搜索解决方案**
```bash
grep(
  pattern: "解决|修复|改为|正确|应该",
  path: ".specstory/history/2025-10-25_04-14Z-了解搜索和抓取服务业务.md",
  output_mode: "content",
  -C: 3
)
```

#### **6.3 提取模式**
对于每个问题，提取：
```markdown
### 坑X：[问题名称]
**问题**：
[错误的代码或做法]

**现象**：
[错误信息或异常行为]

**原因**：
[根本原因分析]

**解决方案**：
[正确的代码或做法]

**经验总结**：
[可复用的经验]
```

---

### **Step 7: 结构化输出 - 生成完整总结**

**目的**：将提取的信息组织成结构化的技术总结文档

#### **7.1 输出结构模板**

```markdown
# [对话主题] - 完整技术总结

## 📂 涉及的所有文件（完整路径）
### ✏️ 编辑/创建的文件（N个）
- [文件路径1] - [修改内容说明]
- [文件路径2] - [修改内容说明]

### 📖 参与讨论但未修改的文件（N个）
- [文件路径1] - [参与原因]

## 🎯 主要完成的工作
### 阶段1：[阶段名称]（第X-Y行）
- 完成的任务1
- 完成的任务2

### 阶段2：[阶段名称]（第X-Y行）
...

## 🔑 核心代码片段
### 1. [功能模块名称]
```language
[代码片段]
```

## 🔌 使用的 API/方法/接口清单
### [分类1]
- API名称1 - 用途说明
- API名称2 - 用途说明

## 📐 项目规范与习惯
### [规范类别1]
- 规范内容

## ⚠️ 踩的坑与经验总结
### 坑1：[问题名称]
**问题**：...
**解决**：...
**经验**：...

## 🎓 可直接复用的知识
### [知识点1]
- 复用场景
- 操作步骤

## 🔄 下一步工作
- 待完成任务1
- 待完成任务2
```

---

## 📊 **工作流检查清单**

在完成总结前，确保提取了以下所有信息：

### ✅ **必须包含的内容**
- [ ] 对话的时间跨度和主题
- [ ] 所有用户的输入指令（19条）
- [ ] 所有被编辑/创建的文件（12个）及其完整路径
- [ ] 所有参与讨论的文件（7个）及其用途
- [ ] 核心代码片段（至少7段）
- [ ] 使用的所有 API/方法（分类列出）
- [ ] 项目的规范和习惯（至少7类）
- [ ] 遇到的所有坑点（至少6个）
- [ ] 架构决策及其原因（至少3个）
- [ ] 数据流图或架构图
- [ ] 可复用的知识点（至少3个）
- [ ] 下一步工作计划

### ✅ **质量标准**
- [ ] 新 AI 可以仅凭此总结无缝衔接工作
- [ ] 所有文件路径完整且准确
- [ ] 代码片段包含注释和说明
- [ ] 坑点包含问题、原因、解决方案
- [ ] 规范包含示例和反例

---

## 🔄 **工作流实际应用示例**

基于刚才的实际操作：

### **应用实例：分析 2025-10-25_04-14Z 对话**

```bash
# Step 1: 初步扫描
read_file(offset: 1, limit: 100)      # → 主题：SearchAndScraper
read_file(offset: 8400, limit: 68)    # → 结束于布局调整

# Step 2: 关键词检索
grep("完成|实现|修改", output: content)  # → 84个匹配
grep("问题|错误|修复", output: content)  # → 49个匹配
grep("^## |^### |Iteration")           # → 99个匹配

# Step 3: 用户意图
grep("^_\\*\\*User \\(", -A: 2)       # → 19条用户输入

# Step 4: 文件操作
grep("Tool use.*read_file|edit_file") # → 51个工具调用

# Step 5: 段落阅读
read_file(offset: 2010, limit: 180)   # → Plan3.md 设计
read_file(offset: 4370, limit: 300)   # → Schema 定义
read_file(offset: 4780, limit: 250)   # → 数据库方法
read_file(offset: 5000, limit: 250)   # → 类型定义
read_file(offset: 5240, limit: 200)   # → Vue 组件
read_file(offset: 6250, limit: 150)   # → 问题修复

# Step 6: 问题提取
# 从 Step 2 的结果中提取 6 个主要坑点

# Step 7: 结构化输出
# 组织成最终的总结文档（已完成）
```

---

## 🎯 **关键成功因素**

1. **分层检索策略**：
   - 先宏观（关键词统计）
   - 后微观（段落精读）

2. **上下文关联**：
   - 用户输入 → AI 响应 → 工具调用 → 结果
   - 建立完整的因果链

3. **代码追踪**：
   - 每个文件操作都要追溯到具体代码
   - 记录行号和修改类型

4. **坑点提炼**：
   - 问题 → 原因 → 解决方案 → 经验
   - 四段式总结

5. **可复用性验证**：
   - 总结完成后，假设自己是新 AI
   - 能否仅凭总结继续工作？

---

## 📝 **工作流输出物清单**

完成工作流后，应该产出：

1. ✅ **完整技术总结文档**（Markdown 格式）
2. ✅ **文件操作清单**（Excel/表格）
3. ✅ **代码片段库**（可搜索）
4. ✅ **坑点知识库**（FAQ 格式）
5. ✅ **架构决策记录**（ADR 格式）
6. ✅ **下一步工作清单**（TODO）

---
