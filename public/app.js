const state = {
  tab: 'data',
  date: new Date().toISOString().slice(0, 10),
  selectedFood: null,
  me: null,
  settings: null,
  hasCheckedIn: false
};

const $ = (id) => document.getElementById(id);

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const body = await res.json();
  if (!res.ok || body.code !== 0) throw new Error(body.message || '请求失败');
  return body.data;
}

function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1800);
}

function mealLabel(type) {
  return { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐' }[type] || '加餐';
}

function goalLabel(type) {
  return type === 'muscle_gain' ? '增肌' : '减脂';
}

function statusLabel(type) {
  return { below_target: '低于目标', within_target: '目标范围内', over_target: '超出目标' }[type] || type;
}

function setTab(tab) {
  state.tab = tab;
  document.querySelectorAll('.nav-tab').forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tab));
  document.querySelectorAll('.page').forEach((page) => page.classList.remove('active'));
  const pageMap = { data: 'dataPage', record: 'recordPage', profile: 'profilePage', weekly: 'weeklyPage' };
  $(pageMap[tab]).classList.add('active');
  $('pageTitle').textContent = tab === 'data' ? '数据' : tab === 'record' ? '记录' : tab === 'profile' ? '个人' : '周报';
  if (tab === 'data') loadDashboard();
  if (tab === 'record') loadFoodLogs();
  if (tab === 'profile') loadProfile();
  if (tab === 'weekly') loadWeekly();
}

function renderAdvice(listEl, advice) {
  listEl.innerHTML = '';
  advice.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    listEl.appendChild(li);
  });
}

async function loadDashboard() {
  const [data, logs] = await Promise.all([
    api(`/api/dashboard/today?date=${state.date}`),
    api(`/api/food-logs?date=${state.date}`)
  ]);
  state.hasCheckedIn = logs.items.length > 0;
  $('checkinCard').classList.toggle('checked', state.hasCheckedIn);
  $('checkinKicker').textContent = state.hasCheckedIn ? '今日已打卡' : '今日待打卡';
  $('checkinTitle').textContent = state.hasCheckedIn ? '今日已完成打卡' : '今天还没记录';
  $('checkinText').textContent = state.hasCheckedIn ? '已经完成一次饮食记录，继续保持节奏。' : '先记一餐，完成今日饮食打卡。';
  $('goalTypeBadge').textContent = goalLabel(data.goal_type);
  $('completionRate').textContent = `${data.completion_rate}%`;
  document.querySelector('.score-ring').style.setProperty('--score', `${Math.min(data.completion_rate, 100)}%`);
  $('completionText').textContent = data.completion_rate >= 80 ? '执行稳定' : data.completion_rate > 0 ? '继续补齐今日目标' : '准备开始记录';
  $('calorieTarget').textContent = Math.round(data.calories.target);
  $('calorieConsumed').textContent = Math.round(data.calories.consumed);
  $('calorieRemaining').textContent = Math.round(data.calories.remaining);
  const progress = data.calories.target ? Math.min((data.calories.consumed / data.calories.target) * 100, 100) : 0;
  $('calorieProgress').style.width = `${progress}%`;
  renderAdvice($('adviceList'), data.advice);
  $('weekRange').textContent = `${data.weekly_report_entry.week_start} ~ ${data.weekly_report_entry.week_end}`;
  $('weeklySummary').textContent = data.weekly_report_entry.summary;
}

async function openFoodSearch() {
  state.selectedFood = null;
  $('foodSearchOverlay').classList.add('open');
  $('foodSearchOverlay').setAttribute('aria-hidden', 'false');
  $('foodResults').innerHTML = '';
  $('foodKeyword').value = '';
  $('foodAmount').value = 100;
  $('addFoodLog').disabled = true;
  $('selectedFoodHint').textContent = '请选择一个食物后添加。';
  setTimeout(() => $('foodKeyword').focus(), 50);
}

function closeFoodSearch() {
  $('foodSearchOverlay').classList.remove('open');
  $('foodSearchOverlay').setAttribute('aria-hidden', 'true');
}

