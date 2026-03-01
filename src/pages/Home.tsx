import { useState, useRef } from 'react';
import { ListFilter, Camera, ImagePlus, Plus, CheckCircle2, Video, Send, Eye, X, Lightbulb, Star, GripVertical, Edit, Trash2 } from 'lucide-react';
import { images } from '../data/mockData';
import { Task } from '../types';
import { Reorder, useDragControls } from 'motion/react';
import { SwipeableTask } from '../components/SwipeableTask';

interface Account {
  id: string;
  name: string;
  image: string;
  imageOffsetY?: number;
}

interface AccountPreview {
  image: string;
  imageOffsetY: number;
}

const DEFAULT_ACCOUNT_IMAGES = [
  images.travelVlogBg,
  images.archive2,
  images.archive3,
  images.archive1,
];

const getDefaultAccountImage = (index: number) =>
  DEFAULT_ACCOUNT_IMAGES[index % DEFAULT_ACCOUNT_IMAGES.length] || images.travelVlogBg;

const initialAccounts: Account[] = [
  { id: 'a1', name: '旅行主账号', image: getDefaultAccountImage(0), imageOffsetY: 50 },
  { id: 'a2', name: 'AI教程号', image: getDefaultAccountImage(1), imageOffsetY: 50 },
  { id: 'a3', name: '知识库号', image: getDefaultAccountImage(2), imageOffsetY: 50 },
  { id: 'a4', name: '生活号', image: getDefaultAccountImage(3), imageOffsetY: 50 },
];

