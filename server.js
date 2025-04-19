const express = require('express');
const path = require('path');
const Imap = require('node-imap');
const { simpleParser } = require('mailparser');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const PREFIX_DB_PATH = process.env.PREFIX_DB_PATH || './data/prefixes.json';

// 确保数据目录存在
const dataDir = path.dirname(PREFIX_DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 如果前缀数据库文件不存在，创建一个空的
if (!fs.existsSync(PREFIX_DB_PATH)) {
  fs.writeFileSync(PREFIX_DB_PATH, JSON.stringify({ prefixes: {} }, null, 2), 'utf8');
}

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 邮箱配置从环境变量获取
const MAIL_CONFIGS = [
  {
    id: 'primary',
    user: process.env.MAIN_EMAIL,
    password: process.env.MAIN_EMAIL_PASSWORD,
    host: process.env.MAIL_SERVER,
    imapPort: parseInt(process.env.MAIL_SERVER_IMAP_PORT) || 993,
    smtpPort: parseInt(process.env.MAIL_SERVER_SMTP_PORT) || 465,
    domain: process.env.MAIL_DOMAIN
  },
  {
    id: 'secondary',
    user: process.env.SECOND_EMAIL,
    password: process.env.SECOND_EMAIL_PASSWORD,
    host: process.env.SECOND_MAIL_SERVER,
    imapPort: parseInt(process.env.SECOND_MAIL_SERVER_IMAP_PORT) || 993,
    smtpPort: parseInt(process.env.SECOND_MAIL_SERVER_SMTP_PORT) || 465,
    domain: process.env.SECOND_MAIL_DOMAIN
  }
];

// 允许的域名列表
const ALLOWED_DOMAINS = (process.env.ALLOWED_DOMAINS || '').split(',').map(d => d.trim().toLowerCase());

// 根据域名获取对应的邮箱配置
function getMailConfigByDomain(domain) {
  domain = domain.toLowerCase();
  return MAIL_CONFIGS.find(config => config.domain.toLowerCase() === domain);
}

// 验证邮箱域名
function validateEmailDomain(email) {
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  
  const domain = parts[1].toLowerCase();
  return ALLOWED_DOMAINS.includes(domain);
}

// 前缀数据库操作函数
function loadPrefixesDB() {
  try {
    const data = fs.readFileSync(PREFIX_DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('加载前缀数据库出错:', error);
    return { prefixes: {} };
  }
}

function savePrefixesDB(data) {
  try {
    fs.writeFileSync(PREFIX_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('保存前缀数据库出错:', error);
    return false;
  }
}

// 前缀验证中间件
function verifyEmail(req, res, next) {
  const { email, password } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: '请输入邮箱地址' });
  }
  
  // 提取邮箱的前缀部分（@符号前的部分）
  const parts = email.split('@');
  if (parts.length !== 2) {
    return res.status(400).json({ error: '邮箱格式不正确' });
  }
  
  const prefix = parts[0];
  const domain = parts[1];
  
  // 确认域名是否在允许列表中
  if (!ALLOWED_DOMAINS.includes(domain.toLowerCase())) {
    return res.status(400).json({ error: `邮箱域名必须是以下之一: ${ALLOWED_DOMAINS.join(', ')}` });
  }
  
  // 获取对应域名的邮箱配置
  const mailConfig = getMailConfigByDomain(domain);
  if (!mailConfig) {
    return res.status(400).json({ error: '不支持的邮箱域名' });
  }
  
  const db = loadPrefixesDB();
  
  // 首先尝试完整邮箱格式（包含域名）作为key
  const fullEmail = `${prefix}@${domain}`;
  
  // 检查前缀是否存在并且密码匹配 - 首先检查完整邮箱格式，然后检查只有前缀的格式
  if (db.prefixes[fullEmail]) {
    // 使用完整邮箱地址查找
    if (db.prefixes[fullEmail].password !== password) {
      return res.status(403).json({ error: '访问密码错误' });
    }
    
    if (!db.prefixes[fullEmail].active) {
      return res.status(403).json({ error: '该邮箱已被禁用' });
    }
    
    // 将原始邮箱和邮箱配置保存到请求对象中
    req.emailInfo = {
      email: email,
      prefix: prefix,
      domain: domain,
      mailConfig: mailConfig,
      prefixKey: fullEmail
    };
  } else if (db.prefixes[prefix]) {
    // 尝试只使用前缀查找（旧格式兼容）
    if (db.prefixes[prefix].password !== password) {
      return res.status(403).json({ error: '访问密码错误' });
    }
    
    if (!db.prefixes[prefix].active) {
      return res.status(403).json({ error: '该邮箱已被禁用' });
    }
    
    // 将原始邮箱和邮箱配置保存到请求对象中
    req.emailInfo = {
      email: email,
      prefix: prefix,
      domain: domain,
      mailConfig: mailConfig,
      prefixKey: prefix
    };
  } else {
    return res.status(403).json({ error: '该邮箱未授权使用' });
  }
  
  // 验证通过，继续处理请求
  next();
}

