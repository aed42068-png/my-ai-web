PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready',
  owner_entity_type TEXT,
  owner_entity_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cover_asset_id TEXT,
  cover_image_url TEXT NOT NULL,
  cover_offset_y INTEGER NOT NULL DEFAULT 50,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (cover_asset_id) REFERENCES assets(id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '未指定',
  status TEXT NOT NULL CHECK (status IN ('已拍', '待拍', '已发')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tasks_account_status_sort
  ON tasks (account_id, status, sort_order);

CREATE INDEX IF NOT EXISTS idx_tasks_date
  ON tasks (date DESC);

CREATE TABLE IF NOT EXISTS task_reviews (
  task_id TEXT PRIMARY KEY,
  hit_status TEXT CHECK (hit_status IN ('爆款', '小爆款') OR hit_status IS NULL),
  review_data TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ad_records (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount REAL NOT NULL,
  settlement_status TEXT CHECK (settlement_status IN ('settled', 'unsettled') OR settlement_status IS NULL),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ad_records_account_date
  ON ad_records (account_id, date DESC);

INSERT OR IGNORE INTO accounts (
  id,
  name,
  cover_asset_id,
  cover_image_url,
  cover_offset_y,
  sort_order,
  created_at,
  updated_at
) VALUES
  (
    'acc_travel',
    '旅行主账号',
    NULL,
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAOv7wIKwK3XjaKw-4aaJXAybZ1F14LQWZlhR2xWfWqAN2No2HcU57V7d5Ybg1XQMlcNl5kMcdqiuLCGsFwSQ9vG2qI0u77N_x8F7FhgIsDuMPWGhTKnUqlP3HAFieErYLlm7TGawzEudrp5ETiGAks3N4rAQEnhWP_tGbG8RGPjoPl657gXMv1oJOJz58MDwl9C6fBXzGyzuCR8YbFcEJk5Q1XDNpFCIeaZ1I5aNqITrPXXxE2ap1nIcY0QSRC3MAtmIbRIPa8ghRa',
    50,
    0,
    '2026-03-01T09:00:00.000Z',
    '2026-03-01T09:00:00.000Z'
  ),
  (
    'acc_ai',
    'AI教程号',
    NULL,
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCX6C3MyjnLFsV9iCVG3QlgNW9Y3YAhdJess4uSZGvNU-Z2-ZqcVWa-FdyXzKE-3EgTjY_OWJMj7iYW4pCvUqaIXibr-oxn-tXl0uX6K-t8QTOyUa1MTAccz4OThbvBJ3nl5ZeLUDc_lAfCnnmn09BJY6ZIlohzhpK8_XHRdhdlYoT71dZMIwK-UZycAkKxXXmawGasOfsnlqYcaC-FTmcx9epSkEMohmIaaExmAnKinGUK4L2bnwqZ3hXBHf-Qeshd-KC1sz53qfet',
    50,
    1,
    '2026-03-01T09:05:00.000Z',
    '2026-03-01T09:05:00.000Z'
  ),
  (
    'acc_knowledge',
    '知识库号',
    NULL,
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBtHZ0g1iBwP6-hUN1MkZEAo0kE-Tu74LehnES29tQW3QS-Dl8tZnaqG3jfHVFcI3FaRqui8-JsJiOEPmA46Ca9yP_3cmNttrlM5iCFfS9JT83Myc8ZuYJ0KyegGszev14R9LXTGFhVQRv0-wF_9WqclkK93y_wEYv79_AQbN2CgEHSRowPHJ0sPGvHwysYJiFQIERMJIIQ954B-XVLP7enCMglhDnDhbXXdbeQXM8n9TFg_3pD_zYkF_PbjGSINZpc6C0MScFoP-80',
    50,
    2,
    '2026-03-01T09:10:00.000Z',
    '2026-03-01T09:10:00.000Z'
  ),
  (
    'acc_life',
    '生活号',
    NULL,
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCFdP4O4990P_q51n2FqJjAQTWE1kHCNMYFlXcj0BNgjawx24_xyXzfdh4Y87Ex2yd3t-hyF5_5zUYTbsD7oQOrbQwCRyEuCOcuM-v0mg7LBS-9ctktHFAKhc7iO5SvqzSFI1fxM95nbr-VrVZMPDAOdmr6oQosoN-oxkqTCxIOxD4vbIRk3ew6F8_Xqih_kthksJoAzUkqea6pi1vj3sPHDtmHReX2xZpvhS_pmhU3e8o_eb7OdYSY_tUAYQuTnEoDDcU8YEFoE3XD',
    50,
    3,
    '2026-03-01T09:15:00.000Z',
    '2026-03-01T09:15:00.000Z'
  );

INSERT OR IGNORE INTO tasks (
  id,
  account_id,
  title,
  date,
  location,
  status,
  sort_order,
  created_at,
  updated_at
) VALUES
  ('task_c1', 'acc_travel', '晨间日常：咖啡制作流程', '2026-03-06', '室内', '已拍', 0, '2026-03-06T01:00:00.000Z', '2026-03-06T01:00:00.000Z'),
  ('task_c2', 'acc_travel', '好物分享：新款蓝牙耳机测评', '2026-03-06', '工作室', '已拍', 1, '2026-03-06T02:00:00.000Z', '2026-03-06T02:00:00.000Z'),
  ('task_t1', 'acc_travel', '周末探店 Vlog 预告', '2026-03-06', '外景', '待拍', 0, '2026-03-06T03:00:00.000Z', '2026-03-06T03:00:00.000Z'),
  ('task_t2', 'acc_travel', '读书笔记分享《心流》', '2026-03-06', '书房', '待拍', 1, '2026-03-06T04:00:00.000Z', '2026-03-06T04:00:00.000Z'),
  ('task_t3', 'acc_travel', '口播：关于如何提高效率', '2026-03-06', '卧室', '待拍', 2, '2026-03-06T05:00:00.000Z', '2026-03-06T05:00:00.000Z');

INSERT OR IGNORE INTO task_reviews (
  task_id,
  hit_status,
  review_data,
  created_at,
  updated_at
) VALUES
  ('task_c1', '爆款', '播放量突破10w，评论区互动很好。', '2026-03-06T06:00:00.000Z', '2026-03-06T06:00:00.000Z');

INSERT OR IGNORE INTO ad_records (
  id,
  account_id,
  title,
  date,
  note,
  type,
  amount,
  settlement_status,
  created_at,
  updated_at
) VALUES
  ('record_1', 'acc_travel', '品牌合作: 户外品牌', '2026-03-04', '某品牌季度合作结算', 'income', 15000, 'settled', '2026-03-04T08:00:00.000Z', '2026-03-04T08:00:00.000Z'),
  ('record_2', 'acc_travel', '激励计划: 视频分成', '2026-03-02', '平台流量激励收益', 'income', 2450, 'unsettled', '2026-03-02T08:00:00.000Z', '2026-03-02T08:00:00.000Z'),
  ('record_3', 'acc_travel', '作品加热: 探店Vlog', '2026-03-01', 'Dou+ 付费加热', 'expense', 500, NULL, '2026-03-01T08:00:00.000Z', '2026-03-01T08:00:00.000Z');
