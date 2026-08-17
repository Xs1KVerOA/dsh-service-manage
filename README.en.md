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

### Install from GitHub

```sh
dsh plugin --profile demo add https://github.com/Xs1KVerOA/dsh-service-manage.git
dsh --profile demo --dump-config
dsh web --profile demo
```

### Install from a local checkout

```sh
dsh plugin --profile demo add /Users/xinyu.ke/Desktop/dsh/static-plugin
dsh --profile demo --dump-config
dsh web --profile demo
```

The package is an installable static bundle. `cordis.patch.yml` registers the plugin entry, and no dynamic Cordis Runner is required. The patch can also be used as an absolute-path overlay.

### Install from dsh.so

After approval and registry publication, the recommended installation is by package name:

```sh
dsh plugin --profile web add dsh-service-manage
dsh web
```

## Compatibility and implementation

- The Host side uses Node.js SDKs; the browser side declares Sidebar and `@` input-trigger dependencies through `dsh.client.inject`.
- `cordis.patch.yml` registers the bundle with the stable plugin ID `dsh-service-manage`.
- Compatibility modes adjust protocol/API parameters for the selected service; the plugin does not copy service clients into the Harness Host.
- DSH core packages are declared as peer dependencies to avoid duplicate Cordis or client singletons.

## Usage

1. Open **Service Management** below the workspace sidebar.
2. Create a connection with its name, service type, host, port, authentication, compatibility mode, and proxy settings.
3. Save the connection and use **Test connection** before performing reads or writes.
4. Type `@` in a conversation and choose a server from the `server` candidate group. For ASCII-safe names, typing `@server-name` followed by a space also confirms the reference.

For names containing spaces or non-ASCII characters, the candidate uses a safe server ID as the input alias. A submitted reference looks like this:

```xml
<dsh-server-ref id="srv_xxx" name="Production database" type="mysql" endpoint="db.example.com:3306" database="app" />
```

References contain only connection metadata such as ID, name, type, endpoint, database, and compatibility/proxy mode. Passwords, private keys, and cloud credentials are never included. A reference does not automatically execute remote writes, deletes, or commands; those actions still require an explicit operation in the service-management UI.

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
node --check index.js
node --check client.js
npm pack --dry-run
```

`index.js` contains the Host-side Node SDK implementation. `client.js` contains the static Web UI and the `@` input-trigger source. The `dsh.client.inject` declaration in `package.json` declares the Sidebar and input-trigger dependencies.

## License

MIT. See [LICENSE](LICENSE).