// 添加API端点，安全地提供管理员密钥
app.get('/api/admin/key', (req, res) => {
  // 仅允许从同一域名的页面访问此API
  const origin = req.headers.origin || '';
  const host = req.headers.host || '';
  
  // 检查是否是同域请求（防止跨站点请求）
  if ((origin && !origin.includes(host)) && 
      (req.headers.referer && !req.headers.referer.includes(host))) {
    return res.status(403).json({ error: '禁止访问' });
  }
  
  // 返回管理员密钥
  res.json({ adminKey: process.env.ADMIN_KEY });
});

// 前缀管理 API
app.post('/api/admin/prefixes', async (req, res) => {
  const { adminKey, prefix, password, domain } = req.body;
  
  // 简单的管理员验证 (实际应用中应使用更安全的方法)
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: '管理员密钥无效' });
  }
  
  if (!prefix || !password) {
    return res.status(400).json({ error: '前缀和密码都是必需的' });
  }

  // 检查域名是否在允许列表中
  if (domain && !ALLOWED_DOMAINS.includes(domain.toLowerCase())) {
    return res.status(400).json({ error: `域名必须是以下之一: ${ALLOWED_DOMAINS.join(', ')}` });
  }
  
  const db = loadPrefixesDB();
  
  // 存储键可能是前缀或完整邮箱
  const key = domain ? `${prefix}@${domain}` : prefix;
  
  // 添加或更新前缀
  db.prefixes[key] = {
    password,
    createdAt: new Date().toISOString(),
    active: true
  };
  
  if (savePrefixesDB(db)) {
    res.json({ success: true, message: `${domain ? '邮箱' : '前缀'} ${key} 已成功添加` });
  } else {
    res.status(500).json({ error: '保存前缀时出错' });
  }
});

app.delete('/api/admin/prefixes/:prefixKey', async (req, res) => {
  const { adminKey } = req.body;
  const { prefixKey } = req.params;
  
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: '管理员密钥无效' });
  }
  
  const db = loadPrefixesDB();
  
  // prefixKey可能是前缀或完整邮箱
  if (!db.prefixes[prefixKey]) {
    return res.status(404).json({ error: '前缀或邮箱不存在' });
  }
  
  // 删除前缀
  delete db.prefixes[prefixKey];
  
  if (savePrefixesDB(db)) {
    res.json({ success: true, message: `前缀或邮箱 ${prefixKey} 已成功删除` });
  } else {
    res.status(500).json({ error: '删除前缀或邮箱时出错' });
  }
});

