GLM 套餐用量把 GLM Coding Plan 的额度放进 Paseo 的用量页。它显示 5 小时窗口、有周限额的套餐的周窗口，以及月度 MCP 调用额度。每一行有已用百分比和重置时间，5 小时窗口和周窗口也会出现在用量摘要里。插件也会报告 opencode 里用 `zhipuai-coding-plan/` 或 `zai-coding-plan/` 模型的 agent 对应的账号，点这个 agent 的上下文环时会出现这张卡片。Paseo 目前只对 OpenCode 1.x 的会话查询这一项，OpenCode 2.x 的会话在上下文环里还不显示套餐用量。

插件用你自己的 API 密钥请求套餐的额度接口。这个接口只覆盖套餐额度，按量计费的余额没有接口，所以不显示。Paseo 内置的 Z.ai 来源只报订阅状态，没有额度窗口，用国际站密钥时可能同时看到两张卡片。

## 设置

需要 Paseo 0.11.0 或更高版本。插件按下面两种来源找 API 密钥，先找到的先用。

1. Paseo 主目录下 `glm-usage.json` 里的取密钥命令。Paseo 不经过 shell 直接执行它，从输出里读密钥。用 1Password 时可以写成 `["op", "read", "op://Private/GLM/credential"]`。
2. Paseo 守护进程的环境变量。open.bigmodel.cn 用 `ZHIPU_API_KEY`、`ZHIPUAI_API_KEY` 或 `BIGMODEL_API_KEY`，api.z.ai 用 `Z_AI_API_KEY` 或 `ZAI_API_KEY`。

两种都没有时不显示卡片。密钥必须属于 Coding Plan，换成别的密钥，卡片上会显示接口返回的提示，内容是账号没有套餐。

`glm-usage.json` 可以不建，里面有两个字段。`region` 为 `"cn"` 时用 open.bigmodel.cn（默认），为 `"global"` 时用 api.z.ai。`keyCommand` 是第一种来源里的命令数组。改完文件后重新加载插件。

## 数据与限制

密钥只会发往所选区域的额度接口，作为 bearer token，每次刷新发一次。插件不保存任何东西，也没有自己的界面，卡片由 Paseo 绘制。取密钥命令以守护进程的权限运行，和所有插件的服务端代码一样。

额度接口不在厂商的 API 文档里，返回格式可能不经通知就变。本插件是独立项目，与智谱 AI 和 Z.ai 没有关联。