async function searchFoods() {
  const keyword = $('foodKeyword').value.trim();
  const data = await api(`/api/foods?keyword=${encodeURIComponent(keyword)}&page_size=20`);
  const box = $('foodResults');
  box.innerHTML = '';
  data.items.forEach((food) => {
    const item = document.createElement('button');
    item.className = 'food-result';
    item.innerHTML = `<div><strong>${food.name}</strong><div class="food-meta">每 ${food.base_amount}${food.base_unit}：${food.calorie} kcal · 蛋白 ${food.protein_g}g · 碳水 ${food.carb_g}g · 脂肪 ${food.fat_g}g</div></div><span>${food.category}</span>`;
    item.addEventListener('click', () => {
      state.selectedFood = food;
      document.querySelectorAll('.food-result').forEach((el) => el.classList.remove('active'));
      item.classList.add('active');
      $('selectedFoodHint').textContent = `已选择：${food.name}，请输入重量/份数后添加。`;
      $('addFoodLog').disabled = false;
      $('foodAmount').value = food.base_amount;
    });
    box.appendChild(item);
  });
  if (data.items.length === 0) box.innerHTML = '<p class="hint">没有找到匹配食物。</p>';
}

async function addFoodLog() {
  if (!state.selectedFood) return;
  const wasCheckedIn = state.hasCheckedIn;
  await api('/api/food-logs', {
    method: 'POST',
    body: JSON.stringify({
      date: state.date,
      meal_type: $('mealType').value,
      food_id: state.selectedFood.id,
      amount: Number($('foodAmount').value),
      unit: state.selectedFood.base_unit
    })
  });
  state.selectedFood = null;
  $('addFoodLog').disabled = true;
  $('selectedFoodHint').textContent = '添加成功，可继续搜索添加。';
  $('foodResults').innerHTML = '';
  $('foodKeyword').value = '';
  await loadFoodLogs();
  await loadDashboard();
  closeFoodSearch();
  toast(wasCheckedIn ? '已添加饮食记录' : '今日打卡完成');
}

async function loadFoodLogs() {
  const data = await api(`/api/food-logs?date=${state.date}`);
  $('recordDateLabel').textContent = data.date;
  $('totalCalories').textContent = Math.round(data.totals.calorie);
  $('totalProtein').textContent = `${data.totals.protein_g}g`;
  $('totalCarb').textContent = `${data.totals.carb_g}g`;
  $('totalFat').textContent = `${data.totals.fat_g}g`;
  const box = $('foodLogs');
  box.innerHTML = '';
  if (data.items.length === 0) {
    box.innerHTML = '<p class="hint">今天还没有记录食物。</p>';
    return;
  }
  data.items.forEach((log) => {
    const item = document.createElement('div');
    item.className = 'food-log';
    item.innerHTML = `
      <div>
        <strong>${log.food_name}</strong>
        <div class="log-meta">${mealLabel(log.meal_type)} · ${log.amount}${log.unit} · ${log.calorie} kcal · P ${log.protein_g}g / C ${log.carb_g}g / F ${log.fat_g}g</div>
      </div>
      <div class="log-actions">
        <button class="icon-btn" data-action="edit">编辑</button>
        <button class="icon-btn danger" data-action="delete">删除</button>
      </div>`;
    item.querySelector('[data-action="edit"]').addEventListener('click', async () => {
      const amount = Number(prompt('输入新的重量/份数', log.amount));
      if (!amount || amount <= 0) return;
      await api(`/api/food-logs/${log.id}`, { method: 'PATCH', body: JSON.stringify({ amount }) });
      await loadFoodLogs();
      toast('已更新记录');
    });
    item.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      if (!confirm('确认删除这条记录？')) return;
      await api(`/api/food-logs/${log.id}`, { method: 'DELETE' });
      await loadFoodLogs();
      toast('已删除记录');
    });
    box.appendChild(item);
  });
}

async function loadProfile() {
  const [me, settings] = await Promise.all([api('/api/me'), api('/api/settings')]);
  state.me = me;
  state.settings = settings;
  $('nickname').value = me.nickname;
  $('gender').value = me.gender;
  $('age').value = me.age;
  $('heightCm').value = me.height_cm;
  $('weightKg').value = me.current_weight_kg;
  $('goalType').value = me.goal_type;
  $('targetCalories').value = me.daily_calorie_target;
  $('targetProtein').value = me.daily_protein_target_g;
  $('targetCarb').value = me.daily_carb_target_g;
  $('targetFat').value = me.daily_fat_target_g;
  $('reminderEnabled').checked = settings.reminder_enabled;
  $('themeMode').value = settings.theme_mode;
  document.body.classList.toggle('dark', settings.theme_mode === 'dark');
}

async function saveProfile() {
  await api('/api/me', {
    method: 'PATCH',
    body: JSON.stringify({
      nickname: $('nickname').value,
      gender: $('gender').value,
      age: Number($('age').value),
      height_cm: Number($('heightCm').value),
      current_weight_kg: Number($('weightKg').value)
    })
  });
  toast('资料已保存');
}