app.put('/api/admin/prefixes/:prefixKey/status', async (req, res) => {
  const { adminKey, active } = req.body;
  const { prefixKey } = req.params;
  
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: '管理员密钥无效' });
  }
  
  const db = loadPrefixesDB();
  
  // prefixKey可能是前缀或完整邮箱
  if (!db.prefixes[prefixKey]) {
    return res.status(404).json({ error: '前缀或邮箱不存在' });
  }
  
  // 更新前缀状态
  db.prefixes[prefixKey].active = !!active;
  
  if (savePrefixesDB(db)) {
    res.json({ 
      success: true, 
      message: `前缀或邮箱 ${prefixKey} 已${db.prefixes[prefixKey].active ? '启用' : '禁用'}`
    });
  } else {
    res.status(500).json({ error: '更新前缀或邮箱状态时出错' });
  }
});

// 获取所有前缀 (仅供管理员使用)
app.get('/api/admin/prefixes', async (req, res) => {
  const { adminKey } = req.query;
  
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: '管理员密钥无效' });
  }
  
  const db = loadPrefixesDB();
  res.json({ prefixes: db.prefixes });
});

// 公共API：验证前缀是否有效 (不需要密码)
app.get('/api/prefixes/:prefix/check', async (req, res) => {
  const { prefix } = req.params;
  const db = loadPrefixesDB();
  
  // 仅检查前缀是否存在，不泄露密码信息
  const exists = !!db.prefixes[prefix];
  const active = exists ? db.prefixes[prefix].active : false;
  
  res.json({ 
    exists,
    active,
    available: !exists
  });
});

// 添加缓存机制
const emailCache = {
  // 格式: { [email]: { timestamp: Date, emails: [...] } }
};

// 处理邮箱查询 (需要验证)
app.post('/api/check-emails', verifyEmail, async (req, res) => {
  const { email, mailConfig } = req.emailInfo;
  
  try {
    // 检查缓存是否过期（5分钟内的缓存视为有效）
    const now = new Date();
    const cachedData = emailCache[email];
    const isPolling = req.query.polling === 'true';
    
    if (cachedData && now - cachedData.timestamp < 5 * 60 * 1000 && isPolling) {
      // 如果是轮询请求且有最近的缓存，直接返回缓存数据
      console.log(`使用缓存数据，有 ${cachedData.emails.length} 封邮件`);
      return res.json({ emails: cachedData.emails, cached: true });
    }
    
    const emails = await fetchEmails(email, mailConfig);
    
    // 确保emails始终是数组
    const safeEmails = Array.isArray(emails) ? emails : [];
    
    console.log(`API响应: 为 ${email} 返回 ${safeEmails.length} 封邮件`);
    
    // 更新缓存
    emailCache[email] = {
      timestamp: now,
      emails: safeEmails
    };
    
    res.json({ emails: safeEmails });
  } catch (error) {
    console.error('获取邮件时出错:', error);
    res.status(500).json({ error: '获取邮件失败，请稍后再试' });
  }
});

// 添加测试端点，获取主邮箱中的所有邮件（需要管理员验证）
app.get('/api/test-all-emails', async (req, res) => {
  const { adminKey, mailbox = 'primary' } = req.query;
  
  // 验证管理员权限
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: '管理员密钥无效' });
  }
  
  try {
    // 根据请求参数选择邮箱
    const mailConfig = MAIL_CONFIGS.find(c => c.id === mailbox) || MAIL_CONFIGS[0];
    const allEmails = await fetchAllEmails(mailConfig);
    res.json({ 
      emails: allEmails, 
      mailboxInfo: { 
        id: mailConfig.id, 
        domain: mailConfig.domain,
        user: mailConfig.user
      } 
    });
  } catch (error) {
    console.error('获取所有邮件时出错:', error);
    res.status(500).json({ error: '获取所有邮件失败，请稍后再试' });
  }
});

