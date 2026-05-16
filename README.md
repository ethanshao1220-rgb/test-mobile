# 健身饮食管理 Web 应用

基于 `VibeCoding-饮食管理软件开发文档.md` 实现的 MVP。

## 启动

```bash
python3 server/app.py
```

访问：`http://localhost:3000`

移动端预览建议使用浏览器设备模拟器，选择 iPhone/Android 视口后刷新页面。当前版本已按移动端 Web / PWA 优先调整，并提供 `public/manifest.json`；暂未启用 Service Worker，避免开发阶段缓存干扰。

## 功能

- 数据页：今日打卡状态、今日完成度、热量摄入、建议、周报入口
- 记录页：当天汇总、已记录食物、全屏搜索添加饮食记录、编辑/删除记录
- 个人页：基础资料、身体信息、目标设置、软件设置
- 周报页：本周 vs 上周、每日表现、建议

## 数据

使用 SQLite，数据库文件位于：`server/data/app.db`。首次启动会自动建表并写入种子数据。