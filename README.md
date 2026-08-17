# dsh-service-manage

DeepSeek Harness 静态服务管理插件。它通过 Node.js SDK 管理远程服务，并在会话中提供 `@` 服务器引用。

Static service-management plugin for DeepSeek Harness. It uses Node.js SDKs for remote services and provides `@` server references in conversations.

## 快速安装 / Quick install

直接从 GitHub 安装到 Web profile：

```sh
npx @deepseek-ai/dsh plugin --profile web add --allow-build=ssh2 --allow-build=cpu-features --allow-build=protobufjs https://github.com/Xs1KVerOA/dsh-service-manage.git
npx @deepseek-ai/dsh --profile web --dump-config
npx @deepseek-ai/dsh web
```

The `--allow-build` flags are required by the current DSH/pnpm profile installer for the `ssh2`, `cpu-features`, and `protobufjs` dependency scripts. The SSH implementation has a pure-JavaScript fallback when optional native bindings cannot be built.

从 GitHub 下载后本地安装：

```sh
git clone https://github.com/Xs1KVerOA/dsh-service-manage.git
cd dsh-service-manage
npm install
npx @deepseek-ai/dsh plugin --profile web add --allow-build=ssh2 --allow-build=cpu-features --allow-build=protobufjs "$PWD"
npx @deepseek-ai/dsh web
```

需要 Node.js `>=22.19.0` 和 DeepSeek Harness `0.1.0-rc.6` 或更高版本。插件的运行时依赖（包括 `@deepseek-ai/dsh-tools`）已写入 `dependencies`，不会依赖本机 Harness 源码目录。

Requires Node.js `>=22.19.0` and DeepSeek Harness `0.1.0-rc.6` or newer. Runtime dependencies, including `@deepseek-ai/dsh-tools`, are declared in `dependencies`, so the plugin does not rely on a local Harness checkout.

## 功能 / Features

- FTP、SSH、Redis、MySQL、MariaDB、PostgreSQL、SQL Server、Elasticsearch、Docker、MongoDB、Cassandra 和 S3/MinIO/R2。
- 密码、SSH 私钥、S3 Access Key/Secret Key，以及 SSH/TCP/SOCKS5 代理。
- SSH SFTP 文件上传下载和远程终端。
- 会话中使用 `@` 引用服务器；模型通过 `dsh_server_manage` 调用服务管理通道，不读取本机 SSH 配置或凭据文件。

See [简体中文](README.zh-CN.md) or [English](README.en.md) for the full feature, security, operations, and release-package documentation.

## Release package

```sh
npm install
npm run check
npm run pack:release
```

The generated `dsh-service-manage-<version>.tgz` can be installed into a profile:

```sh
npx @deepseek-ai/dsh plugin --profile web add --allow-build=ssh2 --allow-build=cpu-features --allow-build=protobufjs ./dsh-service-manage-0.3.1.tgz
```

插件使用 Node SDK，不调用系统 CLI；连接密钥由 Harness `credentials` 服务管理。

The plugin uses Node SDKs instead of system CLIs. Connection secrets are managed by the Harness `credentials` service.
