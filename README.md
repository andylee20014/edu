# 邮箱前缀管理系统

这是一个基于Node.js和Express的邮箱前缀管理系统，用于管理多个邮箱域名下的邮箱账号。系统支持邮箱前缀的添加、修改、禁用和批量导入功能，并提供邮件查看功能。

## 功能特点

### 前缀管理
- 添加/修改单个邮箱前缀
- 批量导入邮箱前缀（支持多种格式）
- 自动生成批量邮箱账号
- 启用/禁用邮箱前缀
- 邮箱前缀列表管理（分页显示、搜索、批量删除）

### 邮件功能
- 邮件查看和访问
- 邮件内容解析（支持HTML和纯文本）
- 自动检测邮件编码并正确显示

### 安全特性
- 基于密钥的管理员验证
- 前缀访问密码验证
- 域名白名单限制

## 技术架构

- **后端**：Node.js + Express
- **前端**：原生JavaScript + HTML + CSS
- **邮件处理**：使用node-imap和mailparser库
- **数据存储**：本地JSON文件

## 安装指南

### 环境要求
- Node.js >= 12.x
- npm >= 6.x

### 安装步骤

1. 克隆项目代码
```bash
git clone https://github.com/username/email-system.git  # 替换为实际仓库地址
cd email-system
```

2. 安装依赖
```bash
npm install
```

3. 创建环境配置文件
将`.env.example`复制为`.env`，并根据实际情况修改配置：
```bash
cp .env.example .env
nano .env  # 或使用其他编辑器如vim
```

4. 确保数据目录存在
```bash
mkdir -p data
```

5. 启动服务
```bash
npm start  # 或直接使用 node server.js
```

## 配置说明

系统通过`.env`文件进行配置，主要配置项包括：

### 基本配置
```
PORT=3000                         # 服务器端口
PREFIX_DB_PATH=./data/prefixes.json  # 前缀数据库路径
ADMIN_KEY=your_admin_key          # 管理员密钥 (避免使用特殊字符，可能导致认证问题)
```

### 邮箱配置
```
# 主邮箱配置
MAIN_EMAIL=example@domain.com     # 主邮箱地址
MAIN_EMAIL_PASSWORD=password      # 主邮箱密码
MAIL_SERVER=mail.domain.com       # 邮件服务器
MAIL_SERVER_IMAP_PORT=993        # IMAP端口
MAIL_SERVER_SMTP_PORT=465        # SMTP端口
MAIL_DOMAIN=domain.com            # 主邮箱域名

# 第二个邮箱配置（可选）
SECOND_EMAIL=example2@domain2.com    # 第二邮箱地址
SECOND_EMAIL_PASSWORD=password    # 第二邮箱密码
SECOND_MAIL_SERVER=mail.domain2.com  # 第二邮件服务器
SECOND_MAIL_SERVER_IMAP_PORT=993    # IMAP端口
SECOND_MAIL_SERVER_SMTP_PORT=465    # SMTP端口
SECOND_MAIL_DOMAIN=domain2.com    # 第二邮箱域名

# 系统配置
ALLOWED_DOMAINS=domain.com,domain2.com  # 允许的域名列表，用逗号分隔
```

## 使用说明

### 访问系统

- **管理员界面**：`http://您的域名或IP:端口/admin.html`
- **用户界面**：`http://您的域名或IP:端口/`

### 管理员登录

1. 访问管理员界面
2. 输入在`.env`文件中设置的`ADMIN_KEY`
3. 点击"登录"按钮

### 添加/修改邮箱前缀

1. 在"邮箱前缀"输入框中输入前缀
2. 选择域名
3. 输入访问密码
4. 点击"添加/更新"按钮

### 批量导入邮箱

支持以下格式的批量导入：

