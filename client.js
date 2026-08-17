(function registerDshServerManager(global) {
  const loader = global.__ModuleLoader__
  if (!loader || typeof loader.load !== 'function') throw new Error('dsh-service-manage: client module loader is unavailable')

  loader.load({
    id: 'dsh-service-manage',
    factory(require) {
      const React = require('react')
      const h = React.createElement
      const { useEffect, useMemo, useState } = React

      const TYPE_META = {
        ssh: { label: 'SSH', icon: '🔑', port: 22, secret: ['password', 'privateKey'] },
        ftp: { label: 'FTP', icon: '📁', port: 21, secret: ['password'] },
        redis: { label: 'Redis', icon: '🔺', port: 6379, secret: ['password'] },
        mysql: { label: 'MySQL', icon: '🐬', port: 3306, secret: ['password'] },
        mariadb: { label: 'MariaDB', icon: '🦭', port: 3306, secret: ['password'] },
        postgresql: { label: 'PostgreSQL', icon: '🐘', port: 5432, secret: ['password'] },
        mssql: { label: 'SQL Server', icon: '🧱', port: 1433, secret: ['password'] },
        elasticsearch: { label: 'Elasticsearch', icon: '🔎', port: 9200, secret: ['password'] },
        docker: { label: 'Docker', icon: '🐳', port: 0, secret: [] },
        mongodb: { label: 'MongoDB', icon: '🍃', port: 27017, secret: ['password'] },
        cassandra: { label: 'Cassandra', icon: '🛰️', port: 9042, secret: ['password'] },
        s3: { label: 'S3 / MinIO / R2', icon: '🪣', port: 0, secret: ['accessKey', 'secretKey', 'token'] },
      }

      const OP_META = {
        ssh: ['test', 'listFiles', 'downloadFile', 'uploadFile', 'terminal'],
        ftp: ['test', 'listFiles', 'readFile', 'writeFile', 'deleteFile'],
        redis: ['test', 'info', 'listKeys', 'getKey', 'setKey', 'delKey', 'query'],
        mysql: ['test', 'listDatabases', 'listTables', 'query'],
        mariadb: ['test', 'listDatabases', 'listTables', 'query'],
        postgresql: ['test', 'listDatabases', 'listTables', 'query'],
        mssql: ['test', 'listDatabases', 'listTables', 'query'],
        elasticsearch: ['test', 'listIndices', 'query'],
        docker: ['test', 'listContainers', 'listImages', 'logs', 'start', 'stop', 'exec', 'query'],
        mongodb: ['test', 'listDatabases', 'listCollections', 'find', 'query'],
        cassandra: ['test', 'listKeyspaces', 'listTables', 'query'],
        s3: ['test', 'listBuckets', 'listObjects', 'readObject', 'writeObject', 'deleteObject'],
      }

      const OP_LABEL = {
        test: '测试连接', listFiles: '列出文件', readFile: '读取文件', writeFile: '写入文件', downloadFile: '下载文件', uploadFile: '上传文件', terminal: '远程终端', deleteFile: '删除文件',
        info: '服务器信息', listKeys: '扫描 Key', getKey: '读取 Key', setKey: '写入 Key', delKey: '删除 Key', query: '执行查询',
        listDatabases: '列出数据库', listTables: '列出表', listIndices: '列出索引', listContainers: '列出容器',
        listImages: '列出镜像', logs: '读取日志', start: '启动容器', stop: '停止容器', exec: '容器执行',
        listCollections: '列出集合', find: '查询集合', listKeyspaces: '列出 Keyspace', listBuckets: '列出 Bucket',
        listObjects: '列出对象', readObject: '读取对象', writeObject: '写入对象', deleteObject: '删除对象',
      }

      const SECRET_LABEL = {
        password: '密码', privateKey: '私钥 PEM', accessKey: 'Access Key', secretKey: 'Secret Key', token: 'Session Token',
        proxyPassword: '代理密码', proxyKey: '跳板机私钥 PEM',
      }

      const CSS = `
.dsm-action{display:flex;align-items:center;gap:8px;width:100%;padding:7px 10px;border:0;border-radius:8px;background:transparent;color:inherit;cursor:pointer;font:inherit;text-align:left}
.dsm-action:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.14))}.dsm-action-icon{width:20px;text-align:center}.dsm-action-label{font-size:12.5px;color:#e9483d;font-weight:600}
.dsm-backdrop{position:fixed;inset:0;z-index:3000;background:rgba(0,0,0,.45);display:flex;align-items:stretch;justify-content:flex-end}
.dsm-panel{width:min(940px,94vw);height:100%;display:flex;flex-direction:column;background:var(--dsw-specific-sidebar-fill,#17191e);color:var(--dsw-alias-label-primary,#e8e8e8);box-shadow:-8px 0 36px rgba(0,0,0,.42)}
.dsm-head{display:flex;align-items:center;gap:10px;padding:13px 17px;border-bottom:1px solid rgba(128,128,128,.22);flex:0 0 auto}.dsm-title{font-weight:650;font-size:15px;flex:1}.dsm-sub{font-size:11px;opacity:.55}.dsm-btn{border:1px solid rgba(128,128,128,.30);background:var(--dsw-alias-button-secondary-fill,rgba(128,128,128,.12));color:inherit;border-radius:7px;padding:6px 11px;cursor:pointer;font:inherit;font-size:12px}.dsm-btn:hover{background:rgba(128,128,128,.22)}.dsm-btn.primary{background:#e9483d;border-color:#e9483d;color:white}.dsm-btn.danger{color:#ff9b96;border-color:rgba(255,100,90,.45)}.dsm-btn:disabled{opacity:.45;cursor:default}
.dsm-body{display:flex;min-height:0;flex:1}.dsm-list{width:270px;min-width:220px;border-right:1px solid rgba(128,128,128,.2);padding:10px;overflow:auto}.dsm-main{flex:1;min-width:0;overflow:auto;padding:15px 18px}.dsm-card{display:flex;align-items:center;gap:9px;width:100%;padding:9px;margin-bottom:7px;border:1px solid transparent;border-radius:9px;background:rgba(128,128,128,.08);color:inherit;cursor:pointer;text-align:left}.dsm-card:hover,.dsm-card.active{background:rgba(128,128,128,.16);border-color:rgba(128,128,128,.25)}.dsm-card-icon{width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:rgba(233,72,61,.15);font-size:16px}.dsm-card-copy{min-width:0;flex:1}.dsm-card-name{font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dsm-card-meta{font-size:10.5px;opacity:.55;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dsm-dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:5px;background:#44c878}.dsm-dot.bad{background:#ee6a62}
.dsm-empty{padding:28px 12px;text-align:center;opacity:.55;font-size:12px}.dsm-error{color:#ff918b;background:rgba(255,80,70,.1);padding:8px 10px;border-radius:7px;font-size:12px;margin-bottom:10px;white-space:pre-wrap}.dsm-section{font-size:11px;letter-spacing:.04em;text-transform:uppercase;opacity:.58;font-weight:650;margin:17px 0 9px}.dsm-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 12px}.dsm-field{min-width:0}.dsm-field.wide{grid-column:1/-1}.dsm-label{display:block;font-size:11px;opacity:.67;margin-bottom:4px}.dsm-input,.dsm-select,.dsm-textarea{width:100%;box-sizing:border-box;padding:7px 9px;border:1px solid rgba(128,128,128,.3);border-radius:7px;background:rgba(128,128,128,.09);color:inherit;font:inherit;font-size:12px}.dsm-textarea{min-height:92px;resize:vertical;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.dsm-input:focus,.dsm-select:focus,.dsm-textarea:focus{outline:none;border-color:#e9483d}.dsm-help{font-size:10px;opacity:.48;margin-top:4px;line-height:1.35}.dsm-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:17px}.dsm-operation{border-top:1px solid rgba(128,128,128,.2);margin-top:17px;padding-top:4px}.dsm-result{margin-top:13px;min-height:140px;padding:11px;border-radius:8px;background:rgba(0,0,0,.14);overflow:auto}.dsm-terminal-wrap{margin-top:13px}.dsm-terminal-output{height:300px;overflow:auto;margin:0 0 8px;padding:11px;border-radius:8px;background:#0b0d10;color:#d8e2d4;white-space:pre-wrap;word-break:break-word;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace}.dsm-terminal-input{min-height:58px}.dsm-pre{margin:0;white-space:pre-wrap;word-break:break-word;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace}.dsm-table{border-collapse:collapse;width:100%;font-size:11px}.dsm-table th,.dsm-table td{border:1px solid rgba(128,128,128,.22);padding:5px 7px;text-align:left;vertical-align:top;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dsm-table th{position:sticky;top:0;background:#202228}.dsm-close{border:0;background:transparent;color:inherit;opacity:.7;cursor:pointer;font-size:17px;padding:3px 7px}.dsm-close:hover{opacity:1}
@media(max-width:700px){.dsm-body{display:block;overflow:auto}.dsm-list{width:auto;border-right:0;border-bottom:1px solid rgba(128,128,128,.2);max-height:220px}.dsm-main{padding:12px}.dsm-grid{grid-template-columns:1fr}.dsm-panel{width:100%}}
`

      function installStyle() {
        if (typeof document === 'undefined' || document.querySelector('style[data-dsh-service-manage]')) return
        const style = document.createElement('style')
        style.dataset.dshServiceManage = 'true'
        style.textContent = CSS
        document.head.appendChild(style)
      }

      function apiRequest(body, signal) {
        return fetch('/api/dsh-service-manage', {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal,
        }).then(async response => {
          const payload = await response.json().catch(() => ({}))
          if (!response.ok || payload.ok === false) throw new Error(payload.error || `HTTP ${response.status}`)
          return payload
        })
      }

      function typeLabel(type) { return TYPE_META[type]?.label || type }
      function clone(value) { return JSON.parse(JSON.stringify(value)) }

      const serverByAlias = new Map()
      const serverById = new Map()
      const serverLexiconListeners = new Set()
      let serverCatalogPromise = null
      let serverCatalogExpiresAt = 0

      function serverAlias(connection) {
        const name = String(connection.name || '').trim()
        const base = /^[A-Za-z0-9_-]+$/.test(name) ? name : String(connection.id)
        const existing = serverByAlias.get(base)
        return existing && String(existing.id) !== String(connection.id) ? `${base}_${connection.id}` : base
      }

      function escapeXml(value) {
        return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character])
      }

      function cacheServers(connections) {
        serverByAlias.clear()
        serverById.clear()
        for (const connection of connections || []) {
          const alias = serverAlias(connection)
          const item = { ...connection, alias }
          serverByAlias.set(alias, item)
          serverById.set(String(connection.id), item)
        }
        for (const listener of serverLexiconListeners) listener()
        return [...serverByAlias.values()]
      }

      function refreshServers(force = false) {
        if (!force && Date.now() < serverCatalogExpiresAt) return Promise.resolve([...serverByAlias.values()])
        if (serverCatalogPromise) return serverCatalogPromise
        serverCatalogPromise = apiRequest({ op: 'list' }).then(payload => {
          serverCatalogExpiresAt = Date.now() + 3000
          return cacheServers(payload.connections || [])
        }).finally(() => { serverCatalogPromise = null })
        return serverCatalogPromise
      }

      function serverReferenceMarkup(connection) {
        const endpoint = connection.host ? `${connection.host}${connection.port ? ':' + connection.port : ''}` : '本机'
        return `<dsh-server-ref id="${escapeXml(connection.id)}" name="${escapeXml(connection.name)}" alias="${escapeXml(connection.alias || serverAlias(connection))}" type="${escapeXml(connection.type)}" endpoint="${escapeXml(endpoint)}" database="${escapeXml(connection.database || '')}" />`
      }

      function createServerInputSource() {
        const source = {
          trigger: '@',
          name: 'server',
          order: 10,
          async candidates(_session, { query, signal }) {
            const servers = await refreshServers()
            if (signal.aborted) return []
            const needle = String(query || '').toLowerCase()
            return servers
              .filter(connection => connection.alias.toLowerCase().startsWith(needle) || String(connection.name || '').toLowerCase().includes(needle))
              .map(connection => ({
                name: connection.alias,
                description: `${connection.name} · ${typeLabel(connection.type)} · ${connection.host || '本机'}${connection.port ? ':' + connection.port : ''}`,
                icon: TYPE_META[connection.type]?.icon || '🔌',
                hint: connection.type,
              }))
          },
          warm() { void refreshServers().catch(() => {}) },
          lexicon() { return serverByAlias.size ? [...serverByAlias.keys()] : undefined },
          subscribeLexicon(_session, listener) {
            serverLexiconListeners.add(listener)
            return () => serverLexiconListeners.delete(listener)
          },
          matchSpace(_session, token) {
            const connection = serverByAlias.get(String(token).slice(1))
            if (!connection) return undefined
            return { insert: { source: 'server', ref: String(connection.id), label: connection.name, clipboardText: `@${connection.alias}` } }
          },
          onPick({ candidate }) {
            const connection = serverByAlias.get(candidate.name)
            if (!connection) return undefined
            return { insert: { source: 'server', ref: String(connection.id), label: connection.name, clipboardText: `@${connection.alias}` } }
          },
          codec: {
            clipboardText(ref) {
              const connection = serverById.get(String(ref))
              return `@${connection?.alias || ref}`
            },
            async serialize(ref, signal) {
              const payload = await apiRequest({ op: 'reference', id: String(ref) }, signal)
              const connection = { ...payload.connection, alias: serverAlias(payload.connection) }
              serverByAlias.set(connection.alias, connection)
              serverById.set(String(connection.id), connection)
              return serverReferenceMarkup(connection)
            },
          },
        }
        return source
      }

      function downloadBase64(base64, filename) {
        if (typeof document === 'undefined' || typeof atob !== 'function') return
        const raw = atob(base64 || '')
        const bytes = Uint8Array.from(raw, character => character.charCodeAt(0))
        const blob = new Blob([bytes], { type: 'application/octet-stream' })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = filename || 'download.bin'
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        setTimeout(() => URL.revokeObjectURL(url), 0)
      }
      function blankConnection(type = 'ssh') {
        const meta = TYPE_META[type]
        return { id: '', name: '', type, host: '', port: meta.port, username: '', database: '', authMode: 'password', options: { compatibility: 'auto', apiVersion: '', ssl: false, scheme: type === 's3' ? 'https' : 'http', proxy: { type: 'none' } } }
      }

      function Field({ label, value, onChange, wide, type = 'text', placeholder, help }) {
        return h('div', { className: 'dsm-field' + (wide ? ' wide' : '') },
          h('label', { className: 'dsm-label' }, label),
          h('input', { className: 'dsm-input', type, value: value == null ? '' : value, placeholder, onChange: event => onChange(event.target.value) }),
          help ? h('div', { className: 'dsm-help' }, help) : null,
        )
      }

      function SecretField({ label, value, onChange, wide, multiline }) {
        const common = { className: multiline ? 'dsm-textarea' : 'dsm-input', value: value || '', placeholder: '已保存时留空表示保持不变', onChange: event => onChange(event.target.value) }
        return h('div', { className: 'dsm-field' + (wide ? ' wide' : '') }, h('label', { className: 'dsm-label' }, label), multiline ? h('textarea', common) : h('input', { ...common, type: 'password' }))
      }

      function ProxyFields({ proxy, setProxy, secrets, setSecret, touched, touch }) {
        const type = proxy?.type || 'none'
        return h(React.Fragment, null,
          h('div', { className: 'dsm-grid' },
            h('div', { className: 'dsm-field' }, h('label', { className: 'dsm-label' }, '代理模式'), h('select', { className: 'dsm-select', value: type, onChange: event => setProxy({ type: event.target.value }) },
              h('option', { value: 'none' }, '不使用代理'), h('option', { value: 'ssh' }, 'SSH 隧道'), h('option', { value: 'tcp' }, 'TCP 原始转发'), h('option', { value: 'socks5' }, 'SOCKS5 转发'),
            )),
            type !== 'none' ? h(Field, { label: type === 'ssh' ? '跳板机地址' : '代理地址', value: proxy.host || '', onChange: value => setProxy({ ...proxy, host: value }), placeholder: '127.0.0.1' }) : null,
            type !== 'none' ? h(Field, { label: '代理端口', value: proxy.port || '', onChange: value => setProxy({ ...proxy, port: value }), type: 'number' }) : null,
            type === 'ssh' ? h(Field, { label: '跳板机用户', value: proxy.username || '', onChange: value => setProxy({ ...proxy, username: value }), placeholder: 'root' }) : null,
            type === 'socks5' ? h(Field, { label: 'SOCKS5 用户名', value: proxy.username || '', onChange: value => setProxy({ ...proxy, username: value }) }) : null,
            (type === 'ssh' || type === 'socks5') ? h(SecretField, { label: type === 'ssh' ? '跳板机密码' : '代理密码', value: secrets.proxyPassword, onChange: value => { touch('proxyPassword'); setSecret('proxyPassword', value) } }) : null,
            type === 'ssh' ? h(SecretField, { label: '跳板机私钥', value: secrets.proxyKey, onChange: value => { touch('proxyKey'); setSecret('proxyKey', value) }, wide: true, multiline: true }) : null,
          ),
        )
      }

      function ConnectionForm({ value, onCancel, onSaved, api }) {
        const [form, setForm] = useState(() => clone(value))
        const [secrets, setSecrets] = useState({})
        const [touched, setTouched] = useState({})
        const [error, setError] = useState('')
        const [busy, setBusy] = useState(false)
        const type = form.type
        const meta = TYPE_META[type]
        const set = (key, next) => setForm(current => ({ ...current, [key]: next }))
        const setOption = (key, next) => setForm(current => ({ ...current, options: { ...(current.options || {}), [key]: next } }))
        const setProxy = proxy => setOption('proxy', proxy)
        const touch = key => setTouched(current => ({ ...current, [key]: true }))
        const setSecret = (key, next) => setSecrets(current => ({ ...current, [key]: next }))
        const changeType = next => {
          const nextMeta = TYPE_META[next]
          setForm(current => ({ ...current, type: next, port: nextMeta.port, database: next === 's3' ? '' : current.database }))
        }
        const save = () => {
          setBusy(true); setError('')
          const selectedSecrets = {}
          for (const key of Object.keys(touched)) if (touched[key]) selectedSecrets[key] = secrets[key] || ''
          api({ op: 'save', connection: form, secrets: selectedSecrets }).then(result => { onSaved(result.connection) }).catch(error => setError(error.message)).finally(() => setBusy(false))
        }
        return h(React.Fragment, null,
          h('div', { className: 'dsm-title' }, value.id ? '编辑连接' : '新建连接'),
          error ? h('div', { className: 'dsm-error' }, error) : null,
          h('div', { className: 'dsm-section' }, '基本信息'),
          h('div', { className: 'dsm-grid' },
            h(Field, { label: '连接名称', value: form.name, onChange: value => set('name', value), placeholder: '例如：生产 Redis' }),
            h('div', { className: 'dsm-field' }, h('label', { className: 'dsm-label' }, '服务类型'), h('select', { className: 'dsm-select', value: type, onChange: event => changeType(event.target.value) }, Object.entries(TYPE_META).map(([key, item]) => h('option', { key, value: key }, item.label)))),
            h(Field, { label: '服务器地址', value: form.host, onChange: value => set('host', value), placeholder: type === 'docker' ? '留空使用本机 Docker' : 'db.example.com' }),
            h(Field, { label: '端口', value: form.port, onChange: value => set('port', value), type: 'number', help: type === 'docker' || type === 's3' ? '可为 0；S3 也可使用 endpoint' : '' }),
            type !== 's3' && type !== 'docker' ? h(Field, { label: '用户名', value: form.username, onChange: value => set('username', value) }) : null,
            type !== 's3' && type !== 'docker' ? h(Field, { label: '数据库 / Keyspace', value: form.database, onChange: value => set('database', value) }) : null,
          ),
          h('div', { className: 'dsm-section' }, '认证密钥'),
          h('div', { className: 'dsm-grid' },
            h('div', { className: 'dsm-field' }, h('label', { className: 'dsm-label' }, '连接方式'), h('select', { className: 'dsm-select', value: form.authMode || 'password', onChange: event => set('authMode', event.target.value) }, h('option', { value: 'password' }, '密码 / Access Key'), h('option', { value: 'key' }, '私钥 / Key'))),
            meta.secret.includes('password') ? h(SecretField, { label: '密码', value: secrets.password, onChange: value => { touch('password'); setSecret('password', value) } }) : null,
            type === 'ssh' ? h(SecretField, { label: 'SSH 私钥 PEM', value: secrets.privateKey, onChange: value => { touch('privateKey'); setSecret('privateKey', value) }, wide: true, multiline: true }) : null,
            type === 's3' ? h(SecretField, { label: 'Access Key', value: secrets.accessKey, onChange: value => { touch('accessKey'); setSecret('accessKey', value) } }) : null,
            type === 's3' ? h(SecretField, { label: 'Secret Key', value: secrets.secretKey, onChange: value => { touch('secretKey'); setSecret('secretKey', value) } }) : null,
            type === 's3' ? h(SecretField, { label: 'Session Token', value: secrets.token, onChange: value => { touch('token'); setSecret('token', value) } }) : null,
          ),
          h('div', { className: 'dsm-section' }, '连接选项与版本兼容'),
          h('div', { className: 'dsm-grid' },
            h('div', { className: 'dsm-field' }, h('label', { className: 'dsm-label' }, '兼容模式'), h('select', { className: 'dsm-select', value: form.options?.compatibility || 'auto', onChange: event => setOption('compatibility', event.target.value) }, h('option', { value: 'auto' }, '自动'), h('option', { value: 'legacy' }, '旧版客户端 / API'), h('option', { value: 'modern' }, '新版客户端 / API'))),
            h(Field, { label: 'API / Client 版本（可选）', value: form.options?.apiVersion || '', onChange: value => setOption('apiVersion', value), placeholder: '例如：7、8、1.43' }),
            type === 'elasticsearch' ? h('div', { className: 'dsm-field' }, h('label', { className: 'dsm-label' }, '协议'), h('select', { className: 'dsm-select', value: form.options?.scheme || 'http', onChange: event => setOption('scheme', event.target.value) }, h('option', { value: 'http' }, 'HTTP'), h('option', { value: 'https' }, 'HTTPS'))) : null,
            ['redis', 'mysql', 'mariadb', 'postgresql', 'mongodb'].includes(type) ? h('label', { className: 'dsm-label', style: { alignSelf: 'end', paddingBottom: 7 } }, h('input', { type: 'checkbox', checked: Boolean(form.options?.ssl), onChange: event => setOption('ssl', event.target.checked) }), ' 启用 TLS / SSL') : null,
            type === 's3' ? h(Field, { label: 'Endpoint（可选）', value: form.options?.endpoint || '', onChange: value => setOption('endpoint', value), placeholder: 'https://minio.example.com', wide: true }) : null,
            type === 's3' ? h(Field, { label: 'Region', value: form.options?.region || '', onChange: value => setOption('region', value), placeholder: 'us-east-1' }) : null,
            type === 's3' ? h(Field, { label: '默认 Bucket', value: form.options?.bucket || '', onChange: value => setOption('bucket', value) }) : null,
            type === 'docker' ? h(Field, { label: 'Docker Host / Context', value: form.options?.dockerHost || form.options?.context || '', onChange: value => setOption('dockerHost', value), placeholder: 'unix:///var/run/docker.sock' }) : null,
            type === 'mongodb' ? h(Field, { label: '认证数据库', value: form.options?.authDatabase || 'admin', onChange: value => setOption('authDatabase', value) }) : null,
            type === 'cassandra' ? h(Field, { label: 'Keyspace', value: form.options?.keyspace || '', onChange: value => setOption('keyspace', value) }) : null,
          ),
          h('div', { className: 'dsm-section' }, '代理模式'),
          h(ProxyFields, { proxy: form.options?.proxy, setProxy, secrets, setSecret, touched, touch }),
          h('div', { className: 'dsm-actions' }, h('button', { className: 'dsm-btn primary', disabled: busy, onClick: save }, busy ? '保存中…' : '保存连接'), h('button', { className: 'dsm-btn', onClick: onCancel }, '取消')),
        )
      }

      function Result({ value }) {
        if (!value) return h('div', { className: 'dsm-empty' }, '执行结果将在这里显示')
        if (!value.ok) return h('pre', { className: 'dsm-pre', style: { color: '#ff918b' } }, value.error || '操作失败')
        if (value.kind === 'table') {
          const rows = (value.rows || []).slice(0, 500)
          const columns = value.columns?.length ? value.columns : (rows[0] || []).map((_, index) => `col${index + 1}`)
          return h('table', { className: 'dsm-table' }, h('thead', null, h('tr', null, columns.map((column, index) => h('th', { key: index }, String(column))))), h('tbody', null, rows.map((row, rowIndex) => h('tr', { key: rowIndex }, row.map((cell, cellIndex) => h('td', { key: cellIndex }, cell == null ? '' : String(cell)))))))
        }
        if (value.kind === 'json') return h('pre', { className: 'dsm-pre' }, JSON.stringify(value.data, null, 2))
        if (value.kind === 'list') return h('pre', { className: 'dsm-pre' }, (value.items || []).join('\n'))
        return h('pre', { className: 'dsm-pre' }, value.text || '')
      }

      function OperationView({ connection, api, onBack }) {
        const [op, setOp] = useState('test')
        const [fields, setFields] = useState({ path: '/', key: '', bucket: connection.options?.bucket || '', collection: '', container: '', text: '', sql: '', cql: '', body: '', content: '', contentBase64: '', fileName: '', filter: '{}', method: 'GET', prefix: '' })
        const [result, setResult] = useState(null)
        const [busy, setBusy] = useState(false)
        const [terminalId, setTerminalId] = useState('')
        const [terminalText, setTerminalText] = useState('')
        const [terminalInput, setTerminalInput] = useState('')
        const [terminalBusy, setTerminalBusy] = useState(false)
        const set = (key, value) => setFields(current => ({ ...current, [key]: value }))
        const run = () => {
          setBusy(true); setResult(null)
          const params = { op, ...fields }
          api({ op: 'exec', id: connection.id, params }).then(setResult).catch(error => setResult({ ok: false, error: error.message })).finally(() => setBusy(false))
        }
        const appendTerminal = value => { if (value?.text) setTerminalText(current => current + value.text) }
        const terminalRequest = (operation, extra = {}) => api({ op: 'exec', id: connection.id, params: { op: operation, terminalId, ...extra } })
        const openTerminal = () => {
          setTerminalBusy(true)
          terminalRequest('terminalOpen', { terminalId: undefined }).then(value => { setTerminalId(value.terminalId || ''); setTerminalText(value.text || '') }).catch(error => setTerminalText(current => current + `\n[连接失败] ${error.message}\n`)).finally(() => setTerminalBusy(false))
        }
        const sendTerminal = () => {
          if (!terminalId || !terminalInput) return
          const data = terminalInput + '\n'
          setTerminalInput('')
          terminalRequest('terminalWrite', { data }).then(appendTerminal).catch(error => setTerminalText(current => current + `\n[发送失败] ${error.message}\n`))
        }
        const closeTerminal = () => {
          if (!terminalId) return
          const id = terminalId
          terminalRequest('terminalClose').catch(() => {}).finally(() => { if (id === terminalId) setTerminalId('') })
        }
        useEffect(() => {
          if (!terminalId) return undefined
          const timer = setInterval(() => terminalRequest('terminalRead').then(appendTerminal).catch(() => {}), 500)
          return () => clearInterval(timer)
        }, [terminalId])
        useEffect(() => () => { if (terminalId) api({ op: 'exec', id: connection.id, params: { op: 'terminalClose', terminalId } }).catch(() => {}) }, [connection.id, terminalId])
        const queryLabel = ['mysql', 'mariadb', 'postgresql', 'mssql'].includes(connection.type) ? 'SQL' : connection.type === 'cassandra' ? 'CQL' : connection.type === 'mongodb' ? 'JSON 操作' : connection.type === 'elasticsearch' ? 'JSON Body' : '命令 / 查询'
        const queryKey = ['mysql', 'mariadb', 'postgresql', 'mssql'].includes(connection.type) ? 'sql' : connection.type === 'cassandra' ? 'cql' : connection.type === 'elasticsearch' ? 'body' : 'text'
        const needsQuery = ['query', 'exec', 'find'].includes(op)
        return h(React.Fragment, null,
          h('div', { className: 'dsm-actions', style: { marginTop: 0 } }, h('button', { className: 'dsm-btn', onClick: onBack }, '← 返回连接列表'), h('span', { className: 'dsm-title' }, `${connection.name} · ${typeLabel(connection.type)}`), h('span', { className: 'dsm-sub' }, `${connection.host || '本机'}${connection.port ? ':' + connection.port : ''}`)),
          h('div', { className: 'dsm-section' }, '读取 / 写入操作'),
          h('div', { className: 'dsm-grid' },
            h('div', { className: 'dsm-field' }, h('label', { className: 'dsm-label' }, '操作'), h('select', { className: 'dsm-select', value: op, onChange: event => setOp(event.target.value) }, (OP_META[connection.type] || ['test']).map(item => h('option', { key: item, value: item }, OP_LABEL[item] || item)))),
            connection.type === 'elasticsearch' ? h('div', { className: 'dsm-field' }, h('label', { className: 'dsm-label' }, 'HTTP Method'), h('select', { className: 'dsm-select', value: fields.method, onChange: event => set('method', event.target.value) }, ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(item => h('option', { key: item, value: item }, item)))) : null,
            ['ftp', 'ssh'].includes(connection.type) && op !== 'terminal' ? h(Field, { label: '远程路径', value: fields.path, onChange: value => set('path', value), placeholder: '/var/log/app.log' }) : null,
            ['redis'].includes(connection.type) ? h(Field, { label: 'Key', value: fields.key, onChange: value => set('key', value) }) : null,
            ['s3'].includes(connection.type) ? h(Field, { label: 'Bucket', value: fields.bucket, onChange: value => set('bucket', value) }) : null,
            ['s3'].includes(connection.type) && op === 'listObjects' ? h(Field, { label: 'Prefix', value: fields.prefix, onChange: value => set('prefix', value) }) : null,
            ['s3'].includes(connection.type) && ['readObject', 'writeObject', 'deleteObject'].includes(op) ? h(Field, { label: 'Object Key', value: fields.key, onChange: value => set('key', value), wide: true }) : null,
            ['mongodb'].includes(connection.type) && ['find'].includes(op) ? h(Field, { label: 'Collection', value: fields.collection, onChange: value => set('collection', value) }) : null,
            ['docker'].includes(connection.type) && ['logs', 'start', 'stop', 'exec'].includes(op) ? h(Field, { label: 'Container', value: fields.container, onChange: value => set('container', value) }) : null,
            connection.type === 'elasticsearch' && op === 'query' ? h(Field, { label: 'API Path', value: fields.path, onChange: value => set('path', value), placeholder: '/_search', wide: true }) : null,
            needsQuery ? h('div', { className: 'dsm-field wide' }, h('label', { className: 'dsm-label' }, queryLabel), h('textarea', { className: 'dsm-textarea', value: fields[queryKey], onChange: event => set(queryKey, event.target.value), placeholder: connection.type === 'mongodb' ? '{"action":"find","collection":"users","filter":{}}' : connection.type === 'redis' ? '["GET","key"]' : '' })) : null,
            op === 'find' ? h(Field, { label: 'Filter JSON', value: fields.filter, onChange: value => set('filter', value) }) : null,
            ['writeFile', 'writeObject'].includes(op) ? h('div', { className: 'dsm-field wide' }, h('label', { className: 'dsm-label' }, '写入内容'), h('textarea', { className: 'dsm-textarea', value: fields.content, onChange: event => set('content', event.target.value) })) : null,
            op === 'uploadFile' ? h('div', { className: 'dsm-field wide' }, h('label', { className: 'dsm-label' }, '选择本地文件'), h('input', { className: 'dsm-input', type: 'file', onChange: event => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { const value = String(reader.result || ''); set('contentBase64', value.includes(',') ? value.slice(value.indexOf(',') + 1) : value); set('fileName', file.name) }; reader.readAsDataURL(file) } }), fields.fileName ? h('div', { className: 'dsm-help' }, `${fields.fileName} · 将写入 ${fields.path}`) : null) : null,
            ['setKey'].includes(op) ? h(Field, { label: 'Value', value: fields.value || '', onChange: value => set('value', value), wide: true }) : null,
          ),
          op === 'terminal' ? h('div', { className: 'dsm-terminal-wrap' }, h('div', { className: 'dsm-actions', style: { marginTop: 8 } }, !terminalId ? h('button', { className: 'dsm-btn primary', disabled: terminalBusy, onClick: openTerminal }, terminalBusy ? '连接中…' : '打开远程终端') : h('button', { className: 'dsm-btn danger', onClick: closeTerminal }, '关闭终端'), h('span', { className: 'dsm-help' }, terminalId ? '已连接；输入命令后按 Enter 执行。' : '使用 SSH shell 建立远程终端会话。')), h('pre', { className: 'dsm-terminal-output' }, terminalText || '终端输出将在这里显示'), h('textarea', { className: 'dsm-textarea dsm-terminal-input', disabled: !terminalId, value: terminalInput, onChange: event => setTerminalInput(event.target.value), onKeyDown: event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendTerminal() } }, placeholder: terminalId ? '输入远程命令，Enter 执行' : '请先打开终端' })) : h('div', { className: 'dsm-actions' }, h('button', { className: 'dsm-btn primary', disabled: busy, onClick: run }, busy ? '执行中…' : '执行操作'), h('span', { className: 'dsm-help' }, '写入、删除和容器控制操作会直接作用于远端服务。')),
          h('div', { className: 'dsm-result' }, busy ? h('div', { className: 'dsm-empty' }, '执行中…') : h(Result, { value: result })),
          result?.encoding === 'base64' ? h('div', { className: 'dsm-actions' }, h('button', { className: 'dsm-btn primary', onClick: () => downloadBase64(result.text, result.filename) }, '下载到本地')) : null,
        )
      }

      function ManagerPanel({ api, onClose }) {
        const [connections, setConnections] = useState([])
        const [sdk, setSdk] = useState({})
        const [editing, setEditing] = useState(null)
        const [workspace, setWorkspace] = useState(null)
        const [error, setError] = useState('')
        const load = () => Promise.all([api({ op: 'list' }), api({ op: 'capabilities' })]).then(([list, capabilities]) => { setConnections(list.connections || []); setSdk(capabilities.available || {}) }).catch(error => setError(error.message))
        useEffect(() => { load() }, [])
        const selected = workspace && connections.find(item => item.id === workspace.id)
        return h('div', { className: 'dsm-backdrop', onClick: onClose }, h('section', { className: 'dsm-panel', onClick: event => event.stopPropagation() },
          h('header', { className: 'dsm-head' }, h('span', { className: 'dsm-title' }, '服务管理'), h('span', { className: 'dsm-sub' }, `${connections.length} 个连接`), h('button', { className: 'dsm-btn primary', onClick: () => { setWorkspace(null); setEditing(blankConnection()) } }, '+ 新建连接'), h('button', { className: 'dsm-close', onClick: onClose }, '×')),
          error ? h('div', { className: 'dsm-error', style: { margin: '10px 15px 0' } }, error) : null,
          h('div', { className: 'dsm-body' },
            h('aside', { className: 'dsm-list' }, connections.length ? connections.map(connection => h('button', { key: connection.id, className: 'dsm-card' + (selected?.id === connection.id ? ' active' : ''), onClick: () => { setWorkspace(connection); setEditing(null) } }, h('span', { className: 'dsm-card-icon' }, TYPE_META[connection.type]?.icon || '🔌'), h('span', { className: 'dsm-card-copy' }, h('span', { className: 'dsm-card-name' }, connection.name), h('span', { className: 'dsm-card-meta' }, h('span', { className: 'dsm-dot ' + (sdk[connection.type] === false ? 'bad' : '') }), `${typeLabel(connection.type)} · ${connection.host || '本机'}${connection.port ? ':' + connection.port : ''}`)), h('span', { className: 'dsm-sub' }, '›'))) : h('div', { className: 'dsm-empty' }, '还没有服务连接\n点击右上角新建'),
              h('div', { className: 'dsm-help', style: { marginTop: 14 } }, '支持 FTP、SSH、Redis、MySQL、MariaDB、PostgreSQL、SQL Server、Elasticsearch、Docker、MongoDB、Cassandra 和各种 S3。'),
            ),
            h('main', { className: 'dsm-main' }, editing ? h(ConnectionForm, { value: editing, api, onCancel: () => setEditing(null), onSaved: connection => { setEditing(null); setConnections(list => list.some(item => item.id === connection.id) ? list.map(item => item.id === connection.id ? connection : item) : [...list, connection]) } }) : selected ? h(OperationView, { connection: selected, api, onBack: () => setWorkspace(null) }) : h('div', { className: 'dsm-empty' }, '从左侧选择连接，或创建一个新的服务连接。')),
          ),
        ))
      }

      function ServiceManagerEntry(props) {
        const [open, setOpen] = useState(false)
        const api = props.api
        useEffect(() => { installStyle() }, [])
        return h(React.Fragment, null,
          h('button', { className: 'dsm-action', title: '服务管理', onClick: () => setOpen(true) }, h('span', { className: 'dsm-action-icon' }, '🗄️'), props.wide ? h('span', { className: 'dsm-action-label' }, '服务管理') : null),
          open ? h(ManagerPanel, { api, onClose: () => setOpen(false) }) : null,
        )
      }

      return {
        inject: ['slots', 'inputTriggers'],
        apply(ctx) {
          installStyle()
          const api = body => apiRequest(body)
          ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
            name: 'sidebar.footer.action', id: 'dsh-service-manage', order: 50, inject: () => ({ api }),
          }, ServiceManagerEntry))
          const inputTriggers = ctx.get('inputTriggers')
          if (inputTriggers) ctx.effect(() => inputTriggers.registerSource(createServerInputSource()), 'dsh-service-manage: @server source')
        },
      }
    },
  })
})(typeof window === 'undefined' ? globalThis : window)
