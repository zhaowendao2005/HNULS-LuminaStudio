# agent系统规划和设计

## 三级配置和数据

- 助手：包含助手级别的若干配置 比如是否开启流式、 助手级系统提示词 、单agent最大推理深度（这里指的是agent在哪里ReAct的次数 用于防止死循环之类的、切换次数计费模型优化（先放在这边）、最大递归层级（我们允许0级主agent派发子agent处理任务 子agent也允许派发他的子agent 所以需要设置最大递归层级）、默认模型、上下文记忆轮数（用户输入和模型输出为一轮）
- action列表开关以及模式控制：action是agent响应性功能，其提示词分几个层次：功能描述提示词，简要介绍能干嘛；json schema用来指导如何调用;skills 来讲解agent应该如何使用，其中json schema是保证llm格式化输出可以被程序识别的json，skills用于规范llm应当如何进行决策 偏向于使用
  开关决定了书否要将功能描述提示词注入到action功能描述、模式有两个 fast和slow，fast模式就是直接将这个action的json schema和skills直接注入进action schema 和skills，slow模式则是使用调用action功能查询action来获取json schema和skills（见下面描述）
- action列表分组（分割线分组即可） 系统action functioncall mcp 其中系统action全部强制打开并fast（mcp先占位 这个我们先不做）
- 附带：助手id
  - topic级（话题级）包含所有助手级别的配置 他的模式是不定义就直接继承助手的、
  - 附带topic id
    - 对话级：用户提示词、agent模版选择（目前仅带有一个main agent 模版）、程序控制的提示词注入
    - 附带：对话id



---

## workflow

用户发送一条消息，将topic的配置和对话的配置，历史记忆收集上下文按照配置的轮数来收集上下文内容，提交给任务队列（后端sqlite数据库）

等待被处理和执行

异步的执行器提供handle通过id来查询会话内容
执行器默认并发20（先写死） 初始化步骤：将进行中状态的任务状态改falied（即将因为程序中断的任务标失败）
日常运行：监控任务队列的任务 按照顺序将未开始的任务状态切换为进行中 然后按照选择的agent模版来创建一个实例，实例的所有信息记录到这个任务对应的数据库表里面，查询handle根据id来查询这个实例实时的输出情况，需要设计一个方案来做到流式的读取这个内容）

实例将下面的模版调用模型发出，然后接受回复，回复包括正常回复以及异常恢复（提供商哪里传来的错误以及其他错误

```
main agent 模版：（<>内表示引用插入的内容、<>.......<>表示插入这个里面的内容 这些是写给你看到的 程序和这个无关
<上下文>
<action功能描述>
<action schema和skills>
<action 执行结果 首次无>
<模版格式控制提示词（我这边主要传达意思，具体的来）>

回复内容遵循下面的格式
区域1：api的返回的一些比如thinking啊这些
区域2：对用户的回答，为md格式  主要为准备做什么或者直接回答问题 不允许空回
区域3：决策是否需要执行action，是的话填写下面的区域4，否的话不需要
区域4：acction区，为json schema和skills写出调用的所有的action 同一个action允许使用不同的输入调用多次

<模版控制提示词>
```

流式接受llm回复的内容 区域3如果是true 即提取action的指令然后去调用action，等待并收集action结果然后更新模版并再次调用llm
注意 我特殊说明action返回内容塞进action在执行结果区

## 首批actions

### 系统actions

1. action schema和skills获取

   1. 设计schema和skills
   2. 传入指定的action 返回其schema和skills

2. 派发子agent

   1. 设计schma和skills

   2. 其功能是派发·一个子agent 来执行器任务  子agent拥有独立的上下文；上级在schema填写给子agent的命令、action开关和模式（控制非system） 程序根据这些内容来构造subagent模版调用模型发出，允许subagent派发子agebnt 这个受到上面的最大递归层数控制。同时子agent允许react多少次 （可以粗浅认为是调用模型多少次）子agent的子agent不算）也收到上面参数控制

      ```
      sub agent 模版：（<>内表示引用插入的内容、<>.......<>表示插入这个里面的内容 这些是写给你看到的 程序和这个无关
      <上下文>
      <action功能描述>
      <action schema和skills>
      <action 执行结果 首次无>
      <模版格式控制提示词（我这边主要传达意思，具体的来）>
      
      回复内容遵循下面的格式
      区域1：api的返回的一些比如thinking啊这些
      区域2：对用户的回答，为md格式  主要为准备做什么或者直接回答问题，或者是对于上轮action的总结和思考 不允许空回
      区域3：决策是否需要执行action，是的话填写下面的区域4，否的话不需要
      区域4：acction区，为json schema和skills写出调用的所有的action 同一个action允许使用不同的输入调用多次
      
      <模版控制提示词>
      ```

## function calls

1. pubmed检索 functioncall 根据目前的ipc类进行设计 给出其功能描述 schema和skills（最佳实践以及思维链等等）



### ps

特别的 action的skills它不仅针对1轮 而且需要包含多轮的决策影响甚至知道开sybagent来集中思考以及规范subagent思维链的功能

## 收尾程序

无论是0级agent还是子agent llm调用action是为了借助外部资源来解决问题的，所以无论如何都需要有一个结果 
如果一切正常 那么就是在区域2里面进行总结 如果不正常 那么也必须进行总结 这部分分为资源收集不足出发react上限（达线强制总览当前收集的资料进行回答）  action工具出错 则是反馈遇到的问题 其他的情况你主动列举并给出方案



## 错误处理

对于模型调用错误或者提供商返回的错误 需要清洗的给出 能继续运行就继续运行 但是错误不可以被吃掉







