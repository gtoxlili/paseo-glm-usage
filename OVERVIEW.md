GLM Coding Plan usage adds the plan's quota to Paseo's Usage screen. It shows the 5-hour window, the weekly window on plans that have one, and the monthly MCP call allowance. Each row has a percent used and a reset time, and the 5-hour and weekly windows also show in the usage summary. An opencode agent on a `zhipuai-coding-plan/` or `zai-coding-plan/` model also shows the card when you tap its context meter.

The plugin calls the plan's quota endpoint with your own API key. That endpoint covers plan quota only. A pay-as-you-go balance has no endpoint, so it is not shown. Paseo's built-in Z.ai source reports subscription status without any windows, so with an international key you may see both cards.

## Setup

Paseo 0.11.0 or later. The plugin takes the API key from the first of these that exists.

1. A key command in `glm-usage.json`, in the Paseo home directory. Paseo runs it without a shell and reads the key from its output. For 1Password that is `["op", "read", "op://Private/GLM/credential"]`.
2. An environment variable in the Paseo daemon. open.bigmodel.cn uses `ZHIPU_API_KEY`, `ZHIPUAI_API_KEY` or `BIGMODEL_API_KEY`. api.z.ai uses `Z_AI_API_KEY` or `ZAI_API_KEY`.

With neither, no card appears. The key has to belong to a Coding Plan. With any other key, the card shows the endpoint's message that the account has no plan.

`glm-usage.json` is optional and has two fields. `region` is `"cn"` for open.bigmodel.cn, the default, or `"global"` for api.z.ai. `keyCommand` is the command array from the first option. Reload the plugin after editing the file.

## Data and limits

The key goes only to the quota endpoint of the chosen region, as a bearer token, on each refresh. The plugin stores nothing and has no screen of its own, because Paseo draws the card. The key command runs with the daemon's permissions, like all plugin server code.

The quota endpoint is not in the vendor's API reference, so its response can change without notice. This plugin is independent of Zhipu AI and Z.ai.
