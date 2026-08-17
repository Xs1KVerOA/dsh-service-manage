(function registerDshServerManager(global) {
  const loader = global.__ModuleLoader__
  if (!loader || typeof loader.load !== 'function') throw new Error('dsh-service-manage: client module loader is unavailable')

  loader.load({
    id: 'dsh-service-manage',
    factory(require) {
      const React = require('react')
      const h = React.createElement
      const { useEffect, useMemo, useRef, useState } = React

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
      const RELATIONAL_TYPES = new Set(['mysql', 'mariadb', 'postgresql', 'mssql'])
      const DATA_WORKSPACE_TYPES = new Set(['redis', 'elasticsearch', 'mongodb', 'cassandra'])

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
.dsm-panel{--dsm-bg:var(--dsw-specific-sidebar-fill,#fff);--dsm-text:var(--dsw-alias-label-primary,#1c1f26);--dsm-muted:var(--dsw-alias-label-secondary,#6b7280);--dsm-soft:rgba(128,128,128,.07);--dsm-line:rgba(128,128,128,.18);--dsm-accent:#e9483d;background:var(--dsm-bg);color:var(--dsm-text);border:1px solid var(--dsm-line);border-radius:18px;overflow:hidden;box-shadow:0 24px 70px rgba(15,23,42,.24)}
.dsm-action{margin:3px 0;padding:9px 11px;border:1px solid transparent;border-radius:10px}.dsm-action:hover{border-color:rgba(233,72,61,.18);background:rgba(233,72,61,.06)}.dsm-action-icon{width:26px;height:26px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:rgba(233,72,61,.10)}.dsm-action-label{color:#e9483d;font-size:12.5px}
.dsm-backdrop{padding:18px;background:rgba(15,23,42,.34);backdrop-filter:blur(5px)}
.dsm-head{height:68px;box-sizing:border-box;padding:0 20px;background:var(--dsm-bg);border-bottom:1px solid var(--dsm-line)}.dsm-head .dsm-title{font-size:16px;letter-spacing:-.01em}.dsm-head .dsm-sub{padding:4px 8px;border:1px solid var(--dsm-line);border-radius:999px;color:var(--dsm-muted);opacity:1}.dsm-head .dsm-btn.primary{padding:8px 13px;border-radius:9px;box-shadow:0 4px 12px rgba(233,72,61,.2)}.dsm-close{width:30px;height:30px;border-radius:8px}.dsm-close:hover{background:var(--dsm-soft)}
.dsm-body{background:var(--dsm-bg)}.dsm-list{width:284px;min-width:250px;padding:18px 14px;background:var(--dsm-soft);border-right:1px solid var(--dsm-line)}.dsm-list:before{content:'已保存连接';display:block;margin:0 8px 13px;color:var(--dsm-muted);font-size:11px;font-weight:700;letter-spacing:.04em}.dsm-card{gap:11px;padding:11px 10px;margin-bottom:8px;border:1px solid transparent;border-radius:12px;background:transparent;transition:background .16s ease,border-color .16s ease,transform .16s ease}.dsm-card:hover{background:rgba(128,128,128,.10);border-color:var(--dsm-line);transform:translateY(-1px)}.dsm-card.active{background:var(--dsm-bg);border-color:rgba(233,72,61,.28);box-shadow:0 5px 14px rgba(15,23,42,.07)}.dsm-card-icon{width:38px;height:38px;border-radius:11px;background:rgba(233,72,61,.12);font-size:18px}.dsm-card-copy{gap:3px;display:flex;flex-direction:column}.dsm-card-name{font-size:13px;line-height:1.25}.dsm-card-meta{font-size:11px;color:var(--dsm-muted);opacity:1}.dsm-card-meta .dsm-dot{width:7px;height:7px;box-shadow:0 0 0 3px rgba(68,200,120,.12)}.dsm-card-meta .dsm-dot.bad{box-shadow:0 0 0 3px rgba(238,106,98,.12)}.dsm-list>.dsm-help{margin:18px 8px 0!important;padding-top:16px;border-top:1px solid var(--dsm-line);color:var(--dsm-muted);opacity:1;font-size:10.5px}.dsm-main{padding:24px 26px;background:var(--dsm-bg)}
.dsm-operation-head{gap:10px;margin:0 0 25px!important;padding-bottom:18px;border-bottom:1px solid var(--dsm-line)}.dsm-operation-head .dsm-title{font-size:18px;letter-spacing:-.02em}.dsm-operation-head .dsm-sub{margin-left:auto;color:var(--dsm-muted);opacity:1}.dsm-operation-head .dsm-btn:first-child{padding-left:9px;padding-right:9px}.dsm-section{margin:21px 0 10px;color:var(--dsm-muted);font-size:11px;letter-spacing:.08em}.dsm-grid{gap:14px 15px}.dsm-label{margin-bottom:6px;color:var(--dsm-muted);font-size:11px;opacity:1;font-weight:600}.dsm-input,.dsm-select,.dsm-textarea{min-height:40px;padding:9px 11px;border-color:var(--dsm-line);background:var(--dsm-soft);color:var(--dsm-text);border-radius:9px;font-size:12px;transition:border-color .16s ease,box-shadow .16s ease,background .16s ease}.dsm-input:hover,.dsm-select:hover,.dsm-textarea:hover{background:rgba(128,128,128,.10)}.dsm-input:focus,.dsm-select:focus,.dsm-textarea:focus{border-color:rgba(233,72,61,.72);box-shadow:0 0 0 3px rgba(233,72,61,.12)}.dsm-help{color:var(--dsm-muted);opacity:1}.dsm-actions{gap:9px}.dsm-btn{padding:8px 12px;border-color:var(--dsm-line);border-radius:9px;background:var(--dsm-bg);font-size:12px;font-weight:600;transition:background .16s ease,border-color .16s ease,transform .16s ease}.dsm-btn:hover{background:var(--dsm-soft);border-color:rgba(128,128,128,.32);transform:translateY(-1px)}.dsm-btn.primary{background:var(--dsm-accent);border-color:var(--dsm-accent);box-shadow:0 4px 12px rgba(233,72,61,.18)}.dsm-btn.primary:hover{background:#d83e35;border-color:#d83e35}.dsm-error{color:#bd3d36;background:rgba(233,72,61,.09);border:1px solid rgba(233,72,61,.16);padding:10px 12px;border-radius:10px}.dsm-notice{display:flex;align-items:center;gap:8px;margin-bottom:16px}.dsm-notice .dsm-btn{margin-left:auto!important;flex:0 0 auto}.dsm-result{min-height:165px;margin-top:16px;padding:0;border:1px solid var(--dsm-line);background:var(--dsm-soft);border-radius:12px;box-shadow:inset 0 1px 0 rgba(255,255,255,.25)}.dsm-result-empty{min-height:165px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:var(--dsm-muted)}.dsm-empty-icon{width:34px;height:34px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:rgba(233,72,61,.11);color:var(--dsm-accent);font-size:18px}.dsm-empty-title{color:var(--dsm-text);font-size:12px;font-weight:650}.dsm-empty-copy{font-size:11px}.dsm-pre{padding:14px}.dsm-table{font-size:11px}.dsm-table th{background:var(--dsm-soft);color:var(--dsm-muted)}.dsm-table th,.dsm-table td{border-color:var(--dsm-line)}.dsm-terminal-output{border:1px solid rgba(0,0,0,.24);border-radius:11px;box-shadow:inset 0 1px 8px rgba(0,0,0,.20)}
.dsm-form-title{display:block;padding-bottom:18px;margin-bottom:24px;border-bottom:1px solid var(--dsm-line);font-size:18px;letter-spacing:-.02em}
.dsm-data-editor{min-height:150px}.dsm-doc-table{min-width:100%;border-collapse:collapse;font-size:11px}.dsm-doc-table th,.dsm-doc-table td{border:1px solid var(--dsm-line);padding:6px 8px;max-width:300px;text-align:left;vertical-align:top;white-space:pre-wrap;word-break:break-word}.dsm-doc-table th{position:sticky;top:0;background:var(--dsm-soft);color:var(--dsm-muted);white-space:nowrap}.dsm-db-sidebar .dsm-select{min-height:34px;margin:0 0 7px;padding:7px 8px;font-size:11px}.dsm-kv-title{display:flex;align-items:center;gap:8px;margin:14px 0 7px;color:var(--dsm-muted);font-size:11px;font-weight:700}.dsm-kv-title span{flex:1}.dsm-data-result{min-height:260px}
.dsm-db-layout{display:grid;grid-template-columns:218px minmax(0,1fr);min-height:520px;border:1px solid var(--dsm-line);border-radius:13px;overflow:hidden;background:var(--dsm-soft)}.dsm-db-sidebar{min-width:0;padding:13px 10px;border-right:1px solid var(--dsm-line);background:rgba(128,128,128,.045);overflow:auto}.dsm-db-sidebar-head{display:flex;align-items:center;gap:7px;padding:2px 5px 10px;color:var(--dsm-muted);font-size:11px;font-weight:700;letter-spacing:.05em}.dsm-db-sidebar-head span{flex:1}.dsm-db-icon-btn{width:25px;height:25px;padding:0;border:1px solid var(--dsm-line);border-radius:7px;background:var(--dsm-bg);color:var(--dsm-muted);cursor:pointer}.dsm-db-icon-btn:hover{color:var(--dsm-text);background:var(--dsm-soft)}.dsm-db-node{display:flex;align-items:center;gap:6px;width:100%;padding:7px 8px;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--dsm-text);font:inherit;font-size:11.5px;text-align:left;cursor:pointer}.dsm-db-node:hover{background:rgba(128,128,128,.10)}.dsm-db-node.active{border-color:rgba(233,72,61,.25);background:rgba(233,72,61,.09);color:var(--dsm-accent);font-weight:650}.dsm-db-node span:last-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dsm-db-node-icon{width:17px;text-align:center;flex:0 0 17px}.dsm-db-group{margin:9px 0 0;padding-top:9px;border-top:1px solid var(--dsm-line)}.dsm-db-group-title{padding:0 8px 5px;color:var(--dsm-muted);font-size:10px;font-weight:700}.dsm-db-content{min-width:0;padding:15px;background:var(--dsm-bg);overflow:auto}.dsm-db-toolbar{display:flex;align-items:center;gap:8px;margin-bottom:12px}.dsm-db-toolbar .dsm-select{flex:1;min-width:0}.dsm-db-title{font-size:12px;font-weight:700}.dsm-db-query-head{display:flex;align-items:center;gap:8px;margin:15px 0 7px;color:var(--dsm-muted);font-size:11px;font-weight:700}.dsm-db-query-head span{flex:1}.dsm-db-query{min-height:130px;margin:0;font-size:12px;line-height:1.55}.dsm-db-result{min-height:220px;margin-top:13px}.dsm-db-result .dsm-table{min-width:100%;white-space:nowrap}.dsm-db-result .dsm-pre{max-height:360px;overflow:auto}
@media(max-width:700px){.dsm-backdrop{padding:0}.dsm-panel{width:100%;height:100%;border:0;border-radius:0}.dsm-main{padding:17px}.dsm-operation-head .dsm-sub{width:100%;margin-left:0}.dsm-operation-head{align-items:flex-start}.dsm-list{padding:14px}.dsm-list:before{margin-bottom:8px}}
@media(max-width:820px){.dsm-db-layout{grid-template-columns:180px minmax(0,1fr)}}
@media(max-width:620px){.dsm-db-layout{display:block}.dsm-db-sidebar{max-height:230px;border-right:0;border-bottom:1px solid var(--dsm-line)}.dsm-db-content{padding:12px}}
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
      function normalizeTerminalText(value) {
        return String(value ?? '')
          .replace(/\\u001b/gi, '\x1b')
          .replace(/\\x1b/gi, '\x1b')
          .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '')
          .replace(/\x1b(?:P|X|\^|_|\x90|\x98|\x9e|\x9f)[\s\S]*?(?:\x1b\\|$)/g, '')
          .replace(/(?:\x1b\[[0-?]*[ -/]*[@-~]|\x1b[()][0-2A-Z]|\x1b.|\x9b[0-?]*[ -/]*[@-~])/g, '')
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n')
          .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, character => character === '\t' ? '\t' : '')
      }
      function credentialIssue(connection) {
        const secrets = connection.secrets || {}
        if (connection.type === 'ssh') {
          const field = connection.authMode === 'key' ? 'privateKey' : 'password'
          return secrets[field] ? '' : (field === 'privateKey' ? '私钥 PEM' : '密码')
        }
        if (connection.type === 's3') {
          if (Boolean(secrets.accessKey) !== Boolean(secrets.secretKey)) return 'Access Key 和 Secret Key'
          return ''
        }
        if (connection.username && TYPE_META[connection.type]?.secret.includes('password') && !secrets.password) return '密码'
        return ''
      }
      function missingCredential(connection) {
        return Boolean(credentialIssue(connection))
      }
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
        return `<dsh-server-ref id="${escapeXml(connection.id)}" name="${escapeXml(connection.name)}" alias="${escapeXml(connection.alias || serverAlias(connection))}" type="${escapeXml(connection.type)}" transport="service-manager" tool="dsh_server_manage" credential-scope="dsh-credentials" endpoint="${escapeXml(endpoint)}" database="${escapeXml(connection.database || '')}" />`
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
                description: `${typeLabel(connection.type)} · ${connection.host || '本机'}${connection.port ? ':' + connection.port : ''}`,
                icon: TYPE_META[connection.type]?.icon || '🔌',
                hint: '服务管理通道',
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
          api({ op: 'save', connection: form, secrets: selectedSecrets }).then(result => {
            if (result.warnings?.length) throw new Error(`凭据写入失败：${result.warnings.join('；')}`)
            onSaved(result.connection)
          }).catch(error => setError(error.message)).finally(() => setBusy(false))
        }
        return h(React.Fragment, null,
          h('div', { className: 'dsm-title dsm-form-title' }, value.id ? '编辑连接' : '新建连接'),
          error ? h('div', { className: 'dsm-error' }, error) : null,
          h('div', { className: 'dsm-section' }, '基本信息'),
          h('div', { className: 'dsm-grid' },
            h(Field, { label: '连接名称', value: form.name, onChange: value => set('name', value), placeholder: '例如：生产 Redis' }),
            h('div', { className: 'dsm-field' }, h('label', { className: 'dsm-label' }, '服务类型'), h('select', { className: 'dsm-select', value: type, onChange: event => changeType(event.target.value) }, Object.entries(TYPE_META).map(([key, item]) => h('option', { key, value: key }, item.label)))),
            h(Field, { label: '服务器地址', value: form.host, onChange: value => set('host', value), placeholder: type === 'docker' ? '留空使用本机 Docker' : 'db.example.com' }),
            h(Field, { label: '端口', value: form.port, onChange: value => set('port', value), type: 'number', help: type === 'docker' || type === 's3' ? '可为 0；S3 也可使用 endpoint' : '' }),
            type !== 's3' && type !== 'docker' ? h(Field, { label: '用户名', value: form.username, onChange: value => set('username', value) }) : null,
            type !== 's3' && type !== 'docker' ? h(Field, { label: type === 'redis' ? 'Redis DB 编号' : RELATIONAL_TYPES.has(type) ? '默认数据库（可选）' : '数据库 / Keyspace', value: form.database, onChange: value => set('database', value), type: type === 'redis' ? 'number' : 'text', placeholder: type === 'redis' ? '0' : RELATIONAL_TYPES.has(type) ? '不填也可在工作区选择' : '', help: RELATIONAL_TYPES.has(type) ? '连接后可从数据库树切换当前数据库。' : '' }) : null,
          ),
          h('div', { className: 'dsm-section' }, '认证密钥'),
          h('div', { className: 'dsm-grid' },
            h('div', { className: 'dsm-field' }, h('label', { className: 'dsm-label' }, '连接方式'), h('select', { className: 'dsm-select', value: type === 'ssh' ? (form.authMode || 'password') : 'password', onChange: event => set('authMode', event.target.value) }, h('option', { value: 'password' }, type === 's3' ? 'Access Key / Secret Key' : '密码'), type === 'ssh' ? h('option', { value: 'key' }, '私钥 PEM') : null)),
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
            ['ftp', 'redis', 'mysql', 'mariadb', 'postgresql', 'mssql', 'mongodb', 'cassandra'].includes(type) ? h('label', { className: 'dsm-label', style: { alignSelf: 'end', paddingBottom: 7 } }, h('input', { type: 'checkbox', checked: Boolean(form.options?.ssl), onChange: event => setOption('ssl', event.target.checked) }), ' 启用 TLS / SSL') : null,
            type === 's3' ? h(Field, { label: 'Endpoint（可选）', value: form.options?.endpoint || '', onChange: value => setOption('endpoint', value), placeholder: 'https://minio.example.com', wide: true }) : null,
            type === 's3' ? h(Field, { label: 'Region', value: form.options?.region || '', onChange: value => setOption('region', value), placeholder: 'us-east-1' }) : null,
            type === 's3' ? h(Field, { label: '默认 Bucket', value: form.options?.bucket || '', onChange: value => setOption('bucket', value) }) : null,
            type === 'docker' ? h(Field, { label: 'Docker Host / Context', value: form.options?.dockerHost || form.options?.context || '', onChange: value => setOption('dockerHost', value), placeholder: 'unix:///var/run/docker.sock' }) : null,
            type === 'mongodb' ? h(Field, { label: '认证数据库', value: form.options?.authDatabase || 'admin', onChange: value => setOption('authDatabase', value) }) : null,
            type === 'cassandra' ? h(Field, { label: 'Keyspace', value: form.options?.keyspace || '', onChange: value => setOption('keyspace', value) }) : null,
            type === 'cassandra' ? h(Field, { label: 'Local Datacenter', value: form.options?.localDataCenter || 'datacenter1', onChange: value => setOption('localDataCenter', value), placeholder: 'datacenter1' }) : null,
          ),
          h('div', { className: 'dsm-section' }, '代理模式'),
          h(ProxyFields, { proxy: form.options?.proxy, setProxy, secrets, setSecret, touched, touch }),
          h('div', { className: 'dsm-actions' }, h('button', { className: 'dsm-btn primary', disabled: busy, onClick: save }, busy ? '保存中…' : '保存连接'), h('button', { className: 'dsm-btn', onClick: onCancel }, '取消')),
        )
      }

      function Result({ value }) {
        if (!value) return h('div', { className: 'dsm-empty dsm-result-empty' }, h('div', { className: 'dsm-empty-icon' }, '✦'), h('div', { className: 'dsm-empty-title' }, '准备执行操作'), h('div', { className: 'dsm-empty-copy' }, '执行结果会显示在这里'))
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

      function resultColumnIndex(value, pattern, fallback = 0) {
        const columns = value?.columns || []
        const index = columns.findIndex(column => pattern.test(String(column)))
        return index >= 0 ? index : fallback
      }

      function resultDatabaseNames(value) {
        const index = resultColumnIndex(value, /database|datname|^name$/i)
        return (value?.rows || []).map(row => String(row?.[index] ?? '')).filter(Boolean)
      }

      function resultTableNames(value) {
        const columns = value?.columns || []
        const tableIndex = resultColumnIndex(value, /table.?name|tablename/i)
        const schemaIndex = resultColumnIndex(value, /table.?schema|schemaname/i, -1)
        return (value?.rows || []).map(row => {
          const table = String(row?.[tableIndex] ?? '').trim()
          const schema = schemaIndex >= 0 ? String(row?.[schemaIndex] ?? '').trim() : ''
          return schema && table ? `${schema}.${table}` : table
        }).filter(Boolean)
      }

      function tableQuery(type, table) {
        const parts = String(table || '').split('.')
        if (parts.some(part => !part || /[\0\r\n;`"\[\]]/.test(part))) return ''
        if (type === 'mysql' || type === 'mariadb') return `SELECT * FROM ${parts.map(part => `\`${part.replaceAll('`', '``')}\``).join('.')} LIMIT 100`
        if (type === 'mssql') return `SELECT TOP 100 * FROM ${parts.map(part => `[${part.replaceAll(']', ']]')}]`).join('.')}`
        return `SELECT * FROM ${parts.map(part => `"${part.replaceAll('"', '""')}"`).join('.')} LIMIT 100`
      }

      function DatabaseWorkspace({ connection, api, onBack, onEdit }) {
        const [databases, setDatabases] = useState([])
        const [selectedDatabase, setSelectedDatabase] = useState(connection.database || '')
        const [tables, setTables] = useState([])
        const [selectedTable, setSelectedTable] = useState('')
        const [sql, setSql] = useState('')
        const [result, setResult] = useState(null)
        const [error, setError] = useState('')
        const [loading, setLoading] = useState(false)
        const [loadingTables, setLoadingTables] = useState(false)
        const [busy, setBusy] = useState(false)

        const loadDatabases = () => {
          setLoading(true); setError('')
          api({ op: 'exec', id: connection.id, params: { op: 'listDatabases' } }).then(value => {
            const items = resultDatabaseNames(value)
            setDatabases(items)
            setSelectedDatabase(current => current && (items.length === 0 || items.includes(current)) ? current : items[0] || connection.database || '')
          }).catch(loadError => setError(loadError.message)).finally(() => setLoading(false))
        }
        const loadTables = database => {
          if (!database) { setTables([]); return }
          setLoadingTables(true); setError('')
          api({ op: 'exec', id: connection.id, params: { op: 'listTables', database } }).then(value => setTables(resultTableNames(value))).catch(loadError => { setTables([]); setError(loadError.message) }).finally(() => setLoadingTables(false))
        }
        const refreshSchema = () => { loadDatabases(); if (selectedDatabase) loadTables(selectedDatabase) }
        const run = params => {
          setBusy(true); setResult(null); setError('')
          api({ op: 'exec', id: connection.id, params: { database: selectedDatabase, ...params } }).then(setResult).catch(runError => setResult({ ok: false, error: runError.message })).finally(() => setBusy(false))
        }
        const selectTable = table => {
          setSelectedTable(table)
          const nextSql = tableQuery(connection.type, table)
          setSql(nextSql)
          run({ op: 'tableData', table, limit: 100 })
        }
        useEffect(() => { loadDatabases() }, [connection.id])
        useEffect(() => { setSelectedTable(''); setSql(''); setResult(null); loadTables(selectedDatabase) }, [selectedDatabase])

        return h(React.Fragment, null,
          h('div', { className: 'dsm-actions dsm-operation-head', style: { marginTop: 0 } }, h('button', { className: 'dsm-btn', onClick: onBack }, '← 返回连接列表'), h('span', { className: 'dsm-title' }, `${connection.name} · ${typeLabel(connection.type)}`), h('span', { className: 'dsm-sub' }, `${connection.host || '本机'}${connection.port ? ':' + connection.port : ''}`), onEdit ? h('button', { className: 'dsm-btn', onClick: onEdit }, '编辑连接') : null),
          error ? h('div', { className: 'dsm-error' }, error) : null,
          h('div', { className: 'dsm-db-layout' },
            h('aside', { className: 'dsm-db-sidebar' },
              h('div', { className: 'dsm-db-sidebar-head' }, h('span', null, '数据库'), h('button', { className: 'dsm-db-icon-btn', title: '刷新数据库和表', onClick: refreshSchema }, loading || loadingTables ? '…' : '↻')),
              databases.length ? databases.map(database => h('button', { key: database, className: 'dsm-db-node' + (selectedDatabase === database ? ' active' : ''), onClick: () => setSelectedDatabase(database) }, h('span', { className: 'dsm-db-node-icon' }, '🗄️'), h('span', null, database))) : h('div', { className: 'dsm-empty' }, loading ? '加载数据库…' : '未发现可用数据库'),
              selectedDatabase ? h('div', { className: 'dsm-db-group' }, h('div', { className: 'dsm-db-group-title' }, loadingTables ? '表 · 加载中…' : `表 · ${tables.length}`), tables.length ? tables.map(table => h('button', { key: table, className: 'dsm-db-node' + (selectedTable === table ? ' active' : ''), onClick: () => selectTable(table) }, h('span', { className: 'dsm-db-node-icon' }, '▱'), h('span', null, table))) : h('div', { className: 'dsm-help', style: { padding: '4px 8px' } }, loadingTables ? '正在读取表…' : '选择数据库后显示表')) : null,
            ),
            h('section', { className: 'dsm-db-content' },
              h('div', { className: 'dsm-db-toolbar' }, h('span', { className: 'dsm-db-title' }, '当前数据库'), h('select', { className: 'dsm-select', value: selectedDatabase, onChange: event => setSelectedDatabase(event.target.value) }, h('option', { value: '' }, '请选择数据库'), databases.map(database => h('option', { key: database, value: database }, database)))),
              h('div', { className: 'dsm-db-query-head' }, h('span', null, selectedTable ? `查询表 · ${selectedTable}` : 'SQL 查询'), h('button', { className: 'dsm-btn', disabled: !selectedDatabase || busy, onClick: () => run({ op: 'query', sql }) }, busy ? '执行中…' : '执行 SQL')),
              h('textarea', { className: 'dsm-textarea dsm-db-query', value: sql, onChange: event => setSql(event.target.value), placeholder: selectedDatabase ? '输入 SQL 查询，例如 SELECT * FROM users LIMIT 100' : '先选择数据库，再输入 SQL' }),
              h('div', { className: 'dsm-actions', style: { marginTop: 9 } }, h('button', { className: 'dsm-btn primary', disabled: !selectedDatabase || !sql.trim() || busy, onClick: () => run({ op: 'query', sql }) }, busy ? '执行中…' : '执行查询'), selectedTable ? h('button', { className: 'dsm-btn', disabled: busy, onClick: () => run({ op: 'tableData', table: selectedTable, limit: 100 }) }, '刷新表数据') : null, h('span', { className: 'dsm-help' }, '表浏览默认读取 100 行；SQL 查询按语句执行，写入前请确认目标数据库。')),
              h('div', { className: 'dsm-result dsm-db-result' }, busy ? h('div', { className: 'dsm-empty' }, '正在读取…') : h(Result, { value: result })),
            ),
          ),
        )
      }

      function WorkspaceHeader({ connection, onBack, onEdit }) {
        return h('div', { className: 'dsm-actions dsm-operation-head', style: { marginTop: 0 } }, h('button', { className: 'dsm-btn', onClick: onBack }, '← 返回连接列表'), h('span', { className: 'dsm-title' }, `${connection.name} · ${typeLabel(connection.type)}`), h('span', { className: 'dsm-sub' }, `${connection.host || '本机'}${connection.port ? ':' + connection.port : ''}`), onEdit ? h('button', { className: 'dsm-btn', onClick: onEdit }, '编辑连接') : null)
      }

      function DocumentResult({ value }) {
        if (!value || value.kind !== 'json') return h(Result, { value })
        if (!value.ok) return h(Result, { value })
        const data = value.data
        const documents = Array.isArray(data) ? data : Array.isArray(data?.hits?.hits) ? data.hits.hits.map(hit => ({ _id: hit._id, _score: hit._score, ...(hit._source || {}) })) : null
        if (!documents) return h(Result, { value })
        if (!documents.length) return h('div', { className: 'dsm-empty' }, '没有匹配的数据')
        const columns = [...new Set(documents.flatMap(item => Object.keys(item || {})))].slice(0, 80)
        return h('table', { className: 'dsm-doc-table' }, h('thead', null, h('tr', null, columns.map(column => h('th', { key: column }, column)))), h('tbody', null, documents.slice(0, 500).map((item, rowIndex) => h('tr', { key: rowIndex }, columns.map(column => h('td', { key: column }, item?.[column] == null ? '' : typeof item[column] === 'object' ? JSON.stringify(item[column]) : String(item[column])))))))
      }

      function RedisWorkspace({ connection, api, onBack, onEdit }) {
        const configuredDatabase = connection.options?.db ?? connection.database
        const [database, setDatabase] = useState(String(configuredDatabase ?? '0'))
        const [pattern, setPattern] = useState('*')
        const [keys, setKeys] = useState([])
        const [selectedKey, setSelectedKey] = useState('')
        const [value, setValue] = useState('')
        const [command, setCommand] = useState('["GET","key"]')
        const [result, setResult] = useState(null)
        const [error, setError] = useState('')
        const [busy, setBusy] = useState(false)
        const databaseOptions = [...new Set([...Array.from({ length: 16 }, (_, index) => String(index)), database])].filter(Boolean)
        const loadKeys = () => {
          setBusy(true); setError('')
          api({ op: 'exec', id: connection.id, params: { op: 'listKeys', database, pattern } }).then(response => setKeys(response.items || [])).catch(loadError => setError(loadError.message)).finally(() => setBusy(false))
        }
        const selectKey = key => {
          setSelectedKey(key); setBusy(true); setError('')
          api({ op: 'exec', id: connection.id, params: { op: 'getKey', database, key } }).then(response => { setResult(response); setValue(response.data == null ? '' : String(response.data)) }).catch(loadError => setError(loadError.message)).finally(() => setBusy(false))
        }
        const execute = params => {
          setBusy(true); setResult(null); setError('')
          return api({ op: 'exec', id: connection.id, params: { database, ...params } }).then(setResult).catch(runError => setResult({ ok: false, error: runError.message })).finally(() => setBusy(false))
        }
        const saveKey = () => execute({ op: 'setKey', key: selectedKey, value })
        const deleteKey = () => execute({ op: 'delKey', key: selectedKey }).then(() => { setSelectedKey(''); setValue(''); loadKeys() })
        useEffect(() => { loadKeys() }, [database])
        return h(React.Fragment, null,
          h(WorkspaceHeader, { connection, onBack, onEdit }),
          error ? h('div', { className: 'dsm-error' }, error) : null,
          h('div', { className: 'dsm-db-layout' },
            h('aside', { className: 'dsm-db-sidebar' },
              h('div', { className: 'dsm-db-sidebar-head' }, h('span', null, 'Redis DB'), h('button', { className: 'dsm-db-icon-btn', title: '刷新 Key', onClick: loadKeys }, busy ? '…' : '↻')),
              h('select', { className: 'dsm-select', value: database, onChange: event => setDatabase(event.target.value) }, databaseOptions.map(item => h('option', { key: item, value: item }, `DB ${item}`))),
              h('input', { className: 'dsm-input', value: pattern, onChange: event => setPattern(event.target.value), onKeyDown: event => { if (event.key === 'Enter') loadKeys() }, placeholder: 'Key Pattern，例如 user:*' }),
              keys.length ? keys.map(key => h('button', { key, className: 'dsm-db-node' + (selectedKey === key ? ' active' : ''), onClick: () => selectKey(key) }, h('span', { className: 'dsm-db-node-icon' }, '🔑'), h('span', null, key))) : h('div', { className: 'dsm-empty' }, busy ? '扫描 Key…' : '没有匹配的 Key'),
            ),
            h('section', { className: 'dsm-db-content' },
              h('div', { className: 'dsm-kv-title' }, h('span', null, selectedKey ? `Key · ${selectedKey}` : 'Redis 操作'), selectedKey ? h('button', { className: 'dsm-btn danger', disabled: busy, onClick: deleteKey }, '删除 Key') : null),
              selectedKey ? h('textarea', { className: 'dsm-textarea dsm-data-editor', value, onChange: event => setValue(event.target.value), placeholder: '字符串 Value' }) : null,
              selectedKey ? h('div', { className: 'dsm-actions', style: { marginTop: 9 } }, h('button', { className: 'dsm-btn primary', disabled: busy, onClick: saveKey }, '写入 Key'), h('button', { className: 'dsm-btn', disabled: busy, onClick: () => selectKey(selectedKey) }, '重新读取')) : null,
              h('div', { className: 'dsm-kv-title' }, h('span', null, 'Redis 命令（JSON 数组）')),
              h('textarea', { className: 'dsm-textarea dsm-data-editor', value: command, onChange: event => setCommand(event.target.value), placeholder: '["GET","user:1"]' }),
              h('div', { className: 'dsm-actions', style: { marginTop: 9 } }, h('button', { className: 'dsm-btn primary', disabled: busy || !command.trim(), onClick: () => execute({ op: 'query', text: command }) }, busy ? '执行中…' : '执行命令')),
              h('div', { className: 'dsm-result dsm-data-result' }, busy ? h('div', { className: 'dsm-empty' }, '正在读取…') : h(Result, { value: result })),
            ),
          ),
        )
      }

      function ElasticsearchWorkspace({ connection, api, onBack, onEdit }) {
        const [indices, setIndices] = useState([])
        const [index, setIndex] = useState('')
        const [path, setPath] = useState('/_search')
        const [body, setBody] = useState('{\n  "from": 0,\n  "size": 100,\n  "query": { "match_all": {} }\n}')
        const [result, setResult] = useState(null)
        const [error, setError] = useState('')
        const [busy, setBusy] = useState(false)
        const loadIndices = () => {
          setBusy(true); setError('')
          api({ op: 'exec', id: connection.id, params: { op: 'listIndices' } }).then(response => {
            const items = Array.isArray(response.data) ? response.data.map(item => String(item.index || '')).filter(Boolean) : []
            setIndices(items)
            if (!index && items[0]) { setIndex(items[0]); setPath(`/${encodeURIComponent(items[0])}/_search`) }
          }).catch(loadError => setError(loadError.message)).finally(() => setBusy(false))
        }
        const execute = () => {
          setBusy(true); setResult(null); setError('')
          api({ op: 'exec', id: connection.id, params: { op: 'query', path, method: 'POST', body } }).then(setResult).catch(runError => setResult({ ok: false, error: runError.message })).finally(() => setBusy(false))
        }
        const selectIndex = next => { setIndex(next); setPath(`/${encodeURIComponent(next)}/_search`); setResult(null) }
        useEffect(() => { loadIndices() }, [connection.id])
        return h(React.Fragment, null,
          h(WorkspaceHeader, { connection, onBack, onEdit }),
          error ? h('div', { className: 'dsm-error' }, error) : null,
          h('div', { className: 'dsm-db-layout' },
            h('aside', { className: 'dsm-db-sidebar' },
              h('div', { className: 'dsm-db-sidebar-head' }, h('span', null, 'Elasticsearch Index'), h('button', { className: 'dsm-db-icon-btn', title: '刷新 Index', onClick: loadIndices }, busy ? '…' : '↻')),
              indices.length ? indices.map(item => h('button', { key: item, className: 'dsm-db-node' + (index === item ? ' active' : ''), onClick: () => selectIndex(item) }, h('span', { className: 'dsm-db-node-icon' }, '▦'), h('span', null, item))) : h('div', { className: 'dsm-empty' }, busy ? '加载 Index…' : '没有可用 Index'),
            ),
            h('section', { className: 'dsm-db-content' },
              h('div', { className: 'dsm-db-toolbar' }, h('span', { className: 'dsm-db-title' }, '当前 Index'), h('select', { className: 'dsm-select', value: index, onChange: event => selectIndex(event.target.value) }, h('option', { value: '' }, '全部 Index'), indices.map(item => h('option', { key: item, value: item }, item)))),
              h('div', { className: 'dsm-kv-title' }, h('span', null, 'API Path')),
              h('input', { className: 'dsm-input', value: path, onChange: event => setPath(event.target.value), placeholder: '/index/_search' }),
              h('div', { className: 'dsm-kv-title' }, h('span', null, 'Query DSL')),
              h('textarea', { className: 'dsm-textarea dsm-data-editor', value: body, onChange: event => setBody(event.target.value), placeholder: '{"query":{"match_all":{}}}' }),
              h('div', { className: 'dsm-actions', style: { marginTop: 9 } }, h('button', { className: 'dsm-btn primary', disabled: busy || !path.trim(), onClick: execute }, busy ? '查询中…' : '执行搜索'), h('span', { className: 'dsm-help' }, '默认返回 100 条文档，可直接编辑 Query DSL。')),
              h('div', { className: 'dsm-result dsm-data-result' }, busy ? h('div', { className: 'dsm-empty' }, '正在查询…') : h(DocumentResult, { value: result })),
            ),
          ),
        )
      }

      function MongoWorkspace({ connection, api, onBack, onEdit }) {
        const [databases, setDatabases] = useState([])
        const [database, setDatabase] = useState(connection.database || '')
        const [collections, setCollections] = useState([])
        const [collection, setCollection] = useState('')
        const [filter, setFilter] = useState('{}')
        const [advanced, setAdvanced] = useState('{"action":"find","collection":"users","filter":{}}')
        const [result, setResult] = useState(null)
        const [error, setError] = useState('')
        const [busy, setBusy] = useState(false)
        const loadDatabases = () => {
          setBusy(true); setError('')
          api({ op: 'exec', id: connection.id, params: { op: 'listDatabases' } }).then(response => {
            const items = Array.isArray(response.data?.databases) ? response.data.databases.map(item => String(item.name || '')).filter(Boolean) : []
            setDatabases(items); setDatabase(current => current && (items.length === 0 || items.includes(current)) ? current : items[0] || connection.database || '')
          }).catch(loadError => setError(loadError.message)).finally(() => setBusy(false))
        }
        const loadCollections = db => {
          if (!db) { setCollections([]); return }
          setBusy(true); setError('')
          api({ op: 'exec', id: connection.id, params: { op: 'listCollections', database: db } }).then(response => setCollections(Array.isArray(response.data) ? response.data.map(item => String(item.name || '')).filter(Boolean) : [])).catch(loadError => { setCollections([]); setError(loadError.message) }).finally(() => setBusy(false))
        }
        const executeFind = () => {
          if (!database || !collection) return
          setBusy(true); setResult(null); setError('')
          api({ op: 'exec', id: connection.id, params: { op: 'find', database, collection, filter, limit: 100 } }).then(setResult).catch(runError => setResult({ ok: false, error: runError.message })).finally(() => setBusy(false))
        }
        const executeAdvanced = () => {
          setBusy(true); setResult(null); setError('')
          api({ op: 'exec', id: connection.id, params: { op: 'query', database, text: advanced } }).then(setResult).catch(runError => setResult({ ok: false, error: runError.message })).finally(() => setBusy(false))
        }
        useEffect(() => { loadDatabases() }, [connection.id])
        useEffect(() => { setCollection(''); loadCollections(database) }, [database])
        return h(React.Fragment, null,
          h(WorkspaceHeader, { connection, onBack, onEdit }),
          error ? h('div', { className: 'dsm-error' }, error) : null,
          h('div', { className: 'dsm-db-layout' },
            h('aside', { className: 'dsm-db-sidebar' },
              h('div', { className: 'dsm-db-sidebar-head' }, h('span', null, 'MongoDB Database'), h('button', { className: 'dsm-db-icon-btn', title: '刷新 Database 和 Collection', onClick: loadDatabases }, busy ? '…' : '↻')),
              databases.length ? databases.map(item => h('button', { key: item, className: 'dsm-db-node' + (database === item ? ' active' : ''), onClick: () => setDatabase(item) }, h('span', { className: 'dsm-db-node-icon' }, '🗄️'), h('span', null, item))) : h('div', { className: 'dsm-empty' }, busy ? '加载 Database…' : '没有可用 Database'),
              database ? h('div', { className: 'dsm-db-group' }, h('div', { className: 'dsm-db-group-title' }, `Collection · ${collections.length}`), collections.length ? collections.map(item => h('button', { key: item, className: 'dsm-db-node' + (collection === item ? ' active' : ''), onClick: () => { setCollection(item); setAdvanced(JSON.stringify({ action: 'find', collection: item, filter: {} }, null, 2)) } }, h('span', { className: 'dsm-db-node-icon' }, '▱'), h('span', null, item))) : h('div', { className: 'dsm-help', style: { padding: '4px 8px' } }, '没有 Collection')) : null,
            ),
            h('section', { className: 'dsm-db-content' },
              h('div', { className: 'dsm-db-toolbar' }, h('span', { className: 'dsm-db-title' }, '当前 Database'), h('select', { className: 'dsm-select', value: database, onChange: event => setDatabase(event.target.value) }, h('option', { value: '' }, '请选择 Database'), databases.map(item => h('option', { key: item, value: item }, item)))),
              h('div', { className: 'dsm-kv-title' }, h('span', null, collection ? `查询 Collection · ${collection}` : 'MongoDB 查询')),
              h('input', { className: 'dsm-input', value: collection, onChange: event => setCollection(event.target.value), placeholder: 'Collection 名称' }),
              h('textarea', { className: 'dsm-textarea dsm-data-editor', value: filter, onChange: event => setFilter(event.target.value), placeholder: '{"status":"active"}' }),
              h('div', { className: 'dsm-actions', style: { marginTop: 9 } }, h('button', { className: 'dsm-btn primary', disabled: busy || !database || !collection, onClick: executeFind }, busy ? '查询中…' : '查询文档')),
              h('div', { className: 'dsm-kv-title' }, h('span', null, '高级 JSON 操作')),
              h('textarea', { className: 'dsm-textarea dsm-data-editor', value: advanced, onChange: event => setAdvanced(event.target.value), placeholder: '{"action":"find","collection":"users","filter":{}}' }),
              h('div', { className: 'dsm-actions', style: { marginTop: 9 } }, h('button', { className: 'dsm-btn', disabled: busy || !database || !advanced.trim(), onClick: executeAdvanced }, '执行 JSON 操作')),
              h('div', { className: 'dsm-result dsm-data-result' }, busy ? h('div', { className: 'dsm-empty' }, '正在查询…') : h(DocumentResult, { value: result })),
            ),
          ),
        )
      }

      function CassandraWorkspace({ connection, api, onBack, onEdit }) {
        const [keyspaces, setKeyspaces] = useState([])
        const [keyspace, setKeyspace] = useState(connection.options?.keyspace || connection.database || '')
        const [tables, setTables] = useState([])
        const [table, setTable] = useState('')
        const [cql, setCql] = useState('')
        const [result, setResult] = useState(null)
        const [error, setError] = useState('')
        const [busy, setBusy] = useState(false)
        const loadKeyspaces = () => {
          setBusy(true); setError('')
          api({ op: 'exec', id: connection.id, params: { op: 'listKeyspaces' } }).then(response => {
            const items = resultColumnIndex(response, /keyspace/i) >= 0 ? (response.rows || []).map(row => String(row?.[resultColumnIndex(response, /keyspace/i)] || '')).filter(Boolean) : []
            setKeyspaces(items); setKeyspace(current => current && (items.length === 0 || items.includes(current)) ? current : items[0] || connection.database || '')
          }).catch(loadError => setError(loadError.message)).finally(() => setBusy(false))
        }
        const loadTables = ks => {
          if (!ks) { setTables([]); return }
          setBusy(true); setError('')
          api({ op: 'exec', id: connection.id, params: { op: 'listTables', keyspace: ks } }).then(response => setTables(resultTableNames(response))).catch(loadError => { setTables([]); setError(loadError.message) }).finally(() => setBusy(false))
        }
        const run = params => {
          setBusy(true); setResult(null); setError('')
          api({ op: 'exec', id: connection.id, params: { keyspace, ...params } }).then(setResult).catch(runError => setResult({ ok: false, error: runError.message })).finally(() => setBusy(false))
        }
        const selectTable = next => { setTable(next); const nextCql = tableQuery('postgresql', `${keyspace}.${next}`); setCql(nextCql); run({ op: 'tableData', table: next, limit: 100 }) }
        useEffect(() => { loadKeyspaces() }, [connection.id])
        useEffect(() => { setTable(''); setCql(''); loadTables(keyspace) }, [keyspace])
        return h(React.Fragment, null,
          h(WorkspaceHeader, { connection, onBack, onEdit }),
          error ? h('div', { className: 'dsm-error' }, error) : null,
          h('div', { className: 'dsm-db-layout' },
            h('aside', { className: 'dsm-db-sidebar' },
              h('div', { className: 'dsm-db-sidebar-head' }, h('span', null, 'Cassandra Keyspace'), h('button', { className: 'dsm-db-icon-btn', title: '刷新 Keyspace 和 Table', onClick: loadKeyspaces }, busy ? '…' : '↻')),
              keyspaces.length ? keyspaces.map(item => h('button', { key: item, className: 'dsm-db-node' + (keyspace === item ? ' active' : ''), onClick: () => setKeyspace(item) }, h('span', { className: 'dsm-db-node-icon' }, '🗄️'), h('span', null, item))) : h('div', { className: 'dsm-empty' }, busy ? '加载 Keyspace…' : '没有可用 Keyspace'),
              keyspace ? h('div', { className: 'dsm-db-group' }, h('div', { className: 'dsm-db-group-title' }, `Table · ${tables.length}`), tables.length ? tables.map(item => h('button', { key: item, className: 'dsm-db-node' + (table === item ? ' active' : ''), onClick: () => selectTable(item) }, h('span', { className: 'dsm-db-node-icon' }, '▱'), h('span', null, item))) : h('div', { className: 'dsm-help', style: { padding: '4px 8px' } }, '没有 Table')) : null,
            ),
            h('section', { className: 'dsm-db-content' },
              h('div', { className: 'dsm-db-toolbar' }, h('span', { className: 'dsm-db-title' }, '当前 Keyspace'), h('select', { className: 'dsm-select', value: keyspace, onChange: event => setKeyspace(event.target.value) }, h('option', { value: '' }, '请选择 Keyspace'), keyspaces.map(item => h('option', { key: item, value: item }, item)))),
              h('div', { className: 'dsm-kv-title' }, h('span', null, table ? `查询 Table · ${table}` : 'CQL 查询')),
              h('textarea', { className: 'dsm-textarea dsm-data-editor', value: cql, onChange: event => setCql(event.target.value), placeholder: 'SELECT * FROM keyspace.table LIMIT 100' }),
              h('div', { className: 'dsm-actions', style: { marginTop: 9 } }, h('button', { className: 'dsm-btn primary', disabled: busy || !keyspace || !cql.trim(), onClick: () => run({ op: 'query', cql }) }, busy ? '执行中…' : '执行 CQL'), table ? h('button', { className: 'dsm-btn', disabled: busy, onClick: () => run({ op: 'tableData', table, limit: 100 }) }, '刷新表数据') : null),
              h('div', { className: 'dsm-result dsm-data-result' }, busy ? h('div', { className: 'dsm-empty' }, '正在查询…') : h(Result, { value: result })),
            ),
          ),
        )
      }

      function DataWorkspace({ connection, api, onBack, onEdit }) {
        if (connection.type === 'redis') return h(RedisWorkspace, { connection, api, onBack, onEdit })
        if (connection.type === 'elasticsearch') return h(ElasticsearchWorkspace, { connection, api, onBack, onEdit })
        if (connection.type === 'mongodb') return h(MongoWorkspace, { connection, api, onBack, onEdit })
        return h(CassandraWorkspace, { connection, api, onBack, onEdit })
      }

      function OperationView({ connection, api, onBack, onEdit }) {
        const [op, setOp] = useState('test')
        const [fields, setFields] = useState({ path: '/', key: '', bucket: connection.options?.bucket || '', collection: '', container: '', pattern: '*', tail: '200', limit: '100', value: '', text: '', sql: '', cql: '', body: '', content: '', contentBase64: '', fileName: '', filter: '{}', method: 'GET', prefix: '' })
        const [result, setResult] = useState(null)
        const [busy, setBusy] = useState(false)
        const [terminalId, setTerminalId] = useState('')
        const [terminalText, setTerminalText] = useState('')
        const [terminalInput, setTerminalInput] = useState('')
        const [terminalBusy, setTerminalBusy] = useState(false)
        const terminalOutputRef = useRef(null)
        const set = (key, value) => setFields(current => ({ ...current, [key]: value }))
        const run = () => {
          setBusy(true); setResult(null)
          const params = { op, ...fields }
          api({ op: 'exec', id: connection.id, params }).then(setResult).catch(error => setResult({ ok: false, error: error.message })).finally(() => setBusy(false))
        }
        const appendTerminal = value => {
          const text = normalizeTerminalText(value?.text)
          if (text) setTerminalText(current => current + text)
        }
        const terminalRequest = (operation, extra = {}) => api({ op: 'exec', id: connection.id, params: { op: operation, terminalId, ...extra } })
        const openTerminal = () => {
          setTerminalBusy(true)
          terminalRequest('terminalOpen', { terminalId: undefined }).then(value => { setTerminalId(value.terminalId || ''); setTerminalText(normalizeTerminalText(value.text)) }).catch(error => setTerminalText(current => current + `\n[连接失败] ${normalizeTerminalText(error.message)}\n`)).finally(() => setTerminalBusy(false))
        }
        const sendTerminal = () => {
          if (!terminalId || !terminalInput) return
          const data = terminalInput + '\n'
          setTerminalInput('')
          terminalRequest('terminalWrite', { data }).then(appendTerminal).catch(error => setTerminalText(current => current + `\n[发送失败] ${normalizeTerminalText(error.message)}\n`))
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
        useEffect(() => {
          const output = terminalOutputRef.current
          if (output) output.scrollTop = output.scrollHeight
        }, [terminalText])
        useEffect(() => () => { if (terminalId) api({ op: 'exec', id: connection.id, params: { op: 'terminalClose', terminalId } }).catch(() => {}) }, [connection.id, terminalId])
        const queryLabel = ['mysql', 'mariadb', 'postgresql', 'mssql'].includes(connection.type) ? 'SQL' : connection.type === 'cassandra' ? 'CQL' : connection.type === 'mongodb' ? 'JSON 操作' : connection.type === 'elasticsearch' ? 'JSON Body' : '命令 / 查询'
        const queryKey = ['mysql', 'mariadb', 'postgresql', 'mssql'].includes(connection.type) ? 'sql' : connection.type === 'cassandra' ? 'cql' : connection.type === 'elasticsearch' ? 'body' : 'text'
        const needsQuery = ['query', 'exec'].includes(op)
        const authIssue = credentialIssue(connection)
        return h(React.Fragment, null,
          h('div', { className: 'dsm-actions dsm-operation-head', style: { marginTop: 0 } }, h('button', { className: 'dsm-btn', onClick: onBack }, '← 返回连接列表'), h('span', { className: 'dsm-title' }, `${connection.name} · ${typeLabel(connection.type)}`), h('span', { className: 'dsm-sub' }, `${connection.host || '本机'}${connection.port ? ':' + connection.port : ''}`), onEdit ? h('button', { className: 'dsm-btn', onClick: onEdit }, '编辑连接') : null),
          authIssue ? h('div', { className: 'dsm-error dsm-notice' }, h('span', null, `此连接未配置${authIssue}。`), onEdit ? h('button', { className: 'dsm-btn', onClick: onEdit }, '补录凭据') : null) : null,
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
            connection.type === 'redis' && op === 'listKeys' ? h(Field, { label: 'Key Pattern', value: fields.pattern, onChange: value => set('pattern', value), placeholder: '*' }) : null,
            connection.type === 'docker' && op === 'logs' ? h(Field, { label: '日志行数', value: fields.tail, onChange: value => set('tail', value), type: 'number' }) : null,
            connection.type === 'mongodb' && op === 'find' ? h(Field, { label: '返回数量', value: fields.limit, onChange: value => set('limit', value), type: 'number' }) : null,
            needsQuery ? h('div', { className: 'dsm-field wide' }, h('label', { className: 'dsm-label' }, queryLabel), h('textarea', { className: 'dsm-textarea', value: fields[queryKey], onChange: event => set(queryKey, event.target.value), placeholder: connection.type === 'mongodb' ? '{"action":"find","collection":"users","filter":{}}' : connection.type === 'redis' ? '["GET","key"]' : '' })) : null,
            op === 'find' ? h(Field, { label: 'Filter JSON', value: fields.filter, onChange: value => set('filter', value) }) : null,
            ['writeFile', 'writeObject'].includes(op) ? h('div', { className: 'dsm-field wide' }, h('label', { className: 'dsm-label' }, '写入内容'), h('textarea', { className: 'dsm-textarea', value: fields.content, onChange: event => set('content', event.target.value) })) : null,
            op === 'uploadFile' ? h('div', { className: 'dsm-field wide' }, h('label', { className: 'dsm-label' }, '选择本地文件'), h('input', { className: 'dsm-input', type: 'file', onChange: event => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { const value = String(reader.result || ''); set('contentBase64', value.includes(',') ? value.slice(value.indexOf(',') + 1) : value); set('fileName', file.name) }; reader.readAsDataURL(file) } }), fields.fileName ? h('div', { className: 'dsm-help' }, `${fields.fileName} · 将写入 ${fields.path}`) : null) : null,
            ['setKey'].includes(op) ? h(Field, { label: 'Value', value: fields.value || '', onChange: value => set('value', value), wide: true }) : null,
          ),
          op === 'terminal' ? h('div', { className: 'dsm-terminal-wrap' }, h('div', { className: 'dsm-actions', style: { marginTop: 8 } }, !terminalId ? h('button', { className: 'dsm-btn primary', disabled: terminalBusy, onClick: openTerminal }, terminalBusy ? '连接中…' : '打开远程终端') : h('button', { className: 'dsm-btn danger', onClick: closeTerminal }, '关闭终端'), h('span', { className: 'dsm-help' }, terminalId ? '已连接；输入命令后按 Enter 执行。' : '使用 SSH shell 建立远程终端会话。')), h('pre', { ref: terminalOutputRef, className: 'dsm-terminal-output' }, terminalText || '终端输出将在这里显示'), h('textarea', { className: 'dsm-textarea dsm-terminal-input', disabled: !terminalId, value: terminalInput, onChange: event => setTerminalInput(event.target.value), onKeyDown: event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendTerminal() } }, placeholder: terminalId ? '输入远程命令，Enter 执行' : '请先打开终端' })) : h('div', { className: 'dsm-actions' }, h('button', { className: 'dsm-btn primary', disabled: busy, onClick: run }, busy ? '执行中…' : '执行操作'), h('span', { className: 'dsm-help' }, '写入、删除和容器控制操作会直接作用于远端服务。')),
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
            h('aside', { className: 'dsm-list' }, connections.length ? connections.map(connection => h('button', { key: connection.id, className: 'dsm-card' + (selected?.id === connection.id ? ' active' : ''), onClick: () => { setWorkspace(connection); setEditing(null) } }, h('span', { className: 'dsm-card-icon' }, TYPE_META[connection.type]?.icon || '🔌'), h('span', { className: 'dsm-card-copy' }, h('span', { className: 'dsm-card-name' }, connection.name), h('span', { className: 'dsm-card-meta' }, h('span', { className: 'dsm-dot ' + (sdk[connection.type] === false || missingCredential(connection) ? 'bad' : '') }), `${typeLabel(connection.type)} · ${connection.host || '本机'}${connection.port ? ':' + connection.port : ''}`)), h('span', { className: 'dsm-sub' }, '›'))) : h('div', { className: 'dsm-empty' }, '还没有服务连接\n点击右上角新建'),
              h('div', { className: 'dsm-help', style: { marginTop: 14 } }, '支持 FTP、SSH、Redis、MySQL、MariaDB、PostgreSQL、SQL Server、Elasticsearch、Docker、MongoDB、Cassandra 和各种 S3。'),
            ),
            h('main', { className: 'dsm-main' }, editing ? h(ConnectionForm, { value: editing, api, onCancel: () => setEditing(null), onSaved: connection => { setEditing(null); setConnections(list => list.some(item => item.id === connection.id) ? list.map(item => item.id === connection.id ? connection : item) : [...list, connection]) } }) : selected ? (RELATIONAL_TYPES.has(selected.type) ? h(DatabaseWorkspace, { key: selected.id, connection: selected, api, onBack: () => setWorkspace(null), onEdit: () => setEditing(selected) }) : DATA_WORKSPACE_TYPES.has(selected.type) ? h(DataWorkspace, { key: selected.id, connection: selected, api, onBack: () => setWorkspace(null), onEdit: () => setEditing(selected) }) : h(OperationView, { key: selected.id, connection: selected, api, onBack: () => setWorkspace(null), onEdit: () => setEditing(selected) })) : h('div', { className: 'dsm-empty' }, '从左侧选择连接，或创建一个新的服务连接。')),
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
