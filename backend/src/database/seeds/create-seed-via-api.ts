// 通过API创建种子数据的脚本（当数据库无法直接连接时使用）
import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

async function createSeedViaAPI() {
  try {
    // 1. 登录
    console.log('正在登录...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@vioflow.com',
      password: 'admin',
    });

    if (!loginRes.data.access_token) {
      console.log('登录失败，可能需要先创建用户');
      return;
    }

    const token = loginRes.data.access_token;
    const headers = { Authorization: `Bearer ${token}` };

    console.log('✓ 登录成功');

    // 2. 检查是否已有项目
    const projectsRes = await axios.get(`${API_BASE}/projects`, { headers });
    if (projectsRes.data && projectsRes.data.length > 0) {
      console.log(`✓ 已有 ${projectsRes.data.length} 个项目，跳过创建`);
      return;
    }

    // 3. 创建项目
    console.log('正在创建项目...');
    const projects = [
      {
        name: '2412_Nike_AirMax_Holiday',
        client: 'Nike',
        lead: 'Sarah D.',
        postLead: 'Mike',
        group: '广告片',
      },
      {
        name: '2501_Spotify_Wrapped_Asia',
        client: 'Spotify',
        lead: 'Alex',
        postLead: 'Jen',
        group: '社交媒体',
      },
    ];

    for (const project of projects) {
      try {
        await axios.post(`${API_BASE}/projects`, project, { headers });
        console.log(`✓ 创建项目: ${project.name}`);
      } catch (err: any) {
        console.error(`✗ 创建项目失败: ${project.name}`, err.response?.data?.message || err.message);
      }
    }

    console.log('✓ 种子数据创建完成（通过API）');
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.error('✗ 无法连接到后端服务，请确保服务已启动');
    } else {
      console.error('✗ 错误:', error.message);
    }
  }
}

createSeedViaAPI();

