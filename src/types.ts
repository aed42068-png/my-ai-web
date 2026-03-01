export interface Task {
  id: string;
  title: string;
  date: string;
  location: string;
  status: '已拍' | '待拍' | '已发';
  hitStatus?: '爆款' | '小爆款' | null;
  reviewData?: string;
  account?: string;
}
