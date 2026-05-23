# 健身饮食管理应用：运行与交接说明

本文件只负责：

- 快速说明文档分工
- 提供启动命令
- 提供最低验证清单
- 提供交接时应关注的运行风险

不在这里维护长期项目事实、产品需求或工程规则。

## 文档分工

- 产品需求、功能边界、流程设计与优先级：`VibeCoding-饮食管理软件开发文档.md`
- 项目规则与工程约束：`.cursor/rules/mobile-first-diet-tracker.mdc`
- 项目事实、当前架构状态、核心链路状态、数据合同状态：`.cursor/PROJECT_MEMORY.md`
- 本文档：运行与交接说明

## 项目结构

当前项目包含三部分：

1. 旧 Web MVP
   - `public/`
   - `server/app.py`

2. 新后端
   - `backend/`

3. 新移动端
   - `mobile/`

原则：保留旧 Web MVP，主增量工作优先进入 `mobile/ + backend/`。

## 启动命令

### 旧 Web MVP

```bash
python3 server/app.py
```

访问：`http://localhost:3000`

### 新后端

```bash
python3 -m pip install -r backend/requirements.txt
npm run backend:dev
```

健康检查：`http://localhost:8000/health`

### 新移动端

```bash
npm --prefix mobile install
npm run mobile:dev
```

真机调试时，将 `EXPO_PUBLIC_API_BASE_URL` 指向电脑局域网地址。

## 最低验证清单

开始新一轮功能开发前，至少确认：

1. 后端可启动
2. `/health` 正常返回
3. Expo 可启动
4. 移动端能连接到当前后端地址

推荐顺序：

```bash
npm run backend:test
npm run backend:dev
npm run mobile:dev
```

## 交接时重点说明

交接给下一个协作者时，至少说明：

- 这次改的是 `public/`、`backend/` 还是 `mobile/`
- 改动是否触及核心链路：`plan -> food log -> exercise log -> today dashboard`
- 是否改了数据模型或 API 合同
- 做了哪些验证
- 还剩哪些风险或未完成项

## 当前运行风险

以下风险在继续开发前要优先意识到：

- 项目处于迁移期，旧 Web MVP、新后端、新移动端并存
- 真机调试时最常见问题是 API 地址配置错误
- 生产目标仍是 PostgreSQL，当前本地仍可能使用 SQLite fallback
- 离线队列、自动重试、同步状态仍需持续补强

## 不要在这里维护的内容

以下内容不要继续堆进本文件：

- 长期产品需求
- 页面流程细节
- 数据合同细节
- 工程规则全文
- 大段架构事实快照

这些内容分别维护在 PRD、rules、memory 中。