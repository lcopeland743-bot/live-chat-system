# Meridian Chat SDK v2.3.6 Online Silent Visitor Hotfix

## 问题

后台“在线访客”会显示未发言访客，但点击该访客时无法选中会话。

## 根因

v2.3.6 将未发言访客从 `sessions` 有效会话数组中排除；在线访客点击逻辑仍只在 `sessions` 中查找，因此找不到未发言访客。

## 修复

- 保持“访客会话”只显示有消息的有效会话。
- 在线访客可从 Presence 数据中选中。
- 未发言访客选中后显示空会话提示。
- 保留 `socketId`，允许客服主动发送第一条消息。
- 未发言访客离线后仍不会进入“离线访客”列表。
- 后台状态恢复时先加载 Presence，再恢复当前选择。

## 替换文件

- `public/js/admin/admin-state.js`
- `public/js/admin/admin-socket.js`
- `public/js/admin/admin-ui.js`
- `public/css/admin.css`
- `tests/admin-visitor-overview.test.js`

## 安装

停止 `npm start` 后，将补丁中的文件按原目录覆盖到项目根目录。

不要覆盖 `.env`。本补丁不包含 `.env`。

## 测试

```cmd
node --check public\js\admin\admin-state.js
node --check public\js\admin\admin-socket.js
node --check public\js\admin\admin-ui.js
node --check tests\admin-visitor-overview.test.js
npm run test:visitor-stats
npm start
```