1. 逗号分隔：`前缀,密码`（例如：`user1,123456`）
2. 空格分隔：`前缀 密码`（例如：`user1 123456`）
3. 制表符分隔：`前缀[Tab]密码`（适合从Excel复制）
4. 完整邮箱格式：`前缀@域名,密码`（例如：`user1@domain.com,123456`）

**操作步骤**：
1. 在批量导入文本框中粘贴数据
2. 根据需要勾选"使用前缀作为默认密码"选项
3. 点击"批量导入"按钮

### 自动生成邮箱

1. 点击"自动生成邮箱"按钮
2. 配置参数：
   - 邮箱数量（建议不超过100个）
   - 前缀格式（如"user"）
   - 起始编号（如1）
   - 选择域名
   - 密码选项（使用前缀作为密码、随机密码或固定密码）
3. 点击"生成"按钮
4. 生成的邮箱将显示在批量导入文本框中，点击"批量导入"按钮完成导入

### 管理已有邮箱

- **查看列表**：账号列表分页显示，可调整每页显示数量
- **刷新列表**：点击"刷新列表"按钮
- **复制信息**：点击邮箱或密码旁边的复制图标
- **批量操作**：使用复选框选择多个账号，然后执行批量删除
- **切换状态**：点击"启用/禁用"按钮修改账号状态
- **删除账号**：点击"删除"按钮

### 查看邮件（用户界面）

1. 访问用户界面
2. 输入完整邮箱地址和密码
3. 点击"登录"按钮查看邮件

## 常用维护命令

### 本地开发与调试

```bash
# 普通启动
node server.js

# 使用nodemon自动重启（开发模式）
npx nodemon server.js

# 查看应用日志
tail -f logs/app.log  # 如果配置了日志文件
```

### 服务器运维命令

```bash
# 查看运行状态
pm2 status

# 查看应用日志
pm2 logs email-system

# 查看实时日志
pm2 logs email-system --lines 100

# 重启应用
pm2 restart email-system

# 停止应用
pm2 stop email-system

# 删除应用（完全停止）
pm2 delete email-system

# 启动应用（单实例模式）
pm2 start server.js --name email-system

# 设置开机自启
pm2 save
pm2 startup
```

### 数据管理

```bash
# 手动备份数据
cp ./data/prefixes.json ./data/prefixes_backup_$(date +%Y%m%d).json

# 恢复数据
cp ./data/prefixes_backup_YYYYMMDD.json ./data/prefixes.json

# 查看数据文件内容
cat ./data/prefixes.json | jq .  # 如果安装了jq工具
```

### Nginx相关命令

```bash
# 查看Nginx状态
sudo systemctl status nginx

# 启动Nginx
sudo systemctl start nginx

# 重启Nginx
sudo systemctl restart nginx

# 重新加载配置（不中断服务）
sudo systemctl reload nginx

# 检查Nginx配置
sudo nginx -t

# 查看错误日志
sudo tail -f /var/log/nginx/error.log
```

### 防火墙相关命令

```bash
# 查看防火墙状态
sudo firewall-cmd --state

# 查看开放端口
sudo firewall-cmd --list-all

# 临时开放端口
sudo firewall-cmd --add-port=3000/tcp

# 永久开放端口
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

### Git与代码更新

```bash
# 更新代码
cd ~/email-system
git pull

# 如果有本地修改冲突
git stash
git pull
git stash pop  # 尝试恢复本地修改

