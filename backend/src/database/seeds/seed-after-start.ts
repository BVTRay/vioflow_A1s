// 这个文件用于在服务启动后通过API注入种子数据
// 如果数据库连接失败，可以使用这个脚本

import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

async function seedViaAPI() {
  try {
    // 1. 登录获取token
    console.log('正在登录...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@vioflow.com',
      password: 'admin',
    });
    
    if (!loginRes.data.access_token) {
      console.log('登录失败，可能种子数据已存在或需要先创建用户');
      return;
    }
    
    const token = loginRes.data.access_token;
    const headers = { Authorization: `Bearer ${token}` };
    
    console.log('✓ 登录成功');
    
    // 2. 检查是否已有数据
    const projectsRes = await axios.get(`${API_BASE}/projects`, { headers });
    if (projectsRes.data && projectsRes.data.length > 0) {
      console.log('✓ 种子数据已存在');
      return;
    }
    
    // 3. 创建项目
    console.log('正在创建项目...');
    const projects = [
      {
        name: '2412_Nike_AirMax_Holiday',
        client: 'Nike',
        lead: 'Sarah D.',
        post_lead: 'Mike',
        group: '广告片',
      },
      {
        name: '2501_Spotify_Wrapped_Asia',
        client: 'Spotify',
        lead: 'Alex',
        post_lead: 'Jen',
        group: '社交媒体',
      },
    ];
    
    for (const project of projects) {
      await axios.post(`${API_BASE}/projects`, project, { headers });
    }
    
    console.log('✓ 种子数据注入完成（通过API）');
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.error('✗ 无法连接到后端服务，请确保服务已启动');
    } else {
      console.error('✗ 错误:', error.message);
    }
  }
}

seedViaAPI();