// 添加端点，获取所有可用邮箱的信息（仅限管理员）
app.get('/api/mailboxes', async (req, res) => {
  const { adminKey } = req.query;
  
  // 验证管理员权限
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: '管理员密钥无效' });
  }
  
  // 返回邮箱信息，但隐藏密码
  const mailboxes = MAIL_CONFIGS.map(config => ({
    id: config.id,
    user: config.user,
    domain: config.domain,
    host: config.host
  }));
  
  res.json({ mailboxes });
});

// 获取所有邮件（测试用）
function fetchAllEmails(mailConfig) {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: mailConfig.user,
      password: mailConfig.password,
      host: mailConfig.host,
      port: mailConfig.imapPort,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });
    
    const emails = [];
    const debug = { parsedEmails: [] };
    
    function openInbox(cb) {
      imap.openBox('INBOX', true, cb);
    }
    
    imap.once('ready', () => {
      openInbox((err, box) => {
        if (err) return reject(err);
        
        // 获取所有邮件
        const searchCriteria = ['ALL'];
        
        imap.search(searchCriteria, (err, results) => {
          if (err) return reject(err);
          
          if (!results || !results.length) {
            imap.end();
            return resolve({ emails: [], debug: { totalEmails: 0 } });
          }
          
          console.log(`找到 ${results.length} 封邮件`);
          
          // 获取所有邮件，而不仅仅是最近的
          const fetch = imap.fetch(results, {
            bodies: ['HEADER.FIELDS (FROM TO CC BCC SUBJECT DATE)', 'TEXT'],
            struct: true
          });
          
          fetch.on('message', (msg, seqno) => {
            const email = {
              seqno,
              headers: null,
              body: null,
              to: null,
              from: null,
              subject: null,
              date: null,
              fullParsed: null,
            };
            
            msg.on('body', (stream, info) => {
              let buffer = '';
              stream.on('data', (chunk) => {
                buffer += chunk.toString('utf8');
              });
              
              stream.once('end', () => {
                if (info.which.includes('HEADER')) {
                  email.headers = buffer;
                  // 解析头部信息
                  const parsedHeader = Imap.parseHeader(buffer);
                  email.to = parsedHeader.to;
                  email.cc = parsedHeader.cc;
                  email.bcc = parsedHeader.bcc;
                  email.from = parsedHeader.from;
                  email.subject = parsedHeader.subject;
                  email.date = parsedHeader.date;
                } else {
                  email.body = buffer;
                }
              });
            });
            
            msg.once('attributes', (attrs) => {
              email.attrs = attrs;
            });
            
            msg.once('end', () => {
              // 获取完整的原始邮件内容用于解析
              simpleParser(email.headers + '\r\n\r\n' + email.body, (err, parsed) => {
                if (err) {
                  console.error(`解析邮件 ${seqno} 时出错:`, err);
                } else {
                  email.fullParsed = {
                    to: parsed.to,
                    from: parsed.from,
                    cc: parsed.cc,
                    bcc: parsed.bcc,
                    subject: parsed.subject,
                    text: parsed.text
                  };
                  
                  debug.parsedEmails.push({
                    seqno,
                    to: parsed.to ? JSON.parse(JSON.stringify(parsed.to)) : null,
                    from: parsed.from ? JSON.parse(JSON.stringify(parsed.from)) : null,
                    cc: parsed.cc ? JSON.parse(JSON.stringify(parsed.cc)) : null,
                    bcc: parsed.bcc ? JSON.parse(JSON.stringify(parsed.bcc)) : null,
                    subject: parsed.subject,
                    date: parsed.date
                  });
                }
                emails.push(email);
              });
            });
          });
          
          fetch.once('error', (err) => {
            reject(err);
          });
          
          fetch.once('end', () => {
            imap.end();
            resolve({ 
              emails, 
              debug: {
                totalEmails: results.length,
                parsedEmails: debug.parsedEmails
              }
            });
          });
        });
      });
    });
    
    imap.once('error', (err) => {
      console.error('IMAP连接错误:', err);
      reject(err);
    });
    
    imap.once('end', () => {
      console.log('IMAP连接结束');
    });
    
    imap.connect();
  });
}

