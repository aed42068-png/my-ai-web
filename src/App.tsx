import { useState } from 'react';
import Layout from './components/Layout';
import Home from './pages/Home';
import Archive from './pages/Archive';
import Ads from './pages/Ads';
import { Task } from './types';

const getTodayDate = () => new Date().toISOString().split('T')[0];

const initialTasks: Task[] = [
  { id: 'c1', title: '晨间日常：咖啡制作流程', date: getTodayDate(), location: '室内', status: '已拍', hitStatus: '爆款', reviewData: '播放量突破10w，评论区互动很好。' },
  { id: 'c2', title: '好物分享：新款蓝牙耳机测评', date: getTodayDate(), location: '工作室', status: '已拍' },
  { id: 't1', title: '周末探店 Vlog 预告', date: getTodayDate(), location: '外景', status: '待拍' },
  { id: 't2', title: '读书笔记分享《心流》', date: getTodayDate(), location: '书房', status: '待拍' },
  { id: 't3', title: '口播：关于如何提高效率', date: getTodayDate(), location: '卧室', status: '待拍' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [toastMessage, setToastMessage] = useState('');
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2000);
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'home' && <Home showToast={showToast} tasks={tasks} setTasks={setTasks} />}
      {activeTab === 'archive' && <Archive showToast={showToast} setActiveTab={setActiveTab} tasks={tasks} setTasks={setTasks} />}
      {activeTab === 'ads' && <Ads showToast={showToast} />}
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-black/80 text-white px-5 py-2.5 rounded-full text-sm font-medium shadow-lg backdrop-blur-sm transition-all animate-in fade-in slide-in-from-top-4">
          {toastMessage}
        </div>
      )}
    </Layout>
  );
}
