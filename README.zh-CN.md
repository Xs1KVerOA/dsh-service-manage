# dsh-service-manage

`dsh-service-manage` 是一个 DeepSeek Harness 静态插件，在工作区侧边栏下方提供服务管理入口，并为会话输入框提供 `@` 服务器引用。

## 功能

- 支持 FTP、SSH、Redis、MySQL、MariaDB、PostgreSQL、SQL Server、Elasticsearch、Docker、MongoDB、Cassandra、S3/MinIO/R2。
- 使用 Node.js SDK 连接服务，不调用系统 CLI，不启动外部命令进程。
- 支持密码、SSH 私钥、S3 Access Key/Secret Key/Session Token 等认证方式。
- 支持 SSH 隧道、TCP 原始转发和 SOCKS5 代理。
- 支持 `auto`、`legacy`、`modern` 兼容模式，以及可选 API/Client 版本配置。
- SSH 支持 SFTP 文件列表、下载、上传和持久化远程终端。
- 数据服务支持连接测试、查询、读取和写入等操作；Docker 支持容器和镜像管理；S3 支持 Bucket/Object 操作。
- 会话中输入 `@` 可从已保存连接中搜索服务器；选中候选项后，引用会以不含密钥的服务器元数据提交给模型。

## 安装

要求 Node.js `>=22.19.0`，以及 DeepSeek Harness `0.1.0-rc.6` 或更高版本。

### 从 GitHub 安装

```sh
npx @deepseek-ai/dsh plugin --profile web add --allow-build=ssh2 --allow-build=cpu-features --allow-build=protobufjs https://github.com/Xs1KVerOA/dsh-service-manage.git
npx @deepseek-ai/dsh --profile web --dump-config
npx @deepseek-ai/dsh web
```

命令中的 `--allow-build` 是当前 DSH/pnpm profile 安装器对 `ssh2`、`cpu-features` 和 `protobufjs` 安装脚本的显式批准；如果系统没有 C/C++ 编译工具，SSH 仍会使用纯 JavaScript fallback（可选 native binding 不影响基本功能）。

### 从本地目录安装

```sh
git clone https://github.com/Xs1KVerOA/dsh-service-manage.git
cd dsh-service-manage
npm install
npx @deepseek-ai/dsh plugin --profile web add --allow-build=ssh2 --allow-build=cpu-features --allow-build=protobufjs "$PWD"
npx @deepseek-ai/dsh web
```

插件是可安装的静态 bundle，入口由 `cordis.patch.yml` 注册，不依赖动态 Cordis Runner。运行时依赖（包括 `@deepseek-ai/dsh-tools`）已写入 `dependencies`，从 GitHub 下载后执行 `npm install` 即可获得与本机一致的运行时依赖。也可以将该 patch 文件作为绝对路径 overlay 使用。

### 从 dsh.so 安装

审核通过并进入 registry 后，推荐使用包名安装：

```sh
npx @deepseek-ai/dsh plugin --profile web add --allow-build=ssh2 --allow-build=cpu-features --allow-build=protobufjs dsh-service-manage
npx @deepseek-ai/dsh web
```

### 安装 release 包

在仓库根目录执行 `npm run pack:release` 生成 `dsh-service-manage-0.3.1.tgz`，然后安装到 profile：

```sh
npx @deepseek-ai/dsh plugin --profile web add --allow-build=ssh2 --allow-build=cpu-features --allow-build=protobufjs ./dsh-service-manage-0.3.1.tgz
```

## 兼容性与实现

- Host 侧使用 Node.js SDK，前端侧通过 `dsh.client.inject` 接入 Sidebar 和 `@` 输入触发器。
- `cordis.patch.yml` 使用稳定插件 ID `dsh-service-manage` 注册 bundle。
- 兼容模式只影响对应服务的协议/API 参数，不会把一个服务的客户端库复制到 Harness Host 中。
- DSH 的 `cordis`、`credentials`、`fs` 和客户端能力通过 `peerDependencies` 对齐 Harness 运行时；插件自身需要的 Node SDK 和 `@deepseek-ai/dsh-tools` 通过 `dependencies` 安装，避免从 GitHub 下载后出现模块缺失。

