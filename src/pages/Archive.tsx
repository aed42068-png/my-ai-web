import { useState, useEffect } from 'react';
import { ChevronLeft, Plus, Search, ChevronRight, Star, Camera, Music, Play, Briefcase, FileText, Palette, X } from 'lucide-react';
import { images } from '../data/mockData';
import { Task } from '../types';
import { SwipeableTask } from '../components/SwipeableTask';
import { Reorder } from 'motion/react';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#10b981', 
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1'
];

export default function Archive({ showToast, setActiveTab, tasks, setTasks }: { showToast: (msg: string) => void, setActiveTab: (tab: string) => void, tasks: Task[], setTasks: React.Dispatch<React.SetStateAction<Task[]>> }) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const [selectedDate, setSelectedDate] = useState(today.getDate());
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Load colors from localStorage or use defaults
  const [completedColor, setCompletedColor] = useState(() => localStorage.getItem('archive_completed_color') || '#10b981');
  const [todoColor, setTodoColor] = useState(() => localStorage.getItem('archive_todo_color') || '#f59e0b');
  const [publishedColor, setPublishedColor] = useState(() => localStorage.getItem('archive_published_color') || '#3b82f6');

  // Display toggles
  const [showCompleted, setShowCompleted] = useState(() => localStorage.getItem('archive_show_completed') !== 'false');
  const [showTodo, setShowTodo] = useState(() => localStorage.getItem('archive_show_todo') !== 'false');
  const [showPublished, setShowPublished] = useState(() => localStorage.getItem('archive_show_published') !== 'false');

  // Edit Task State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({ title: '', date: new Date().toISOString().split('T')[0], status: '待拍' as Task['status'] });

  useEffect(() => {
    localStorage.setItem('archive_completed_color', completedColor);
  }, [completedColor]);

  useEffect(() => {
    localStorage.setItem('archive_todo_color', todoColor);
  }, [todoColor]);

  useEffect(() => {
    localStorage.setItem('archive_published_color', publishedColor);
  }, [publishedColor]);

  useEffect(() => {
    localStorage.setItem('archive_show_completed', String(showCompleted));
    localStorage.setItem('archive_show_todo', String(showTodo));
    localStorage.setItem('archive_show_published', String(showPublished));
  }, [showCompleted, showTodo, showPublished]);

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();

  const blanks = Array.from({ length: firstDay }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getTasksForDate = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter(t => t.date === dateStr);
  };

  const selectedDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;
  
  const filteredTasks = tasks.filter(t => {
    if (searchQuery) {
      return t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
             (t.reviewData && t.reviewData.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return t.date === selectedDateStr;
  });

  const handleEdit = (task: Task) => {
    setNewTask({ title: task.title, date: task.date, status: task.status });
    setEditingId(task.id);
    setIsModalOpen(true);
  };

  const handleDelete = (task: Task) => {
    setTasks(prev => prev.filter(t => t.id !== task.id));
    showToast('任务已删除');
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
        date: newTask.date || selectedDateStr,
        location: '未指定',
        status: newTask.status,
      };
      setTasks(prev => [...prev, task]);
      showToast('任务创建成功');
    }
    setIsModalOpen(false);
    setNewTask({ title: '', date: selectedDateStr, status: '待拍' });
  };

  const handleReorder = (status: Task['status'], newOrder: Task[]) => {
    setTasks(prev => {
      const otherTasks = prev.filter(t => t.status !== status || (searchQuery ? false : t.date !== selectedDateStr));
      return [...otherTasks, ...newOrder];
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 ">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 ">
        <div className="flex items-center justify-between px-4 pt-12 pb-2">
          <button onClick={() => setActiveTab('home')} className="flex items-center text-primary hover:text-slate-600 transition-colors">
            <ChevronLeft className="w-6 h-6" />
            <span className="ml-1 text-[17px] font-normal">返回</span>
          </button>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsColorModalOpen(true)} className="text-primary hover:text-slate-600 transition-colors">
              <Palette className="w-6 h-6" />
            </button>
            <button onClick={() => { setEditingId(null); setNewTask({ title: '', date: selectedDateStr, status: '待拍' }); setIsModalOpen(true); }} className="text-primary hover:text-slate-600 transition-colors">
              <Plus className="w-6 h-6" />
            </button>
            <button onClick={() => setIsSearchOpen(!isSearchOpen)} className={`transition-colors ${isSearchOpen ? 'text-slate-600' : 'text-primary hover:text-slate-600'}`}>
              <Search className="w-6 h-6" />
            </button>
          </div>
        </div>

        {isSearchOpen && (
          <div className="px-4 pb-3 animate-in slide-in-from-top-2">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索记录内容..." 
              className="w-full bg-gray-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
              autoFocus
            />
          </div>
        )}

        <div className="px-4 pb-2 pt-2">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-[26px] font-bold tracking-tight text-slate-900 ">{currentYear}年 {currentMonth}月</h1>
            <div className="flex gap-4 text-primary">
              <ChevronLeft className="w-6 h-6 cursor-pointer" />
              <ChevronRight className="w-6 h-6 cursor-pointer" />
            </div>
          </div>

          <div className="grid grid-cols-7 text-center mb-2">
            {['日', '一', '二', '三', '四', '五', '六'].map(day => (
              <span key={day} className="text-[11px] font-semibold text-slate-400 uppercase">{day}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 text-center gap-y-3">
            {blanks.map(b => (
              <div key={`blank-${b}`} className="py-2"></div>
            ))}
            {days.map(day => {
              const isSelected = day === selectedDate;
              const dayTasks = getTasksForDate(day);
              const completedCount = dayTasks.filter(t => t.status === '已拍').length;
              const todoCount = dayTasks.filter(t => t.status === '待拍').length;
              const publishedCount = dayTasks.filter(t => t.status === '已发').length;
              const hasBigHit = dayTasks.some(t => t.hitStatus === '爆款');
              const hasSmallHit = dayTasks.some(t => t.hitStatus === '小爆款');
              
              return (
                <div key={day} onClick={() => { setSelectedDate(day); setSearchQuery(''); setIsSearchOpen(false); }} className="relative group cursor-pointer flex flex-col items-center h-14">
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full text-[19px] font-normal transition-colors ${isSelected && !searchQuery ? 'bg-primary text-white font-semibold shadow-md' : 'text-slate-900 hover:bg-slate-100 '}`}>
                    {day}
                  </div>
                  <div className="flex gap-1 mt-0.5">
                    {showCompleted && completedCount > 0 && (
                      <div className="flex items-center text-[9px] font-medium" style={{ color: completedColor }}>
                        <div className="w-1.5 h-1.5 rounded-full mr-0.5" style={{ backgroundColor: completedColor }}></div>
                        {completedCount}
                      </div>
                    )}
                    {showTodo && todoCount > 0 && (
                      <div className="flex items-center text-[9px] font-medium" style={{ color: todoColor }}>
                        <div className="w-1.5 h-1.5 rounded-full mr-0.5" style={{ backgroundColor: todoColor }}></div>
                        {todoCount}
                      </div>
                    )}
                    {showPublished && publishedCount > 0 && (
                      <div className="flex items-center text-[9px] font-medium" style={{ color: publishedColor }}>
                        <div className="w-1.5 h-1.5 rounded-full mr-0.5" style={{ backgroundColor: publishedColor }}></div>
                        {publishedCount}
                      </div>
                    )}
                  </div>
                  {hasBigHit ? (
                    <Star className={`w-2.5 h-2.5 text-orange-500 absolute top-0 right-1 fill-orange-500`} />
                  ) : hasSmallHit ? (
                    <Star className={`w-2.5 h-2.5 text-orange-400 absolute top-0 right-1 fill-orange-400`} />
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="flex justify-center mt-3 pb-1">
            <div className="w-10 h-1 bg-slate-300 rounded-full"></div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        <div className="px-4 py-4 bg-gray-ios sticky top-0 z-10 backdrop-blur-sm">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            {searchQuery ? '搜索结果' : `${currentMonth}月${selectedDate}日`}
          </h2>
        </div>

        <div className="px-5 space-y-6">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-10 text-gray-400">{searchQuery ? '没有找到相关记录' : '这一天没有记录'}</div>
          ) : (
            <>
              {['待拍', '已拍', '已发'].map(status => {
                const statusTasks = filteredTasks.filter(t => t.status === status);
                if (statusTasks.length === 0) return null;
                
                const statusColor = status === '已拍' ? completedColor : status === '待拍' ? todoColor : publishedColor;
                const statusLabel = status;
                
                return (
                  <div key={status} className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }}></div>
                      {statusLabel}
                    </h3>
                    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 ">
                      <Reorder.Group axis="y" values={statusTasks} onReorder={(newOrder) => handleReorder(status as Task['status'], newOrder)}>
                        {statusTasks.map(task => (
                          <Reorder.Item key={task.id} value={task}>
                            <SwipeableTask task={task} onEdit={handleEdit} onDelete={handleDelete} onClick={() => showToast(`查看详情：${task.title}`)}>
                              <div className="p-3.5 flex items-center gap-3 w-full group hover:bg-gray-50  transition-colors cursor-pointer">
                                <div className="w-1 h-8 rounded-full group-hover:scale-y-110 transition-transform shrink-0" style={{ backgroundColor: statusColor }}></div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                                    {task.hitStatus === '爆款' && <Star className="w-3.5 h-3.5 text-orange-500 fill-orange-500 shrink-0" />}
                                    {task.hitStatus === '小爆款' && <Star className="w-3.5 h-3.5 text-orange-400 fill-orange-400 shrink-0" />}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {task.account && <span className="mr-1">{task.account} •</span>}
                                    {task.date} • {task.location}
                                  </p>
                                </div>
                                {task.reviewData && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded shrink-0">有复盘</span>
                                )}
                              </div>
                            </SwipeableTask>
                          </Reorder.Item>
                        ))}
                      </Reorder.Group>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </main>

      {/* Color Settings Modal */}
      {isColorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 ">设置状态显示与颜色</h3>
              <button onClick={() => setIsColorModalOpen(false)} className="text-gray-400 hover:text-gray-600 ">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* 已拍 Settings */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 ">「已拍」状态</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={showCompleted} onChange={() => setShowCompleted(!showCompleted)} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                {showCompleted && (
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map(color => (
                      <button 
                        key={color} 
                        onClick={() => setCompletedColor(color)}
                        className={`w-8 h-8 rounded-full border-2 transition-transform ${completedColor === color ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-110'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* 待拍 Settings */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 ">「待拍」状态</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={showTodo} onChange={() => setShowTodo(!showTodo)} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                {showTodo && (
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map(color => (
                      <button 
                        key={color} 
                        onClick={() => setTodoColor(color)}
                        className={`w-8 h-8 rounded-full border-2 transition-transform ${todoColor === color ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-110'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* 已发 Settings */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 ">「已发」状态</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={showPublished} onChange={() => setShowPublished(!showPublished)} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                {showPublished && (
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map(color => (
                      <button 
                        key={color} 
                        onClick={() => setPublishedColor(color)}
                        className={`w-8 h-8 rounded-full border-2 transition-transform ${publishedColor === color ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-110'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                )}
              </div>

              <button 
                onClick={() => setIsColorModalOpen(false)}
                className="w-full py-3.5 mt-4 bg-primary hover:bg-slate-800  text-white rounded-xl font-semibold shadow-lg shadow-primary/30 active:scale-[0.98] transition-all"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Create Task Modal */}
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
                <div className="flex gap-3">
                  {['待拍', '已拍', '已发'].map(status => (
                    <button
                      key={status}
                      onClick={() => setNewTask({...newTask, status: status as Task['status']})}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${newTask.status === status ? 'bg-primary text-white shadow-md shadow-primary/30' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 '}`}
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
    </div>
  );
}
