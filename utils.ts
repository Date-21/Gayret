import { Habit, HabitLog, Badge } from './types';

export const formatDateKey = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const getDayName = (dayIndex: number): string => {
  const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  return days[dayIndex];
};

// Calculate active days in a month, considering the habit creation date (Pro-rating)
export const countActiveDaysInMonth = (year: number, month: number, activeDays: number[], createdStr: string): number => {
  const createdDate = new Date(createdStr);
  const startOfMonth = new Date(year, month, 1);
  
  // If habit was created after the start of this month, start counting from creation date
  let date = createdDate > startOfMonth ? new Date(createdDate) : new Date(startOfMonth);
  // Ensure we don't start before the requested month if creation was years ago (logic above handles it but safety check)
  if (date < startOfMonth) date = new Date(startOfMonth);

  let count = 0;
  while (date.getMonth() === month && date.getFullYear() === year) {
    if (activeDays.includes(date.getDay())) {
      count++;
    }
    date.setDate(date.getDate() + 1);
  }
  return count;
};

// Dynamic Goal Calculations with Pro-rating
export const getGoals = (habit: Habit, date: Date = new Date()) => {
  const daily = habit.goal;
  
  // Weekly: If custom is set use it, otherwise daily * active days per week
  const weekly = habit.customWeeklyGoal ?? (daily * habit.days.length);

  // Monthly: Check effective active days based on creation date
  const effectiveDays = countActiveDaysInMonth(date.getFullYear(), date.getMonth(), habit.days, habit.created);
  const monthly = habit.customMonthlyGoal ?? (daily * effectiveDays);

  return { daily, weekly, monthly };
};

export const calculateStreak = (habit: Habit, logs: HabitLog[]): number => {
  let streak = 0;
  const today = new Date();
  
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateKey = formatDateKey(d);
    
    // Only check if habit existed on this day
    if (new Date(habit.created) > d && i > 0) break; // Habit didn't exist yet

    if (habit.days.includes(d.getDay())) {
      const log = logs.find(l => l.hid === habit.id && l.date === dateKey);
      
      if (log) {
        // Use snapshot goal if available, else current goal
        const target = log.targetSnapshot ?? habit.goal;

        if (log.status === 'skip' || log.status === 'recovered') {
          continue; // Maintain streak
        } else if (log.val >= target) {
          streak++;
        } else if (i === 0) {
          continue; // Today not finished
        } else {
          break; // Broken
        }
      } else if (i === 0) {
         continue;
      } else {
        break; // Missing log
      }
    }
  }
  return streak;
};

export const getCompletionPercentage = (habit: Habit, val: number, snapshotTarget?: number): number => {
  const target = snapshotTarget ?? habit.goal;
  if (target === 0) return 0;
  return Math.min(100, Math.round((val / target) * 100));
};

// Advanced Weekly Progress with Compensation Logic & Bonus Days
export const getWeeklyStatus = (habit: Habit, logs: HabitLog[], refDate: Date = new Date()) => {
  const day = refDate.getDay();
  const diff = refDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  const monday = new Date(refDate);
  monday.setDate(diff);
  monday.setHours(0,0,0,0);

  let totalVal = 0;
  let activeDaysCount = 0;
  let successDays = 0;

  // Calculate week totals
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const k = formatDateKey(d);
    
    // Check if habit is active this day AND habit existed
    const habitExisted = new Date(habit.created) <= d;
    
    if (habit.days.includes(d.getDay()) && habitExisted) {
        activeDaysCount++;
    }

    const log = logs.find(l => l.hid === habit.id && l.date === k);
    if (log) {
        totalVal += log.val; // Add value regardless of active day (Bonus logic)
        
        // Success check uses snapshot
        const target = log.targetSnapshot ?? habit.goal;
        if ((log.val >= target || log.status === 'skip') && habit.days.includes(d.getDay())) {
            successDays++;
        }
    }
  }

  // Determine weekly goal. If custom goal exists, use it. 
  // Else, use daily * activeDaysCount (this handles pro-rating for new habits mid-week)
  const weeklyGoal = habit.customWeeklyGoal ?? (habit.goal * activeDaysCount);
  
  // Avoid division by zero for brand new habits with no active days yet this week
  const isWeeklyMet = weeklyGoal > 0 && totalVal >= weeklyGoal;

  return { totalVal, weeklyGoal, isWeeklyMet, successDays, activeDaysCount };
};