## 使用方式

1. 打开工作区下方的“服务管理”。
2. 新建连接，填写名称、服务类型、地址、端口、认证方式、兼容模式和代理配置。
3. 保存后使用“测试连接”确认配置，再执行对应服务的读取或写入操作。
4. 在会话输入框键入 `@`，从 `server` 候选分组选择服务器；ASCII 名称也可以输入 `@服务器名` 后按空格确认。

服务器名称包含中文或空格时，候选项会使用安全 ID 作为可输入别名。提交会话时引用形如：

```xml
<dsh-server-ref id="srv_xxx" name="生产数据库" alias="prod-db" type="mysql" transport="service-manager" tool="dsh_server_manage" credential-scope="dsh-credentials" endpoint="db.example.com:3306" database="app" />
```

引用只包含连接 ID、名称、别名、类型、地址、数据库和通道元数据，不包含密码、私钥或云密钥。模型收到引用后应调用 `dsh_server_manage`；该 Tool 在插件内部通过 DSH credentials service 解析密钥，并复用服务管理的 Node SDK、SSH/TCP/SOCKS5 通道。插件会拒绝模型通过 `bash/pwsh`、`sshpass`、数据库 CLI 或本机凭据文件绕过服务管理连接服务器。

## 支持的 Node SDK

| 服务 | SDK |
| --- | --- |
| SSH | `ssh2` |
| FTP | `basic-ftp` |
| Redis | `redis` |
| MySQL / MariaDB | `mysql2` |
| PostgreSQL | `pg` |
| SQL Server | `mssql` |
| Elasticsearch | `@elastic/elasticsearch` |
| Docker | `dockerode` |
| MongoDB | `mongodb` |
| Cassandra | `cassandra-driver` |
| S3 兼容服务 | `@aws-sdk/client-s3` |
| SOCKS5 代理 | `socks` |

## 数据与安全

- 非敏感连接元数据写入当前工作区的 `.dsh-servers.json`。
- 密码、私钥和云密钥通过 Harness `credentials` 服务保存，不写入连接配置文件。
- 服务器列表接口只返回密钥是否已配置，不返回密钥内容。
- `/api/dsh-service-manage` 仅接受本机回环请求，不向局域网开放。
- SSH、SOCKS5 和 TCP 转发隧道由插件生命周期管理；插件卸载时会关闭隧道和终端。
- 写入、删除、SQL/CQL、远程命令以及容器启停都可能产生真实副作用，请只对受授权的服务使用。

## 常见问题

### `@` 候选列表为空

先在“服务管理”中保存至少一个连接，再重新聚焦会话输入框。连接名称包含中文或空格时，请从候选菜单选择安全 ID；ASCII 名称可以输入 `@name` 后按空格确认。

### 安装后侧边栏没有入口

确认安装的是 `dsh-service-manage` 包名，并重启对应的 `dsh web` profile。客户端 bundle 依赖 Sidebar 和输入触发器，profile 缺少这些能力时插件不会提供完整 UI。

### 连接失败

先执行“测试连接”，再分别检查地址/端口、认证密钥、TLS、兼容模式和代理跳板机。插件不会把密码或私钥写入 `.dsh-servers.json`。

## 开发与验证

```sh
npm install
npm run check
npm pack --dry-run
```

插件由 `index.js` 提供 Host 侧 Node SDK 逻辑，由 `client.js` 提供静态 Web UI 和 `@` 输入触发器。`package.json` 中的 `dsh.client.inject` 声明了 Sidebar 和输入触发器依赖。

## License

MIT，见 [LICENSE](LICENSE)。