# 完全覆盖本地修改（谨慎使用）
git fetch --all
git reset --hard origin/main  # 或origin/master，取决于分支名
git pull
```

## 部署指南

### 本地开发环境部署

参考上述[安装指南](#安装指南)部分。

### 服务器部署

由于系统使用本地JSON文件存储和IMAP长连接，建议部署在传统服务器上而非Vercel等无状态平台。以下指南针对CentOS 8系统，其他Linux发行版可能需要调整相应命令。

> **注意**: CentOS 8已于2021年12月31日结束生命周期。建议考虑使用Rocky Linux 8或AlmaLinux 8作为替代，这些系统与CentOS 8高度兼容，命令基本相同。

#### 1. 服务器准备

1. **购买服务器**：
   - 推荐配置：1-2核CPU、2GB内存、CentOS 8/Rocky Linux 8/AlmaLinux 8

2. **域名设置**（可选）：
   - 购买域名并设置DNS A记录指向服务器IP

#### 2. 服务器基础配置

登录服务器:
```bash
ssh root@你的服务器IP
```

更新系统:
```bash
dnf update -y
```

创建非root用户（可选但推荐）:
```bash
useradd -m appuser
passwd appuser
usermod -aG wheel appuser
su - appuser
```

#### 3. 安装必要软件

安装Node.js:
```bash
# 安装Node.js源
sudo dnf module install nodejs:16 -y