export const getWeeklyProgress = (habits: Habit[], logs: HabitLog[]): number => {
  let totalHabitPercent = 0;
  let count = 0;
  
  habits.filter(h => h.active && !h.archived).forEach(h => {
      const { isWeeklyMet, totalVal, weeklyGoal } = getWeeklyStatus(h, logs);
      if (weeklyGoal > 0) {
        const pct = Math.min(100, (totalVal / weeklyGoal) * 100);
        totalHabitPercent += pct;
        count++;
      }
  });

  return count === 0 ? 0 : Math.round(totalHabitPercent / count);
};

export const motivationalQuotes = [
  "Yeni bir güne hoş geldin!",
  "Bugün kendini aştın!",
  "Harika gidiyorsun!",
  "Her usta çırak başlar!",
  "Yeni gün yeni fırsat!",
  "İstikrar başarının anahtarıdır.",
  "Küçük adımlar, büyük zaferler."
];

export const getRandomQuote = () => motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];

// Gamification System
export const BADGE_DEFINITIONS: Omit<Badge, 'unlocked'>[] = [
  {
    id: 'b_first_step',
    title: 'İlk Adım',
    desc: 'İlk alışkanlığını tamamladın.',
    icon: '🌱',
    condition: (h, l) => l.some(log => log.val > 0)
  },
  {
    id: 'b_week_streak',
    title: 'Haftalık Seri',
    desc: 'Bir alışkanlıkta 7 günlük seri yaptın.',
    icon: '🔥',
    condition: (h, l) => h.some(habit => calculateStreak(habit, l) >= 7)
  },
  {
    id: 'b_month_streak',
    title: 'İstikrar Abidesi',
    desc: 'Bir alışkanlıkta 30 günlük seri yaptın.',
    icon: '👑',
    condition: (h, l) => h.some(habit => calculateStreak(habit, l) >= 30)
  },
  {
    id: 'b_early_bird',
    title: 'Erkenci Kuş',
    desc: 'Toplam 10 kayıt girdin.',
    icon: '🌅',
    condition: (h, l) => l.length >= 10
  },
  {
    id: 'b_collector',
    title: 'Koleksiyoncu',
    desc: '5 farklı alışkanlık oluşturdun.',
    icon: '🎒',
    condition: (h, l) => h.filter(x => !x.archived).length >= 5
  }
];

export const checkBadges = (habits: Habit[], logs: HabitLog[]): Badge[] => {
  return BADGE_DEFINITIONS.map(def => ({
    ...def,
    unlocked: def.condition(habits, logs)
  }));
};

// Calculate cumulative totals for each habit (all-time)
export const getCumulativeTotals = (habit: Habit, logs: HabitLog[]): number => {
  return logs
    .filter(log => log.hid === habit.id)
    .reduce((sum, log) => sum + log.val, 0);
};

