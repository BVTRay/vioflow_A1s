
import React, { useState, useEffect, useMemo } from 'react';
import { Share2, Copy, Eye, Power, Clock, Download, Package, FileVideo, CheckCircle2, AlertCircle } from 'lucide-react';
import { useStore } from '../../App';
import { sharesApi, ShareLink } from '../../api/shares';
import { useThemeClasses } from '../../hooks/useThemeClasses';
import { useTeam } from '../../contexts/TeamContext';

export const ShareModule: React.FC = () => {
  const { state, dispatch } = useStore();
  const theme = useThemeClasses();
  const { currentTeam } = useTeam();
  const { projects, selectedShareProjects, shareMultiSelectMode, selectedShareProjectId, searchTerm } = state;
  
  const [allShareLinks, setAllShareLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<'all' | 'review' | 'delivery' | 'showcase'>('all');

  // 加载所有分享链接
  useEffect(() => {
    setLoading(true);
    const teamId = currentTeam?.id;
    sharesApi.getAll(teamId)
      .then((links) => {
        setAllShareLinks(links);
      })
      .catch((error) => {
        console.error('Failed to load share links:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [currentTeam?.id]);

  // 根据搜索词筛选项目
  const filteredProjectsBySearch = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return projects.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [projects, searchTerm]);

  // 根据选中的项目和类别筛选分享链接
  const getFilteredLinks = () => {
    let filtered = allShareLinks;

    // 按类别筛选
    if (filterCategory !== 'all') {
      filtered = filtered.filter(link => {
        if (filterCategory === 'review') {
          return link.type === 'video_review' || link.type === 'video_share';
        } else if (filterCategory === 'delivery') {
          return link.type === 'delivery_package';
        } else if (filterCategory === 'showcase') {
          return link.type === 'showcase_package' || link.type === 'showcase';
        }
        return false;
      });
    }

    // 搜索模式：显示被筛选项目的链接（优先级最高）
    if (searchTerm.trim() && filteredProjectsBySearch.length > 0) {
      const filteredProjectIds = filteredProjectsBySearch.map(p => p.id);
      filtered = filtered.filter(link => {
        const projectId = link.project_id || (link.project as any)?.id;
        return projectId && filteredProjectIds.includes(projectId);
      });
    }
    // 按选中的项目筛选（多选模式）
    else if (shareMultiSelectMode && selectedShareProjects.length > 0) {
      filtered = filtered.filter(link => {
        const projectId = link.project_id || (link.project as any)?.id;
        return projectId && selectedShareProjects.includes(projectId);
      });
    }
    // 单选模式
    else if (!shareMultiSelectMode && selectedShareProjectId) {
      filtered = filtered.filter(link => {
        const projectId = link.project_id || (link.project as any)?.id;
        return projectId === selectedShareProjectId;
      });
    }

    return filtered;
  };

  const filteredLinks = getFilteredLinks();

  // 按类别分组
  const groupedLinks = {
    review: filteredLinks.filter(link => link.type === 'video_review' || link.type === 'video_share'),
    delivery: filteredLinks.filter(link => link.type === 'delivery_package'),
    showcase: filteredLinks.filter(link => link.type === 'showcase_package' || link.type === 'showcase'),
  };

  const getShareUrl = (link: ShareLink) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/share/${link.token}`;
  };

  const getCategoryLabel = (type: string) => {
    if (type === 'video_review' || type === 'video_share') return '审阅';
    if (type === 'delivery_package') return '交付';
    if (type === 'showcase_package' || type === 'showcase') return '案例';
    return '其他';
  };

  const getCategoryColor = (type: string) => {
    if (type === 'video_review' || type === 'video_share') {
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
    if (type === 'delivery_package') {
      return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
    }
    if (type === 'showcase_package' || type === 'showcase') {
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    }
    return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
  };

  const renderLinkCard = (link: ShareLink) => {
    const project = projects.find(p => p.id === (link.project_id || (link.project as any)?.id));
    
    return (
      <div key={link.id} className={`${theme.bg.secondary} border ${theme.border.primary} rounded-lg p-6 hover:border-indigo-500/30 transition-colors`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className={`text-base font-semibold ${theme.text.secondary}`}>
                {(link.video as any)?.name || (link as any).delivery_package?.title || (link as any).showcase_package?.title || project?.name || '未命名分享'}
              </h3>
              <span className={`px-2 py-0.5 rounded text-xs border ${getCategoryColor(link.type)}`}>
                {getCategoryLabel(link.type)}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs ${
                link.is_active 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : `${theme.bg.tertiary} ${theme.text.muted} border ${theme.border.secondary}`
              }`}>
                {link.is_active ? '已启用' : '已停用'}
              </span>
            </div>
            {project && (
              <p className={`text-sm ${theme.text.muted} mb-2`}>
                项目：{project.name} • {project.client}
              </p>
            )}
            {(link as any).delivery_package?.description && (
              <p className={`text-sm ${theme.text.muted} mb-4`}>{(link as any).delivery_package.description}</p>
            )}
            {link.justification && (
              <p className={`text-sm ${theme.text.muted} mb-4`}>{link.justification}</p>
            )}
            <div className="flex items-center gap-6 text-xs text-zinc-500">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>创建时间：{new Date((link as any).created_at || Date.now()).toLocaleString('zh-CN')}</span>
              </div>
              {(link as any).view_count !== undefined && (
                <div className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  <span>查看次数：{(link as any).view_count || 0}</span>
                </div>
              )}
              {(link as any).download_count !== undefined && link.allow_download && (
                <div className="flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" />
                  <span>下载次数：{(link as any).download_count || 0}</span>
                </div>
              )}
              {link.expires_at && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>过期时间：{new Date(link.expires_at).toLocaleString('zh-CN')}</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                const updated = await sharesApi.toggle(link.id);
                setAllShareLinks(allShareLinks.map(l => l.id === link.id ? updated : l));
              } catch (error) {
                console.error('Failed to toggle share link:', error);
                alert('操作失败');
              }
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              link.is_active
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
            }`}
          >
            <Power className="w-4 h-4" />
            {link.is_active ? '停用链接' : '启用链接'}
          </button>
        </div>
        <div className={`pt-4 border-t ${theme.border.primary}`}>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={getShareUrl(link)}
              className={`flex-1 ${theme.bg.primary} border ${theme.border.secondary} rounded-lg px-3 py-2 text-sm ${theme.text.primary} font-mono`}
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(getShareUrl(link));
                alert('链接已复制到剪贴板');
              }}
              className={`px-4 py-2 ${theme.bg.tertiary} ${theme.bg.hover} ${theme.text.tertiary} rounded-lg text-sm transition-colors flex items-center gap-2`}
            >
              <Copy className="w-4 h-4" />
              复制链接
            </button>
            <button
              onClick={() => window.open(getShareUrl(link), '_blank')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              查看
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className={`ml-[384px] pt-14 pb-10 transition-all duration-300 ease-in-out mr-4`}>
      {/* Header */}
      <div className={`sticky top-14 z-20 ${theme.bg.primary} border-b ${theme.border.primary} px-6 py-4 mb-6`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-2xl font-semibold ${theme.text.secondary} mb-1`}>分享管理</h1>
            <p className={`text-sm ${theme.text.muted}`}>
              {shareMultiSelectMode && selectedShareProjects.length > 0 
                ? `已选中 ${selectedShareProjects.length} 个项目，共 ${filteredLinks.length} 个分享链接`
                : !shareMultiSelectMode && selectedShareProjectId
                ? `已选择 1 个项目，共 ${filteredLinks.length} 个分享链接`
                : searchTerm.trim() && filteredProjectsBySearch.length > 0
                ? `搜索到 ${filteredProjectsBySearch.length} 个项目，共 ${filteredLinks.length} 个分享链接`
                : `共 ${allShareLinks.length} 个分享链接`}
            </p>
          </div>
          
          {/* Category Filter */}
          <div className={`flex items-center gap-1 rounded-lg p-1 ${theme.bg.secondary} border ${theme.border.primary}`}>
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 text-xs font-medium ${
                filterCategory === 'all'
                  ? `${theme.text.indigo} bg-indigo-500/20`
                  : `${theme.text.disabled} ${theme.text.hover}`
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setFilterCategory('review')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 text-xs font-medium ${
                filterCategory === 'review'
                  ? `${theme.text.indigo} bg-indigo-500/20`
                  : `${theme.text.disabled} ${theme.text.hover}`
              }`}
            >
              审阅
            </button>
            <button
              onClick={() => setFilterCategory('delivery')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 text-xs font-medium ${
                filterCategory === 'delivery'
                  ? `${theme.text.indigo} bg-indigo-500/20`
                  : `${theme.text.disabled} ${theme.text.hover}`
              }`}
            >
              交付
            </button>
            <button
              onClick={() => setFilterCategory('showcase')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 text-xs font-medium ${
                filterCategory === 'showcase'
                  ? `${theme.text.indigo} bg-indigo-500/20`
                  : `${theme.text.disabled} ${theme.text.hover}`
              }`}
            >
              案例
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            <p className={`mt-4 text-sm ${theme.text.muted}`}>加载中...</p>
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Share2 className={`w-12 h-12 mb-4 opacity-20 ${theme.text.muted}`} />
            <p className={`text-sm ${theme.text.muted}`}>
              {shareMultiSelectMode && selectedShareProjects.length > 0 
                ? '选中的项目暂无分享链接'
                : !shareMultiSelectMode && selectedShareProjectId
                ? '选中的项目暂无分享链接'
                : searchTerm.trim() && filteredProjectsBySearch.length > 0
                ? '搜索到的项目暂无分享链接'
                : filterCategory !== 'all'
                  ? `暂无${filterCategory === 'review' ? '审阅' : filterCategory === 'delivery' ? '交付' : '案例'}类分享链接`
                  : '暂无分享链接'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 按类别分组显示 */}
            {filterCategory === 'all' ? (
              <>
                {groupedLinks.review.length > 0 && (
                  <div>
                    <div className={`flex items-center gap-2 mb-4 ${theme.text.muted}`}>
                      <FileVideo className="w-4 h-4" />
                      <h2 className="text-sm font-semibold uppercase tracking-wider">审阅链接 ({groupedLinks.review.length})</h2>
                    </div>
                    <div className="space-y-4">
                      {groupedLinks.review.map(link => renderLinkCard(link))}
                    </div>
                  </div>
                )}
                {groupedLinks.delivery.length > 0 && (
                  <div>
                    <div className={`flex items-center gap-2 mb-4 ${theme.text.muted}`}>
                      <Package className="w-4 h-4" />
                      <h2 className="text-sm font-semibold uppercase tracking-wider">交付链接 ({groupedLinks.delivery.length})</h2>
                    </div>
                    <div className="space-y-4">
                      {groupedLinks.delivery.map(link => renderLinkCard(link))}
                    </div>
                  </div>
                )}
                {groupedLinks.showcase.length > 0 && (
                  <div>
                    <div className={`flex items-center gap-2 mb-4 ${theme.text.muted}`}>
                      <CheckCircle2 className="w-4 h-4" />
                      <h2 className="text-sm font-semibold uppercase tracking-wider">案例链接 ({groupedLinks.showcase.length})</h2>
                    </div>
                    <div className="space-y-4">
                      {groupedLinks.showcase.map(link => renderLinkCard(link))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                {filteredLinks.map(link => renderLinkCard(link))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
};

