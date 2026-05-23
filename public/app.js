const state = {
  tab: 'today',
  date: new Date().toISOString().slice(0, 10),
  selectedFood: null,
  me: null,
  settings: null,
  hasCheckedIn: false,
  showCheckinBack: false
};

const MOOD_STATUS_KEY = 'fitdiet.mood.statusByDate';
const MOOD_NOTE_KEY = 'fitdiet.mood.noteByDate';
const moodQuotes = [
  '先照顾好今天的自己，改变会自然发生。',
  '记录不是约束，是帮你看清自己。',
  '今天做到一点点，也比昨天更接近目标。',
  '不用完美，坚持比完美更重要。',
  '身体会记得你认真对待它的每一天。',
  '情绪可以被看见，饮食也可以被重新选择。'
];

const checkinMotivations = [
  '记录不是约束，是帮你稳定靠近目标。',
  '今天已经开始执行，剩下的只需要继续保持。',
  '每一次记录，都是一次更清楚的自我管理。',
  '饮食不需要完美，稳定记录才是真正的进步。'
];

const foodCategoryEmoji = {
  水果: '🍎',
  主食: '🍚',
  蛋白质: '🍗',
  饮品: '🥛',
  蔬菜: '🥦',
  补剂: '💊',
  其他: '🍽️'
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

function foodEmoji(food) {
  return foodCategoryEmoji[food.category] || foodCategoryEmoji.其他;
}

function clampPercent(value, target) {
  if (!target) return 0;
  return Math.min(Math.max((value / target) * 100, 0), 100);
}

function renderMacroBars(macros) {
  const items = [
    { name: '蛋白质', data: macros.protein },
    { name: '碳水', data: macros.carb },
    { name: '脂肪', data: macros.fat }
  ];
  const box = $('macroBars');
  box.innerHTML = items.map((macro) => {
    const value = Number(macro.data?.consumed || 0);
    const target = Number(macro.data?.target || 0);
    const percent = clampPercent(value, target);
    return `
      <div class="macro-bar-row">
        <div class="macro-bar-top"><span>${macro.name}</span><strong>${value}g / ${target}g</strong></div>
        <div class="macro-bar-track"><span style="width: ${percent}%"></span></div>
      </div>`;
  }).join('');
}

function statusLabel(type) {
  return { below_target: '低于目标', within_target: '目标范围内', over_target: '超出目标' }[type] || type;
}

function titleFor(tab) {
  return { today: '今天', plan: '计划', mood: '心情', profile: '我的' }[tab] || '今天';
}

async function setTab(tab) {
  state.tab = tab;
  document.querySelectorAll('.nav-tab[data-tab]').forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tab));
  document.querySelectorAll('.page').forEach((page) => page.classList.remove('active'));
  const pageMap = { today: 'todayPage', plan: 'planPage', mood: 'moodPage', profile: 'profilePage' };
  $(pageMap[tab]).classList.add('active');
  $('pageTitle').textContent = titleFor(tab);
  if (tab === 'today') await loadToday();
  if (tab === 'plan') await loadPlan();
  if (tab === 'mood') loadMood();
  if (tab === 'profile') await loadProfile();
}

function renderAdvice(listEl, advice) {
  listEl.innerHTML = '';
  advice.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    listEl.appendChild(li);
  });
}

async function loadToday() {
  await Promise.all([loadDashboard(), loadFoodLogs()]);
}

