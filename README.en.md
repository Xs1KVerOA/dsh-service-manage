# dsh-service-manage

`dsh-service-manage` is a static DeepSeek Harness plugin that adds service management below the workspace sidebar and provides `@` server references in conversations.

## Features

- Supports FTP, SSH, Redis, MySQL, MariaDB, PostgreSQL, SQL Server, Elasticsearch, Docker, MongoDB, Cassandra, and S3-compatible services such as MinIO and R2.
- Uses Node.js SDKs directly. It does not call system CLIs or spawn external command processes.
- Supports password authentication, SSH private keys, and S3 Access Key/Secret Key/Session Token credentials.
- Supports SSH tunneling, raw TCP forwarding, and SOCKS5 proxying.
- Supports `auto`, `legacy`, and `modern` compatibility modes, plus optional API/client version settings.
- SSH provides SFTP listing, downloads, uploads, and a persistent remote terminal.
- Data services provide connection tests, queries, reads, and writes; Docker provides container/image operations; S3 provides bucket/object operations.
- Type `@` in a conversation to search saved connections. Selecting a candidate inserts a reference that is serialized with non-secret server metadata.

## Installation

Requires Node.js `>=22.19.0` and DeepSeek Harness `0.1.0-rc.6` or newer.

### Install from GitHub

```sh
npx @deepseek-ai/dsh plugin --profile web add --allow-build=ssh2 --allow-build=cpu-features --allow-build=protobufjs https://github.com/Xs1KVerOA/dsh-service-manage.git
npx @deepseek-ai/dsh --profile web --dump-config
npx @deepseek-ai/dsh web
```

The `--allow-build` flags explicitly approve the `ssh2`, `cpu-features`, and `protobufjs` dependency scripts for the current DSH/pnpm profile installer. If a machine has no C/C++ toolchain, SSH falls back to its pure-JavaScript implementation; the optional native binding is not required for the basic feature set.

### Install from a local checkout

```sh
git clone https://github.com/Xs1KVerOA/dsh-service-manage.git
cd dsh-service-manage
npm install
npx @deepseek-ai/dsh plugin --profile web add --allow-build=ssh2 --allow-build=cpu-features --allow-build=protobufjs "$PWD"
npx @deepseek-ai/dsh web
```

The package is an installable static bundle. `cordis.patch.yml` registers the plugin entry, and no dynamic Cordis Runner is required. Runtime dependencies, including `@deepseek-ai/dsh-tools`, are declared in `dependencies`, so cloning from GitHub and running `npm install` produces the same runtime dependency set as the development checkout. The patch can also be used as an absolute-path overlay.

### Install from dsh.so

After approval and registry publication, the recommended installation is by package name:

```sh
npx @deepseek-ai/dsh plugin --profile web add --allow-build=ssh2 --allow-build=cpu-features --allow-build=protobufjs dsh-service-manage
npx @deepseek-ai/dsh web
```

### Install a release tarball

Run `npm run pack:release` in the repository root to generate `dsh-service-manage-0.3.1.tgz`, then install it into a profile:

```sh
npx @deepseek-ai/dsh plugin --profile web add --allow-build=ssh2 --allow-build=cpu-features --allow-build=protobufjs ./dsh-service-manage-0.3.1.tgz
```

## Compatibility and implementation

- The Host side uses Node.js SDKs; the browser side declares Sidebar and `@` input-trigger dependencies through `dsh.client.inject`.
- `cordis.patch.yml` registers the bundle with the stable plugin ID `dsh-service-manage`.
- Compatibility modes adjust protocol/API parameters for the selected service; the plugin does not copy service clients into the Harness Host.
- DSH `cordis`, `credentials`, `fs`, and client capabilities are declared as peer dependencies to match the Harness runtime; the Node SDKs and `@deepseek-ai/dsh-tools` required by this plugin are declared as runtime dependencies so GitHub installs do not depend on a local Harness checkout.

## Usage

1. Open **Service Management** below the workspace sidebar.
2. Create a connection with its name, service type, host, port, authentication, compatibility mode, and proxy settings.
3. Save the connection and use **Test connection** before performing reads or writes.
4. Type `@` in a conversation and choose a server from the `server` candidate group. For ASCII-safe names, typing `@server-name` followed by a space also confirms the reference.

For names containing spaces or non-ASCII characters, the candidate uses a safe server ID as the input alias. A submitted reference looks like this:

```xml
<dsh-server-ref id="srv_xxx" name="Production database" alias="prod-db" type="mysql" transport="service-manager" tool="dsh_server_manage" credential-scope="dsh-credentials" endpoint="db.example.com:3306" database="app" />
```

References contain only connection metadata such as ID, name, alias, type, endpoint, database, and transport. Passwords, private keys, and cloud credentials are never included. The model should call `dsh_server_manage` for a reference; the plugin resolves secrets through the DSH credentials service and uses the managed Node SDK, SSH/TCP, or SOCKS5 channel. A guard rejects attempts to bypass the service manager through `bash/pwsh`, `sshpass`, database CLIs, or local credential files.

## Node SDKs

| Service | SDK |
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
| S3-compatible services | `@aws-sdk/client-s3` |
| SOCKS5 proxying | `socks` |

## Data and security

- Non-sensitive connection metadata is stored in `.dsh-servers.json` in the current workspace.
- Passwords, private keys, and cloud credentials are stored through the Harness `credentials` service rather than the connection file.
- The server-list endpoint exposes only whether a secret is configured, never the secret value.
- `/api/dsh-service-manage` accepts loopback requests only and is not exposed to the LAN.
- SSH, SOCKS5, and TCP forwarding tunnels are owned by the plugin lifecycle and are closed when the plugin or terminal is disposed.
- Writes, deletes, SQL/CQL, remote commands, and container start/stop operations can have real side effects. Use the plugin only with authorized services.

## FAQ

### The `@` candidate list is empty

Save at least one connection in **Service Management**, then focus the conversation input again. For names containing spaces or non-ASCII characters, choose the safe ID from the candidate menu; ASCII-safe names can be confirmed by typing `@name` followed by a space.

### The sidebar entry is missing after installation

Make sure the package is installed as `dsh-service-manage` and restart the relevant `dsh web` profile. The client bundle depends on the Sidebar and input-trigger capabilities; a profile missing those capabilities cannot provide the complete UI.

### A connection fails

Start with **Test connection**, then check host/port, credentials, TLS, compatibility mode, and proxy/jump-host settings. Passwords and private keys are never written to `.dsh-servers.json`.

## Development and validation

```sh
npm install
npm run check
npm pack --dry-run
```

`index.js` contains the Host-side Node SDK implementation. `client.js` contains the static Web UI and the `@` input-trigger source. The `dsh.client.inject` declaration in `package.json` declares the Sidebar and input-trigger dependencies.

## License

MIT. See [LICENSE](LICENSE).
