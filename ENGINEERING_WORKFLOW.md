# 规范执行说明

本文件只维护规范执行入口，不重复长期产品事实或架构说明。

## 统一范围

- 全仓库文档分工统一
- `mobile/` 和 `backend/` 纳入强制检查
- 旧 Web MVP（`public/`、`server/`、根目录 `index.html`）保留运行，不纳入自动格式化

## 本地开发前提

- Python 3.14+
- Node.js 22+ 与 `npm`

## 安装依赖

### backend

```bash
python3 -m pip install -r backend/requirements.txt
```

### mobile

```bash
npm --prefix mobile install
```

## 日常命令

### 后端

```bash
npm run backend:lint
npm run backend:format
npm run backend:format:check
npm run backend:test
```

### 移动端

```bash
npm run mobile:lint
npm run mobile:format
npm run mobile:format:check
npm run mobile:typecheck
npm run mobile:test
```

### 仓库级检查

```bash
npm run check
npm run format
```

## 提交门禁

- 提交前执行脚本：`scripts/pre-commit.sh`
- 本地缺少 `npm` 或 `python3` 时，提交会被阻断
- 当前仓库已安装真实本地钩子：`.git/hooks/pre-commit`
- 仓库内可审计的门禁逻辑统一维护在 `scripts/pre-commit.sh`

## CI

GitHub Actions 工作流：`.github/workflows/quality.yml`

CI 会执行：
- backend lint
- backend format check
- backend tests
- mobile install
- mobile lint
- mobile format check
- mobile typecheck
- mobile tests

## 例外边界

以下目录当前不纳入统一格式化：
- `public/`
- `server/`
- 根目录旧 Web `index.html`

原因：当前仍处于迁移期，旧 Web 只做最低维护，不做风格重排。