# 或者使用官方脚本
# curl -fsSL https://rpm.nodesource.com/setup_16.x | sudo bash -
# sudo dnf install -y nodejs
```

安装Git:
```bash
sudo dnf install git -y
```

安装PM2（进程管理器）:
```bash
sudo npm install -g pm2
```

#### 4. 部署应用

克隆代码:
```bash
cd ~
git clone https://github.com/username/email-system.git  # 替换为实际仓库地址
cd email-system
```

安装依赖:
```bash
npm install
```

创建配置文件:
```bash
cp .env.example .env
nano .env
```

创建数据目录:
```bash
mkdir -p data
```

使用PM2启动应用:
```bash
pm2 start server.js --name email-system
```

设置自启动:
```bash
pm2 startup
# 执行上面命令输出的指令
pm2 save
```

#### 5. 配置Nginx反向代理（推荐）

安装Nginx:
```bash
sudo dnf install nginx -y
```

创建配置文件:
```bash
sudo nano /etc/nginx/conf.d/email-system.conf
```

配置内容:
```nginx
server {
    listen 80;
    server_name yourdomain.com;  # 替换为您的域名或服务器IP

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API请求特别配置（避免跨域问题）
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用配置:
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### 6. 配置HTTPS（强烈推荐）

安装Certbot:
```bash
sudo dnf install epel-release -y
sudo dnf install certbot python3-certbot-nginx -y
```

获取SSL证书:
```bash
sudo certbot --nginx -d yourdomain.com
```

#### 7. 安全设置

配置防火墙:
```bash
sudo systemctl start firewalld
sudo systemctl enable firewalld
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

#### 8. 维护与更新

查看应用状态:
```bash
pm2 status
pm2 logs email-system
```

更新应用:
```bash
cd ~/email-system
git pull
npm install
pm2 restart email-system
```

数据备份:
```bash
# 创建备份目录
mkdir -p ~/backups

# 创建备份脚本
nano ~/backup.sh
```

备份脚本内容:
```bash
#!/bin/bash
DATE=$(date +%Y-%m-%d)
cp ~/email-system/data/prefixes.json ~/backups/prefixes-$DATE.json

# 保留最近30天的备份，删除更早的
find ~/backups -name "prefixes-*.json" -type f -mtime +30 -delete
```

设置定期任务:
```bash
chmod +x ~/backup.sh

# 编辑crontab
crontab -e

# 添加以下行（每天凌晨3点备份）
0 3 * * * /home/appuser/backup.sh

# 如果遇到权限问题，可以使用绝对路径
# 0 3 * * * /bin/bash /home/appuser/backup.sh
```

## 高级设置

### SMTP邮件设置

如需开启邮件发送功能，在`.env`文件中配置SMTP参数：

```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_password
SMTP_SECURE=false  # true for 465, false for other ports
```

### 修改管理员密钥

如果需要更改管理员密钥：

1. 编辑`.env`文件
```bash
nano .env
```

2. 修改ADMIN_KEY的值（避免使用特殊字符，可能导致认证问题）
```
ADMIN_KEY=new_admin_key
```

3. 重启应用
```bash
pm2 restart email-system
```

## API文档

### 前缀管理API

#### 获取管理员密钥
```
GET /api/admin/key
```

#### 添加/更新前缀
```
POST /api/admin/prefixes
Body: { adminKey, prefix, password, domain }
```

#### 删除前缀
```
DELETE /api/admin/prefixes/:prefixKey
Body: { adminKey }
```

#### 切换前缀状态
```
PUT /api/admin/prefixes/:prefixKey/status
Body: { adminKey, active }
```

#### 获取所有前缀
```
GET /api/admin/prefixes?adminKey=xxx
```

#### 批量添加前缀
```
POST /api/admin/batch-prefixes
Body: { adminKey, records: [{ prefix, password, domain }] }
```

### 邮件访问API

#### 检查邮件
```
POST /api/check-emails
Body: { email, password }
```

## 数据存储

系统使用本地JSON文件存储前缀数据，默认路径为`./data/prefixes.json`。数据格式如下：

```json
{
  "prefixes": {
    "user1@domain.com": {
      "password": "password1",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "active": true,
      "domain": "domain.com"
    },
    "user2": {
      "password": "password2",
      "createdAt": "2023-01-02T00:00:00.000Z",
      "active": false
    }
  }
}
```

## 常见问题与故障排除

### 修改环境变量后不生效
- 确保修改.env文件后已重启应用：`pm2 restart email-system`
- 检查.env文件是否有语法错误：引号不匹配、特殊字符等

### 管理员密钥无效
- 避免在ADMIN_KEY中使用特殊字符，可能导致认证问题
- 检查浏览器开发者工具(F12)中的网络请求，确认密钥传递正确

### 邮件无法加载
- 检查邮箱配置是否正确
- 确认IMAP服务器是否可访问
- 查看服务器日志了解详细错误信息：`pm2 logs email-system`
- 检查防火墙是否允许IMAP连接：`sudo firewall-cmd --list-all`
- 验证邮箱凭据是否正确：在其他邮件客户端尝试登录

### 批量导入失败
- 确认导入格式是否正确
- 检查管理员密钥是否有效
- 查看浏览器控制台获取更多错误信息：按F12打开开发者工具
- 查看服务器日志：`pm2 logs email-system`

### 服务器部署问题
- **应用无法启动**: 检查 `pm2 logs email-system` 查看错误日志
- **端口冲突**: 使用 `sudo ss -tulpn | grep 3000` 检查端口是否被占用
- **无法访问网站**: 
  - 检查 Nginx 状态：`sudo systemctl status nginx`
  - 检查防火墙设置：`sudo firewall-cmd --list-all`
  - 检查SELinux状态：`sudo sestatus`（如果启用，可能需要配置允许Nginx访问）
- **SELinux问题**: 如果遇到权限问题，可以尝试设置SELinux上下文或临时禁用：
  ```bash
  # 允许Nginx作为反向代理
  sudo setsebool -P httpd_can_network_connect 1
  
  # 或临时禁用SELinux（不推荐生产环境）
  sudo setenforce 0
  ```
- **SSL证书问题**: 运行 `sudo certbot --nginx` 重新配置证书

## 性能优化建议

1. **增加缓存层**：对频繁读取的数据添加内存缓存
2. **分页加载**：大量邮件使用分页加载，避免一次加载过多
3. **压缩响应**：添加gzip压缩减少传输量
4. **监控资源**：定期检查CPU、内存使用情况
   ```bash
   # 查看系统资源
   top
   free -h
   df -h
   ```

## 贡献与开发

欢迎贡献代码和提交问题！请遵循以下步骤：

1. Fork项目
2. 创建功能分支：`git checkout -b feature/new-feature`
3. 提交更改：`git commit -m 'Add new feature'`
4. 推送到分支：`git push origin feature/new-feature`
5. 提交Pull Request

## 许可证

[MIT](LICENSE) 