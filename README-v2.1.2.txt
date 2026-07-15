Meridian Chat SDK v2.1.2
Admin Authentication

==================================================
一、功能
==================================================

- 独立后台登录页
- bcrypt 密码哈希
- MongoDB 持久化 Admin Session
- HttpOnly Cookie
- Render HTTPS Secure Cookie
- /admin 和 /admin.html 页面保护
- 后台状态 API 保护
- 旧版 Session Restore API 保护
- 历史消息 API 保护
- 客服管理 API 保护
- 会话分配 API 保护
- Admin Socket Session 鉴权
- admin_reply 服务端权限校验
- 后台消息只推送给认证管理员
- 登录失败频率限制
- Session 过期跳转登录页
- 退出登录

==================================================
二、替换文件
==================================================

server.js
package.json
package-lock.json
.gitignore

public/admin.html
public/css/admin.css
public/js/admin/admin.js
public/js/admin/admin-socket.js
public/js/admin/history-loader.js

server/config/server-config.js
server/socket/chat-handler.js
server/socket/presence-handler.js
server/routes/message-route.js
server/routes/admin-state-route.js
server/routes/agent-route.js
server/routes/session-agent-route.js

==================================================
三、新增文件
==================================================

.env.example

public/admin-login.html
public/css/admin-login.css
public/js/admin/admin-login.js
public/js/admin/admin-auth.js

server/config/session-config.js
server/middleware/admin-auth-middleware.js
server/middleware/admin-socket-auth.js
server/middleware/login-rate-limit.js
server/routes/admin-auth-route.js
server/routes/admin-page-route.js
server/services/admin-auth-service.js
server/scripts/generate-admin-password-hash.js
server/views/admin.html

==================================================
四、为什么 upload-route.js 没有加登录保护
==================================================

当前 /api/upload 同时被用户端和后台端使用。
如果整体加入 Admin 鉴权，用户将无法发送图片。

本版本保护的是后台页面、后台数据 API、客服管理 API
以及 Admin Socket 权限。上传接口的限流、持久化存储和
进一步安全拆分放到下一阶段。

==================================================
五、安装依赖
==================================================

在项目根目录 CMD 执行：

npm install

新增依赖：

bcryptjs
express-session
connect-mongo
mongodb

==================================================
六、生成密码哈希
==================================================

CMD 执行：

npm run admin:hash

按照提示输入两次密码。
密码不会显示，只显示 *。

成功后会输出：

ADMIN_PASSWORD_HASH=$2b$12$......

复制整行中的哈希部分。

==================================================
七、本地 .env
==================================================

复制：

.env.example

重命名为：

.env

至少配置：

MONGODB_URI=你的MongoDB地址
ADMIN_USERNAME=你的管理员账号
ADMIN_PASSWORD_HASH=刚生成的哈希
SESSION_SECRET=至少32位随机字符串
SESSION_MAX_AGE_HOURS=12
NODE_ENV=development

SESSION_SECRET 可以在 CMD 中用 Node 生成：

node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

==================================================
八、本地测试
==================================================

启动：

node server.js

打开：

http://localhost:3000/admin.html

预期：

1. 自动跳转到 /admin-login.html
2. 错误账号或密码无法登录
3. 正确账号密码进入后台
4. 普通文字、图片、Link Card、自动回复正常
5. 点击 Sign Out 返回登录页
6. 退出后直接访问 /admin.html 会再次跳登录页
7. 未登录访问 /api/admin/state 返回 401
8. 未登录访问 /api/messages/任意用户 返回 401

==================================================
九、Render 环境变量
==================================================

Render → Service → Environment 增加：

ADMIN_USERNAME
ADMIN_PASSWORD_HASH
SESSION_SECRET
SESSION_MAX_AGE_HOURS=12
NODE_ENV=production

保留现有：

MONGODB_URI

不要设置：

ADMIN_PASSWORD=明文密码

==================================================
十、提交 Git 前检查
==================================================

不要提交：

.env
node_modules/
server/uploads/

可以提交：

.env.example
package.json
package-lock.json
所有本次代码文件
