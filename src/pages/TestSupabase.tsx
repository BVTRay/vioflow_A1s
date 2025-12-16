import React, { useState } from 'react';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import apiClient from '../api/client';

export const TestSupabase: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testConnection = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await apiClient.get('/upload/test-supabase');
      setResult(response);
    } catch (error: any) {
      console.error('测试失败:', error);
      setResult({
        success: false,
        message: error.response?.data?.message || error.message || '测试失败',
        error: error.response?.data || error.toString(),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
          <h1 className="text-2xl font-bold text-white mb-6">Supabase 连接测试</h1>
          
          <button
            onClick={testConnection}
            disabled={loading}
            className="mb-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                测试中...
              </>
            ) : (
              '测试 Supabase 连接'
            )}
          </button>

          {result && (
            <div className={`p-4 rounded-lg border ${
              result.success 
                ? 'bg-emerald-500/10 border-emerald-500/30' 
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <h3 className={`font-semibold mb-2 ${
                    result.success ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {result.success ? '连接成功' : '连接失败'}
                  </h3>
                  
                  <p className="text-zinc-300 mb-3">{result.message}</p>
                  
                  {result.details && (
                    <div className="bg-zinc-800/50 rounded p-3 mb-3">
                      <p className="text-sm text-zinc-400 mb-1">详细信息：</p>
                      <pre className="text-xs text-zinc-300 overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {result.checkList && (
                    <div className="bg-zinc-800/50 rounded p-3 mb-3">
                      <p className="text-sm text-zinc-400 mb-2">环境变量检查：</p>
                      <ul className="space-y-1 text-sm">
                        <li className={`flex items-center gap-2 ${
                          result.checkList.hasSupabaseUrl ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {result.checkList.hasSupabaseUrl ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          SUPABASE_URL: {result.checkList.hasSupabaseUrl ? '已设置' : '未设置'}
                        </li>
                        <li className={`flex items-center gap-2 ${
                          result.checkList.hasServiceKey ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {result.checkList.hasServiceKey ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          SUPABASE_SERVICE_KEY: {result.checkList.hasServiceKey ? '已设置' : '未设置'}
                        </li>
                        <li className="flex items-center gap-2 text-zinc-400">
                          <AlertCircle className="w-4 h-4" />
                          SUPABASE_STORAGE_BUCKET: {result.checkList.bucketName}
                        </li>
                      </ul>
                    </div>
                  )}
                  
                  {result.error && (
                    <div className="bg-red-500/10 rounded p-3">
                      <p className="text-sm text-red-400 mb-1">错误详情：</p>
                      <pre className="text-xs text-red-300 overflow-auto">
                        {typeof result.error === 'string' 
                          ? result.error 
                          : JSON.stringify(result.error, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {result.stack && (
                    <details className="mt-3">
                      <summary className="text-sm text-zinc-400 cursor-pointer hover:text-zinc-300">
                        查看堆栈信息
                      </summary>
                      <pre className="text-xs text-zinc-500 mt-2 overflow-auto">
                        {result.stack}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <h3 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              如何配置 Supabase 环境变量
            </h3>
            <ol className="text-sm text-zinc-300 space-y-2 list-decimal list-inside">
              <li>访问 Supabase Dashboard: <a href="https://supabase.com/dashboard/project/bejrwnamnxxdxoqwoxag" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">https://supabase.com/dashboard/project/bejrwnamnxxdxoqwoxag</a></li>
              <li>点击左侧菜单的 <strong>Settings</strong> → <strong>API</strong></li>
              <li>复制 <strong>Project URL</strong> 作为 <code className="bg-zinc-800 px-1 rounded">SUPABASE_URL</code></li>
              <li>复制 <strong>service_role</strong> key（不是 anon key）作为 <code className="bg-zinc-800 px-1 rounded">SUPABASE_SERVICE_KEY</code></li>
              <li>确认存储桶名称为 <code className="bg-zinc-800 px-1 rounded">videos</code></li>
              <li>在后端环境变量中设置这些值并重启服务</li>
            </ol>
            <p className="text-xs text-zinc-500 mt-3">
              详细说明请查看：<code className="bg-zinc-800 px-1 rounded">docs/setup/SUPABASE_ENV_SETUP.md</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};