// 连接IMAP服务器并获取邮件
function fetchEmails(email, mailConfig) {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: mailConfig.user,
      password: mailConfig.password,
      host: mailConfig.host,
      port: mailConfig.imapPort,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });
    
    const emails = [];
    let pendingEmails = 0; // 用于跟踪待处理的邮件数量
    
    function openInbox(cb) {
      imap.openBox('INBOX', true, cb);
    }
    
    imap.once('ready', () => {
      openInbox((err, box) => {
        if (err) return reject(err);
        
        // 搜索所有邮件
        const searchCriteria = ['ALL'];
        
        imap.search(searchCriteria, (err, results) => {
          if (err) return reject(err);
          
          if (!results || !results.length) {
            imap.end();
            console.log(`邮箱 ${email} 没有邮件`);
            return resolve([]);
          }
          
          console.log(`检查邮箱 ${email} 的邮件，从 ${results.length} 封邮件中查找`);
          pendingEmails = results.length; // 设置待处理邮件数量
          
          // 获取所有邮件，不限制数量
          const fetch = imap.fetch(results, {
            bodies: ['HEADER.FIELDS (FROM TO CC BCC SUBJECT DATE)', 'TEXT'],
            struct: true
          });
          
          fetch.on('message', (msg, seqno) => {
            let headerInfo = null;
            let bodyInfo = "";
            
            msg.on('body', (stream, info) => {
              let buffer = '';
              stream.on('data', (chunk) => {
                buffer += chunk.toString('utf8');
              });
              
              stream.once('end', () => {
                if (info.which.includes('HEADER')) {
                  headerInfo = Imap.parseHeader(buffer);
                } else {
                  bodyInfo = buffer;
                }
              });
            });
            
            msg.once('end', () => {
              // 必须等待两部分内容都获取完毕
              if (headerInfo) {
                // 解析完整邮件
                simpleParser(
                  // 构建一个简单的邮件格式
                  `From: ${headerInfo.from ? headerInfo.from[0] : ''}\r\n` +
                  `To: ${headerInfo.to ? headerInfo.to[0] : ''}\r\n` +
                  `Subject: ${headerInfo.subject ? headerInfo.subject[0] : ''}\r\n` +
                  `Date: ${headerInfo.date ? headerInfo.date[0] : ''}\r\n\r\n` +
                  bodyInfo,
                  (err, parsed) => {
                    if (err) {
                      console.error(`解析邮件 ${seqno} 时出错:`, err);
                      pendingEmails--; // 减少待处理邮件计数
                      checkAndFinalize(); // 检查是否所有邮件都处理完毕
                      return;
                    }
                    
                    // 详细检查邮件收件人 - 提取所有可能的收件人信息
                    let isMatch = false;
                    
                    // 检查方法1：直接检查headerInfo中的to字段
                    if (headerInfo.to && headerInfo.to.length > 0) {
                      for (const to of headerInfo.to) {
                        if (to.toLowerCase().includes(email.toLowerCase())) {
                          isMatch = true;
                          break;
                        }
                      }
                    }
                    
                    // 检查方法2：检查parsed.to字段
                    if (!isMatch && parsed.to) {
                      // 不同格式的处理
                      if (typeof parsed.to === 'string') {
                        if (parsed.to.toLowerCase().includes(email.toLowerCase())) {
                          isMatch = true;
                        }
                      } else if (parsed.to.text) {
                        if (parsed.to.text.toLowerCase().includes(email.toLowerCase())) {
                          isMatch = true;
                        }
                      } else if (parsed.to.value && Array.isArray(parsed.to.value)) {
                        // 处理邮件解析库可能返回的数组格式
                        for (const addr of parsed.to.value) {
                          if (addr.address && addr.address.toLowerCase() === email.toLowerCase()) {
                            isMatch = true;
                            break;
                          }
                        }
                      }
                    }
                    
                    // 检查方法3：检查抄送字段
                    if (!isMatch && parsed.cc) {
                      if (typeof parsed.cc === 'string') {
                        if (parsed.cc.toLowerCase().includes(email.toLowerCase())) {
                          isMatch = true;
                        }
                      } else if (parsed.cc.text) {
                        if (parsed.cc.text.toLowerCase().includes(email.toLowerCase())) {
                          isMatch = true;
                        }
                      } else if (parsed.cc.value && Array.isArray(parsed.cc.value)) {
                        for (const addr of parsed.cc.value) {
                          if (addr.address && addr.address.toLowerCase() === email.toLowerCase()) {
                            isMatch = true;
                            break;
                          }
                        }
                      }
                    }
                    
                    // 如果找到匹配，保存这封邮件
                    if (isMatch) {
                      console.log(`找到发送给 ${email} 的邮件: ${parsed.subject}`);
                      
                      // 获取正文内容 - 完全依赖mailparser提供的内容
                      let emailText = '';
                      let emailHtml = null;
                      
                      // 检查是否有HTML内容
                      if (parsed.html) {
                        // 有HTML内容时，优先使用HTML
                        emailHtml = parsed.html;
                      }
                      
                      // 获取纯文本内容
                      if (parsed.text) {
                        emailText = parsed.text;
                      } else if (emailHtml) {
                        // 如果没有纯文本但有HTML，尝试从HTML提取文本
                        emailText = emailHtml.replace(/<[^>]+>/g, ' ')
                                            .replace(/\s+/g, ' ')
                                            .trim();
                      }
                      
                      // 提取可能的Base64编码内容 (适用于邮件客户端使用Base64编码发送中文的情况)
                      const base64Blocks = [];
                      
                      // 从text中查找可能的Base64编码块
                      if (emailText) {
                        const lines = emailText.split(/\r?\n/);
                        let inBase64Block = false;
                        let currentBlock = '';
                        
                        for (const line of lines) {
                          // 检测Content-Transfer-Encoding: base64标记
                          if (line.match(/Content-Transfer-Encoding:\s*base64/i)) {
                            inBase64Block = true;
                            currentBlock = '';
                            continue;
                          }
                          
                          // 检测是否为MIME边界行，如果是则结束当前块
                          if (line.match(/^--[a-f0-9]{16,}/)) {
                            if (inBase64Block && currentBlock) {
                              base64Blocks.push(currentBlock);
                            }
                            inBase64Block = false;
                            continue;
                          }
                          
                          // 在Base64块中收集内容
                          if (inBase64Block && line.trim() && line.match(/^[A-Za-z0-9+/=]+$/)) {
                            currentBlock += line.trim();
                          }
                        }
                        
                        // 处理最后一个块
                        if (inBase64Block && currentBlock) {
                          base64Blocks.push(currentBlock);
                        }
                      }
                      
                      // 尝试解码所有找到的Base64块
                      for (const block of base64Blocks) {
                        try {
                          const decoded = Buffer.from(block, 'base64').toString('utf8');
                          if (decoded && decoded.trim() && !/^\s+$/.test(decoded)) {
                            // 如果解码成功且内容有意义，替换原始文本
                            emailText = decoded.trim();
                            break;
                          }
                        } catch (e) {
                          console.log('Base64块解码失败:', e);
                        }
                      }
                      
                      // 最终清理 - 移除所有可能的邮件头和MIME边界
                      emailText = emailText
                        // 移除Content-开头的行
                        .replace(/^Content-[^\r\n]+[\r\n]*/gm, '')
                        // 移除MIME边界行
                        .replace(/^--[a-f0-9]{16,}[^\r\n]*[\r\n]*/gm, '')
                        // 移除空行
                        .replace(/(\r?\n){2,}/g, '\n\n')
                        .trim();
                      
                      // 组装邮件内容
                      emails.push({
                        from: parsed.from ? parsed.from.text : '未知',
                        subject: parsed.subject || '(无主题)',
                        date: parsed.date || new Date(),
                        text: emailText || '无内容',
                        html: emailHtml
                      });
                      
                      console.log(`成功提取邮件内容: "${emailText.substring(0, 50)}${emailText.length > 50 ? '...' : ''}"`);
                    }
                    
                    pendingEmails--; // 减少待处理邮件计数
                    checkAndFinalize(); // 检查是否所有邮件都处理完毕
                  }
                );
              } else {
                pendingEmails--; // 减少待处理邮件计数
                checkAndFinalize(); // 检查是否所有邮件都处理完毕
              }
            });
          });
          
          fetch.once('error', (err) => {
            console.error('获取邮件时出错:', err);
            reject(err);
          });
          
          fetch.once('end', () => {
            console.log('所有邮件获取完毕，等待处理完成...');
            // 注意：我们不再在这里关闭IMAP连接和返回结果
            // 而是在所有邮件都解析完成后才执行这些操作
          });
          
          // 添加新函数检查是否所有邮件都处理完成
          function checkAndFinalize() {
            if (pendingEmails <= 0) {
              console.log(`检查完成，找到 ${emails.length} 封发送给 ${email} 的邮件`);
              
              // 按日期排序，最新的邮件放在前面
              emails.sort((a, b) => new Date(b.date) - new Date(a.date));
              
              // 添加额外的日志，输出完整的emails数组结构
              console.log('返回的邮件数据:', JSON.stringify(emails));
              
              // 关闭IMAP连接并返回结果
              imap.end();
              resolve(emails);
            }
          }
        });
      });
    });
    
    imap.once('error', (err) => {
      console.error('IMAP连接错误:', err);
      reject(err);
    });
    
    imap.once('end', () => {
      console.log('IMAP连接结束');
    });
    
    imap.connect();
  });
}

