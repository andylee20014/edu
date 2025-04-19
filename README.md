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
git clone <仓库地址>
cd <项目文件夹>
```

2. 安装依赖
```bash
npm install
```

3. 创建环境配置文件
将`.env.example`复制为`.env`，并根据实际情况修改配置：
```bash
cp .env.example .env
```

4. 确保数据目录存在
```bash
mkdir -p data
```

5. 启动服务
```bash
npm start
```

## 配置说明

系统通过`.env`文件进行配置，主要配置项包括：

### 基本配置
```
PORT=3000                         # 服务器端口
PREFIX_DB_PATH=./data/prefixes.json  # 前缀数据库路径
ADMIN_KEY=your_admin_key          # 管理员密钥
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

### 管理员界面

访问`http://localhost:3000/admin.html`进入管理员界面，系统会自动读取环境变量中的管理员密钥进行身份验证。

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

### 自动生成邮箱

1. 点击"自动生成邮箱"按钮
2. 配置邮箱数量、前缀格式、起始编号和域名
3. 选择密码选项（使用前缀作为密码或固定密码）
4. 点击"生成"按钮

### 查看邮件（用户界面）

用户可以通过`http://localhost:3000`访问前端界面，使用已授权的邮箱前缀和密码登录查看邮件。

## 部署指南

### 本地开发环境部署

参考上述[安装指南](#安装指南)部分。

### 服务器部署

由于系统使用本地JSON文件存储和IMAP长连接，建议部署在传统服务器上而非Vercel等无状态平台。

#### 1. 服务器准备

1. **购买服务器**：
   - 推荐配置：1-2核CPU、2GB内存、Ubuntu 20.04/22.04 LTS

2. **域名设置**（可选）：
   - 购买域名并设置DNS A记录指向服务器IP

#### 2. 服务器基础配置

登录服务器:
```bash
ssh root@你的服务器IP
```

更新系统:
```bash
apt update && apt upgrade -y
```

创建非root用户（可选但推荐）:
```bash
adduser appuser
usermod -aG sudo appuser
su - appuser
```

#### 3. 安装必要软件

安装Node.js:
```bash
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs
```

安装Git:
```bash
sudo apt install git -y
```

安装PM2（进程管理器）:
```bash
sudo npm install -g pm2
```

#### 4. 部署应用

克隆代码:
```bash
cd ~
git clone <仓库URL> email-system
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
sudo apt install nginx -y
```

创建配置文件:
```bash
sudo nano /etc/nginx/sites-available/email-system
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
}
```

启用配置:
```bash
sudo ln -s /etc/nginx/sites-available/email-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 6. 配置HTTPS（强烈推荐）

安装Certbot:
```bash
sudo apt install certbot python3-certbot-nginx -y
```

获取SSL证书:
```bash
sudo certbot --nginx -d yourdomain.com
```

#### 7. 安全设置

配置防火墙:
```bash
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
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
```

设置定期任务:
```bash
chmod +x ~/backup.sh
crontab -e
# 添加以下行（每天凌晨3点备份）
0 3 * * * /home/appuser/backup.sh
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

## 故障排除

### 邮件无法加载
- 检查邮箱配置是否正确
- 确认IMAP服务器是否可访问
- 查看服务器日志了解详细错误信息

### 批量导入失败
- 确认导入格式是否正确
- 检查管理员密钥是否有效
- 查看浏览器控制台获取更多错误信息

### 服务器部署问题
- **应用无法启动**: 检查 `pm2 logs email-system` 查看错误日志
- **无法访问网站**: 检查 Nginx 配置和防火墙设置
- **SSL证书问题**: 运行 `sudo certbot --nginx` 重新配置证书

## 贡献与开发

欢迎贡献代码和提交问题！请遵循以下步骤：

1. Fork项目
2. 创建功能分支：`git checkout -b feature/new-feature`
3. 提交更改：`git commit -m 'Add new feature'`
4. 推送到分支：`git push origin feature/new-feature`
5. 提交Pull Request

## 许可证

[MIT](LICENSE) 