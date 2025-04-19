document.addEventListener('DOMContentLoaded', () => {
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('email-password');
  const togglePasswordBtn = document.getElementById('toggle-password');
  const searchBtn = document.getElementById('search-btn');
  const loader = document.getElementById('loader');
  const errorMessage = document.getElementById('error-message');
  const resultsContainer = document.getElementById('results-container');
  const emailList = document.getElementById('email-list');
  const emailDetail = document.getElementById('email-detail');
  const pollingIndicator = document.getElementById('polling-indicator');
  const statusText = document.getElementById('status-text');
  const lastCheckTime = document.getElementById('last-check-time');
  
  let pollingInterval = null; // 用于存储轮询定时器
  let lastEmailCount = 0; // 记录上次获取到的邮件数量
  let isPolling = false;
  
  // 密码显示/隐藏切换
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        togglePasswordBtn.querySelector('.eye-icon').textContent = '🔒';
      } else {
        passwordInput.type = 'password';
        togglePasswordBtn.querySelector('.eye-icon').textContent = '👁️';
      }
    });
  }
  
  // 检查邮箱格式
  emailInput.addEventListener('blur', () => {
    const email = emailInput.value.trim();
    if (email && !isValidEmail(email)) {
      showError('请输入有效的邮箱地址');
    } else {
      clearError();
    }
  });
  
  // 验证邮箱格式
  function isValidEmail(email) {
    // 基本的邮箱格式验证正则表达式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  searchBtn.addEventListener('click', () => {
    checkEmails(true);
  });
  
  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
  }
  
  function clearError() {
    errorMessage.textContent = '';
    errorMessage.style.display = 'none';
  }
  
  function startPolling() {
    // 如果已经存在轮询，先清除
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    
    isPolling = true;
    updatePollingStatus(true);
    
    // 设置定时器，每30秒检查一次新邮件
    pollingInterval = setInterval(() => {
      checkEmails(false);
      // 闪烁指示器
      updatePollingStatus(true, true);
      
      // 2秒后恢复常亮状态
      setTimeout(() => {
        if (isPolling) {
          updatePollingStatus(true, false);
        }
      }, 2000);
      
    }, 30000); // 30秒
  }
  
  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    isPolling = false;
    updatePollingStatus(false);
  }
  
  function updatePollingStatus(isActive, isPulsing = false) {
    if (isActive) {
      pollingIndicator.classList.add('active');
      statusText.textContent = isPulsing ? '正在检查新邮件...' : '自动检查开启中';
    } else {
      pollingIndicator.classList.remove('active');
      statusText.textContent = '等待查询...';
    }
  }
  
  function updateLastCheckTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('zh-CN');
    lastCheckTime.textContent = `上次检查: ${timeString}`;
  }
  
  async function checkEmails(isInitialCheck) {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    clearError();
    
    if (!email) {
      showError('请输入邮箱地址');
      return;
    }
    
    if (!isValidEmail(email)) {
      showError('请输入有效的邮箱地址');
      return;
    }
    
    if (!password) {
      showError('请输入访问密码');
      return;
    }
    
    // 显示加载状态，但只有在初次检查时才显示
    if (isInitialCheck) {
      loader.style.display = 'block';
      resultsContainer.style.display = 'none';
      emailDetail.style.display = 'none';
    }
    
    try {
      // 构建API URL，如果是轮询请求添加polling=true参数
      const apiUrl = isInitialCheck 
        ? '/api/check-emails'
        : '/api/check-emails?polling=true';
        
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      // 添加调试日志，查看响应数据
      console.log('接收到的API响应:', data);
      console.log('邮件数量:', data.emails ? data.emails.length : 0);
      
      if (response.ok) {
        // 验证成功，如果是初次检查则开始轮询
        if (isInitialCheck && !isPolling) {
          startPolling();
        }
        
        // 更新最后检查时间
        updateLastCheckTime();
        
        // 确保emails字段存在且为数组
        const emails = data.emails || [];
        
        // 修改逻辑：始终显示初次查询的结果
        if (isInitialCheck) {
          // 初次加载时，显示所有邮件
          displayEmails(emails, email);
          lastEmailCount = emails.length;
        } 
        // 对于后续的轮询请求，只在有新邮件时更新
        else if (emails.length > lastEmailCount) {
          // 计算新增的邮件
          const newEmails = emails.slice(0, emails.length - lastEmailCount);
          // 添加新邮件到当前列表
          addNewEmailsToDisplay(newEmails, email);
          showNotification(newEmails.length);
          lastEmailCount = emails.length;
        }
      } else {
        // 显示错误信息
        showError(data.error || '获取邮件失败');
        
        if (isInitialCheck) {
          stopPolling();
        }
      }
    } catch (error) {
      console.error('查询邮件时出错:', error);
      showError('连接服务器出错，请稍后再试');
      
      if (isInitialCheck) {
        stopPolling();
      }
    } finally {
      if (isInitialCheck) {
        loader.style.display = 'none';
      }
    }
  }
  
  function showNotification(count) {
    // 如果浏览器支持通知，可以显示通知
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("您有新邮件", {
        body: `${emailInput.value.trim()} 收到了新邮件`
      });
    }
    
    // 在页面上显示新邮件提示
    const notification = document.createElement('div');
    notification.className = 'new-email-notification';
    notification.textContent = `有新邮件到达！`;
    notification.style.backgroundColor = '#4CAF50';
    notification.style.color = 'white';
    notification.style.padding = '10px';
    notification.style.textAlign = 'center';
    notification.style.position = 'fixed';
    notification.style.top = '10px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.borderRadius = '4px';
    notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    notification.style.zIndex = '1000';
    
    document.body.appendChild(notification);
    
    // 3秒后自动消失
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.5s';
      setTimeout(() => {
        notification.remove();
      }, 500);
    }, 3000);
  }
  
  function displayEmails(emails, emailAddress) {
    // 添加调试日志
    console.log(`开始显示邮件，数量: ${emails ? emails.length : 0}`);
    
    // 清空当前邮件列表
    emailList.innerHTML = '';
    
    // 确保emails是数组且非空
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      console.log('没有邮件可显示');
      emailList.innerHTML = `<div class="empty-message">没有找到发送至 ${emailAddress} 的邮件</div>`;
      resultsContainer.style.display = 'block';
      return;
    }
    
    console.log(`将显示 ${emails.length} 封邮件`);
    
    // 遍历所有邮件并创建显示元素
    emails.forEach((email, index) => {
      if (!email) {
        console.warn(`邮件项 #${index} 为空或无效`);
        return; // 跳过无效邮件
      }
      
      console.log(`处理邮件 #${index}: ${email.subject || '(无主题)'}`);
      
      // 邮件内容不再需要额外清理，直接使用服务器处理好的内容
      const emailItem = document.createElement('div');
      emailItem.className = 'email-item';
      emailItem.innerHTML = `
        <h3>${email.subject || '(无主题)'}</h3>
        <div class="email-meta">
          <span>发件人: ${email.from || '未知'}</span>
          <span>日期: ${email.date ? new Date(email.date).toLocaleString('zh-CN') : '未知日期'}</span>
        </div>
        <p>${email.text ? (email.text.substring(0, 100) + (email.text.length > 100 ? '...' : '')) : '无内容'}</p>
      `;
      
      emailItem.addEventListener('click', () => {
        displayEmailDetail(email);
      });
      
      emailList.appendChild(emailItem);
    });
    
    // 确保结果容器可见
    resultsContainer.style.display = 'block';
    
    // 添加调试日志
    console.log(`显示了 ${emails.length} 封邮件`);
  }
  
  function displayEmailDetail(email) {
    // 邮件内容已经在服务器处理好，直接显示
    
    // 处理纯文本内容
    let textContent = email.text || '';
    
    // 检测是否是HTML邮件
    const hasHtml = email.html && email.html.trim().length > 0;
    
    emailDetail.innerHTML = `
      <h3>${email.subject || '(无主题)'}</h3>
      <div class="email-meta">
        <div>发件人: ${email.from}</div>
        <div>日期: ${new Date(email.date).toLocaleString('zh-CN')}</div>
      </div>
      <div class="email-content">
        ${hasHtml ? email.html : `<pre style="white-space: pre-wrap; word-break: break-all;">${textContent}</pre>`}
      </div>
    `;
    
    emailDetail.style.display = 'block';
  }
  
  // 添加新函数来处理新邮件的添加
  function addNewEmailsToDisplay(newEmails, emailAddress) {
    // 如果没有新邮件，直接返回
    if (!newEmails || !Array.isArray(newEmails) || newEmails.length === 0) {
      console.log('没有新邮件需要添加');
      return;
    }
    
    console.log(`正在添加 ${newEmails.length} 封新邮件`);
    
    // 确保结果容器显示
    if (emailList.innerHTML.includes('没有找到发送至')) {
      // 如果之前显示的是"没有找到邮件"，则清空列表
      emailList.innerHTML = '';
    }
    
    // 创建新元素来展示新邮件
    newEmails.forEach((email, index) => {
      if (!email) {
        console.warn(`新邮件项 #${index} 为空或无效`);
        return; // 跳过无效邮件
      }
      
      console.log(`添加新邮件 #${index}: ${email.subject || '(无主题)'}`);
      
      const emailItem = document.createElement('div');
      emailItem.className = 'email-item';
      emailItem.innerHTML = `
        <h3>${email.subject || '(无主题)'}</h3>
        <div class="email-meta">
          <span>发件人: ${email.from || '未知'}</span>
          <span>日期: ${email.date ? new Date(email.date).toLocaleString('zh-CN') : '未知日期'}</span>
        </div>
        <p>${email.text ? email.text.substring(0, 100) + (email.text.length > 100 ? '...' : '') : '无内容'}</p>
      `;
      
      // 添加点击事件
      emailItem.addEventListener('click', () => {
        displayEmailDetail(email);
      });
      
      // 在列表顶部添加新邮件
      emailList.insertBefore(emailItem, emailList.firstChild);
      
      // 添加高亮效果
      emailItem.classList.add('new-email');
      // 3秒后移除高亮效果
      setTimeout(() => {
        emailItem.classList.remove('new-email');
      }, 3000);
    });
    
    // 确保结果容器显示
    resultsContainer.style.display = 'block';
  }
  
  // 请求通知权限
  if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
    Notification.requestPermission();
  }
  
  // 当窗口关闭或切换页面时停止轮询
  window.addEventListener('beforeunload', stopPolling);
  
  // 当页面重新获得焦点时恢复轮询
  window.addEventListener('focus', () => {
    if (emailInput.value.trim() && passwordInput.value.trim()) {
      // 恢复正常频率的轮询，但不立即重新加载邮件
      if (!isPolling) {
        isPolling = true;
        updatePollingStatus(true);
        
        // 设置定时器，每30秒检查一次新邮件
        pollingInterval = setInterval(() => {
          checkEmails(false);
          // 闪烁指示器
          updatePollingStatus(true, true);
          
          // 2秒后恢复常亮状态
          setTimeout(() => {
            if (isPolling) {
              updatePollingStatus(true, false);
            }
          }, 2000);
        }, 30000); // 30秒
      }
    }
  });
  
  // 当页面失去焦点时暂停轮询以节省资源
  window.addEventListener('blur', () => {
    // 停止常规轮询但不改变isPolling状态
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    
    // 在页面不活跃时使用更长的轮询间隔
    pollingInterval = setInterval(() => {
      checkEmails(false);
    }, 60000); // 一分钟
  });
  
  // 同时响应回车键提交
  emailInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      if (passwordInput.value.trim()) {
        checkEmails(true);
      } else {
        passwordInput.focus();
      }
    }
  });
  
  passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      checkEmails(true);
    }
  });
}); 