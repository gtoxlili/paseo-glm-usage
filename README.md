# paseo-glm-usage

A Paseo plugin that shows GLM Coding Plan quota in the Usage screen. [OVERVIEW.md](OVERVIEW.md) describes what it shows and how it finds your API key. [中文说明](OVERVIEW.zh-CN.md).

## Install

```sh
paseo plugin add git:gtoxlili/paseo-glm-usage
```

Needs Paseo 0.11.0 or later. Third-party plugins only run when the Paseo config has `"pluginsEnabled": true`. Run `paseo reload` after changing it.

## Key command

To keep the key in a password manager, create `glm-usage.json` in the Paseo home directory (`~/.paseo`, or `$PASEO_HOME`). Paseo runs the command without a shell and reads the key from stdout.

```json
{
  "region": "cn",
  "keyCommand": ["op", "read", "op://Private/GLM/credential"]
}
```

`region` is `"cn"` (open.bigmodel.cn, the default) or `"global"` (api.z.ai). Without the file, the plugin reads the key from an environment variable of the Paseo daemon, as listed in the overview.

## Development

```sh
npm install
npm run typecheck
```

The plugin has no build step. `mapQuota` in `server/usage.ts` turns the quota response into the report Paseo draws.
