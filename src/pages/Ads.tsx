import { useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, Plus, X } from 'lucide-react';

export default function Ads({ showToast }: { showToast: (msg: string) => void }) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  // Mock data for ads
  const [adData, setAdData] = useState({
    expenses: 12500,
    revenue: 38400,
    campaigns: [
      { id: 1, name: '春季新品推广', platform: '小红书', expense: 4500, revenue: 12000, roi: 2.67, status: 'active' },
      { id: 2, name: '日常种草引流', platform: '抖音', expense: 5000, revenue: 18000, roi: 3.6, status: 'active' },
      { id: 3, name: '品牌曝光', platform: 'B站', expense: 3000, revenue: 8400, roi: 2.8, status: 'completed' },
    ]
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: '', platform: '小红书', expense: '', revenue: '' });

  const totalProfit = adData.revenue - adData.expenses;
  const overallROI = (adData.revenue / adData.expenses).toFixed(2);

  const handleAddCampaign = () => {
    if (!newCampaign.name || !newCampaign.expense) {
      showToast('请填写完整信息');
      return;
    }

    const expense = parseFloat(newCampaign.expense);
    const revenue = parseFloat(newCampaign.revenue) || 0;

    const campaign = {
      id: Date.now(),
      name: newCampaign.name,
      platform: newCampaign.platform,
      expense,
      revenue,
      roi: revenue > 0 ? parseFloat((revenue / expense).toFixed(2)) : 0,
      status: 'active'
    };

    setAdData(prev => ({
      ...prev,
      expenses: prev.expenses + expense,
      revenue: prev.revenue + revenue,
      campaigns: [campaign, ...prev.campaigns]
    }));

    setIsModalOpen(false);
    setNewCampaign({ name: '', platform: '小红书', expense: '', revenue: '' });
    showToast('添加投放记录成功');
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 ">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 ">
        <div className="flex items-center justify-between px-4 pt-12 pb-4">
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 ">投放数据</h1>
          <button onClick={() => setIsModalOpen(true)} className="text-primary hover:text-blue-600 transition-colors">
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24 px-4 pt-6 space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 ">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-red-50 rounded-lg">
                <TrendingDown className="w-4 h-4 text-red-500" />
              </div>
              <span className="text-xs font-medium text-slate-500 ">当月投放费用</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 ">
              ¥{adData.expenses.toLocaleString()}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 ">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-emerald-50 rounded-lg">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-xs font-medium text-slate-500 ">当月广告收入</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 ">
              ¥{adData.revenue.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Profit & ROI */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-5 rounded-2xl shadow-md text-white">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">当月净利润</p>
              <div className="text-3xl font-bold flex items-center gap-1">
                <DollarSign className="w-6 h-6 opacity-80" />
                {totalProfit.toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <p className="text-blue-100 text-xs font-medium mb-1">整体 ROI</p>
              <div className="text-xl font-bold bg-white/20 px-3 py-1 rounded-lg backdrop-blur-sm">
                {overallROI}
              </div>
            </div>
          </div>
        </div>

        {/* Campaign List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 ">投放明细</h2>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
              {currentMonth}月
            </span>
          </div>

          <div className="space-y-3">
            {adData.campaigns.map(campaign => (
              <div key={campaign.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 ">{campaign.name}</h3>
                    <span className="inline-block mt-1 text-[10px] font-medium px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                      {campaign.platform}
                    </span>
                  </div>
                  <div className={`text-xs font-medium px-2 py-1 rounded-full ${campaign.status === 'active' ? 'bg-blue-50 text-blue-600 ' : 'bg-gray-50 text-gray-500 '}`}>
                    {campaign.status === 'active' ? '投放中' : '已结束'}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-50 ">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 mb-0.5">花费</span>
                    <span className="text-sm font-semibold text-slate-700 ">¥{campaign.expense.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-slate-400 mb-0.5">ROI</span>
                    <span className="text-sm font-bold text-primary">{campaign.roi}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-400 mb-0.5">收入</span>
                    <span className="text-sm font-semibold text-emerald-600 ">¥{campaign.revenue.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Add Campaign Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 ">新增投放记录</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 :text-gray-200">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">项目名称</label>
                <input 
                  type="text" 
                  value={newCampaign.name}
                  onChange={e => setNewCampaign({...newCampaign, name: e.target.value})}
                  placeholder="例如：春季新品推广"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-slate-900 "
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">投放平台</label>
                <select 
                  value={newCampaign.platform}
                  onChange={e => setNewCampaign({...newCampaign, platform: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-slate-900 appearance-none"
                >
                  <option value="小红书">小红书</option>
                  <option value="抖音">抖音</option>
                  <option value="B站">B站</option>
                  <option value="微信公众号">微信公众号</option>
                  <option value="其他">其他</option>
                </select>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">投放费用 (¥)</label>
                  <input 
                    type="number" 
                    value={newCampaign.expense}
                    onChange={e => setNewCampaign({...newCampaign, expense: e.target.value})}
                    placeholder="0"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-slate-900 "
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">广告收入 (¥)</label>
                  <input 
                    type="number" 
                    value={newCampaign.revenue}
                    onChange={e => setNewCampaign({...newCampaign, revenue: e.target.value})}
                    placeholder="0"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-slate-900 "
                  />
                </div>
              </div>

              <button 
                onClick={handleAddCampaign}
                className="w-full py-3.5 mt-2 bg-primary hover:bg-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-primary/30 active:scale-[0.98] transition-all"
              >
                保存记录
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
