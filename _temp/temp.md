这个节点的核心用法很直接：它负责“取一个值 -> 按目标类型转换 -> 写成当前节点自己的输出变量”。

**怎么用**
1. 在工作流里新增“变量赋值”节点。
2. 打开面板，在“赋值规则”里添加一条或多条规则。
3. 每条规则先选来源模式：
   - `变量`：从上游节点或开始节点输入里选变量。
   - `常量`：直接填固定值。
4. 填 `目标变量名`，比如 `score_text`、`is_valid`、`profile_json`。
5. 选 `目标类型`：
   - `string`
   - `number`
   - `boolean`
   - `object`
   - `array`
6. 如果来源是对象里的字段，直接选对象后，在下面的 path 输入里补全，例如：
   - `profile.name`
   - `profile.stats.score`
   - `items.0.title`
7. 保存后看“输出预览”，这里就是后续节点可引用的变量。
   - 例如节点标题是 `assign`，目标变量名是 `score_text`
   - 下游引用一般就是 `assign.score_text`

**转换规则你可以这样记**
- `number -> string`：变成文本。
- `string -> number`：必须是合法数字。
- `string -> boolean`：`false/no/off/0/空串` 会变 `false`，其它非空一般是 `true`。
- `object/array -> string`：走 JSON stringify。
- `string -> object/array`：必须是合法 JSON。
- 不做“猜测式复杂转换”。比如整个 object 直接转 number，不支持。

**一个最简单的验证场景**
建议你做这个 3 节点链路：

1. `开始` 节点
   - 输入变量加一个 `profile`
   - 类型用 `object`
   - 调试时传：
   ```json
   {
     "stats": {
       "score": 27
     }
   }
   ```

2. `变量赋值` 节点
   - 规则 1：
     - 来源模式：`变量`
     - 来源变量：`profile`
     - path：`profile.stats.score`
     - 目标变量名：`score_text`
     - 目标类型：`string`

3. `结束` 节点
   - 输出变量引用：`assign.score_text`
   - 如果你把这个节点标题改了，比如改成 `score_mapper`，那就引用 `score_mapper.score_text`

**预期结果**
- 单节点 debug 这个赋值节点时，输出应是：
```json
{
  "score_text": "27"
}
```
- 整个工作流运行到结束节点时，最终结果应是：
```json
{
  "result": "27"
}
```
前提是你的 End 节点把 `result` 指到这个 selector。

**建议你按这个顺序做端到端测试**
1. 单节点 debug，先测变量来源。
   - 输入 `profile.stats.score = 27`
   - 期待输出 `score_text = "27"`

2. 单节点 debug，测常量来源。
   - 常量填 `123`
   - 目标类型 `number`
   - 期待输出是数字 `123`

3. 单节点 debug，测 JSON 转 object。
   - 常量填 `{"name":"Lumina"}`
   - 目标类型 `object`
   - 期待输出是 object，不是字符串

4. 单节点 debug，测 object -> string。
   - 来源给 object
   - 目标类型 `string`
   - 期待输出是 JSON 字符串

5. 单节点 debug，测失败路径。
   - 常量填 `abc`
   - 目标类型 `number`
   - 期待节点失败
   - 且不应写出部分成功结果

6. 工作流端到端。
   - `开始 -> 变量赋值 -> 结束`
   - 最终输出正确
   - tracing 里能看到“变量赋值节点”

7. 改节点标题再验证一次。
   - 比如从 `assign` 改成 `score_mapper`
   - 下游 selector 应同步到新命名空间
   - 结果仍然正确

**想把这个功能测干净，至少覆盖这几类**
- primitive 转换：`string/number/boolean`
- `string <-> object/array`
- 对象字段读取
- 数组索引读取
- 多规则同时写出
- 原子失败：一条失败，全节点失败
- 标题改名后的下游引用同步
- 单节点 debug
- 工作流 run + tracing 展示

如果你愿意，我下一步可以直接给你写一份“最小可执行测试工作流配置清单”，你照着在 UI 里点一遍就能完整验收。