// Notification Messages Library (22 scenarios × 3 alternatives)
export const NOTIFICATION_MESSAGES = {
  morning_reminder: [
    "Günaydın! Bugün küçük bir adım atman bile dünkü senden ileride olman demek. Hazır mısın?",
    "Yeni bir gün, yeni bir sayfa. Alışkanlıkların seni bekliyor — bugün kendine ne güzellik yapacaksın?",
    "Sabahın ilk ışığıyla birlikte fırsatlar da doğuyor. Bugünün listesine bir göz at, başlamak için mükemmel bir an!"
  ],
  streak_continues: [
    "{streak} gündür aralıksız devam ediyorsun! Bu disiplin sıradan bir şey değil, farkında mısın?",
    "Arka arkaya {streak} gün… Artık bu bir alışkanlık değil, senin karakterin olmaya başladı.",
    "{streak} günlük serin parlıyor! 🔥 Bugün de bu zincire bir halka daha ekle."
  ],
  all_completed: [
    "Bugün eksiksiz tamamladın! Kendine bir 'aferin' borçlusun — hak ettin. 🎉",
    "Yüzde yüz! Bugün kendine verdiğin her sözü tuttun. Bu güven duygusu çok kıymetli.",
    "Tam isabet! Tüm alışkanlıkların tamam. Böyle günler geleceğin temelini atıyor."
  ],
  partial_completed: [
    "Bugün her şeyi yapamadın ama yapabildiğin kadarı da değerli. Yarım adım da adımdır.",
    "Bazı günler mükemmel olmak zorunda değilsin — tutarlı olmak yeterli. Bugün de buradasın, bu önemli.",
    "Birkaç alışkanlığını tamamladın, geri kalanı için hâlâ vakit var. Ama tamamlayamasan da sorun yok, devam etmen yeterli."
  ],
  none_completed: [
    "Bugün biraz zor geçmiş olabilir. Yatmadan önce tek bir alışkanlığını bile tamamlasan, bu gün boşa gitmemiş olur.",
    "Hâlâ vakit var! Tek bir küçük adım bile bugünü kurtarabilir. Kendine bu şansı ver.",
    "Herkesin durgun günleri olur. Ama bir tane bile olsa bir şey yapmak, yarına daha güçlü başlamana yardımcı olacak."
  ],
  streak_broken: [
    "Serin kırıldı ama sen kırılmadın. Bugün yeniden başlamak için en iyi gün — çünkü tek gün bu.",
    "Düşmek yenilgi değil, kalkmamak yenilgi. Yeni bir seri bugün başlıyor, buna hazır mısın?",
    "Serilerin bir sonu olur ama senin gayretin bitmez. Sıfırdan başlamak bazen en cesur adımdır."
  ],
  milestone_7: [
    "Bir haftayı devirdin! 🎉 İlk 7 gün en zor kısımdı — şimdi momentum sende.",
    "7 gün aralıksız! Bilim diyor ki alışkanlıklar tekrarla güçlenir. Sen tam yoldasın.",
    "Bir hafta oldu ve hâlâ buradasın. Çoğu insan 3. günde bırakır — sen farklısın."
  ],
  milestone_30: [
    "30 gün! Bir ay boyunca her gün kendine söz verdin ve tuttun. Bu inanılmaz bir başarı.",
    "Tam bir ay oldu. Artık bu senin rutinin, senin yaşam biçimin. Gurur duy! 🌟",
    "30 günlük seri! Araştırmalar diyor ki artık bu davranış beynine yerleşmeye başladı. Muhteşemsin."
  ],
  milestone_100: [
    "100 GÜN! Bu rakam tesadüf değil, irade ve kararlılığın eseri. Efsaneler böyle yazılır.",
    "Üç haneli seriye hoş geldin. 💯 100 gündür vazgeçmedin — bu hikâye ilham verici.",
    "Yüz gün. Yüz karar. Yüz küçük zafer. Toplamı müthiş bir insanı ortaya çıkardı."
  ],
  weekly_excellent: [
    "Bu hafta %{rate} oranla muhteşem geçti! Tam gaz devam — bu ritmi koru.",
    "Haftanı %{rate} başarıyla kapattın. Bu tutarlılık seni hedeflerine götürecek olan şey.",
    "Harika bir hafta! %{rate} tamamlama oranın, disiplinin somut kanıtı. Gelecek hafta da aynı enerjiyle! 💪"
  ],
  weekly_moderate: [
    "Bu hafta %{rate} ile kapandı. Fena değil ama potansiyelinin altında olduğunu ikimiz de biliyoruz. Gelecek hafta daha güçlü!",
    "%{rate} — ideal değil ama hâlâ oyundasın. Küçük ayarlamalarla gelecek hafta farkı göreceksin.",
    "Bu hafta biraz iniş çıkışlı geçti (%{rate}). Olsun, önemli olan devam etmen. Gelecek hafta senin haftanı olsun."
  ],
  weekly_low: [
    "Bu hafta zorlu geçti (%{rate}). Ama buraya bakmaya geldin — bu bile pes etmediğinin kanıtı.",
    "%{rate} ile kapanan bir hafta oldu. Belki alışkanlıklarını gözden geçirme vakti gelmiştir? Bazen az ama düzenli, çoktan iyidir.",
    "Zor bir haftaydı, biliyorum. Ama her Pazartesi yeni bir başlangıçtır. Bu hafta farklı olabilir — sadece bugünle başla."
  ],
  comeback: [
    "Seni özledik! Geri dönmen en önemli adım — geçmişe takılma, bugünden başla.",
    "Tekrar hoş geldin! 🙌 Ara vermek insani bir şey. Önemli olan geri dönmek — ve sen buradasın.",
    "Hey, uzun zamandır görüşemedik! Ama geri dönmek yeniden başlamaktır ve bu büyük cesaret ister. Hazırsan başlayalım."
  ],
  new_habit: [
    "Yeni bir alışkanlık eklendi! Her büyük değişim küçük bir kararla başlar — bu da senin o kararın.",
    "Harika, yeni bir hedef belirlemişsin! İlk adım atıldı — şimdi sıra tutarlılıkta.",
    "Yeni alışkanlık listene eklendi. Unutma: mükemmellik değil, süreklilik kazandırır. 🎯"
  ],
  evening_reminder: [
    "Gün bitmeden bir kontrol: bugün listendeki şeylere baktın mı? Hâlâ vakit var!",
    "Akşam oldu, gün kapanmak üzere. Tamamlanmamış alışkanlıkların var — birkaç dakikan yeter.",
    "Günü kapatmadan önce: Gayret'e bir göz at. Küçük bir hamle bile bugünü anlamlı kılar."
  ],
  anniversary: [
    "Bugün Gayret'le tanışalı tam {months} ay oldu! Başladığın günden bu yana ne kadar yol aldığına bir bak.",
    "Gayret'teki {months}. ayın kutlu olsun! Bu yolculukta en değerli şey başlamak değil, devam etmekti — ve sen devam ettin.",
    "{months} aydır birlikte ilerliyoruz. Bu sürede biriktirdiğin alışkanlıklar, sana kattıklarıyla gurur duymalısın."
  ],
  personal_record: [
    "YENİ REKOR! 🏅 En uzun serin artık {streak} gün. Kendi limitlerini aştın — bu tarih yazıldı!",
    "Kendini geçtin! {streak} günlük yeni rekorunla önceki en iyi performansını bile geride bıraktın.",
    "Rekor kırıldı! 🎊 {streak} gün — daha önce hiç bu kadar uzun süre devam etmemiştin. Bu an unutulmaz."
  ],
  inactive_short: [
    "Dün seni göremedik. Her şey yolunda mı? Bugün tek bir alışkanlıkla bile dönsek harika olur.",
    "Bir gün araydın — olur böyle şeyler. Ama bugün küçük bir adım atarak ritmine dönebilirsin.",
    "Kısa bir mola verdin. Bazen insanın nefes alması gerekir. Hazır hissettiğinde buradayız!"
  ],
  badge_earned: [
    "Yeni bir rozet kazandın: {badge_name}! 🏅 Her rozet, verdiğin emeğin bir nişanesi.",
    "Tebrikler! '{badge_name}' rozeti artık senin. Bu başarıyı kimse senden alamaz.",
    "'{badge_name}' rozetini açtın! 🎖️ Koleksiyonun büyüyor — tıpkı senin gibi."
  ],
  goal_suggestion: [
    "Son günlerde tüm hedeflerini rahatça tutturuyorsun. Belki çıtayı biraz yükseltmenin zamanı gelmiştir?",
    "Hedeflerini sürekli aşıyorsun — bu harika! Kendine biraz daha meydan okumak ister misin?",
    "Mükemmel bir uyum yakalamışsın. Hedefini artırmak istersen, bu büyümenin doğal bir parçası. Ne dersin?"
  ],
  friday_special: [
    "Hayırlı Cumalar! Bu mübarek günü güzel alışkanlıklarla taçlandırmak nasıl olurdu?",
    "Cuma günün mübarek olsun. Gayret etmek de bir ibadet — bugün niyetini yenile.",
    "Hayırlı Cumalar! Bugün hem ruhumuz hem bedenimiz için güzel bir gün olsun. Alışkanlıkların seni bekliyor."
  ],
  daily_motivation: [
    "Büyük hedefler küçük günlük alışkanlıklardan doğar. Bugün o küçük adımlardan birini at.",
    "Disiplin, motivasyon bittiğinde devam eden şeydir. Bugün o gücü içinde hisset.",
    "Dünyanın en başarılı insanlarının ortak noktası: küçük rutinlerini asla ihmal etmemeleri. Sen de onlardan birisin."
  ]
};

// Helper to get random notification message
export const getRandomNotificationMessage = (type: keyof typeof NOTIFICATION_MESSAGES, vars?: Record<string, string | number>): string => {
  const messages = NOTIFICATION_MESSAGES[type];
  let message = messages[Math.floor(Math.random() * messages.length)];

  // Replace variables
  if (vars) {
    Object.keys(vars).forEach(key => {
      message = message.replace(`{${key}}`, String(vars[key]));
    });
  }

  return message;
};
