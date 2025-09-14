// ===============================
// REFERRAL SYSTEM BACKUP - DISABLED
// Bu fayl eski referal tizimining backupi
// Yangi referal tizim qurish uchun saqlab qo'yilgan
// ===============================

/*
ESKI REFERAL TIZIM KODLARI:

// Referral System for Dispatchers
private dispatcherReferrals = new Map<number, {
  dispatcherId: number,
  referredDrivers: Set<number>,
  referredCustomers: Set<number>,
  referredDispatchers: Set<number>,
  totalEarnings: number,
  pendingEarnings?: number
}>();

// Referral tizimi
private async showReferral(ctx: any) {
  const userId = ctx.from.id;
  const referralLink = `https://t.me/Avtomatikxabarbot?start=ref_${userId}`;
  const message = `
👥 <b>Referral tizimi</b>
Do'stlaringizni taklif qiling va bonuslar oling!

📊 <b>Sizning statistikangiz:</b>
• Taklif qilingan: 0 kishi
• Faol foydalanuvchilar: 0 kishi
• Jami daromad: 0 so'm

🔗 <b>Sizning referral havolangiz:</b>
<code>${referralLink}</code>

📱 <b>Qanday foydalanish:</b>
1️⃣ Havolani nusxalang
2️⃣ Do'stlaringizga yuboring
3️⃣ Ular bot orqali ro'yxatdan o'tganda bonus oling
  `;

  const keyboard = new InlineKeyboard()
    .text('📋 Nusxalash', 'copy_referral')
    .url('📤 Ulashish', `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('🤖 Eng yaxshi AutoPoster bot! Guruhlaringizga xabarlarni tez va oson yuborishning eng qulay usuli.')}`).row()
    .text('📊 Statistika', 'referral_stats')
    .text('🔙 Orqaga', 'back_main');
  await this.safeEditMessage(ctx, message, {
    parse_mode: 'HTML',
    reply_markup: keyboard
  });
}

// Referral linkni nusxalash
private async copyReferralLink(ctx: any) {
  const userId = ctx.from.id;
  const referralLink = `https://t.me/Avtomatikxabarbot?start=ref_${userId}`;

  await this.safeAnswerCallback(ctx, '📋 Havola nusxalandi! Endi do\'stlaringizga yuboring.', { show_alert: false });

  // Linkni alohida xabar sifatida yuborish (nusxalash oson bo'lishi uchun)
  await ctx.reply(`📋 <b>Sizning referral havolangiz:</b>\n\n<code>${referralLink}</code>\n\n💡 <i>Havolani borib nusxalash uchun ustiga bosing</i>`, {
    parse_mode: 'HTML'
  });
}

// Referral statistika
private async showReferralStats(ctx: any) {
  const userId = ctx.from.id;

  // Demo statistika (real database bilan almashtirilishi kerak)
  const stats = {
    totalReferrals: 0,
    activeReferrals: 0,
    totalEarnings: 0,
    thisMonthEarnings: 0
  };

  const message = `
📊 <b>Referral Statistika</b>

👥 <b>Taklif qilganlar:</b> ${stats.totalReferrals} kishi
✅ <b>Faol:</b> ${stats.activeReferrals} kishi
💰 <b>Jami daromad:</b> ${stats.totalEarnings.toLocaleString()} so'm
📈 <b>Bu oy:</b> ${stats.thisMonthEarnings.toLocaleString()} so'm

🏆 <b>Darajangiz:</b> Boshlang'ich
📈 <b>Keyingi daraja:</b> 5 ta faol referral kerak
`;

  const keyboard = new InlineKeyboard()
    .text('📋 Havola olish', 'copy_referral')
    .text('📤 Ulashish', 'referral').row()
    .text('🔄 Yangilash', 'referral_stats')
    .text('🔙 Orqaga', 'referral');
  await this.safeEditMessage(ctx, message, {
    parse_mode: 'HTML',
    reply_markup: keyboard
  });
}

// Create referral link for drivers
private async createDriverReferralLink(ctx: any) {
  const dispatcherId = ctx.from.id;
  const referralCode = `drv_${dispatcherId}_${Date.now()}`;

  // Initialize dispatcher referral data if needed
  if (!this.dispatcherReferrals.has(dispatcherId)) {
    this.dispatcherReferrals.set(dispatcherId, {
      dispatcherId,
      referredDrivers: new Set(),
      referredCustomers: new Set(),
      referredDispatchers: new Set(),
      totalEarnings: 0,
      pendingEarnings: 0
    });
  }

  const botUsername = 'avtohabarbot'; // Replace with your actual bot username
  const referralLink = `https://t.me/${botUsername}?start=${referralCode}`;

  const message = `
🔗 <b>HAYDOVCHI REFERRAL LINK</b>

✅ <b>Sizning maxsus linkingiz tayyor!</b>

📱 <b>Referral link:</b>
<code>${referralLink}</code>

📋 <b>Qanday ishlatish:</b>
1. Linkni haydovchilarga yuboring
2. Ular linkdan bosib botga kirishadi
3. "Haydovchi" sifatida ro'yxatdan o'tishadi
4. Sizning orderlaringiz ularga birinchi bo'lib yuboriladi (1 daqiqa)
5. Order bajarishganda siz 5% bonus olasiz

🎯 <b>Afzalliklar:</b>
• Sizning orderlaringiz tez bajariladi
• Ishonchli haydovchilar jamosi
• Har orderdan 5% bonus
• Premium xizmat sifati
  `;

  await ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard()
      .text('📋 Linkni nusxalash', 'copy_driver_referral_' + referralCode)
      .text('📤 Ulashish', 'share_driver_referral').row()
      .text('📊 Referral statistika', 'referral_stats')
      .text('🔙 Orqaga', 'add_driver').row()
  });
}

// Create referral link for customers
private async createCustomerReferralLink(ctx: any) {
  const dispatcherId = ctx.from.id;
  const referralCode = `cst_${dispatcherId}_${Date.now()}`;

  // Initialize dispatcher referral data if needed
  if (!this.dispatcherReferrals.has(dispatcherId)) {
    this.dispatcherReferrals.set(dispatcherId, {
      dispatcherId,
      referredDrivers: new Set(),
      referredCustomers: new Set(),
      referredDispatchers: new Set(),
      totalEarnings: 0,
      pendingEarnings: 0
    });
  }

  const botUsername = 'avtohabarbot'; // Replace with your actual bot username
  const referralLink = `https://t.me/${botUsername}?start=${referralCode}`;

  const message = `
🔗 <b>MIJOZ REFERRAL LINK</b>

✅ <b>Sizning maxsus linkingiz tayyor!</b>

📱 <b>Referral link:</b>
<code>${referralLink}</code>

📋 <b>Qanday ishlatish:</b>
1. Linkni mijozlaringizga yuboring
2. Ular linkdan bosib botga kirishadi
3. "Yukchi" sifatida ro'yxatdan o'tishadi
4. Order berganda sizga 1.5 daqiqa oldin beriladi
5. Customer lifetime value orqali daromad

🎯 <b>Afzalliklar:</b>
• Orderlar sizga birinchi beriladi
• Doimiy mijozlar bazasi
• Premium pricing imkoniyati
• Direct customer relationship
  `;

  await ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard()
      .text('📋 Linkni nusxalash', 'copy_customer_referral_' + referralCode)
      .text('📤 Ulashish', 'share_customer_referral').row()
      .text('📊 Mijoz statistikasi', 'customer_stats')
      .text('🔙 Orqaga', 'add_customer').row()
  });
}

// Handle referral start commands
private async handleReferralStart(ctx: any, payload: string) {
  const user = ctx.from;

  if (payload.startsWith('drv_')) {
    // Driver referral
    const parts = payload.split('_');
    if (parts.length >= 2) {
      const dispatcherId = parseInt(parts[1]);

      const message = `
🚛 <b>HAYDOVCHI BO'LIB QOSHILING!</b>

👋 Salom, ${user.first_name}!
🎯 Siz maxsus taklifnoma orqali bizning botga kelgansiz!

💼 <b>Haydovchi sifatida ishlash:</b>
• Kundalik yangi orderlar
• To'g'ridan-to'g'ri mijozlar bilan aloqa
• Raqobatbardosh narxlar
• Tezkor to'lovlar
• 24/7 qo'llab-quvvatlash

🎁 <b>Maxsus bonuslar:</b>
• Birinchi 5 order uchun +10% bonus
• Priority order notifications
• Premium customer base
• Direct dispatcher partnership

❓ <b>Haydovchi bo'lishni xohlaysizmi?</b>
      `;

      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .text('✅ Ha, haydovchi bo\'laman', 'register_haydovchi_ref_' + dispatcherId)
          .text('ℹ️ Batafsil ma\'lumot', 'driver_referral_info').row()
          .text('🏠 Bosh sahifa', 'back_main')
      });

      // Notify dispatcher about referral click
      try {
        await this.bot.api.sendMessage(dispatcherId,
          `🔔 <b>REFERRAL NOTIFICATION</b>\n\n👤 ${user.first_name} (@${user.username || 'username_yoq'}) sizning haydovchi referral linkingizga bosdi!\n\n⏳ U ro'yxatdan o'tishini kutamiz...`,
          { parse_mode: 'HTML' }
        );
      } catch (error) {
        this.logger.warn('Could not notify dispatcher about referral click');
      }

      return;
    }
  } else if (payload.startsWith('cst_')) {
    // Customer referral
    const parts = payload.split('_');
    if (parts.length >= 2) {
      const dispatcherId = parseInt(parts[1]);

      const message = `
📦 <b>YUKCHI BO'LIB QOSHILING!</b>

👋 Salom, ${user.first_name}!
🎯 Siz maxsus taklifnoma orqali bizning botga kelgansiz!

📦 <b>Yukchi sifatida foydalanish:</b>
• Tez va ishonchli yuk tashish xizmati
• Raqobatbardosh narxlar
• Real-time tracking
• Sug'urta himoyasi
• 24/7 qo'llab-quvvatlash

🎁 <b>Maxsus bonuslar:</b>
• Birinchi order uchun 15% chegirma
• Priority haydovchi selection
• Premium service level
• Direct dispatcher communication

❓ <b>Yukchi bo'lishni xohlaysizmi?</b>
      `;

      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .text('✅ Ha, yukchi bo\'laman', 'register_yukchi_ref_' + dispatcherId)
          .text('ℹ️ Batafsil ma\'lumot', 'customer_referral_info').row()
          .text('🏠 Bosh sahifa', 'back_main')
      });

      // Notify dispatcher about referral click
      try {
        await this.bot.api.sendMessage(dispatcherId,
          `🔔 <b>REFERRAL NOTIFICATION</b>\n\n👤 ${user.first_name} (@${user.username || 'username_yoq'}) sizning mijoz referral linkingizga bosdi!\n\n⏳ U ro'yxatdan o'tishini kutamiz...`,
          { parse_mode: 'HTML' }
        );
      } catch (error) {
        this.logger.warn('Could not notify dispatcher about referral click');
      }

      return;
    }
  }

  // If referral parsing failed, show main menu
  await this.showMainMenu(ctx);
}

private async showMyTeam(ctx: any) {
  const userId = ctx.from.id;
  const referralData = this.dispatcherReferrals.get(userId) || {
    referredDrivers: new Set(),
    referredCustomers: new Set(),
    referredDispatchers: new Set(),
    totalEarnings: 0
  };

  const message = `
👥 <b>MENING JAMOAM</b>

📊 <b>Jamoangiz statistikasi:</b>

🚚 <b>Haydovchilar:</b> ${referralData.referredDrivers.size} ta
• Faol haydovchilar: ${Array.from(referralData.referredDrivers).length}
• Oxirgi 30 kun: +${Math.floor(Math.random() * 5)} ta yangi

👤 <b>Mijozlar:</b> ${referralData.referredCustomers.size} ta
• Faol mijozlar: ${Array.from(referralData.referredCustomers).length}
• Oxirgi 30 kun: +${Math.floor(Math.random() * 3)} ta yangi

👨‍💼 <b>Dispechrlar:</b> ${referralData.referredDispatchers.size} ta
• Ulangan dispechrlar: ${Array.from(referralData.referredDispatchers).length}
• 5% bonus olish imkoniyati

💰 <b>Daromad statistikasi:</b>
• Jami ishlab topilgan: ${referralData.totalEarnings?.toLocaleString() || 0} so'm
• Bu oy: ${Math.floor(Math.random() * 500000).toLocaleString()} so'm
• Bu hafta: ${Math.floor(Math.random() * 150000).toLocaleString()} so'm

🎯 <b>Performance:</b>
• Top 10% dispechr: ✅
• Premium status: ✅
• Elite partner: ${referralData.referredDrivers.size > 10 ? '✅' : '❌'}
  `;

  const keyboard = new InlineKeyboard()
    .text('👥 Yangi jamoa qo\'shish', 'add_team_members')
    .text('📊 Batafsil statistika', 'detailed_team_stats').row()
    .text('💰 To\'lovlar tarixi', 'team_payment_history')
    .text('🎁 Bonus dastur', 'team_bonus_program').row()
    .text('🔙 Orqaga', 'back_main');

  await this.safeEditMessage(ctx, message, {
    parse_mode: 'HTML',
    reply_markup: keyboard
  });
}

private async processDispatcherBonus(driverId: number, amount: number) {
  // Find dispatcher who referred this driver
  for (const [dispatcherId, referralData] of this.dispatcherReferrals.entries()) {
    if (referralData.referredDrivers.has(driverId)) {
      const bonusAmount = Math.floor(amount * 0.05); // 5% bonus to dispatcher

      // Initialize dispatcher balance if doesn't exist
      if (!this.virtualBalances.has(dispatcherId)) {
        this.virtualBalances.set(dispatcherId, {
          userId: dispatcherId,
          balance: 0,
          totalEarned: 0,
          totalSpent: 0,
          transactions: [],
          lastUpdated: new Date()
        });
      }

      const dispatcherBalance = this.virtualBalances.get(dispatcherId);
      dispatcherBalance.balance += bonusAmount;
      dispatcherBalance.totalEarned += bonusAmount;

      const transaction = {
        id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'referral_bonus' as const,
        amount: bonusAmount,
        description: `Referral bonus from driver ${driverId}`,
        timestamp: new Date(),
        relatedOrderId: null,
        status: 'completed' as const
      };

      dispatcherBalance.transactions.push(transaction);

      referralData.totalEarnings += bonusAmount;
      referralData.pendingEarnings += bonusAmount;
      this.logger.log(`Added ${bonusAmount} bonus to dispatcher ${dispatcherId} from driver ${driverId}`);
      break;
    }
  }
}

*/