const { contextBridge, ipcRenderer } = require('electron');

// 安全地暴露 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取新闻
  getNews: () => ipcRenderer.invoke('get-news'),
  
  // 刷新新闻
  refreshNews: () => ipcRenderer.invoke('refresh-news'),
  
  // 打开外部链接
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // 监听新闻更新
  onNewsUpdated: (callback) => {
    ipcRenderer.on('news-updated', (event, news) => callback(news));
  },
  
  // 移除监听器
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