async function loadDashboard() {
  const [data, logs] = await Promise.all([
    api(`/api/dashboard/today?date=${state.date}`),
    api(`/api/food-logs?date=${state.date}`)
  ]);
  state.hasCheckedIn = logs.items.length > 0;
  if (!state.hasCheckedIn) state.showCheckinBack = false;
  $('checkinCard').classList.toggle('checked', state.hasCheckedIn);
  $('checkinCard').classList.toggle('flipped', state.hasCheckedIn && state.showCheckinBack);
  $('checkinCard').setAttribute('aria-label', state.hasCheckedIn ? '今日已打卡，点击切换鼓励文案' : '今日待打卡');
  $('checkinKicker').textContent = state.hasCheckedIn ? '今日已打卡' : '今日待打卡';
  $('checkinTitle').textContent = state.hasCheckedIn ? '今日已完成打卡' : '今天还没记录';
  $('checkinText').textContent = state.hasCheckedIn ? '已经完成一次饮食记录，继续保持节奏。' : '先记一餐，完成今日饮食打卡。';
  $('checkinMotivationText').textContent = checkinMotivations[new Date(state.date).getDate() % checkinMotivations.length];
  $('goalTypeBadge').textContent = goalLabel(data.goal_type);
  $('completionRate').textContent = `${data.completion_rate}%`;
  $('calorieTarget').textContent = Math.round(data.calories.target);
  $('calorieConsumed').textContent = Math.round(data.calories.consumed);
  $('calorieRemaining').textContent = Math.round(data.calories.remaining);
  $('calorieGaugeHint').textContent = data.calories.remaining >= 0 ? '剩余热量 kcal' : '已超出目标 kcal';
  const progress = data.calories.target ? Math.min((data.calories.consumed / data.calories.target) * 100, 100) : 0;
  $('calorieProgress').style.width = `${progress}%`;
  document.querySelector('.calorie-gauge').style.setProperty('--score', `${progress}%`);
  renderMacroBars(data.macros);
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
  const button = $('searchFood');
  const box = $('foodResults');
  if (!keyword) {
    box.innerHTML = '<p class="hint">请输入食物名称后搜索。</p>';
    toast('请输入食物名称');
    return;
  }
  button.disabled = true;
  button.textContent = '搜索中';
  box.innerHTML = '<p class="hint">正在搜索...</p>';
  try {
    const data = await api(`/api/foods?keyword=${encodeURIComponent(keyword)}&page_size=20`);
    box.innerHTML = '';
    data.items.forEach((food) => {
      const item = document.createElement('button');
      item.className = 'food-result';
      item.innerHTML = `<span class="food-emoji" aria-hidden="true">${foodEmoji(food)}</span><div class="food-result-copy"><strong>${food.name}</strong><div class="food-meta">每 ${food.base_amount}${food.base_unit}：${food.calorie} kcal · 蛋白 ${food.protein_g}g · 碳水 ${food.carb_g}g · 脂肪 ${food.fat_g}g</div></div><span class="food-category">${food.category}</span>`;
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
  } catch (error) {
    console.error(error);
    box.innerHTML = '<p class="hint">搜索失败，请稍后重试。</p>';
    toast('搜索失败，请稍后重试');
  } finally {
    button.disabled = false;
    button.textContent = '搜索';
  }
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
  await loadToday();
  closeFoodSearch();
  if (state.tab !== 'today') await setTab('today');
  toast(wasCheckedIn ? '已添加饮食记录' : '今日打卡完成');
}

async function loadFoodLogs() {
  const data = await api(`/api/food-logs?date=${state.date}`);
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
      await loadToday();
      toast('已更新记录');
    });
    item.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      if (!confirm('确认删除这条记录？')) return;
      await api(`/api/food-logs/${log.id}`, { method: 'DELETE' });
      await loadToday();
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

async function loadPlan() {
  await Promise.all([loadProfile(), loadWeekly()]);
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
  await loadDashboard();
  toast('目标已保存');
}

async function saveSettings() {
  await api('/api/settings', {
    method: 'PATCH',
    body: JSON.stringify({
      reminder_enabled: $('reminderEnabled').checked,
      theme_mode: $('themeMode').value,
      unit_system: 'metric',
      default_home_tab: 'today'
    })
  });
  document.body.classList.toggle('dark', $('themeMode').value === 'dark');
  toast('设置已保存');
}

async function loadWeekly() {
  const dashboard = await api(`/api/dashboard/today?date=${state.date}`);
  const data = await api(`/api/reports/weekly?week_start=${dashboard.weekly_report_entry.week_start}`);
  $('weekRange').textContent = `${dashboard.weekly_report_entry.week_start} ~ ${dashboard.weekly_report_entry.week_end}`;
  $('weeklySummary').textContent = dashboard.weekly_report_entry.summary;
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

function readMoodStore(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}');
  } catch {
    return {};
  }
}

function writeMoodStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function setRandomMoodQuote() {
  const quote = moodQuotes[Math.floor(Math.random() * moodQuotes.length)];
  $('moodQuote').textContent = quote;
}

function loadMood() {
  $('moodDateLabel').textContent = state.date;
  const statusByDate = readMoodStore(MOOD_STATUS_KEY);
  const noteByDate = readMoodStore(MOOD_NOTE_KEY);
  const currentMood = statusByDate[state.date] || '';
  document.querySelectorAll('.mood-option').forEach((btn) => btn.classList.toggle('active', btn.dataset.mood === currentMood));
  $('moodNote').value = noteByDate[state.date] || '';
  $('moodSaveHint').textContent = currentMood || noteByDate[state.date] ? '已读取当前日期的心情记录。' : '心情和日记会保存在当前浏览器。';
  setRandomMoodQuote();
}

function saveMoodStatus(status) {
  const statusByDate = readMoodStore(MOOD_STATUS_KEY);
  statusByDate[state.date] = status;
  writeMoodStore(MOOD_STATUS_KEY, statusByDate);
  document.querySelectorAll('.mood-option').forEach((btn) => btn.classList.toggle('active', btn.dataset.mood === status));
  $('moodSaveHint').textContent = '今日状态已保存。';
}

function saveMoodNote() {
  const noteByDate = readMoodStore(MOOD_NOTE_KEY);
  noteByDate[state.date] = $('moodNote').value.trim();
  writeMoodStore(MOOD_NOTE_KEY, noteByDate);
  $('moodSaveHint').textContent = '日记已自动保存。';
}

function bindEvents() {
  document.querySelectorAll('.nav-tab[data-tab]').forEach((btn) => btn.addEventListener('click', () => setTab(btn.dataset.tab)));
  $('globalDate').value = state.date;
  $('globalDate').addEventListener('change', () => {
    state.date = $('globalDate').value;
    if (state.tab === 'today') loadToday();
    if (state.tab === 'plan') loadPlan();
    if (state.tab === 'mood') loadMood();
  });
  $('quickAddTab').addEventListener('click', openFoodSearch);
  $('searchFood').addEventListener('click', searchFoods);
  $('foodKeyword').addEventListener('keydown', (event) => { if (event.key === 'Enter') searchFoods(); });
  $('addFoodLog').addEventListener('click', addFoodLog);
  $('quickRecordFromToday').addEventListener('click', (event) => {
    event.stopPropagation();
    openFoodSearch();
  });
  $('checkinCard').addEventListener('click', () => {
    if (!state.hasCheckedIn) return;
    state.showCheckinBack = !state.showCheckinBack;
    $('checkinCard').classList.toggle('flipped', state.showCheckinBack);
  });
  $('checkinCard').addEventListener('keydown', (event) => {
    if (!state.hasCheckedIn || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    state.showCheckinBack = !state.showCheckinBack;
    $('checkinCard').classList.toggle('flipped', state.showCheckinBack);
  });
  $('closeFoodSearch').addEventListener('click', closeFoodSearch);
  $('refreshWeekly').addEventListener('click', loadWeekly);
  $('saveProfile').addEventListener('click', saveProfile);
  $('saveWeight').addEventListener('click', saveWeight);
  $('recalculateGoal').addEventListener('click', recalculateGoal);
  $('saveGoal').addEventListener('click', saveGoal);
  $('saveSettings').addEventListener('click', saveSettings);
  $('refreshMoodQuote').addEventListener('click', setRandomMoodQuote);
  document.querySelectorAll('.mood-option').forEach((btn) => btn.addEventListener('click', () => saveMoodStatus(btn.dataset.mood)));
  $('moodNote').addEventListener('input', saveMoodNote);
}

async function init() {
  bindEvents();
  await loadToday();
}

init().catch((error) => {
  console.error(error);
  toast(error.message);
});