function ImagePositioner({ image, offsetY, setOffsetY }: { image: string, offsetY: number, setOffsetY: (y: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startOffsetY = useRef(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    startY.current = e.clientY;
    startOffsetY.current = offsetY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return;
    const dy = e.clientY - startY.current;
    if (containerRef.current) {
      const height = containerRef.current.clientHeight;
      let newOffset = startOffsetY.current - (dy / height) * 100;
      newOffset = Math.max(0, Math.min(100, newOffset));
      setOffsetY(newOffset);
    }
  };

  return (
    <div 
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      className="mt-3 aspect-video w-full rounded-xl shadow-sm cursor-ns-resize relative overflow-hidden group touch-none"
    >
      <div className="absolute inset-0 bg-cover bg-no-repeat" style={{ backgroundImage: `url('${image}')`, backgroundPosition: `center ${offsetY}%` }} />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
        <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded-full">上下拖动调整位置</span>
      </div>
    </div>
  );
}



export default function Home({ showToast, tasks, setTasks }: { showToast: (msg: string) => void, tasks: Task[], setTasks: React.Dispatch<React.SetStateAction<Task[]>> }) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [accountPreviewMap, setAccountPreviewMap] = useState<Record<string, AccountPreview>>({});
  const [activeAccount, setActiveAccount] = useState('旅行主账号');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountImage, setNewAccountImage] = useState('');
  const [newAccountImageOffsetY, setNewAccountImageOffsetY] = useState(50);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({ title: '', date: new Date().toISOString().split('T')[0], status: '待拍' as Task['status'] });
  const [recordingTask, setRecordingTask] = useState<Task | null>(null);
  const [selectedStatusView, setSelectedStatusView] = useState<'已拍' | '待拍' | '已发' | null>(null);

  const accountTasks = tasks.filter(t => t.account === activeAccount || (!t.account && activeAccount === '旅行主账号'));
  const completedTasks = accountTasks.filter(t => t.status === '已拍');
  const todoTasks = accountTasks.filter(t => t.status === '待拍');
  const ideaTasks = accountTasks.filter(t => t.status === '已发');

  const completeTask = (task: Task) => {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: '已拍' } : t));
    showToast(`已完成：${task.title}`);
  };

  const handleCreateTask = () => {
    if (!newTask.title) {
      showToast('请输入任务名称');
      return;
    }
    if (editingId) {
      setTasks(prev => prev.map(t => t.id === editingId ? { ...t, title: newTask.title, date: newTask.date, status: newTask.status } : t));
      setEditingId(null);
      showToast('任务修改成功');
    } else {
      const task: Task = {
        id: Date.now().toString(),
        title: newTask.title,
        date: newTask.date || new Date().toISOString().split('T')[0],
        location: '未指定',
        status: newTask.status,
        account: activeAccount
      };
      setTasks(prev => [...prev, task]);
      showToast('任务创建成功');
    }
    setIsModalOpen(false);
    setNewTask({ title: '', date: new Date().toISOString().split('T')[0], status: '待拍' });
  };

  const handleEdit = (task: Task) => {
    setNewTask({ title: task.title, date: task.date, status: task.status });
    setEditingId(task.id);
    setIsModalOpen(true);
  };

  const handleDelete = (task: Task) => {
    setTasks(prev => prev.filter(t => t.id !== task.id));
    showToast('任务已删除');
  };

  const handleRecordData = (task: Task) => {
    setRecordingTask(task);
  };

  const handleReorderCompleted = (newOrder: Task[]) => {
    setTasks(prev => {
      const otherTasks = prev.filter(t => !(t.status === '已拍' && (t.account === activeAccount || (!t.account && activeAccount === '旅行主账号'))));
      return [...otherTasks, ...newOrder];
    });
  };

  const handleReorderTodo = (newOrder: Task[]) => {
    setTasks(prev => {
      const otherTasks = prev.filter(t => !(t.status === '待拍' && (t.account === activeAccount || (!t.account && activeAccount === '旅行主账号'))));
      return [...otherTasks, ...newOrder];
    });
  };

  const handleReorderIdea = (newOrder: Task[]) => {
    setTasks(prev => {
      const otherTasks = prev.filter(t => !(t.status === '已发' && (t.account === activeAccount || (!t.account && activeAccount === '旅行主账号'))));
      return [...otherTasks, ...newOrder];
    });
  };

  const handleAddAccountClick = () => {
    if (accounts.length >= 10) {
      showToast('最多只能添加10个账号');
      return;
    }
    setEditingAccountId(null);
    setNewAccountName('');
    setNewAccountImage('');
    setNewAccountImageOffsetY(50);
    setIsAddAccountModalOpen(true);
  };

  const handleEditAccountClick = (acc: Account) => {
    const accountIndex = accounts.findIndex(a => a.id === acc.id);
    setEditingAccountId(acc.id);
    setNewAccountName(acc.name);
    setNewAccountImage(acc.image || getDefaultAccountImage(accountIndex >= 0 ? accountIndex : 0));
    setNewAccountImageOffsetY(acc.imageOffsetY ?? 50);
    setIsAddAccountModalOpen(true);
  };

  const handleOpenAccountEditor = (acc: Account) => {
    setActiveAccount(acc.name);
    handleEditAccountClick(acc);
  };

  const getDisplayAccount = (acc: Account, index: number): AccountPreview & Pick<Account, 'id' | 'name'> => {
    const preview = accountPreviewMap[acc.id];
    if (preview) {
      return { ...acc, image: preview.image || getDefaultAccountImage(index), imageOffsetY: preview.imageOffsetY };
    }
    return { ...acc, image: acc.image || getDefaultAccountImage(index), imageOffsetY: acc.imageOffsetY ?? 50 };
  };

  const updateEditingAccountPreview = (image: string, imageOffsetY: number) => {
    if (!editingAccountId) return;
    setAccountPreviewMap(prev => ({
      ...prev,
      [editingAccountId]: { image, imageOffsetY },
    }));
  };

  const clearAccountPreview = (accountId: string | null) => {
    if (!accountId) return;
    setAccountPreviewMap(prev => {
      if (!prev[accountId]) return prev;
      const next = { ...prev };
      delete next[accountId];
      return next;
    });
  };

  const handleCloseAccountModal = () => {
    clearAccountPreview(editingAccountId);
    setNewAccountName('');
    setNewAccountImage('');
    setNewAccountImageOffsetY(50);
    setIsAddAccountModalOpen(false);
    setEditingAccountId(null);
  };

  const handleSaveAccount = () => {
    if (!newAccountName.trim()) {
      showToast('请输入账号名称');
      return;
    }
    if (editingAccountId) {
      const currentEditingAccountId = editingAccountId;
      setAccounts(prev =>
        prev.map((a, idx) =>
          a.id === currentEditingAccountId
            ? {
                ...a,
                name: newAccountName.trim(),
                image: newAccountImage || a.image || getDefaultAccountImage(idx),
                imageOffsetY: newAccountImageOffsetY,
              }
            : a
        )
      );
      clearAccountPreview(currentEditingAccountId);
      showToast('账号修改成功');
    } else {
      if (accounts.length >= 10) {
        showToast('最多只能添加10个账号');
        return;
      }
      const newAcc: Account = {
        id: Date.now().toString(),
        name: newAccountName.trim(),
        image: newAccountImage || getDefaultAccountImage(accounts.length),
        imageOffsetY: newAccountImageOffsetY
      };
      setAccounts([...accounts, newAcc]);
      showToast('账号添加成功');
    }
    setNewAccountName('');
    setNewAccountImage('');
    setNewAccountImageOffsetY(50);
    setIsAddAccountModalOpen(false);
    setEditingAccountId(null);
  };
  return (
    <>
      <div className="flex items-center justify-between px-5 pt-12 pb-2 bg-white/80 ios-blur sticky top-0 z-30 border-b border-gray-200 ">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">10月24日 星期二</span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">账号管理</h1>
        </div>
        <div className="relative group cursor-pointer">
          <div className="w-9 h-9 rounded-full overflow-hidden border border-gray-200 shadow-sm">
            <img alt="User profile" className="w-full h-full object-cover" src={images.avatar} referrerPolicy="no-referrer" />
          </div>
          <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white "></div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-32">
        <div className="px-5 pt-4 pb-2">
          <div className="bg-white text-slate-900 rounded-3xl p-4 shadow-sm relative overflow-hidden ring-1 ring-gray-100 ">
            <div className="flex justify-between items-center mb-3 px-1">
              <span className="text-xs font-medium text-gray-500 ">发布管理</span>
              <span onClick={() => showToast('打开账号切换面板')} className="text-xs font-medium text-primary cursor-pointer hover:text-slate-500 transition-colors">账号切换</span>
            </div>
            <div className="flex justify-between items-center relative z-10 gap-4">
              <div onClick={() => setSelectedStatusView('已拍')} className="flex items-center gap-3 flex-1 bg-gray-50 rounded-2xl p-2 pr-3 cursor-pointer hover:bg-gray-100  transition-colors active:scale-95 duration-200 group">
                <div className="relative w-10 h-10 flex items-center justify-center">
                  <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
                    <circle className="stroke-gray-200 " cx="50" cy="50" fill="none" r="40" strokeWidth="10"></circle>
                    <circle className="group-hover:stroke-[12] transition-all" cx="50" cy="50" fill="none" r="40" stroke="#a3e635" strokeDasharray="251.2" strokeDashoffset="60" strokeLinecap="round" strokeWidth="10"></circle>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-[#a3e635]">{completedTasks.length}</span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 font-medium uppercase group-hover:text-slate-900  transition-colors">已拍</span>
                  <span className="text-xs font-bold text-slate-900 ">今日</span>
                </div>
              </div>

              <div onClick={() => setSelectedStatusView('待拍')} className="flex items-center gap-3 flex-1 bg-gray-50 rounded-2xl p-2 pr-3 cursor-pointer hover:bg-gray-100  transition-colors active:scale-95 duration-200 group">
                <div className="relative w-10 h-10 flex items-center justify-center">
                  <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
                    <circle className="stroke-gray-200 " cx="50" cy="50" fill="none" r="40" strokeWidth="10"></circle>
                    <circle className="group-hover:stroke-[12] transition-all" cx="50" cy="50" fill="none" r="40" stroke="#f87171" strokeDasharray="251.2" strokeDashoffset="100" strokeLinecap="round" strokeWidth="10"></circle>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-[#f87171]">{todoTasks.length}</span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 font-medium uppercase group-hover:text-slate-900  transition-colors">灵感</span>
                  <span className="text-xs font-bold text-slate-900 ">待拍</span>
                </div>
              </div>

              <div onClick={() => setSelectedStatusView('已发')} className="flex items-center gap-3 flex-1 bg-gray-50 rounded-2xl p-2 pr-3 cursor-pointer hover:bg-gray-100  transition-colors active:scale-95 duration-200 group">
                <div className="relative w-10 h-10 flex items-center justify-center">
                  <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
                    <circle className="stroke-gray-200 " cx="50" cy="50" fill="none" r="40" strokeWidth="10"></circle>
                    <circle className="group-hover:stroke-[12] transition-all" cx="50" cy="50" fill="none" r="40" stroke="#60a5fa" strokeDasharray="251.2" strokeDashoffset="180" strokeLinecap="round" strokeWidth="10"></circle>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-[#60a5fa]">{ideaTasks.length}</span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 font-medium uppercase group-hover:text-slate-900  transition-colors">已发</span>
                  <span className="text-xs font-bold text-slate-900 ">今日</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 mb-2">
          <div className="flex items-center justify-between px-5 mb-3">
            <h3 className="text-lg font-bold text-slate-900 ">账号管理</h3>
            <button onClick={() => showToast('打开排序选项')} className="text-xs font-medium text-primary flex items-center gap-0.5 hover:bg-primary/10 px-2 py-1 rounded-full transition-colors">
              <ListFilter className="w-3.5 h-3.5" />
              排序
            </button>
          </div>

          <div className="px-5 mb-4 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-6 border-b border-gray-200 pb-1 min-w-max">
              <Reorder.Group axis="x" values={accounts} onReorder={setAccounts} className="flex items-center gap-6">
                {accounts.map((acc, index) => {
                  const displayAcc = getDisplayAccount(acc, index);
                  return (
                  <Reorder.Item key={acc.id} value={acc}>
                    <button 
                      onClick={() => setActiveAccount(acc.name)}
                      className={`text-sm pb-2 px-1 transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeAccount === acc.name ? 'font-semibold text-slate-900 border-b-2 border-slate-900 ' : 'font-medium text-gray-500 hover:text-slate-900 '}`}
                    >
                      <img src={displayAcc.image} alt={acc.name} className="w-5 h-5 rounded-full object-cover shadow-sm" />
                      {acc.name}
                    </button>
                  </Reorder.Item>
                )})}
              </Reorder.Group>
              <button 
                onClick={handleAddAccountClick}
                className="text-sm pb-2 px-1 font-medium text-primary hover:text-slate-600 transition-colors flex items-center gap-1 shrink-0"
              >
                <Plus className="w-4 h-4" /> 添加账号
              </button>
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto px-5 pb-4 no-scrollbar snap-x snap-mandatory">
            {accounts.map((acc, index) => {
              const displayAcc = getDisplayAccount(acc, index);
              return (
              <div 
                key={acc.id} 
                onClick={() => handleOpenAccountEditor(acc)}
                className={`snap-center shrink-0 w-[85vw] h-48 rounded-3xl relative overflow-hidden group shadow-lg border transition-all cursor-pointer ${activeAccount === acc.name ? 'border-primary ring-2 ring-primary/50' : 'border-gray-200 '}`}
              >
                <div className="absolute inset-0 bg-cover bg-no-repeat transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: `url('${displayAcc.image}')`, backgroundPosition: `center ${displayAcc.imageOffsetY}%`, filter: 'brightness(0.6)' }}></div>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-20 backdrop-blur-[2px]">
                  <div className="flex flex-col items-center gap-2 text-white">
                    <Camera className="w-8 h-8" />
                    <span className="text-xs font-medium">点击编辑账号与截图</span>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
                  <div className="w-8 h-8 rounded-full bg-white p-0.5 shadow-sm">
                    <img alt="Platform" className="w-full h-full rounded-full object-cover" src={displayAcc.image} referrerPolicy="no-referrer" />
                  </div>
                  <span className="text-white font-semibold text-sm drop-shadow-md">{acc.name}</span>
                </div>
                <div className="absolute top-4 right-4 z-10">
                  <button onClick={(e) => { e.stopPropagation(); handleOpenAccountEditor(acc); }} className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors border border-white/20">
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end z-10">
                  <div>
                    <div className="text-white text-xs opacity-80 mb-1">粉丝数</div>
                    <div className="text-white font-bold text-2xl">12.5万</div>
                  </div>
                  <div onClick={(e) => { e.stopPropagation(); showToast(`查看${acc.name}主页`); }} className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 hover:bg-white/30 transition-colors cursor-pointer">
                    <span className="text-white text-xs font-medium">查看主页</span>
                  </div>
                </div>
              </div>
            )})}
          </div>
        </div>

        <div className="px-5 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="text-[#a3e635] w-5 h-5" />
              <h3 className="text-base font-semibold text-slate-800 ">今日已拍</h3>
            </div>
            <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 ">
              <Reorder.Group axis="y" values={completedTasks} onReorder={handleReorderCompleted}>
                {completedTasks.map(task => (
                  <Reorder.Item key={task.id} value={task}>
                    <SwipeableTask task={task} onEdit={handleEdit} onDelete={handleDelete} onClick={handleRecordData}>
                      <div className="p-3.5 flex items-center gap-3 w-full group hover:bg-gray-50  transition-colors cursor-pointer">
                        <GripVertical className="w-4 h-4 text-gray-300 cursor-grab active:cursor-grabbing shrink-0" />
                        <div className="w-1 h-8 bg-[#a3e635] rounded-full group-hover:scale-y-110 transition-transform shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                            {task.hitStatus === '爆款' && <Star className="w-3.5 h-3.5 text-orange-500 fill-orange-500 shrink-0" />}
                            {task.hitStatus === '小爆款' && <Star className="w-3.5 h-3.5 text-orange-400 fill-orange-400 shrink-0" />}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{task.date} • {task.location}</p>
                        </div>
                        <span className="text-xs text-gray-400 font-medium whitespace-nowrap shrink-0">已完成</span>
                      </div>
                    </SwipeableTask>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Video className="text-amber-500 w-5 h-5" />
              <h3 className="text-base font-semibold text-slate-800 ">今日待拍</h3>
            </div>
            <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 ">
              {todoTasks.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500 ">今日待拍已全部完成 🎉</div>
              ) : (
                <Reorder.Group axis="y" values={todoTasks} onReorder={handleReorderTodo}>
                  {todoTasks.map(task => (
                    <Reorder.Item key={task.id} value={task}>
                      <SwipeableTask task={task} onEdit={handleEdit} onDelete={handleDelete} onClick={() => completeTask(task)}>
                        <div className="p-3.5 flex items-center gap-3 w-full group hover:bg-gray-50  transition-colors cursor-pointer">
                          <GripVertical className="w-4 h-4 text-gray-300 cursor-grab active:cursor-grabbing shrink-0" />
                          <div className="w-1 h-8 bg-amber-500 rounded-full group-hover:scale-y-110 transition-transform shrink-0"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{task.date} • {task.location}</p>
                          </div>
                          <div className="w-5 h-5 rounded-full border-2 border-gray-300 group-hover:border-primary transition-colors flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      </SwipeableTask>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              )}
            </div>
          </div>

          {ideaTasks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Send className="text-blue-500 w-5 h-5" />
                <h3 className="text-base font-semibold text-slate-800 ">今日已发</h3>
              </div>
              <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 ">
                <Reorder.Group axis="y" values={ideaTasks} onReorder={handleReorderIdea}>
                  {ideaTasks.map(task => (
                    <Reorder.Item key={task.id} value={task}>
                      <SwipeableTask task={task} onEdit={handleEdit} onDelete={handleDelete} onClick={() => showToast(`查看内容：${task.title}`)}>
                        <div className="p-3.5 flex items-center gap-3 w-full group hover:bg-gray-50  transition-colors cursor-pointer">
                          <GripVertical className="w-4 h-4 text-gray-300 cursor-grab active:cursor-grabbing shrink-0" />
                          <div className="w-1 h-8 bg-yellow-500 rounded-full group-hover:scale-y-110 transition-transform shrink-0"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{task.date} • {task.location}</p>
                          </div>
                        </div>
                      </SwipeableTask>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Send className="text-violet-500 w-5 h-5" />
              <h3 className="text-base font-semibold text-slate-800 ">今日已发</h3>
            </div>
            <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 ">
              <div className="p-3.5 flex items-center gap-3 list-group-separator group hover:bg-gray-50  transition-colors cursor-pointer">
                <div className="w-1 h-8 bg-violet-500 rounded-full group-hover:scale-y-110 transition-transform"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">早安图文：今日心情</p>
                  <p className="text-xs text-gray-500 mt-0.5">08:00 AM • 旅行主账号</p>
                </div>
                <div className="flex items-center text-gray-400 gap-1 group-hover:text-violet-500 transition-colors">
                  <Eye className="w-3.5 h-3.5" />
                  <span className="text-xs">1.2k</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-8 pb-8">
          <button onClick={() => { setEditingId(null); setNewTask({ title: '', date: new Date().toISOString().split('T')[0], status: '待拍' }); setIsModalOpen(true); }} className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-white/40 ios-blur border border-white/30 shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <Plus className="w-8 h-8 text-primary font-light" />
          </button>
        </div>
      </div>

      {/* Create/Edit Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 ">{editingId ? '修改任务' : '新建任务'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 ">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">任务名称</label>
                <input 
                  type="text" 
                  value={newTask.title}
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                  placeholder="例如：周末探店 Vlog"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-slate-900 "
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">日期</label>
                <input 
                  type="date" 
                  value={newTask.date}
                  onChange={e => setNewTask({...newTask, date: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-slate-900 "
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">状态</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['待拍', '已拍', '已发'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => setNewTask({...newTask, status})}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-all ${newTask.status === status ? 'bg-primary text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 '}`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleCreateTask}
                className="w-full py-3.5 mt-2 bg-primary hover:bg-slate-800  text-white rounded-xl font-semibold shadow-lg shadow-primary/30 active:scale-[0.98] transition-all"
              >
                {editingId ? '保存修改' : '创建任务'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Record Modal */}
      {recordingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 ">复盘记录</h3>
              <button onClick={() => setRecordingTask(null)} className="text-gray-400 hover:text-gray-600 ">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">标记爆款</label>
                <div className="flex gap-3">
                  <button onClick={() => setRecordingTask({...recordingTask, hitStatus: '爆款'})} className={`flex-1 py-2 rounded-xl text-sm font-medium border ${recordingTask.hitStatus === '爆款' ? 'border-orange-500 bg-orange-500 text-white ' : 'border-gray-200 '}`}>大爆款</button>
                  <button onClick={() => setRecordingTask({...recordingTask, hitStatus: '小爆款'})} className={`flex-1 py-2 rounded-xl text-sm font-medium border ${recordingTask.hitStatus === '小爆款' ? 'border-orange-400 bg-orange-400 text-white ' : 'border-gray-200 '}`}>小爆款</button>
                  <button onClick={() => setRecordingTask({...recordingTask, hitStatus: null})} className={`flex-1 py-2 rounded-xl text-sm font-medium border ${!recordingTask.hitStatus ? 'border-gray-400 bg-gray-100 ' : 'border-gray-200 '}`}>无</button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">复盘（下次要修改的地方）</label>
                <textarea 
                  value={recordingTask.reviewData || ''}
                  onChange={e => setRecordingTask({...recordingTask, reviewData: e.target.value})}
                  placeholder="例如：小红书播放量10w+，点赞2k..."
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-slate-900 h-32 resize-none"
                />
              </div>

              <button 
                onClick={() => {
                  setTasks(prev => prev.map(t => t.id === recordingTask.id ? recordingTask : t));
                  setRecordingTask(null);
                  showToast('复盘记录已保存');
                }}
                className="w-full py-3.5 mt-2 bg-primary hover:bg-slate-800  text-white rounded-xl font-semibold shadow-lg shadow-primary/30 active:scale-[0.98] transition-all"
              >
                保存记录
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Add Account Modal */}
      {isAddAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 ">{editingAccountId ? '修改账号' : '添加账号'}</h3>
              <button onClick={handleCloseAccountModal} className="text-gray-400 hover:text-gray-600 ">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">账号名称</label>
                <input 
                  type="text" 
                  value={newAccountName}
                  onChange={e => setNewAccountName(e.target.value)}
                  placeholder="例如：小红书副号"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-slate-900 "
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">账号截图</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const url = URL.createObjectURL(e.target.files[0]);
                      setNewAccountImage(url);
                      setNewAccountImageOffsetY(50);
                      updateEditingAccountPreview(url, 50);
                    }
                  }}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
                {newAccountImage && (
                  <ImagePositioner
                    image={newAccountImage}
                    offsetY={newAccountImageOffsetY}
                    setOffsetY={(offsetY) => {
                      setNewAccountImageOffsetY(offsetY);
                      updateEditingAccountPreview(newAccountImage, offsetY);
                    }}
                  />
                )}
              </div>

              <button 
                onClick={handleSaveAccount}
                className="w-full py-3.5 mt-2 bg-primary hover:bg-slate-800  text-white rounded-xl font-semibold shadow-lg shadow-primary/30 active:scale-[0.98] transition-all"
              >
                {editingAccountId ? '保存修改' : '确认添加'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Status View Modal */}
      {selectedStatusView && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md h-[80vh] sm:h-[600px] flex flex-col shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 ">
              <h3 className="text-xl font-bold text-slate-900 ">
                {selectedStatusView === '已拍' ? '今日已拍' : selectedStatusView === '待拍' ? '待拍灵感' : '今日已发'}
              </h3>
              <button onClick={() => setSelectedStatusView(null)} className="text-gray-400 hover:text-gray-600 ">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {accountTasks.filter(t => t.status === selectedStatusView).length === 0 ? (
                <div className="text-center py-10 text-gray-400">暂无内容</div>
              ) : (
                accountTasks.filter(t => t.status === selectedStatusView).map(task => (
                  <div key={task.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-start gap-3">
                    {selectedStatusView === '待拍' && (
                      <div onClick={() => completeTask(task)} className="mt-0.5 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-primary transition-colors flex items-center justify-center cursor-pointer shrink-0 group/check">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary opacity-0 group-hover/check:opacity-100 transition-opacity" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-slate-900 ">{task.title}</h4>
                        <div className="flex items-center gap-1 -mt-1 -mr-1">
                          <button onClick={() => { handleEdit(task); setSelectedStatusView(null); }} className="p-1.5 text-gray-400 hover:text-slate-700  transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(task)} className="p-1.5 text-gray-400 hover:text-slate-700  transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-white text-gray-500 ">{task.date}</span>
                        <span className="text-xs text-gray-500 ">{task.location}</span>
                      </div>
                      {task.reviewData && (
                        <p className="text-xs text-gray-400 mt-1 bg-white p-2 rounded-lg">{task.reviewData}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