async function saveWeight() {
  await api('/api/weight-logs', {
    method: 'POST',
    body: JSON.stringify({ record_date: state.date, weight_kg: Number($('weightKg').value), note: '' })
  });
  toast('今日体重已记录');
}

async function recalculateGoal() {
  const data = await api('/api/goals/recalculate', {
    method: 'POST',
    body: JSON.stringify({
      gender: $('gender').value,
      age: Number($('age').value),
      height_cm: Number($('heightCm').value),
      current_weight_kg: Number($('weightKg').value),
      goal_type: $('goalType').value
    })
  });
  $('targetCalories').value = data.recommended.daily_calorie_target;
  $('targetProtein').value = data.recommended.daily_protein_target_g;
  $('targetCarb').value = data.recommended.daily_carb_target_g;
  $('targetFat').value = data.recommended.daily_fat_target_g;
  toast('已生成推荐目标');
}

async function saveGoal() {
  await api('/api/goals/current', {
    method: 'PATCH',
    body: JSON.stringify({
      goal_type: $('goalType').value,
      daily_calorie_target: Number($('targetCalories').value),
      daily_protein_target_g: Number($('targetProtein').value),
      daily_carb_target_g: Number($('targetCarb').value),
      daily_fat_target_g: Number($('targetFat').value)
    })
  });
  toast('目标已保存');
}

async function saveSettings() {
  await api('/api/settings', {
    method: 'PATCH',
    body: JSON.stringify({
      reminder_enabled: $('reminderEnabled').checked,
      theme_mode: $('themeMode').value,
      unit_system: 'metric',
      default_home_tab: 'data'
    })
  });
  document.body.classList.toggle('dark', $('themeMode').value === 'dark');
  toast('设置已保存');
}

async function loadWeekly() {
  const dashboard = await api(`/api/dashboard/today?date=${state.date}`);
  const data = await api(`/api/reports/weekly?week_start=${dashboard.weekly_report_entry.week_start}`);
  $('weeklyDateRange').textContent = `${data.week_start} ~ ${data.week_end}`;
  $('currentWeekRate').textContent = `${data.comparison.current_week_completion_rate}%`;
  $('previousWeekRate').textContent = `${data.comparison.previous_week_completion_rate}%`;
  $('weekRateDiff').textContent = `${data.comparison.completion_rate_diff}%`;
  $('currentWeightDiff').textContent = `${data.comparison.current_week_weight_change_kg}kg`;
  $('weeklyTitle').textContent = data.summary.title;
  $('weeklyText').textContent = data.summary.text;
  const breakdown = $('dailyBreakdown');
  breakdown.innerHTML = '';
  data.daily_breakdown.forEach((day) => {
    const item = document.createElement('div');
    item.className = 'daily-item';
    item.innerHTML = `<strong>${day.date}</strong><span>${day.completion_rate}% · ${statusLabel(day.calorie_status)}</span>`;
    breakdown.appendChild(item);
  });
  renderAdvice($('weeklyAdvice'), data.advice);
}

function bindEvents() {
  document.querySelectorAll('.nav-tab').forEach((btn) => btn.addEventListener('click', () => setTab(btn.dataset.tab)));
  $('globalDate').value = state.date;
  $('globalDate').addEventListener('change', () => {
    state.date = $('globalDate').value;
    if (state.tab === 'data') loadDashboard();
    if (state.tab === 'record') loadFoodLogs();
    if (state.tab === 'weekly') loadWeekly();
  });
  $('searchFood').addEventListener('click', searchFoods);
  $('foodKeyword').addEventListener('keydown', (event) => { if (event.key === 'Enter') searchFoods(); });
  $('addFoodLog').addEventListener('click', addFoodLog);
  $('openFoodSearch').addEventListener('click', openFoodSearch);
  $('quickRecordFromData').addEventListener('click', () => {
    setTab('record');
    openFoodSearch();
  });
  $('closeFoodSearch').addEventListener('click', closeFoodSearch);
  $('openWeekly').addEventListener('click', () => setTab('weekly'));
  $('backToData').addEventListener('click', () => setTab('data'));
  $('saveProfile').addEventListener('click', saveProfile);
  $('saveWeight').addEventListener('click', saveWeight);
  $('recalculateGoal').addEventListener('click', recalculateGoal);
  $('saveGoal').addEventListener('click', saveGoal);
  $('saveSettings').addEventListener('click', saveSettings);
}

async function init() {
  bindEvents();
  await loadDashboard();
}

init().catch((error) => {
  console.error(error);
  toast(error.message);
});