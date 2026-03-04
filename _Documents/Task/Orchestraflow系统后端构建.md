# 需求和架构
1. 组织结构LuminaStudio\src\utility 仿照现有的lanmgchian-client子线程的组织架构（这里指的是与主进程两侧双向调用的结构和handle、以及内部业务放在一些列serviece里面。
2. 业务需求
   1. 主进程侧LuminaStudio\src\main\services\orchestraflows侧负责从前端的全局状态、渲染进程组件本地状态、后端ipc里面收集参数和数据，对齐shared里面的类型定义来调用子进程的handle来发送任务
   2. 子进程暴露handle给主进程来用于接受调用，之后内部分几个域，首先是一个实例工厂，根据参数创建一个实例来运行orchestraflow工作流；其次是每个节点对应的后端服务、这里我们写一个basenode 提供基本服务 然后来写其他的节点对应的服务 一个节点一个目录
   3. 使用logger并将异常情况（包括很多不应该是空的一些）转发主进程以便于调试
   4. 支持多个工作流同时运行 上限不能低 这个你需要研究架构问题
   5. 考虑到这个是工作流，你需要像主进程转发执行到什么节点的进度、以及为主进程分出这是哪个工作流的哪个实例的进度提供支持基础
3. 其他你需要了解的：
   1. LuminaStudio\src\Public\ShareTypes\Orchestraflow-types 这个是公共类型定义目录
   2. LuminaStudio\src\renderer\src\stores\orchestraflow前端全局状态 这里是会传入后端的参数
   3. LuminaStudio\src\renderer\src\views\LuminaApp\Maincontent\OrchestraFlowView 前端组件
4. 需要完成的目标（必须完成且可以在前端运行直接调试）
   1. 补齐当前最小化mvp 即在完成开始-llm-结束工作流的调试
      1. 大致需要做的 替换掉前端状态里面的一些mock还有相关的一些本地状态
      2. 补齐前端相关组件的ipc调用替换todo
      3. 其他需要完成才可以正确的完成端到端测试验证全功能