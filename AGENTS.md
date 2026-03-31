# 本项目使用electron+vue+pnpm架构，辅以eslint、ts-types-check
# 优先第一批需要加载的内容和需要做的事情
优先使用ide内置工具、其次选择mcp、推荐使用ripgrep mcp 尽量减少内置工具或者filesystem读取全代码的此时尽可能降低成本、了解项目时也尽量优先锁定落点然后精准读取

## 扫一遍skills列表看看有什么是需要加载的
D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\.agents\skills
每次必须加载的:project overview(大致项目概况和指南) 与 ripgrep-mcp Analyst skills（高效分析mcp使用说明）

## 写代码前看一眼eslint规则和eslint补丁
D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\eslint.config.mjs
D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\scripts\eslint\orchestraflow-plugin.mjs

## 多用别名，我们的别名配置位置
D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\tsconfig.node.json
D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\tsconfig.web.json
D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\vitest.orchestraflow.config.ts

## 一轮任务完成了后记得使用eslint和tscheck进行扫尾

