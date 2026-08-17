# dsh-service-manage

DeepSeek Harness 静态服务管理插件，基于 Node.js SDK 接入常用远程服务，并在会话中支持使用 `@` 引用已保存服务器。

Static service-management plugin for DeepSeek Harness. It connects to common remote services through Node.js SDKs and supports `@` server references in conversations.

## 文档 / Documentation

- [简体中文](README.zh-CN.md)
- [English](README.en.md)

## 快速开始 / Quick start

```sh
dsh plugin --profile demo add https://github.com/Xs1KVerOA/dsh-service-manage.git
dsh --profile demo --dump-config
dsh web --profile demo
```

插件使用 Node SDK，不调用系统 CLI；连接密钥由 Harness `credentials` 服务管理。

The plugin uses Node SDKs instead of system CLIs. Connection secrets are managed by the Harness `credentials` service.