// 修改客户端提交邮箱数据时的解析方式，以支持完整邮箱格式
app.post('/api/admin/batch-prefixes', async (req, res) => {
  const { adminKey, records } = req.body;
  
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: '管理员密钥无效' });
  }
  
  if (!records || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: '没有提供有效的记录' });
  }
  
  const db = loadPrefixesDB();
  let successCount = 0;
  const failedRecords = [];
  
  // 逐条处理记录
  for (const record of records) {
    try {
      const { prefix, password, domain } = record;
      
      if (!prefix || !password) {
        failedRecords.push({ 
          prefix, 
          reason: '前缀和密码都是必需的' 
        });
        continue;
      }
      
      // 检查域名是否有效
      if (domain && !ALLOWED_DOMAINS.includes(domain.toLowerCase())) {
        failedRecords.push({ 
          prefix, 
          reason: `域名 ${domain} 不在允许列表中` 
        });
        continue;
      }
      
      // 使用有域名信息的key
      const prefixKey = domain ? `${prefix}@${domain}` : prefix;
      
      // 添加或更新前缀
      db.prefixes[prefixKey] = {
        password,
        createdAt: new Date().toISOString(),
        active: true,
        domain: domain || null
      };
      
      successCount++;
    } catch (error) {
      failedRecords.push({ 
        prefix: record.prefix || '未知', 
        reason: '处理数据时出错' 
      });
    }
  }
  
  // 保存更新后的数据库
  if (successCount > 0) {
    if (!savePrefixesDB(db)) {
      return res.status(500).json({ 
        error: '保存数据时出错',
        successCount: 0,
        failedCount: records.length
      });
    }
  }
  
  // 返回处理结果
  res.json({
    success: true,
    message: `成功处理 ${successCount} 个记录，失败 ${failedRecords.length} 个`,
    successCount,
    failedCount: failedRecords.length,
    failedRecords: failedRecords.length > 0 ? failedRecords : undefined
  });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`服务器运行在 http://0.0.0.0:${PORT}`);
});