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

### 从 GitHub 安装

```sh
dsh plugin --profile demo add https://github.com/Xs1KVerOA/dsh-service-manage.git
dsh --profile demo --dump-config
dsh web --profile demo
```

### 从本地目录安装

```sh
dsh plugin --profile demo add /Users/xinyu.ke/Desktop/dsh/static-plugin
dsh --profile demo --dump-config
dsh web --profile demo
```

插件是可安装的静态 bundle，入口由 `cordis.patch.yml` 注册，不依赖动态 Cordis Runner。也可以将该 patch 文件作为绝对路径 overlay 使用。

### 从 dsh.so 安装

审核通过并进入 registry 后，推荐使用包名安装：

```sh
dsh plugin --profile web add dsh-service-manage
dsh web
```

## 兼容性与实现

- Host 侧使用 Node.js SDK，前端侧通过 `dsh.client.inject` 接入 Sidebar 和 `@` 输入触发器。
- `cordis.patch.yml` 使用稳定插件 ID `dsh-service-manage` 注册 bundle。
- 兼容模式只影响对应服务的协议/API 参数，不会把一个服务的客户端库复制到 Harness Host 中。
- DSH 核心依赖通过 `peerDependencies` 声明，避免重复加载 Cordis 或客户端单例。

## 使用方式

1. 打开工作区下方的“服务管理”。
2. 新建连接，填写名称、服务类型、地址、端口、认证方式、兼容模式和代理配置。
3. 保存后使用“测试连接”确认配置，再执行对应服务的读取或写入操作。
4. 在会话输入框键入 `@`，从 `server` 候选分组选择服务器；ASCII 名称也可以输入 `@服务器名` 后按空格确认。

服务器名称包含中文或空格时，候选项会使用安全 ID 作为可输入别名。提交会话时引用形如：

```xml
<dsh-server-ref id="srv_xxx" name="生产数据库" type="mysql" endpoint="db.example.com:3306" database="app" />
```

引用只包含连接 ID、名称、类型、地址、端口、数据库和兼容/代理模式等元数据，不包含密码、私钥或云密钥。引用本身不会自动执行远程写入、删除或命令；这些操作仍需在服务管理界面中明确触发。

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
node --check index.js
node --check client.js
npm pack --dry-run
```

插件由 `index.js` 提供 Host 侧 Node SDK 逻辑，由 `client.js` 提供静态 Web UI 和 `@` 输入触发器。`package.json` 中的 `dsh.client.inject` 声明了 Sidebar 和输入触发器依赖。

## License

MIT，见 [LICENSE](LICENSE)。
