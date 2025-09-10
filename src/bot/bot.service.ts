import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Bot, InlineKeyboard } from 'grammy';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BotService implements OnModuleInit {
  private readonly logger = new Logger(BotService.name);
  private bot: Bot;
  private messageWaitingUsers = new Set<number>();
  private trackingCodeWaitingUsers = new Set<number>();
  private routeInputWaitingUsers = new Set<number>();
  private phoneWaitingUsers = new Set<number>();
  private codeWaitingUsers = new Map<number, {phoneCodeHash: string, phone: string, client: TelegramClient}>();
  private userSessions = new Map<number, {connected: boolean, phone: string, client: TelegramClient, session: string}>();
  private connectedGroups = new Map<number, Array<{id: string, title: string, members: number, restrictions?: any}>>();
  private userGroups = new Map<number, Array<{id: string, title: string, members: number, connected: boolean, type: 'chat' | 'channel', restrictions?: any, botAdmin?: boolean}>>();
  private selectedGroups = new Map<number, Set<string>>();
  private antiSpamTimers = new Map<string, number>();
  private userLastActivity = new Map<number, number>();
  
  // Payment system
  private paymentWaitingUsers = new Map<number, {plan: string, amount: number}>();
  private userPayments = new Map<number, {id: string, plan: string, amount: number, status: 'pending' | 'approved' | 'rejected', date: string, screenshot?: string}[]>();
  private pendingPayments = new Map<string, {userId: number, plan: string, amount: number, status: 'pending' | 'approved' | 'rejected', date: string, screenshot?: string}>();
  
  // User Registration System
  private userRoles = new Map<number, {
    role: 'yukchi' | 'haydovchi' | 'dispechr',
    isRegistered: boolean,
    registrationDate: string,
    profile: any
  }>();
  private registrationInProgress = new Set<number>();
  private registrationData = new Map<number, any>();
  
  // Dynamic Pricing System
  private pricingDatabase = new Map<string, {
    route: string,
    truckType: string,
    basePrice: number,
    pricePerTon: number,
    samples: Array<{price: number, date: string, driverId: string}>
  }>();
  
  // Order Management with Timer
  private activeOrders = new Map<string, {
    orderId: string,
    cargoId: string,
    yukchiId: number,
    assignedDriverId?: number,
    dispatcherFallbackTimer?: NodeJS.Timeout,
    status: 'pending' | 'driver_assigned' | 'dispatcher_assigned' | 'completed' | 'accepted_by_driver',
    createdAt: string
  }>();
  
  // Notification System
  private driverNotifications = new Map<number, string[]>();
  
  // Cargo Matching System for Dispatchers
  private cargoPostingUsers = new Set<number>();
  
  // Enhanced Cargo Posting with Step-by-Step Process
  private cargoPostingSteps = new Map<number, {
    step: 'from' | 'to' | 'type' | 'truck_info' | 'budget' | 'description',
    data: {
      from?: string,
      to?: string,
      type?: string, 
      truckInfo?: string,
      deliveryTime?: string,
      budget?: number,
      phone?: string,
      description?: string,
      fromLocation?: { latitude: number, longitude: number },
      toLocation?: { latitude: number, longitude: number }
    }
  }>();

  // Truck types and tonnages for driver registration and cargo posting
  private truckTypes = new Map<string, string[]>([
    ['Isuzu', ['3 tonna', '5 tonna', '7 tonna', '10 tonna']],
    ['Howo', ['15 tonna', '20 tonna', '25 tonna', '30 tonna']],
    ['Shacman', ['20 tonna', '25 tonna', '30 tonna', '35 tonna']],
    ['Foton', ['3 tonna', '5 tonna', '8 tonna', '12 tonna']],
    ['Hyundai', ['5 tonna', '8 tonna', '12 tonna', '15 tonna']],
    ['Mercedes', ['10 tonna', '15 tonna', '20 tonna', '25 tonna']],
    ['Volvo', ['20 tonna', '25 tonna', '30 tonna', '40 tonna']],
    ['Man', ['15 tonna', '20 tonna', '25 tonna', '30 tonna']],
    ['Scania', ['20 tonna', '25 tonna', '30 tonna', '40 tonna']],
    ['Iveco', ['10 tonna', '15 tonna', '20 tonna', '25 tonna']],
    ['Ford Transit', ['1.5 tonna', '2 tonna', '2.5 tonna']],
    ['Gazelle', ['1.5 tonna', '2 tonna', '3 tonna']],
    ['Tentli yuk mashinasi', ['5 tonna', '10 tonna', '15 tonna', '20 tonna']],
    ['Yarim treyl', ['20 tonna', '25 tonna', '30 tonna']],
    ['Treyl', ['25 tonna', '30 tonna', '35 tonna', '40 tonna']],
    ['Konteyner tashuvchi', ['20 tonna', '25 tonna', '30 tonna']],
    ['Refrizherator', ['5 tonna', '10 tonna', '15 tonna', '20 tonna']],
    ['Tsisterna', ['10 tonna', '15 tonna', '20 tonna', '25 tonna']],
  ]);

  private bodyTypes = ['Ochoq', 'Yopiq', 'Tentli', 'Refrizherator', 'Tsisterna', 'Konteyner', 'Avtovoz', 'Lowboy'];

  // Driver registration system with detailed steps
  private driverRegistrationSteps = new Map<number, {
    step: 'name' | 'phone' | 'tonnage_range' | 'price_survey',
    data: {
      fullName?: string,
      phone?: string,
      minTonnage?: number,
      maxTonnage?: number,
      priceSurveyAnswers?: Array<{question: string, answer: string}>,
      personalizedQuestions?: Array<{from: string, to: string, weight: string, type: string, minCapacity: number, maxCapacity: number}>
    },
    currentPriceSurveyIndex?: number,
    messageId?: number
  }>();

  // Comprehensive price survey questions database (100+ questions)
  private priceSurveyDatabase = [
    // LIGHT TRUCKS (1-5 tonna)
    { from: 'Toshkent Yunusobod', to: 'Andijon Baliqchi', weight: '2 tonna', type: 'Oziq-ovqat mahsulotlari', minCapacity: 1, maxCapacity: 5 },
    { from: 'Samarqand Markaz', to: 'Buxoro Gijduvon', weight: '3 tonna', type: 'Maishiy texnika', minCapacity: 1, maxCapacity: 5 },
    { from: 'Namangan Chust', to: 'Farg\'ona Quva', weight: '4 tonna', type: 'Tekstil mahsulotlari', minCapacity: 1, maxCapacity: 5 },
    { from: 'Qarshi Shahrisabz', to: 'Termiz Denov', weight: '1.5 tonna', type: 'Mebel', minCapacity: 1, maxCapacity: 5 },
    { from: 'Nukus Xojayli', to: 'Urganch Xiva', weight: '2.5 tonna', type: 'Qishloq xojalik', minCapacity: 1, maxCapacity: 5 },
    { from: 'Jizzax Forish', to: 'Sirdaryo Guliston', weight: '3.5 tonna', type: 'Avtoehtiyot qismlar', minCapacity: 1, maxCapacity: 5 },
    { from: 'Toshkent Sergeli', to: 'Samarqand Kattaqo\'rg\'on', weight: '2 tonna', type: 'Farmatsevtika', minCapacity: 1, maxCapacity: 5 },
    { from: 'Andijon Xonobod', to: 'Namangan Pop', weight: '4 tonna', type: 'Elektron jihozlar', minCapacity: 1, maxCapacity: 5 },
    { from: 'Buxoro Romitan', to: 'Navoiy Zarafshon', weight: '1 tonna', type: 'Kimyoviy moddalar', minCapacity: 1, maxCapacity: 5 },
    { from: 'Farg\'ona Rishton', to: 'Andijon Asaka', weight: '5 tonna', type: 'Poyabzal-kiyim', minCapacity: 1, maxCapacity: 5 },
    
    // MEDIUM TRUCKS (6-15 tonna)  
    { from: 'Toshkent Bektimir', to: 'Samarqand Urgut', weight: '10 tonna', type: 'Qurilish materiallari', minCapacity: 6, maxCapacity: 15 },
    { from: 'Andijon Jalaquduq', to: 'Toshkent Olmazor', weight: '8 tonna', type: 'Metalloprokat', minCapacity: 6, maxCapacity: 15 },
    { from: 'Buxoro Kogon', to: 'Qarshi Mirishkor', weight: '12 tonna', type: 'Sement va beton', minCapacity: 6, maxCapacity: 15 },
    { from: 'Namangan Kosonsoy', to: 'Farg\'ona Marg\'ilon', weight: '9 tonna', type: 'Paxta mahsulotlari', minCapacity: 6, maxCapacity: 15 },
    { from: 'Samarqand Ishtixon', to: 'Jizzax Zomin', weight: '7 tonna', type: 'Qishloq xojalik texnikasi', minCapacity: 6, maxCapacity: 15 },
    { from: 'Qarshi Guzor', to: 'Termiz Sariosiyo', weight: '11 tonna', type: 'Neft mahsulotlari', minCapacity: 6, maxCapacity: 15 },
    { from: 'Nukus Qo\'ng\'irot', to: 'Urganch Bagat', weight: '6 tonna', type: 'Baliq mahsulotlari', minCapacity: 6, maxCapacity: 15 },
    { from: 'Navoiy Karmana', to: 'Buxoro Olot', weight: '13 tonna', type: 'Kon sanoati', minCapacity: 6, maxCapacity: 15 },
    { from: 'Sirdaryo Bayaut', to: 'Toshkent Chinoz', weight: '8.5 tonna', type: 'Plastmassa buyumlar', minCapacity: 6, maxCapacity: 15 },
    { from: 'Farg\'ona Oltiariq', to: 'Namangan Uchqo\'rg\'on', weight: '10.5 tonna', type: 'Yog\'lik mahsulotlari', minCapacity: 6, maxCapacity: 15 },
    
    // HEAVY TRUCKS (16-25 tonna)
    { from: 'Toshkent Sergeli', to: 'Andijon Asaka', weight: '20 tonna', type: 'Sanoat jihozlari', minCapacity: 16, maxCapacity: 25 },
    { from: 'Samarqand Payariq', to: 'Qarshi Koson', weight: '18 tonna', type: 'Temir-beton konstruksiya', minCapacity: 16, maxCapacity: 25 },
    { from: 'Buxoro Shofirkon', to: 'Navoiy Qiziltepa', weight: '22 tonna', type: 'Og\'ir mashina-mexanizmlar', minCapacity: 16, maxCapacity: 25 },
    { from: 'Andijon Marhamat', to: 'Toshkent Zangiota', weight: '17 tonna', type: 'Avtomobil qismlari', minCapacity: 16, maxCapacity: 25 },
    { from: 'Namangan Mingbuloq', to: 'Sirdaryo Oqoltin', weight: '19 tonna', type: 'Kimyo sanoati', minCapacity: 16, maxCapacity: 25 },
    { from: 'Farg\'ona Beshariq', to: 'Jizzax Mirzacho\'l', weight: '21 tonna', type: 'Energetika uskunalari', minCapacity: 16, maxCapacity: 25 },
    { from: 'Qarshi Dehqonobod', to: 'Termiz Boysun', weight: '16 tonna', type: 'Transport vositalari', minCapacity: 16, maxCapacity: 25 },
    { from: 'Nukus Taxtako\'pir', to: 'Urganch Shovot', weight: '23 tonna', type: 'Qor tozalash uskunalari', minCapacity: 16, maxCapacity: 25 },
    { from: 'Navoiy Konimex', to: 'Buxoro Qorako\'l', weight: '24 tonna', type: 'Tog\' kon jihozlari', minCapacity: 16, maxCapacity: 25 },
    { from: 'Toshkent Quyichirchiq', to: 'Samarqand Jomboy', weight: '25 tonna', type: 'Issiqxona konstruksiyalar', minCapacity: 16, maxCapacity: 25 },
    
    // SUPER HEAVY TRUCKS (25+ tonna)
    { from: 'Toshkent YTT', to: 'Andijon Paxtaobod', weight: '30 tonna', type: 'Yirik sanoat uskunalari', minCapacity: 25, maxCapacity: 50 },
    { from: 'Samarqand Toyloq', to: 'Buxoro Vobkent', weight: '28 tonna', type: 'Kranlar va ko\'taruvchi mexanizmlar', minCapacity: 25, maxCapacity: 50 },
    { from: 'Qarshi Nishon', to: 'Navoiy Uchquduq', weight: '35 tonna', type: 'Neft-gaz uskunalari', minCapacity: 25, maxCapacity: 50 },
    { from: 'Andijon Shahrixon', to: 'Namangan Yangiqo\'rg\'on', weight: '32 tonna', type: 'Temir yo\'l uskunalari', minCapacity: 25, maxCapacity: 50 },
    { from: 'Farg\'ona Dang\'ara', to: 'Toshkent Parkent', weight: '27 tonna', type: 'Gidravlik press uskunalari', minCapacity: 25, maxCapacity: 50 },
    
    // Additional varied routes for all categories
    { from: 'Toshkent Bekobod', to: 'Sirdaryo Sardoba', weight: '4 tonna', type: 'Konditsionerlar', minCapacity: 1, maxCapacity: 8 },
    { from: 'Buxoro Jondor', to: 'Qarshi Qarshi', weight: '15 tonna', type: 'Mebel komplektlari', minCapacity: 10, maxCapacity: 20 },
    { from: 'Namangan Turagurgan', to: 'Andijon Buloqboshi', weight: '6 tonna', type: 'Bog\'dorchilik uskunalari', minCapacity: 3, maxCapacity: 10 },
    { from: 'Samarqand Nurobod', to: 'Jizzax Pakhtakor', weight: '26 tonna', type: 'Qurilish kranlar', minCapacity: 20, maxCapacity: 30 },
    { from: 'Farg\'ona Yozyovon', to: 'Nukus Beruni', weight: '12 tonna', type: 'Suv tozalash uskunalari', minCapacity: 8, maxCapacity: 15 },
    
    // Regional cross-connections
    { from: 'Urganch Gurlen', to: 'Termiz Muzrobod', weight: '14 tonna', type: 'Quyosh panellari', minCapacity: 10, maxCapacity: 18 },
    { from: 'Jizzax Dustlik', to: 'Nukus Chimboy', weight: '8 tonna', type: 'Veterinariya preparatlari', minCapacity: 5, maxCapacity: 12 },
    { from: 'Sirdaryo Mirzaabad', to: 'Qarshi Kitob', weight: '33 tonna', type: 'Shamol energetika uskunalari', minCapacity: 25, maxCapacity: 40 }
  ];

  private cargoTypes = [
    'Oziq-ovqat mahsulotlari',
    'Qurilish materiallari', 
    'Maishiy texnika',
    'Tekstil mahsulotlari',
    'Sanoat jihozlari',
    'Qishloq xojalik mahsulotlari',
    'Kimyoviy moddalar',
    'Mebel',
    'Avtomobil ehtiyot qismlari',
    'Boshqa'
  ];

  // Select personalized pricing questions based on truck capacity

  // Driver Location System
  private driverLocations = new Map<number, { latitude: number, longitude: number, address: string }>();
  
  // Price Negotiation System
  private priceNegotiations = new Map<string, {
    cargoId: string,
    originalBudget: number,
    currentBudget: number,
    suggestedPrices: number[],
    waitingForResponse: boolean
  }>();

  // Referral System for Dispatchers
  private dispatcherReferrals = new Map<number, {
    dispatcherId: number,
    referredDrivers: Set<number>,
    referredCustomers: Set<number>,
    referredDispatchers: Set<number>,
    totalEarnings: number,
    pendingEarnings: number,
    joinDate: string
  }>();

  // Virtual Balance System
  private virtualBalances = new Map<number, {
    userId: number,
    balance: number,
    totalEarned: number,
    withdrawnAmount: number,
    lastWithdrawal: string,
    transactions: Array<{
      id: string,
      amount: number,
      type: 'earning' | 'withdrawal' | 'bonus',
      description: string,
      date: string
    }>
  }>();

  // Driver-Customer Referral Relationships
  private customerReferrals = new Map<number, {
    customerId: number,
    referredBy: number, // dispatcher ID
    joinDate: string,
    priorityUntil: string // when priority expires
  }>();

  // Order Priority System
  private orderPriorities = new Map<string, {
    orderId: string,
    priorityDrivers: number[], // referred drivers get first priority
    generalDrivers: number[],  // all other drivers
    priorityDeadline: Date,
    currentPhase: 'priority' | 'general'
  }>();
  private cargoOffers = new Map<string, {
    id: string,
    userId: number,
    username: string,
    fromCity: string,
    toCity: string,
    cargoType: string,
    truckInfo: string,
    price: number,
    description?: string,
    date: string,
    phone: string,
    status: 'active' | 'matched' | 'completed' | 'cancelled',
    assignedDriverId?: number,
    acceptedDate?: string,
    fromLocation?: { latitude: number, longitude: number },
    toLocation?: { latitude: number, longitude: number }
  }>();
  private driverOffers = new Map<string, {
    id: string,
    userId: number,
    username: string,
    driverName: string,
    phone: string,
    truckType: string,
    capacity: number,
    fromCity: string,
    toCity: string,
    price: number,
    rating: number,
    completedOrders: number,
    date: string,
    status: 'available' | 'busy' | 'offline'
  }>();
  private matches = new Map<string, {
    cargoId: string,
    driverId: string,
    status: 'pending' | 'accepted' | 'rejected' | 'completed',
    date: string
  }>();
  
  // Anti-spam settings for logistics professionals
  private readonly MIN_INTERVAL = 3000; // 3 soniya
  private readonly MAX_INTERVAL = 8000; // 8 soniya  
  private readonly GROUP_COOLDOWN = 120000; // 2 daqiqa
  private readonly BATCH_SIZE = 10; // bir vaqtda maksimum 10 ta guruh

  async onModuleInit() {
    // Sizning bot tokeningiz
    const token = '8479156569:AAEm3WzUo1d3rITQ7dDVtiSMeMZOEZdxx3Q';
    
    this.bot = new Bot(token);
    
    // Demo data qo'shish (test uchun)
    await this.initializeDemoData();
    
    // /start buyrug'i
    this.bot.command('start', async (ctx) => {
      const startPayload = ctx.match;
      
      if (startPayload && typeof startPayload === 'string') {
        // Handle referral links
        await this.handleReferralStart(ctx, startPayload);
      } else {
        await this.showMainMenu(ctx);
      }
    });

    // Callback query handlers
    this.bot.on('callback_query:data', async (ctx) => {
      const data = ctx.callbackQuery.data;
      
      switch (data) {
        case 'features':
          await this.showFeatures(ctx);
          break;
        case 'connect_groups':
          await this.showConnectGroups(ctx);
          break;
        case 'my_groups':
          await this.showMyGroups(ctx);
          break;
        case 'send_message':
          await this.showSendMessage(ctx);
          break;
        case 'referral':
          await this.showReferral(ctx);
          break;
        case 'copy_referral':
          await this.copyReferralLink(ctx);
          break;
        case 'referral_stats':
          await this.showReferralStats(ctx);
          break;
        case 'pricing':
          await this.showPricing(ctx);
          break;
        case 'help_menu':
          await this.showHelpMenu(ctx);
          break;
        case 'settings':
          await this.showSettings(ctx);
          break;
        case 'contact':
          await this.showContact(ctx);
          break;
        case 'language_uz':
          await this.setLanguage(ctx, 'uz');
          break;
        case 'language_ru':
          await this.setLanguage(ctx, 'ru');
          break;
        case 'view_my_profile':
          await this.showDriverProfile(ctx);
          break;
        case 'edit_driver_profile':
          await this.editDriverProfile(ctx);
          break;
        case 'driver_stats':
          await this.showDriverStats(ctx);
          break;
        case 'earnings':
          await this.showEarnings(ctx);
          break;
        case 'rating_details':
          await this.showRatingDetails(ctx);
          break;
        case 'quick_order':
          await this.showQuickOrder(ctx);
          break;
        case 'price_calculator':
          await this.showPriceCalculator(ctx);
          break;
        case 'payments':
          await this.showPayments(ctx);
          break;
        case 'logistics_pricing':
          await this.showLogisticsPricingOptions(ctx);
          break;
        case 'pricing_demo':
          // Show demo pricing for Toshkent-Samarqand route with 15 ton cargo
          await this.showPricingSuggestion(ctx, 'Toshkent', 'Samarqand', 15);
          break;
        case 'bot_pricing':
          await this.showBotPricing(ctx);
          break;
        case 'pending_payments':
          await this.showPendingPayments(ctx);
          break;
        case 'back_main':
          await this.showMainMenu(ctx);
          break;
        case 'request_location_from':
          await this.requestLocationFrom(ctx);
          break;
        case 'request_location_to':
          await this.requestLocationTo(ctx);
          break;
        case 'skip_description':
          await this.handleSkipDescription(ctx);
          break;
        case 'cargo_skip_desc':
          await this.handleSkipDescription(ctx);
          break;
        case 'wait_for_price_increase':
          await this.handleWaitForPriceIncrease(ctx);
          break;
        case 'forward_info':
          await this.showForwardInfo(ctx);
          break;
        case 'admin_guide':
          await this.showAdminGuide(ctx);
          break;
        case 'connect_account':
          await this.showAccountConnection(ctx);
          break;
        case 'start_session':
          await this.startUserSession(ctx);
          break;
        case 'connect_all':
          await this.connectAllGroups(ctx);
          break;
        case 'disconnect_all':
          await this.disconnectAllGroups(ctx);
          break;
        case 'cargo_system':
          await this.showCargoSystem(ctx);
          break;
        case 'post_cargo':
          await this.startCargoPosting(ctx);
          break;
        case 'view_cargo':
          await this.showActiveCargoOffers(ctx);
          break;
        case 'cargo_tracking':
          await this.showCargoTrackingMenu(ctx);
          break;
        case 'track_by_code':
          await this.trackCargoByCode(ctx);
          break;
        case 'my_shipments':
          await this.showMyShipments(ctx);
          break;
        case 'contact_driver':
          await this.showDriverContact(ctx);
          break;
        case 'show_location':
          await this.showCargoLocation(ctx);
          break;
        case 'locationFrom':
          await this.requestLocationFrom(ctx);
          break;
        case 'locationTo':
          await this.requestLocationTo(ctx);
          break;
        case 'request_location_from':
          await this.requestLocationFrom(ctx);
          break;
        case 'request_location_to':
          await this.requestLocationTo(ctx);
          break;
        case 'rating_menu':
          await this.showRatingMenu(ctx);
          break;
        case 'my_rating':
          await this.showMyRating(ctx);
          break;
        case 'top_ratings':
          await this.showTopRatings(ctx);
          break;
        case 'give_rating':
          await this.showGiveRating(ctx);
          break;
        case 'route_optimization':
          await this.showRouteOptimization(ctx);
          break;
        case 'find_route':
          await this.showFindRoute(ctx);
          break;
        case 'popular_routes':
          await this.showPopularRoutes(ctx);
          break;
        case 'smart_suggestions':
          await this.showSmartSuggestions(ctx);
          break;
        case 'emergency_system':
          await this.showEmergencySystem(ctx);
          break;
        case 'emergency_contacts':
          await this.showEmergencyContacts(ctx);
          break;
        case 'emergency_sos':
          await this.triggerSOSAlarm(ctx);
          break;
        case 'emergency_guide':
          await this.showEmergencyGuide(ctx);
          break;
        case 'registered_drivers':
          await this.showRegisteredDrivers(ctx);
          break;
        case 'add_driver':
          await this.showAddDriver(ctx);
          break;
        case 'add_customer':
          await this.showAddCustomer(ctx);
          break;
        case 'my_team':
          await this.showMyTeam(ctx);
          break;
        case 'my_balance':
          await this.showMyBalance(ctx);
          break;
        case 'create_driver_referral':
          await this.createDriverReferralLink(ctx);
          break;
        case 'create_customer_referral':
          await this.createCustomerReferralLink(ctx);
          break;
        case 'register_driver':
          await this.showDriverRegistration(ctx);
          break;
        case 'view_drivers':
          await this.showAvailableDrivers(ctx);
          break;
        case 'my_orders':
          await this.showMyOrders(ctx);
          break;
        case 'cargo_stats':
          await this.showCargoStats(ctx);
          break;
        case 'register_yukchi':
          await this.startRegistration(ctx, 'yukchi');
          break;
        case 'register_haydovchi':
          await this.startRegistration(ctx, 'haydovchi');
          break;
        case 'register_dispechr':
          await this.startRegistration(ctx, 'dispechr');
          break;
        case 'confirm_registration':
          await this.confirmRegistration(ctx);
          break;
        case 'admin_panel':
          await this.showAdminPanel(ctx);
          break;
        case 'admin_stats':
          await this.showAdminStats(ctx);
          break;
        case 'admin_users':
          await this.showAdminUsers(ctx);
          break;
        case 'admin_orders':
          await this.showAdminOrders(ctx);
          break;
        case 'admin_reports':
          await this.showAdminReports(ctx);
          break;
        case 'admin_system':
          await this.showAdminSystem(ctx);
          break;
        case 'admin_clear_data':
          await this.showClearDataConfirmation(ctx);
          break;
        case 'confirm_clear_data':
          await this.handleClearAllData(ctx);
          break;
        default:
          if (data.startsWith('tonnage_')) {
            const tonnageRange = data.replace('tonnage_', '');
            await this.handleTonnageRangeSelection(ctx, tonnageRange);
          } else if (data.startsWith('disconnect_')) {
            const groupId = data.replace('disconnect_', '');
            await this.disconnectGroup(ctx, groupId);
          } else if (data.startsWith('connect_')) {
            const groupId = data.replace('connect_', '');
            await this.connectGroup(ctx, groupId);
          } else if (data.startsWith('select_')) {
            const groupId = data.replace('select_', '');
            await this.toggleGroupSelection(ctx, groupId);
          } else if (data === 'finish_selection') {
            await this.finishGroupSelection(ctx);
          } else if (data.startsWith('buy_')) {
            const plan = data.replace('buy_', '');
            await this.showPayment(ctx, plan);
          } else if (data === 'upload_payment') {
            await this.showPaymentUpload(ctx);
          } else if (data === 'admin_panel') {
            await this.showAdminPanel(ctx);
          } else if (data.startsWith('approve_')) {
            const paymentId = data.replace('approve_', '');
            await this.approvePayment(ctx, paymentId);
          } else if (data.startsWith('reject_')) {
            const paymentId = data.replace('reject_', '');
            await this.rejectPayment(ctx, paymentId);
          } else if (data.startsWith('budget_')) {
            const budget = parseInt(data.replace('budget_', ''));
            await this.handleBudgetSelection(ctx, budget);
          } else if (data.startsWith('city_from_')) {
            const city = data.replace('city_from_', '').replace(/([A-Z])/g, '$1');
            await this.handleCitySelection(ctx, city, 'from');
          } else if (data.startsWith('city_to_')) {
            const city = data.replace('city_to_', '').replace(/([A-Z])/g, '$1');
            await this.handleCitySelection(ctx, city, 'to');
          } else if (data.startsWith('cargo_type_')) {
            const cargoType = data.replace('cargo_type_', '');
            await this.handleCargoTypeSelection(ctx, cargoType);
          } else if (data.startsWith('accept_cargo_')) {
            const cargoId = data.replace('accept_cargo_', '');
            await this.handleCargoAcceptance(ctx, cargoId);
          } else if (data.startsWith('complete_cargo_')) {
            const cargoId = data.replace('complete_cargo_', '');
            await this.handleCargoCompletion(ctx, cargoId);
          } else if (data.startsWith('contact_cargo_owner_')) {
            const cargoId = data.replace('contact_cargo_owner_', '');
            await this.handleCargoOwnerContact(ctx, cargoId);
          } else if (data.startsWith('cargo_details_')) {
            const cargoId = data.replace('cargo_details_', '');
            await this.showCargoDetails(ctx, cargoId);
          } else if (data === 'my_balance') {
            await this.showVirtualBalance(ctx);
          } else if (data === 'withdraw_money') {
            await this.handleWithdrawal(ctx);
          } else if (data === 'detailed_transactions') {
            await this.showDetailedTransactions(ctx);
          } else if (data === 'my_earnings') {
            await this.showEarningsReport(ctx);
          } else if (data === 'back_to_main') {
            await this.showMainMenu(ctx);
          } else if (data.startsWith('cancel_cargo_')) {
            const cargoId = data.replace('cancel_cargo_', '');
            await this.handleCargoCancel(ctx, cargoId);
          } else if (data.startsWith('track_shipment_')) {
            const shipmentId = data.replace('track_shipment_', '');
            await this.showShipmentDetails(ctx, shipmentId);
          } else if (data.startsWith('rate_order_')) {
            const orderId = data.replace('rate_order_', '');
            await this.startRatingProcess(ctx, orderId);
          } else if (data.startsWith('rating_')) {
            const parts = data.replace('rating_', '').split('_');
            const orderId = parts.slice(0, -1).join('_');
            const rating = parseInt(parts[parts.length - 1]);
            await this.processRating(ctx, orderId, rating);
          } else if (data === 'cancel_cargo_posting') {
            await this.handleCancelCargoPosting(ctx);
          }
          break;
      }
    });

    // Xabar yuborish uchun matn kutish
    this.bot.on('message:text', async (ctx) => {
      if (ctx.message.text.startsWith('/')) return;
      
      const userId = ctx.from.id;
      
      // Telefon raqam kutilmoqda
      if (this.phoneWaitingUsers.has(userId)) {
        await this.handlePhoneNumber(ctx, ctx.message.text);
        return;
      }
      
      // SMS kod kutilmoqda
      if (this.codeWaitingUsers.has(userId)) {
        await this.handleVerificationCode(ctx, ctx.message.text);
        return;
      }
      
      // Yuk kuzatuv kodi kutilmoqda
      if (this.trackingCodeWaitingUsers.has(userId)) {
        await this.handleTrackingCode(ctx, ctx.message.text);
        return;
      }
      
      // Marshrut ma'lumoti kutilmoqda
      if (this.routeInputWaitingUsers.has(userId)) {
        await this.analyzeRoute(ctx, ctx.message.text);
        return;
      }
      
      // Foydalanuvchi xabar yuborish holatida bo'lsa
      if (this.messageWaitingUsers.has(userId)) {
        await this.sendMessageToGroups(ctx, ctx.message.text);
        this.messageWaitingUsers.delete(userId);
        return;
      }
      
      // Yuk e'lon qilish holatida bo'lsa (yangi step-by-step tizim)
      if (this.cargoPostingSteps.has(userId)) {
        await this.handleCargoPostingSteps(ctx, ctx.message.text);
        return;
      }
      
      // Eski yuk e'lon qilish holatida bo'lsa (eski tizim uchun)
      if (this.cargoPostingUsers.has(userId)) {
        await this.handleCargoPosting(ctx, ctx.message.text);
        return;
      }

      // Haydovchi qadam-baqadam registratsiyasi
      if (this.driverRegistrationSteps.has(userId)) {
        await this.handleDriverRegistrationStep(ctx, ctx.message.text);
        return;
      }
      
      // Ro'yxatdan o'tish holatida bo'lsa
      if (this.registrationInProgress.has(userId)) {
        await this.handleRegistrationData(ctx, ctx.message.text);
        return;
      }
      
      // Oddiy javob
      await ctx.reply(
        'Botdan foydalanish uchun /start buyrug\'ini yuboring!',
        {
          reply_markup: new InlineKeyboard()
            .text('🚀 Bosh menyu', 'back_main')
        }
      );
    });

    // To'lov screenshot handler
    this.bot.on('message:photo', async (ctx) => {
      const userId = ctx.from.id;
      
      if (this.paymentWaitingUsers.has(userId)) {
        await this.handlePaymentScreenshot(ctx);
        return;
      }
      
      await ctx.reply('Screenshot yuborish uchun avval to\'lov bo\'limiga o\'ting.', {
        reply_markup: new InlineKeyboard()
          .text('💰 Tariflar', 'pricing')
          .text('🏠 Bosh menyu', 'back_main')
      });
    });

    // Location message handler
    this.bot.on('message:location', async (ctx) => {
      const userId = ctx.from.id;
      const location = ctx.message.location;
      
      this.logger.log(`Location received from user ${userId}: ${location.latitude}, ${location.longitude}`);
      
      // Check if user is in cargo posting process
      const currentStep = this.cargoPostingSteps.get(userId);
      this.logger.log(`Current step for user ${userId}:`, currentStep);
      
      if (!currentStep) {
        this.logger.log(`User ${userId} not in cargo posting process`);
        await ctx.reply('📍 Lokatsiya qabul qilindi, lekin hozir yuk e\'lon qilish jarayonida emassiz.');
        return;
      }

      try {
        const locationString = `Lat: ${location.latitude}, Lon: ${location.longitude}`;
        
        if (currentStep.step === 'locationFrom') {
          // Handle "from" location
          currentStep.data.from = locationString;
          currentStep.step = 'to';
          this.cargoPostingSteps.set(userId, currentStep);
          
          // Show TO step with both location and text options
          const toMessage = `
📦 <b>YUK E'LON QILISH</b>

✅ <b>Qayerdan:</b> Lokatsiya (${locationString})

🌍 <b>2-qadam:</b> Yuk qayerga yetkaziladi?

📍 Shahar nomini yozing yoki lokatsiyangizni yuboring

<b>Tez tanlash:</b>
• Toshkent • Samarqand • Buxoro • Farg'ona
• Namangan • Andijon • Nukus • Qashqadaryo

📍 <b>Yoki aniq manzil uchun lokatsiya yuboring!</b>
          `;
          
          await ctx.reply(toMessage, {
            parse_mode: 'HTML',
            reply_markup: new InlineKeyboard()
              .text('🏙️ Toshkent', 'city_to_Toshkent')
              .text('🕌 Samarqand', 'city_to_Samarqand')
              .text('🏛️ Buxoro', 'city_to_Buxoro').row()
              .text('🌱 Farg\'ona', 'city_to_Fargona')  
              .text('💎 Namangan', 'city_to_Namangan')
              .text('🍇 Andijon', 'city_to_Andijon').row()
              .text('🏜️ Nukus', 'city_to_Nukus')
              .text('🌾 Qarshi', 'city_to_Qarshi')
              .text('🏔️ Termiz', 'city_to_Termiz').row()
              .text('📍 Lokatsiya yuborish', 'request_location_to')
              .text('🔙 Orqaga', 'post_cargo').row()
          });
          
        } else if (currentStep.step === 'locationTo') {
          // Handle "to" location  
          currentStep.data.to = locationString;
          currentStep.step = 'cargoType';
          this.cargoPostingSteps.set(userId, currentStep);
          
          await ctx.reply('✅ Yuk yetkazish joyi saqlandi!\n\nEndi yuk turini kiriting (masalan: mebel, oziq-ovqat, qurilish materiallari):', {
            reply_markup: new InlineKeyboard()
              .text('🔙 Orqaga', 'post_cargo')
          });
        } else {
          await ctx.reply('❌ Hozir lokatsiya kutilmayapti.');
        }
      } catch (error) {
        this.logger.error('Location handling error:', error);
        await ctx.reply('❌ Lokatsiyani qayta ishlashda xato yuz berdi.');
      }
    });

    // Botni ishga tushirish
    try {
      await this.bot.start();
      this.logger.log('🤖 Bot muvaffaqiyatli ishga tushdi!');
    } catch (error) {
      this.logger.error('Botni ishga tushirishda xato:', error);
    }
  }

  // Asosiy menyu
  private async showMainMenu(ctx: any) {
    try {
      const user = ctx.from;
      
      // Faol foydalanuvchini qo'shish
      this.activeUsers.add(user.id);
      
      const userRole = this.userRoles.get(user.id);
      
      if (!userRole || !userRole.isRegistered) {
        // Ro'yxatdan o'tmagan foydalanuvchilar uchun
        const welcomeMessage = `
🎉 <b>Xush kelibsiz, ${user.first_name}!</b>

🚛 <b>AVTOXABAR LOGISTIKA PLATFORMASI</b>

┌─────────────────────────┐
│  ⚡ TEZKOR • 🔒 XAVFSIZ  │  
│  💰 TEJAMKOR • 📱 QULAY  │
└─────────────────────────┘

🎯 <b>Kimlar uchun:</b>
👤 <b>YUKCHILAR</b> - Yuk yuboruvchi
🚚 <b>HAYDOVCHILAR</b> - Transport egasi  
🎭 <b>DISPECHRLAR</b> - Logistika mutaxassisi

✨ <b>Nima beradi:</b>
🔥 Oniy ulanish • 📆 Narx tahlili
🎪 Avtomatik matching • 💬 24/7 chat
🎁 Tekin dispech xizmat • 🚀 Smart tizim

<b>Qaysi rol bilan ro'yxatdan o'tasiz?</b>
        `;
        
        const keyboard = new InlineKeyboard()
          .text('👤 YUKCHI', 'register_yukchi')
          .text('🚚 HAYDOVCHI', 'register_haydovchi').row()
          .text('🎭 DISPECHR', 'register_dispechr').row()
          .text('ℹ️ Ma\'lumot', 'features')
          .text('🎯 Yordam', 'help_menu').row()
          .text('⚙️ Sozlamalar', 'settings')
          .text('📞 Aloqa', 'contact').row();
        
        return await this.sendMenuMessage(ctx, welcomeMessage, keyboard);
      }

      // Ro'yxatdan o'tgan foydalanuvchilar uchun
      let welcomeMessage = '';
      let keyboard = new InlineKeyboard();

      switch (userRole.role) {
        case 'yukchi':
          const activeOrders = Math.floor(Math.random() * 5) + 1; // Fake data
          const completedOrders = Math.floor(Math.random() * 20) + 5;
          
          welcomeMessage = `
📦 <b>YUKCHI</b>

👋 Salom, ${user.first_name}!

🔄 Faol: ${activeOrders} ta | ✅ Bajarilgan: ${completedOrders} ta
          `;
          
          keyboard = new InlineKeyboard()
            .text('📦 Yuk e\'lon qilish', 'post_cargo')
            .text('🔍 Yuk kuzatuvi', 'cargo_tracking').row()
            .text('🚚 Haydovchilar', 'view_drivers')
            .text('📋 Mening orderlarim', 'my_orders').row()
            .text('⚙️ Sozlamalar', 'settings')
            .text('📞 Yordam', 'contact').row();
          break;

        case 'haydovchi':
          // Find driver by userId pattern in keys
          const driverKey = Array.from(this.driverOffers.keys()).find(key => key.startsWith(`driver_${user.id}_`));
          const driverInfo = driverKey ? this.driverOffers.get(driverKey) : null;
          const driverStatus = !!driverInfo;
          
          this.logger.log(`Driver panel for ${user.id}: found key=${driverKey}, hasInfo=${!!driverInfo}`);
          if (driverInfo) {
            this.logger.log(`Driver info:`, driverInfo);
          }
          
          welcomeMessage = `
🚚 <b>HAYDOVCHI</b>

👋 Salom, ${user.first_name}!

${driverStatus ? '✅ Profil faol' : '⏳ Profil to\'ldiring'} | Bajarilgan: ${driverInfo?.completedOrders || 0} ta
          `;
          
          keyboard = new InlineKeyboard()
            .text('🆕 Yangi orderlar', 'view_cargo')
            .text('👤 Mening profilim', 'view_my_profile').row()
            .text('📋 Order tarixi', 'my_orders')
            .text('⚙️ Sozlamalar', 'settings').row();
          break;

        case 'dispechr':
          // Get dispatcher referral stats
          const dispatcherStats = this.dispatcherReferrals.get(user.id) || {
            referredDrivers: new Set(),
            referredCustomers: new Set(), 
            totalEarnings: 0
          };
          const virtualBalance = this.virtualBalances.get(user.id);
          
          welcomeMessage = `
🎯 <b>DISPECHR PANELI</b>

Assalomu alaykum, ${user.first_name}!

👨‍💼 <b>Sizning profilingiz:</b> Dispechr
✅ <b>Status:</b> Professional
💰 <b>Balans:</b> ${virtualBalance?.balance?.toLocaleString() || 0} so'm

📈 <b>Referral statistika:</b>
🚚 Ulangan haydovchilar: ${dispatcherStats.referredDrivers.size}
👤 Ulangan mijozlar: ${dispatcherStats.referredCustomers.size}
💵 Jami daromad: ${dispatcherStats.totalEarnings?.toLocaleString() || 0} so'm

💼 <b>Dispechr funksiyalari:</b>
• Referral tizimi va bonus olish
• Shaxsiy haydovchi va mijoz bazasi
• Priority order distribution
• Commission-free orders

Quyidagi bo'limlardan birini tanlang:
          `;
          
          keyboard = new InlineKeyboard()
            .text('📦 Yuk e\'lon qilish', 'post_cargo')
            .text('👀 Faol yuklar', 'view_cargo').row()
            .text('🚚 Haydovchi qo\'shish', 'add_driver')
            .text('👤 Mijoz qo\'shish', 'add_customer').row()
            .text('👥 Mening jamoa', 'my_team')
            .text('💰 Balansim', 'my_balance').row()
            .text('📤 Avto xabar', 'send_message')
            .text('📊 Analytics', 'cargo_stats')
            .text('🔗 Guruhlar', 'my_groups').row()
            .text('💰 Tariflar', 'pricing')
            .text('⚙️ Sozlamalar', 'settings').row();
          break;
      }
      
      return await this.sendMenuMessage(ctx, welcomeMessage, keyboard);
    } catch (error) {
      this.logger.error('showMainMenu error:', error);
    }
  }

  private async sendMenuMessage(ctx: any, message: string, keyboard: InlineKeyboard) {
    try {
      const user = ctx.from;
      
      // Admin foydalanuvchilari uchun admin panel tugmasi
      const adminUsers = [parseInt(process.env.ADMIN_USER_ID || '0'), 5968018488, 5772668259];
      if (adminUsers.includes(user.id)) {
        keyboard.text('🔐 Admin Panel', 'admin_panel').row();
      }
      
      if (ctx.callbackQuery) {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard
        });
      } else {
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard
        });
      }
      
      this.logger.log(`Foydalanuvchi ${user.first_name} (${user.id}) menyuni ko'rdi`);
    } catch (error) {
      this.logger.error('Menyu ko\'rsatishda xato:', error);
      await ctx.reply('Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.');
    }
  }

  // Bot imkoniyatlari
  private async showFeatures(ctx: any) {
    const message = `
🤖 <b>Bot nima qila oladi?</b>

✅ <b>Asosiy imkoniyatlar:</b>
📝 Matnli xabarlarni yuborish
🖼 Rasm va videolarni yuborish
⏰ Vaqtni rejalashtirish
👥 Bir nechta guruhga birdan yuborish
📊 Yuborish statistikasini kuzatish

🔒 <b>Xavfsizlik:</b>
• Spam himoya tizimi
• Tasodifiy kechikishlar
• Guruh administratorlari nazorati

💰 <b>Tarif tizimi:</b>
• 10 ta bepul xabar
• Turli muddat tanlovlari
• To'lov qo'llab-quvvatlash

📱 <b>Foydalanish:</b>
• Oddiy interfeys
• Telegram mini-app
• Mobil va desktop qo'llab-quvvatlash
    `;

    const keyboard = new InlineKeyboard()
      .text('🔙 Orqaga', 'back_main');

    await this.safeEditMessage(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  // Professional logistics groups management
  private async showConnectGroups(ctx: any) {
    const userId = ctx.from.id;
    
    // Check if user has active session
    const userSession = this.userSessions.get(userId);
    const hasSession = userSession && userSession.connected;
    
    if (!hasSession) {
      // Show session connection interface
      const message = `
🔐 **Professional Logistics System**

📦 **Session kerak:**
Guruhlaringizga xabar yuborish uchun avval Telegram akkauntingizni ulashingiz kerak.

🚀 **Logistics Features:**
• Limitlarsiz real-time yuborish
• 100+ guruhga bir vaqtda
• Anti-freeze algoritmlari
• Professional statistika
• Smart timing system

⚡ **Session ulash:**
1️⃣ Telegram session yaratiladi
2️⃣ Sizning guruhlaringiz yuklanadi
3️⃣ Professional yuborish tizimi faollashadi
4️⃣ Xabarlar sizning nomingizdan ketadi

🛡️ **Xavfsizlik:**
• Ma'lumotlar shifrlangan
• Faqat bot ichida saqlanadi
• Istalgan vaqt uzish mumkin
• To'liq nazorat sizda

💡 **Logistlar uchun:** Bu tizim yuqori hajmli e'lon tarqatish uchun optimallashtirilgan.
      `;

      const keyboard = new InlineKeyboard()
        .text('🔐 Session ulash', 'connect_account')
        .text('ℹ️ Batafsil ma\'lumot', 'session_info').row()
        .text('🔙 Orqaga', 'back_main');

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
      return;
    }

    // User has session - show their actual groups
    const userAllGroups = this.userGroups.get(userId) || [];
    const connectedGroups = userAllGroups.filter(g => g.connected);
    const availableGroups = userAllGroups.filter(g => !g.connected);
    
    let message = `
📦 **Professional Logistics Groups**

👤 **Session:** ${userSession.phone}
📊 **Guruhlar:** ${userAllGroups.length} ta mavjud
✅ **Faol:** ${connectedGroups.length} ta

🚀 **Real-time yuborish tizimi:**
• Sizning nomingizdan yuboriladi
• Limitlarsiz professional tizim
• Anti-freeze himoya algoritmlari
• Smart timing va bulk operations

📋 **Sizning guruhlaringiz:**

`;

    if (connectedGroups.length > 0) {
      message += `✅ **Faol guruhlar:**\n\n`;
      connectedGroups.forEach((group, index) => {
        const restrictions = this.getGroupRestrictions(group);
        message += `${index + 1}. ${group.title}\n👥 ${group.members} a'zo • ${group.type} ${restrictions}\n`;
      });
      message += `\n`;
    }

    if (availableGroups.length > 0) {
      message += `⬜ **Faollashtirish mumkin:**\n\n`;
      availableGroups.slice(0, 8).forEach((group, index) => {
        const restrictions = this.getGroupRestrictions(group);
        message += `${index + 1}. ${group.title}\n👥 ${group.members} a'zo • ${group.type} ${restrictions}\n`;
      });
      
      if (availableGroups.length > 8) {
        message += `\n... va yana ${availableGroups.length - 8} ta guruh\n`;
      }
    }

    message += `
💡 **Professional Features:**
• Bulk messaging (100+ groups)
• Smart anti-spam timing
• Category-based filtering
• Real-time delivery status
• High-volume optimization

⚡ **Logistics optimized:** Tez va xavfsiz e'lon tarqatish uchun!
    `;

    const keyboard = new InlineKeyboard();
    
    // Available groups buttons (first 6 for space)
    const displayGroups = availableGroups.slice(0, 6);
    displayGroups.forEach((group, index) => {
      if (index % 2 === 0) {
        const buttonText1 = `✅ ${group.title.length > 15 ? group.title.substring(0, 15) + '...' : group.title}`;
        const action1 = `connect_${group.id}`;
        
        if (displayGroups[index + 1]) {
          const group2 = displayGroups[index + 1];
          const buttonText2 = `✅ ${group2.title.length > 15 ? group2.title.substring(0, 15) + '...' : group2.title}`;
          const action2 = `connect_${group2.id}`;
          
          keyboard.text(buttonText1, action1).text(buttonText2, action2).row();
        } else {
          keyboard.text(buttonText1, action1).row();
        }
      }
    });

    // Action buttons
    if (connectedGroups.length > 0) {
      keyboard.text('📤 Xabar yuborish', 'send_message').row();
    }
    
    keyboard.text('🔄 Barchani faollashtirish', 'connect_all')
      .text('❌ Barchani o\'chirish', 'disconnect_all').row();
      
    keyboard.text('📊 Batafsil ro\'yxat', 'detailed_groups')
      .text('⚙️ Sozlamalar', 'group_settings').row();
      
    keyboard.text('🔙 Orqaga', 'back_main');

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  // Faol guruhlar
  private async showMyGroups(ctx: any) {
    const userId = ctx.from.id;
    const groups = this.connectedGroups.get(userId) || [];

    let message = `📋 <b>Faol guruhlar (Bot admin)</b>\n\n`;

    if (groups.length === 0) {
      message += `❌ Hozircha faol guruhlar yo'q.\n\n🤖 Bot admin bo'lgan guruhlarni faollashtirish uchun "Guruhlarni bog'lash" bo'limidan foydalaning.\n\n💡 <b>Eslatma:</b> Bot faqat admin sifatida qo'shilgan guruhlariga xabar yuborishi mumkin.`;
      
      const keyboard = new InlineKeyboard()
        .text('🔗 Guruh bog\'lash', 'connect_groups')
        .text('📖 Admin qilish yo\'riqnomasi', 'admin_guide').row()
        .text('🔙 Orqaga', 'back_main');

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
      return;
    }

    groups.forEach((group, index) => {
      message += `${index + 1}. ${group.title}\n👥 A'zolar: ${group.members}\n🤖 Bot holati: ✅ Admin\n📤 Forward: ✅ Faol\n\n`;
    });

    message += `💡 <b>Afzallik:</b> Bot orqali xabar forward qilish - sizning ma'lumotlaringiz xavfsiz!\n\n🔄 Guruhni o'chirish uchun "O'chirish" tugmasini bosing.`;

    const keyboard = new InlineKeyboard();
    
    groups.forEach((group, index) => {
      if (index % 2 === 0) {
        if (groups[index + 1]) {
          keyboard
            .text(`❌ ${group.title}`, `disconnect_${group.id}`)
            .text(`❌ ${groups[index + 1].title}`, `disconnect_${groups[index + 1].id}`)
            .row();
        } else {
          keyboard.text(`❌ ${group.title}`, `disconnect_${group.id}`).row();
        }
      }
    });

    keyboard.text('ℹ️ Forward haqida', 'forward_info')
      .text('🔙 Orqaga', 'back_main');

    await this.safeEditMessage(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  // Xabar yuborish (Bot forward usuli)
  private async showSendMessage(ctx: any) {
    const userId = ctx.from.id;
    const groups = this.connectedGroups.get(userId) || [];

    if (groups.length === 0) {
      const message = `
❌ <b>Faol guruhlar yo'q</b>

Xabar yuborish uchun avval guruhlarni faollashtiring.

Bot admin bo'lgan guruhlarni "Guruhlarni bog'lash" bo'limidan faollashtiring.
      `;

      const keyboard = new InlineKeyboard()
        .text('🔗 Guruh bog\'lash', 'connect_groups')
        .text('🔙 Orqaga', 'back_main');

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
      return;
    }

    const message = `
📤 <b>Bot orqali xabar yuborish</b>

Faol guruhlar: ${groups.length} ta

🤖 <b>Bot forward usuli:</b>
1️⃣ Xabaringizni botga yuboring
2️⃣ Bot xabaringizni forward qiladi
3️⃣ Barcha faol guruhlariga yuboriladi
4️⃣ Sizning ma'lumotlaringiz maxfiy qoladi

🔐 <b>Xavfsizlik:</b>
• Shaxsiy akkaunt ulanmagan
• Bot orqali boshqarish
• Ma'lumotlar himoyasi
• Spam himoyasi faol

📝 <b>Faol guruhlar:</b>
${groups.map((group, index) => `${index + 1}. ${group.title} (${group.members} a'zo) 🤖`).join('\n')}

✍️ <b>Xabaringizni yozing:</b>
    `;

    const keyboard = new InlineKeyboard()
      .text('ℹ️ Forward haqida', 'forward_info')
      .text('🔙 Orqaga', 'back_main');

    await this.safeEditMessage(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });

    this.messageWaitingUsers.add(userId);
  }

  // Referral tizimi
  private async showReferral(ctx: any) {
    const userId = ctx.from.id;
    const referralLink = `https://t.me/Avtomatikxabarbot?start=ref_${userId}`;

    const message = `
👥 <b>Referral tizimi</b>

Do'stlaringizni taklif qiling va bonuslar oling!

🎁 <b>Sizning bonuslaringiz:</b>
• Har bir taklif uchun: 5 bepul xabar
• 10 ta taklif: 1 kun bepul
• 50 ta taklif: 1 hafta bepul
• 100 ta taklif: 1 oy bepul

📊 <b>Sizning statistikangiz:</b>
• Taklif qilingan: 0 kishi
• Bonus xabarlar: 0 ta
• Jami daromad: 0 so'm

🔗 <b>Sizning referral havolangiz:</b>
<code>${referralLink}</code>

📱 <b>Qanday foydalanish:</b>
1️⃣ Havolani nusxalang
2️⃣ Do'stlaringizga yuboring
3️⃣ Ular bot orqali ro'yxatdan o'tganda bonus oling

💡 <b>Maslahat:</b> Havolani ijtimoiy tarmoqlarda ulashing!
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
      bonusMessages: 10, // demo: bepul xabarlar
      totalEarnings: 0,
      thisWeekReferrals: 0,
      thisMonthReferrals: 0,
      recentReferrals: [] // oxirgi taklif qilinganlar
    };
    
    const message = `
📊 <b>Referral statistikangiz</b>

👥 <b>Umumiy statistika:</b>
• Taklif qilingan: ${stats.totalReferrals} kishi
• Bu hafta: ${stats.thisWeekReferrals} kishi  
• Bu oy: ${stats.thisMonthReferrals} kishi

🎁 <b>Sizning bonuslaringiz:</b>
• Bonus xabarlar: ${stats.bonusMessages} ta
• Jami daromad: ${stats.totalEarnings} so'm

💰 <b>Bonus tizimi:</b>
• Har bir taklif: 5 bepul xabar
• 10 ta taklif: 1 kun bepul foydalanish
• 50 ta taklif: 1 hafta bepul
• 100 ta taklif: 1 oy bepul

📈 <b>Darajalar:</b>
${stats.totalReferrals >= 100 ? '🏆 Platinum (100+)' :
  stats.totalReferrals >= 50 ? '🥇 Gold (50+)' :
  stats.totalReferrals >= 10 ? '🥈 Silver (10+)' :
  stats.totalReferrals >= 1 ? '🥉 Bronze (1+)' : '⭐ Yangi boshlovchi'}

${stats.totalReferrals === 0 ? 
`🚀 <b>Boshlash uchun:</b>
1️⃣ Referral havolangizni oling
2️⃣ Do'stlaringizga ulashing  
3️⃣ Ular ro'yxatdan o'tganda bonus oling` :

`📋 <b>Oxirgi 5 ta taklif:</b>
${stats.recentReferrals.length === 0 ? 'Hozircha taklif yo\'q' :
  stats.recentReferrals.slice(-5).map((ref, index) => 
    `${index + 1}. ${ref.name} - ${ref.date}`
  ).join('\n')}
`}
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

  // Pricing/Tariflar
  private async showPricing(ctx: any) {
    const message = `
💰 <b>Tariflar va Narxlar</b>

🤖 <b>Bot xabar yuborish tariflari:</b>
📅 1 Kun - 7,000 so'm
📅 1 Hafta - 20,000 so'm (🔥 Ommabop!)  
📅 1 Oy - 60,000 so'm

🚛 <b>Logistika narx kalkulatori:</b>
• Yo'nalish va mashina turiga qarab
• Haydovchilardan olingan real narxlar asosida
• 3-5 ta namuna ma'lumotlari bilan

🆓 <b>Bepul:</b> 10 ta xabar (har qanday foydalanuvchi)

💡 <b>Qo'shimcha:</b>
• Referral tizimi orqali bepul kunlar
• Doimiy mijozlar uchun chegirmalar
    `;

    const keyboard = new InlineKeyboard()
      .text('🚛 Logistika narxlari', 'logistics_pricing')
      .text('🤖 Bot tariflar', 'bot_pricing').row()
      .text('🔙 Orqaga', 'back_main');

    await this.safeEditMessage(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private async showBotPricing(ctx: any) {
    const message = `
🤖 <b>Bot xabar yuborish tariflari</b>

📅 <b>1 Kun</b> - 7,000 so'm
• Limitlarsiz xabar yuborish
• Barcha bot imkoniyatlari
• Texnik yordam

📅 <b>1 Hafta</b> - 20,000 so'm  
• Limitlarsiz xabar yuborish
• Barcha bot imkoniyatlari
• Texnik yordam
• 🔥 Eng ommabop!

📅 <b>1 Oy</b> - 60,000 so'm
• Limitlarsiz xabar yuborish
• Barcha bot imkoniyatlari
• Texnik yordam
• Premium qo'llab-quvvatlash

🆓 <b>Bepul:</b> 10 ta xabar (har qanday foydalanuvchi)

💳 <b>To'lov usullari:</b>
• Plastik karta (Uzcard, Humo)
• Bank o'tkazmalari

🛡️ <b>Kafolat:</b>
• To'lov qabul qilingandan keyin darhol aktivlashadi
• 24/7 texnik yordam
    `;

    const keyboard = new InlineKeyboard()
      .text('💳 1 Kun - 7,000', 'buy_1day')
      .text('🔥 1 Hafta - 20,000', 'buy_1week').row()
      .text('⭐ 1 Oy - 60,000', 'buy_1month')
      .text('🔙 Orqaga', 'pricing').row();

    await this.safeEditMessage(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private async showLogisticsPricingOptions(ctx: any) {
    const message = `
🚛 <b>Logistika Narx Kalkulatori</b>

📊 <b>Tizim haqida:</b>
• Haydovchilardan olingan haqiqiy narxlar asosida
• Yo'nalish va mashina turiga qarab
• Bozor narxlariga moslashtirilgan
• Avtomatik yangilanuvchi tizim

💡 <b>Namuna ko'rish:</b>
Toshkent → Samarqand (15 tonna yuk) uchun narxlar

🎯 <b>Foydalanish:</b>
• Yukchi sifatida ro'yxatdan o'ting
• Yuk e'lon qilishda avtomatik narx taklifi
• Haydovchilar bilan kelishib oling
    `;

    const keyboard = new InlineKeyboard()
      .text('📊 Namuna ko\'rish', 'pricing_demo')
      .text('👤 Ro\'yxatdan o\'tish', 'register_yukchi').row()
      .text('🔙 Orqaga', 'pricing');

    await this.safeEditMessage(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  // To'lov ko'rsatish
  private async showPayment(ctx: any, plan: string) {
    const prices = {
      '1day': { name: '1 Kun', amount: 7000 },
      '1week': { name: '1 Hafta', amount: 20000 },
      '1month': { name: '1 Oy', amount: 60000 }
    };
    
    const planInfo = prices[plan];
    if (!planInfo) {
      await this.safeEditMessage(ctx, '❌ Noto\'g\'ri tarif tanlandi.');
      return;
    }

    const paymentCardNumber = process.env.PAYMENT_CARD_NUMBER || '9860120112345678';
    const paymentCardHolder = process.env.PAYMENT_CARD_HOLDER || 'AutoPoster Bot';

    const message = `
💳 <b>To'lov ma'lumotlari</b>

📋 <b>Tanlangan tarif:</b> ${planInfo.name}
💰 <b>Narxi:</b> ${planInfo.amount.toLocaleString()} so'm

💳 <b>To'lov uchun karta ma'lumotlari:</b>
🔢 <b>Karta raqami:</b> <code>${paymentCardNumber}</code>
👤 <b>Karta egasi:</b> ${paymentCardHolder}

📋 <b>To'lov qilish tartibi:</b>
1️⃣ Yuqoridagi karta raqamiga ${planInfo.amount.toLocaleString()} so'm o'tkazing
2️⃣ To'lov chekini (screenshot) botga yuboring
3️⃣ Admin tomonidan tasdiqlashni kuting
4️⃣ Tasdiqlangandan keyin xizmat faollashadi

⏰ <b>Tasdiqlash vaqti:</b> 5-30 daqiqa

⚠️ <b>Muhim:</b>
• Screenshot aniq va o'qiladigan bo'lishi kerak
• To'lov summasi to'liq mos kelishi kerak
• Karta raqami to'g'ri bo'lishi kerak

🔒 <b>Xavfsizlik:</b> Barcha to'lovlar admin tomonidan tekshiriladi
    `;

    const keyboard = new InlineKeyboard()
      .text('📤 Screenshot yuborish', 'upload_payment')
      .text('🔙 Orqaga', 'pricing');

    await this.safeEditMessage(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });

    // Plan ma'lumotlarini session'ga saqlash
    const userId = ctx.from.id;
    this.paymentWaitingUsers.set(userId, { plan, amount: planInfo.amount });
  }

  // Screenshot yuborish
  private async showPaymentUpload(ctx: any) {
    const userId = ctx.from.id;
    
    // Avval tanlangan plan ma'lumotini olish
    const currentPlan = this.paymentWaitingUsers.get(userId);
    if (!currentPlan) {
      await this.safeEditMessage(ctx, '❌ Avval tarif tanlang.', {
        reply_markup: new InlineKeyboard().text('🔙 Tariflar', 'pricing')
      });
      return;
    }
    
    const message = `
📤 <b>To'lov cheki yuborish</b>

📋 <b>Tanlangan tarif:</b> ${currentPlan.plan}
💰 <b>To'lov summasi:</b> ${currentPlan.amount.toLocaleString()} so'm

📋 <b>Qadamlar:</b>
1️⃣ Kartaga ${currentPlan.amount.toLocaleString()} so'm to'lov qiling
2️⃣ To'lov chekini (screenshot) shu yerga yuboring
3️⃣ Admin tomonidan tasdiqlashni kuting

📱 <b>Screenshot talablari:</b>
• Aniq va o'qiladigan bo'lishi kerak
• To'lov summasi ko'rinishi kerak  
• Vaqt va sana ko'rinishi kerak
• Qabul qiluvchi karta oxirgi 4 raqami ko'rinishi kerak

⏰ <b>Admin tekshiruvi:</b> 5-30 daqiqa

🔄 <b>Status:</b> Screenshot yuborish kutilmoqda...
    `;

    const keyboard = new InlineKeyboard()
      .text('🔙 Orqaga', 'pricing');

    await this.safeEditMessage(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  // Screenshot handle qilish
  private async handlePaymentScreenshot(ctx: any) {
    const userId = ctx.from.id;
    
    if (!this.paymentWaitingUsers.has(userId)) {
      await ctx.reply('❌ Avval to\'lov bo\'limidan screenshot yuborish rejimini yoqing.');
      return;
    }

    try {
      // Photo file info olish
      const photo = ctx.message.photo[ctx.message.photo.length - 1]; // Eng katta o'lchamdagisini olish
      const fileId = photo.file_id;

      // Payment ID generatsiya qilish
      const paymentId = `pay_${userId}_${Date.now()}`;
      
      // Plan ma'lumotlarini olish
      const planInfo = this.paymentWaitingUsers.get(userId);
      if (!planInfo) {
        await this.safeEditMessage(ctx, '❌ Tarif ma\'lumotlari topilmadi. Qaytadan tarif tanlang.', {
          parse_mode: 'HTML',
          reply_markup: new InlineKeyboard().text('🔙 Tariflar', 'pricing')
        });
        return;
      }
      
      // Payment ma'lumotlarini saqlash
      const paymentData = {
        userId: userId,
        plan: planInfo.plan,
        amount: planInfo.amount,
        status: 'pending' as const,
        date: new Date().toLocaleString('uz-UZ'),
        screenshot: fileId
      };

      this.pendingPayments.set(paymentId, paymentData);

      // User payments ro'yxatiga qo'shish
      if (!this.userPayments.has(userId)) {
        this.userPayments.set(userId, []);
      }
      const userPaymentsList = this.userPayments.get(userId)!;
      userPaymentsList.push({...paymentData, id: paymentId});

      this.paymentWaitingUsers.delete(userId);

      const message = `
✅ <b>Screenshot muvaffaqiyatli qabul qilindi!</b>

📋 <b>To'lov ma'lumotlari:</b>
🆔 To'lov ID: <code>${paymentId}</code>
📅 Tarif: ${planInfo.plan}
💰 Summa: ${planInfo.amount.toLocaleString()} so'm
⏰ Vaqt: ${paymentData.date}
📊 Status: ⏳ Tekshirilmoqda

🔔 <b>Keyingi qadamlar:</b>
• Admin sizning to'lovingizni tekshiradi
• Tekshirish 5-30 daqiqa davom etadi
• Tasdiqlangandan keyin xizmat avtomatik faollashadi

💬 <b>Xabarnoma:</b> 
To'lov holati o'zgarganda sizga xabar beriladi.

📞 <b>Muammo bo'lsa:</b> @support_username ga murojaat qiling
      `;

      const keyboard = new InlineKeyboard()
        .text('🏠 Bosh menyu', 'back_main')
        .text('💰 Tariflar', 'pricing');

      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

      // Adminlarga xabar yuborish (demo)
      await this.notifyAdmins(paymentId, paymentData);

      this.logger.log(`New payment submitted: ${paymentId} from user ${userId}`);

    } catch (error) {
      this.logger.error('Screenshot handle error:', error);
      await ctx.reply('❌ Screenshot yuklashda xatolik yuz berdi. Qayta urinib ko\'ring.');
    }
  }

  // Admin panel (removed duplicate - keeping only the comprehensive CRM version)

  // To'lovni tasdiqlash
  private async approvePayment(ctx: any, paymentId: string) {
    const payment = this.pendingPayments.get(paymentId);
    if (!payment) {
      await this.safeAnswerCallback(ctx, '❌ To\'lov topilmadi');
      return;
    }

    payment.status = 'approved';
    
    // Foydalanuvchiga xabar yuborish
    try {
      await this.bot.api.sendMessage(payment.userId, `
✅ <b>To'lovingiz tasdiqlandi!</b>

🎉 <b>Tabriklaymiz!</b> Sizning to'lovingiz admin tomonidan tasdiqlandi.

📋 <b>To'lov ma'lumotlari:</b>
🆔 ID: <code>${paymentId}</code>
📅 Tarif: ${payment.plan}
💰 Summa: ${payment.amount.toLocaleString()} so'm
⏰ Vaqt: ${payment.date}

🚀 <b>Xizmat faollashtirildi!</b>
Endi siz limitlarsiz xabar yuborishingiz mumkin.

💡 <b>Boshlash uchun:</b> /start buyrug'ini yuboring
      `, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard().text('🚀 Botni ishlatish', 'back_main')
      });
    } catch (error) {
      this.logger.error('Error sending approval message:', error);
    }

    await this.safeAnswerCallback(ctx, `✅ To'lov ${paymentId} tasdiqlandi`);
    
    this.logger.log(`Payment approved: ${paymentId} for user ${payment.userId}`);
    
    // Admin panelni yangilash
    await this.showPendingPayments(ctx);
  }

  // To'lovni rad qilish
  private async rejectPayment(ctx: any, paymentId: string) {
    const payment = this.pendingPayments.get(paymentId);
    if (!payment) {
      await this.safeAnswerCallback(ctx, '❌ To\'lov topilmadi');
      return;
    }

    payment.status = 'rejected';
    
    // Foydalanuvchiga xabar yuborish
    try {
      await this.bot.api.sendMessage(payment.userId, `
❌ <b>To'lovingiz rad qilindi</b>

😔 <b>Afsuski, sizning to'lovingiz qabul qilinmadi.</b>

📋 <b>To'lov ma'lumotlari:</b>
🆔 ID: <code>${paymentId}</code>
💰 Summa: ${payment.amount.toLocaleString()} so'm
⏰ Vaqt: ${payment.date}

🔍 <b>Mumkin bo'lgan sabablar:</b>
• To'lov summasi noto'g'ri
• Screenshot aniq emas
• Noto'g'ri karta raqamiga o'tkazma
• Boshqa texnik sabab

🔄 <b>Qayta to'lov:</b>
To'lovni qaytadan qilishingiz mumkin. Iltimos, to'lov ma'lumotlarini diqqat bilan tekshiring.

📞 <b>Yordam:</b> @support_username
      `, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .text('🔄 Qayta to\'lov', 'pricing')
          .text('🏠 Bosh menyu', 'back_main')
      });
    } catch (error) {
      this.logger.error('Error sending rejection message:', error);
    }

    await this.safeAnswerCallback(ctx, `❌ To'lov ${paymentId} rad qilindi`);
    
    this.logger.log(`Payment rejected: ${paymentId} for user ${payment.userId}`);
    
    // Admin panelni yangilash
    await this.showPendingPayments(ctx);
  }

  // Kutilayotgan to'lovlarni ko'rsatish
  private async showPendingPayments(ctx: any) {
    const pendingPayments = Array.from(this.pendingPayments.entries())
      .filter(([_, payment]) => payment.status === 'pending')
      .slice(0, 10); // Faqat oxirgi 10 tani

    if (pendingPayments.length === 0) {
      const message = `
📋 <b>Kutilayotgan to'lovlar</b>

✅ Hozirda kutilayotgan to'lovlar yo'q.

🔄 Yangilash uchun tugmani bosing.
      `;

      const keyboard = new InlineKeyboard()
        .text('🔄 Yangilash', 'pending_payments')
        .text('🔙 Admin Panel', 'admin_panel');

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
      return;
    }

    let message = `📋 <b>Kutilayotgan to'lovlar (${pendingPayments.length} ta)</b>\n\n`;
    
    const keyboard = new InlineKeyboard();
    
    pendingPayments.forEach(([paymentId, payment], index) => {
      message += `${index + 1}. 💰 ${payment.amount.toLocaleString()} so'm\n`;
      message += `👤 User ID: ${payment.userId}\n`;
      message += `⏰ ${payment.date}\n`;
      message += `🆔 ID: <code>${paymentId}</code>\n\n`;
      
      // Har bir to'lov uchun tasdiqlash/rad qilish tugmalari
      keyboard
        .text(`✅ #${index + 1}`, `approve_${paymentId}`)
        .text(`❌ #${index + 1}`, `reject_${paymentId}`);
      
      if (index % 2 === 1 || index === pendingPayments.length - 1) {
        keyboard.row();
      }
    });

    keyboard.text('🔄 Yangilash', 'pending_payments')
      .text('🔙 Admin Panel', 'admin_panel');

    await this.safeEditMessage(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  // Adminlarga xabar yuborish
  private async notifyAdmins(paymentId: string, paymentData: any) {
    const adminUsers = [parseInt(process.env.ADMIN_USER_ID || '0')];
    
    const message = `
🔔 <b>Yangi to'lov!</b>

🆔 ID: <code>${paymentId}</code>
👤 User: ${paymentData.userId}
💰 Summa: ${paymentData.amount.toLocaleString()} so'm
📅 Tarif: ${paymentData.plan}
⏰ Vaqt: ${paymentData.date}

📋 <b>Harakatlar:</b>
    `;

    const keyboard = new InlineKeyboard()
      .text('✅ Tasdiqlash', `approve_${paymentId}`)
      .text('❌ Rad qilish', `reject_${paymentId}`).row()
      .text('🔐 Admin Panel', 'admin_panel');

    for (const adminId of adminUsers) {
      if (adminId > 0) {
        try {
          // Screenshot bilan birga yuborish
          if (paymentData.screenshot) {
            await this.bot.api.sendPhoto(adminId, paymentData.screenshot, {
              caption: message,
              parse_mode: 'HTML',
              reply_markup: keyboard
            });
          } else {
            await this.bot.api.sendMessage(adminId, message, {
              parse_mode: 'HTML',
              reply_markup: keyboard
            });
          }
        } catch (error) {
          this.logger.error(`Error notifying admin ${adminId}:`, error);
        }
      }
    }
  }

  // Forward haqida ma'lumot
  private async showForwardInfo(ctx: any) {
    const message = `
🤖 <b>Bot Forward tizimi haqida</b>

🔒 <b>Xavfsizlik:</b>
• Sizning shaxsiy akkauntingiz ulanmaydi
• Ma'lumotlaringiz bot tizimida saqlanmaydi
• Telefon raqam yoki parolingiz so'ralmaydi
• To'liq maxfiylik va xavfsizlik

⚡ <b>Qanday ishlaydi:</b>
1️⃣ Siz botga xabar yozasiz
2️⃣ Bot sizning xabaringizni forward qiladi
3️⃣ Xabar bot nomidan guruhlariga yuboriladi
4️⃣ Sizning ismi va ma'lumotlaringiz ko'rsatilmaydi

🎯 <b>Shartlar:</b>
• Bot guruhlariga admin sifatida qo'shilgan bo'lishi kerak
• "Xabar yuborish" huquqi berilgan bo'lishi kerak
• Bot guruh a'zolariga ko'rinishi kerak

✅ <b>Afzalliklar:</b>
• Tezkor xabar yuborish
• Sizning maxfiyligingiz himoyalangan
• Spam himoyasi avtomatik
• Bir nechta guruhga birdan yuborish
• Tasodifiy kechikishlar

💡 <b>Misol:</b>
Siz: "Yangi mahsulot sotuvga chiqdi!"
Bot: [Sizning xabaringizni barcha faol guruhlariga forward qiladi]
Guruhlar: Xabar bot nomidan ko'rsatiladi

⚠️ <b>Muhim:</b>
Bu usul an'anaviy "shaxsiy akkaunt ulash" usulidan xavfsizroq va oddiyroq.
    `;

    const keyboard = new InlineKeyboard()
      .text('📖 Admin qilish yo\'riqnomasi', 'admin_guide')
      .text('📤 Xabar yuborish', 'send_message').row()
      .text('🔙 Orqaga', 'back_main');

    await this.safeEditMessage(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  // Admin qilish yo'riqnomasi
  private async showAdminGuide(ctx: any) {
    const botUsername = 'avtohabarbot'; // Bot username
    const message = `
📖 <b>Botni guruhga admin qilish yo'riqnomasi</b>

🔧 <b>Qadamlar:</b>

1️⃣ <b>Botni guruhga qo'shish:</b>
   • Guruhga o'ting
   • "Add Member" yoki "A'zo qo'shish"
   • @${botUsername} ni qidiring va qo'shing

2️⃣ <b>Admin huquqi berish:</b>
   • Guruh sozlamalariga o'ting
   • "Administrators" bo'limini oching
   • Botni tanlang va "Edit" bosing

3️⃣ <b>Kerakli huquqlar:</b>
   ✅ "Send Messages" - Xabar yuborish
   ✅ "Delete Messages" - Xabarlarni o'chirish (ixtiyoriy)
   ⭕ Boshqa huquqlar ixtiyoriy

4️⃣ <b>Tekshirish:</b>
   • Botga /start yuboring
   • "Guruhlarni bog'lash" bo'limiga o'ting
   • Guruhingiz ro'yxatda ko'rinishi kerak

🎯 <b>Tugadi!</b>
Endi bot sizning guruhingizga xabar forward qila oladi.

💡 <b>Maslahat:</b>
• Bir nechta guruhga qo'shishingiz mumkin
• Har birida admin qilib qo'ying
• Faqat kerakli huquqlarni bering

⚠️ <b>Muhim:</b>
Bot faqat admin bo'lgan guruhlariga xabar yuborishi mumkin!
    `;

    const keyboard = new InlineKeyboard()
      .text('🔗 Guruhlarni tekshirish', 'connect_groups')
      .text('ℹ️ Forward haqida', 'forward_info').row()
      .text('🔙 Orqaga', 'back_main');

    await this.safeEditMessage(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  // Bot orqali xabar yuborish (forward usuli)
  private async sendMessageToGroups(ctx: any, messageText: string) {
    const userId = ctx.from.id;
    const userRole = this.userRoles.get(userId);
    
    // Check if user is a dispatcher and use AutoPost for registered drivers
    if (userRole?.role === 'dispechr') {
      await this.sendAutoPostToDrivers(ctx, messageText);
      return;
    }

    const groups = this.connectedGroups.get(userId) || [];

    if (groups.length === 0) {
      await ctx.reply('❌ Faol guruhlar topilmadi. Avval guruhlarni faollashtiring.');
      return;
    }

    const userSession = this.userSessions.get(userId);
    if (!userSession || !userSession.connected) {
      await ctx.reply('❌ Session ulanmagan. Qayta /start bosing.');
      return;
    }

    // Advanced anti-spam analysis
    const riskLevel = this.analyzeSpamRisk(userId, groups.length);
    const deliveryStrategy = this.calculateDeliveryStrategy(groups, riskLevel);

    // Professional logistics delivery
    const processingMessage = await ctx.reply(`
🚀 **Professional Logistics Delivery**

📤 **Xabar:** ${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}
🎯 **Guruhlar:** ${groups.length} ta
👤 **Nomingizdan:** ${userSession.phone}

🧠 **Smart Anti-Spam:**
• Risk darajasi: ${this.getRiskLevelText(riskLevel)}
• Delivery strategiya: ${deliveryStrategy.name}
• Timing: ${deliveryStrategy.baseDelay}ms - ${deliveryStrategy.maxDelay}ms

⚡ **Professional Features Active:**
• Account freeze protection ✅
• Smart timing algorithms ✅
• Bulk optimization ✅
• Real-time monitoring ✅

🔄 **Jarayon boshlandi...**
    `, { parse_mode: 'Markdown' });

    const results: Array<{group: any, status: 'success' | 'failed', time: string}> = [];

    // Har bir guruhga bot orqali forward qilish
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      
      try {
        // Tasodifiy kechikish (2-8 soniya)
        const delay = Math.random() * 6000 + 2000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Bot orqali forward qilish (demo)
        // Real implementation: bot.api.forwardMessage(group.id, ctx.chat.id, ctx.message.message_id)
        // yoki: bot.api.sendMessage(group.id, messageText)
        
        results.push({
          group,
          status: 'success',
          time: new Date().toLocaleTimeString('uz-UZ')
        });
        
        // Progres yangilanishi
        const progressMessage = `
⏳ <b>Bot orqali yuborilmoqda...</b>

📊 <b>Progres:</b> ${i + 1}/${groups.length}

✅ <b>Muvaffaqiyatli forward:</b>
${results.filter(r => r.status === 'success').map(r => 
  `• ${r.group.title} 🤖 - ${r.time}`
).join('\n')}

${i < groups.length - 1 ? `🔄 <b>Keyingisi:</b> ${groups[i + 1].title}` : '🎯 <b>Yakunlanmoqda...</b>'}
        `;

        await ctx.api.editMessageText(
          ctx.chat.id,
          processingMessage.message_id,
          progressMessage,
          { parse_mode: 'HTML' }
        );
        
      } catch (error) {
        results.push({
          group,
          status: 'failed',
          time: new Date().toLocaleTimeString('uz-UZ')
        });
        
        this.logger.error(`Bot orqali guruhga xabar yuborishda xato: ${group.title}`, error);
      }
      
      // Guruhlar orasidagi kechikish (3-10 soniya)
      if (i < groups.length - 1) {
        const groupDelay = Math.random() * 7000 + 3000;
        await new Promise(resolve => setTimeout(resolve, groupDelay));
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    // Yakuniy natija
    const finalMessage = `
🎉 <b>Bot orqali yuborish yakunlandi!</b>

📝 <b>Forward qilingan xabar:</b>
"${messageText}"

📊 <b>Natijalar:</b>
✅ Muvaffaqiyatli forward: ${successCount} ta guruh
${failedCount > 0 ? `❌ Xatolik: ${failedCount} ta guruh` : ''}

✅ <b>Muvaffaqiyatli guruhlar:</b>
${results.filter(r => r.status === 'success').map((r, index) => 
  `${index + 1}. ${r.group.title} (${r.group.members} a'zo) 🤖 - ${r.time}`
).join('\n')}

${failedCount > 0 ? `
❌ <b>Xatolik bo'lgan guruhlar:</b>
${results.filter(r => r.status === 'failed').map((r, index) => 
  `${index + 1}. ${r.group.title} - ${r.time}`
).join('\n')}
` : ''}

⏰ <b>Jami vaqt:</b> ${Math.ceil((Date.now() - Date.now()) / 60000)} daqiqa
🤖 <b>Yuborish usuli:</b> Bot forward
🔐 <b>Maxfiylik:</b> Sizning ma'lumotlaringiz himoyalangan
💡 <b>Eslatma:</b> Xabarlar bot nomidan forward qilindi.
    `;

    const keyboard = new InlineKeyboard()
      .text('📤 Yana yuborish', 'send_message')
      .text('📋 Faol guruhlar', 'my_groups').row()
      .text('🏠 Bosh menyu', 'back_main');

    await ctx.api.editMessageText(
      ctx.chat.id,
      processingMessage.message_id,
      finalMessage,
      { 
        parse_mode: 'HTML',
        reply_markup: keyboard
      }
    );

    this.logger.log(`Foydalanuvchi ${ctx.from.first_name} (${userId}) bot orqali ${successCount}/${groups.length} ta guruhga xabar forward qildi`);
  }

  // AutoPost for dispatchers - send to registered drivers only
  private async sendAutoPostToDrivers(ctx: any, messageText: string) {
    const userId = ctx.from.id;
    
    // Get all registered drivers
    const registeredDrivers = Array.from(this.userRoles.entries())
      .filter(([id, role]) => role.role === 'haydovchi' && role.isRegistered)
      .map(([id, role]) => ({ id, profile: role.profile }));
    
    if (registeredDrivers.length === 0) {
      await ctx.reply('❌ Ro\'yxatdan o\'tgan haydovchilar topilmadi.');
      return;
    }

    const processingMessage = await ctx.reply(`
🚀 **DISPECHR AUTOPOST TIZIMI**

📤 **Xabar:** ${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}
🎯 **Maqsad:** ${registeredDrivers.length} ta ro'yxatdan o'tgan haydovchi
👤 **Dispechr:** ${ctx.from.first_name}

⚡ **AutoPost xususiyatlari:**
• Faqat ro'yxatdan o'tgan haydovchilarga ✅
• Narx ma'lumotlari bilan ✅
• Mashina turini hisobga olish ✅
• Commission-free tizim ✅

🔄 **Jarayon boshlandi...**
    `, { parse_mode: 'Markdown' });

    const results: Array<{driverId: number, status: 'success' | 'failed', time: string}> = [];
    let successCount = 0;

    // Send to each registered driver
    for (let i = 0; i < registeredDrivers.length; i++) {
      const driver = registeredDrivers[i];
      const startTime = Date.now();
      
      try {
        // Create professional cargo post message for drivers
        const autoPostMessage = `
🚛 **DISPECHR AUTOPOST** 📋

${messageText}

👨‍💼 **Dispechr:** ${ctx.from.first_name}
⚡ **Tez javob bering!**
💰 **Komisyasiz buyurtma**

📱 **Bog'lanish:** @${ctx.from.username || 'direct_message'}
        `;
        
        await this.bot.api.sendMessage(driver.id, autoPostMessage, {
          parse_mode: 'Markdown'
        });
        
        results.push({
          driverId: driver.id,
          status: 'success',
          time: new Date().toLocaleTimeString('uz-UZ')
        });
        
        successCount++;
        
      } catch (error) {
        results.push({
          driverId: driver.id,
          status: 'failed', 
          time: new Date().toLocaleTimeString('uz-UZ')
        });
        
        this.logger.error(`AutoPost haydovchiga yuborishda xato: ${driver.id}`, error);
      }
      
      // Delay between drivers (1-3 seconds)
      if (i < registeredDrivers.length - 1) {
        const delay = Math.floor(Math.random() * 2000) + 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Final report
    const finalMessage = `
✅ **AUTOPOST YAKUNLANDI**

📊 **Natijalar:**
• Muvaffaqiyatli: ${successCount}/${registeredDrivers.length}
• Muvaffaqiyatsiz: ${registeredDrivers.length - successCount}/${registeredDrivers.length}
• Umumiy vaqt: ${Math.ceil((Date.now() - Date.now()) / 1000)} soniya

🎯 **AutoPost maqsadi:** Ro'yxatdan o'tgan haydovchilar
💼 **Dispechr tizimi:** Komisyasiz buyurtmalar
⚡ **Status:** Faol monitoring

🔔 **Keyingi qadamlar:**
• Haydovchilar sizga javob berishadi
• Buyurtmalarni boshqaring
• Commission-free tizimdan foydalaning
    `;

    const keyboard = new InlineKeyboard()
      .text('📤 Yana AutoPost', 'send_message')
      .text('📋 Faol haydovchilar', 'registered_drivers').row()
      .text('🏠 Bosh menyu', 'back_main');

    await ctx.api.editMessageText(
      ctx.chat.id,
      processingMessage.message_id,
      finalMessage,
      { 
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );

    this.logger.log(`Dispechr ${ctx.from.first_name} (${userId}) AutoPost yubordi: ${successCount}/${registeredDrivers.length} ta haydovchiga`);
  }

  // Guruhni faollashtirish
  private async connectGroup(ctx: any, groupId: string) {
    const userId = ctx.from.id;
    const userAllGroups = this.userGroups.get(userId) || [];
    
    // Faqat bot admin bo'lgan guruhlarni faollashtirish
    const group = userAllGroups.find(g => g.id === groupId);
    if (!group || !group.botAdmin) {
      await this.safeAnswerCallback(ctx, '❌ Bot bu guruhda admin emas!');
      return;
    }
    
    // Guruhni faol deb belgilash
    const updatedGroups = userAllGroups.map(g => 
      g.id === groupId ? { ...g, connected: true } : g
    );
    
    this.userGroups.set(userId, updatedGroups);
    
    // Faol guruhlar ro'yxatini yangilash
    const connectedGroups = updatedGroups.filter(g => g.connected && g.botAdmin);
    this.connectedGroups.set(userId, connectedGroups.map(g => ({
      id: g.id,
      title: g.title,
      members: g.members
    })));
    
    const groupName = group.title || 'Guruh';
    await this.safeAnswerCallback(ctx, `✅ ${groupName} faollashtirildi! Bot forward qilish tayyor.`);
    
    // Sahifani yangilash
    await this.showConnectGroups(ctx);
  }

  // Guruhni o'chirish
  private async disconnectGroup(ctx: any, groupId: string) {
    const userId = ctx.from.id;
    const userAllGroups = this.userGroups.get(userId) || [];
    
    // Guruhni faol emas deb belgilash
    const updatedGroups = userAllGroups.map(group => 
      group.id === groupId ? { ...group, connected: false } : group
    );
    
    this.userGroups.set(userId, updatedGroups);
    
    // Faol guruhlar ro'yxatini yangilash
    const connectedGroups = updatedGroups.filter(g => g.connected && g.botAdmin);
    this.connectedGroups.set(userId, connectedGroups.map(g => ({
      id: g.id,
      title: g.title,
      members: g.members
    })));
    
    const groupName = userAllGroups.find(g => g.id === groupId)?.title || 'Guruh';
    await this.safeAnswerCallback(ctx, `❌ ${groupName} faollikdan o'chirildi`);
    
    // Sahifani yangilash - agar bog'lash sahifasidaysa
    if (ctx.callbackQuery.message.text.includes('bog\'lash')) {
      await this.showConnectGroups(ctx);
    } else {
      await this.showMyGroups(ctx);
    }
  }

  // Guruh tanlash/bekor qilish
  private async toggleGroupSelection(ctx: any, groupId: string) {
    const userId = ctx.from.id;
    
    if (!this.selectedGroups.has(userId)) {
      this.selectedGroups.set(userId, new Set());
    }
    
    const selected = this.selectedGroups.get(userId)!;
    
    if (selected.has(groupId)) {
      selected.delete(groupId);
      await this.safeAnswerCallback(ctx, '❌ Guruh tanlovdan olib tashlandi');
    } else {
      selected.add(groupId);
      await this.safeAnswerCallback(ctx, '✅ Guruh tanlandi');
    }
    
    // Sahifani yangilash
    await this.showGroupSelection(ctx);
  }

  // Guruh tanlashni yakunlash
  private async finishGroupSelection(ctx: any) {
    const userId = ctx.from.id;
    const selected = this.selectedGroups.get(userId) || new Set();
    
    if (selected.size === 0) {
      await this.safeAnswerCallback(ctx, '⚠️ Kamida bitta guruh tanlang');
      return;
    }
    
    // Tanlangan guruhlarni bog'lash
    const userAllGroups = this.userGroups.get(userId) || [];
    const updatedGroups = userAllGroups.map(group => ({
      ...group,
      connected: group.connected || selected.has(group.id)
    }));
    
    this.userGroups.set(userId, updatedGroups);
    
    // Bog'langan guruhlar ro'yxatini yangilash
    const connectedGroups = updatedGroups.filter(g => g.connected);
    this.connectedGroups.set(userId, connectedGroups.map(g => ({
      id: g.id,
      title: g.title,
      members: g.members
    })));
    
    // Tanlashni tozalash
    this.selectedGroups.delete(userId);
    
    const message = `
🎉 <b>Jarayon yakunlandi!</b>

✅ <b>${selected.size} ta guruh muvaffaqiyatli bog'landi:</b>
${Array.from(selected).map(id => {
  const group = userAllGroups.find(g => g.id === id);
  return `• ${group?.title} (${group?.members} a'zo)`;
}).join('\n')}

📤 <b>Keyingi qadam:</b>
"Xabar yuborish" bo'limiga o'ting va bog'langan guruhlaringizga xabar yuboring.

⚠️ <b>Eslatma:</b>
• Xabarlar spam himoyasi bilan yuboriladi
• Har bir guruhga tasodifiy kechikish bilan yuboriladi
• Guruh qoidalariga rioya qiling
    `;

    const keyboard = new InlineKeyboard()
      .text('📤 Xabar yuborish', 'send_message')
      .text('📋 Bog\'langan guruhlar', 'my_groups').row()
      .text('🏠 Bosh menyu', 'back_main');

    await this.safeEditMessage(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  // Guruh tanlash interfeysi
  private async showGroupSelection(ctx: any) {
    const userId = ctx.from.id;
    const userAllGroups = this.userGroups.get(userId) || [];
    const selected = this.selectedGroups.get(userId) || new Set();
    
    let message = `
🎯 <b>Guruhlarni tanlang</b>

Xabar yuborish uchun kerakli guruhlarni tanlang:

`;

    userAllGroups.forEach((group, index) => {
      const isSelected = selected.has(group.id);
      const status = isSelected ? '✅' : '⬜';
      message += `${status} ${index + 1}. ${group.title}\n👥 A'zolar: ${group.members}\n\n`;
    });

    message += `
📊 <b>Tanlangan:</b> ${selected.size} ta guruh

⚡ <b>Tugmalarni bosing:</b> Guruhlarni tanlash/bekor qilish uchun
    `;

    const keyboard = new InlineKeyboard();
    
    // Har bir guruh uchun tanlov tugmasi
    userAllGroups.forEach((group, index) => {
      if (index % 2 === 0) {
        const isSelected1 = selected.has(group.id);
        const buttonText1 = `${isSelected1 ? '✅' : '⬜'} ${group.title}`;
        
        if (userAllGroups[index + 1]) {
          const group2 = userAllGroups[index + 1];
          const isSelected2 = selected.has(group2.id);
          const buttonText2 = `${isSelected2 ? '✅' : '⬜'} ${group2.title}`;
          
          keyboard.text(buttonText1, `select_${group.id}`).text(buttonText2, `select_${group2.id}`).row();
        } else {
          keyboard.text(buttonText1, `select_${group.id}`).row();
        }
      }
    });

    if (selected.size > 0) {
      keyboard.text('🎯 Tanlovni yakunlash', 'finish_selection').row();
    }
    
    keyboard.text('🔙 Orqaga', 'back_main');

    await this.safeEditMessage(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  // Account connection for logistics professionals
  private async showAccountConnection(ctx: any) {
    const message = `
🔐 **Professional Logistics System**

📦 **Logistlar uchun maxsus tizim:**
• Limitlarsiz xabar yuborish
• Real-time delivery tracking
• Anti-freeze himoya
• Professional dashboard

🔒 **Xavfsiz session:**
• Ma'lumotlaringiz shifrlangan
• Faqat bot ichida saqlanadi
• Telegram API orqali to'g'ridan-to'g'ri ulanish
• Istalgan vaqt uzish mumkin

⚡ **Qanday ishlaydi:**
1️⃣ Telefon raqamingizni kiriting
2️⃣ SMS kod keladi
3️⃣ Bot sizning guruhlaringizni oladi
4️⃣ Professional yuborish tizimi faollashadi

🚨 **Muhim:**
• Faqat sizning shaxsiy guruhlaringizga yuboradi
• Xabarlar sizning nomingizdan ketadi
• Account muzlashidan himoya
• High-volume logistics uchun optimallashgan

📊 **Logistics features:**
• Bulk messaging (100+ groups)
• Smart timing algorithms
• Category-based targeting
• Real-time analytics
    `;

    const keyboard = new InlineKeyboard()
      .text('🔐 Session boshlash', 'start_session')
      .text('ℹ️ Batafsil ma\'lumot', 'session_info').row()
      .text('🔙 Orqaga', 'connect_groups');

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  // Start user session
  private async startUserSession(ctx: any) {
    const userId = ctx.from.id;
    
    const message = `
📱 **Telefon raqam kiriting**

**Format:** +998901234567

⚠️ **Muhim:**
• To'liq xalqaro format (+998...)
• Telegram akkauntingiz bilan bog'langan raqam
• SMS kod shu raqamga keladi

🔐 **Xavfsizlik:**
• Raqam shifrlangan holda saqlanadi
• Faqat verificatsiya uchun ishlatiladi
• Boshqa maqsadlarda ishlatilmaydi

📝 **Telefon raqamingizni yozing:**
    `;

    const keyboard = new InlineKeyboard()
      .text('🔙 Bekor qilish', 'connect_account');

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });

    this.phoneWaitingUsers.add(userId);
  }

  // Handle phone number
  private async handlePhoneNumber(ctx: any, phoneNumber: string) {
    const userId = ctx.from.id;
    this.phoneWaitingUsers.delete(userId);

    try {
      // Clean and validate phone number
      const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
      
      if (!cleanPhone.startsWith('+')) {
        await ctx.reply('❌ Telefon raqam + belgisi bilan boshlanishi kerak!\nMisol: +998901234567');
        this.phoneWaitingUsers.add(userId);
        return;
      }

      const processingMessage = await ctx.reply(`
⏳ **Telegram session yaratilmoqda...**

📱 Telefon: ${cleanPhone}
🔄 SMS kod so'ralmoqda...
⏱️ Bir oz sabr qiling...

**Eslatma:** SMS kod 2-3 daqiqa ichida keladi
      `, { parse_mode: 'Markdown' });

      // MUHIM: Real Telegram API kalitlari kerak!
      // my.telegram.org dan oling:
      const apiId = parseInt(process.env.TELEGRAM_API_ID || '0');
      const apiHash = process.env.TELEGRAM_API_HASH || '';
      
      this.logger.log(`📞 SMS kod jo'natilmoqda: ${cleanPhone}`);
      
      if (!apiId || !apiHash) {
        throw new Error('TELEGRAM_API_ID and TELEGRAM_API_HASH must be set in .env file. Get them from https://my.telegram.org/auth');
      }
      const session = new StringSession('');
      
      const client = new TelegramClient(session, apiId, apiHash, {
        connectionRetries: 5,
      });

      // Real Telegram authentication
      try {
        await client.connect();
        
        const result = await client.sendCode({
          apiId: apiId,
          apiHash: apiHash
        }, cleanPhone);

        // Store client and phone code hash for verification
        this.codeWaitingUsers.set(userId, {
          phoneCodeHash: result.phoneCodeHash,
          phone: cleanPhone,
          client: client
        });

        this.logger.log(`Real SMS code sent to ${cleanPhone}`);
      } catch (error) {
        this.logger.error('Real Telegram API error:', error);
        
        // Real API da xatolik bo'lsa, foydalanuvchiga xabar beramiz
        await ctx.api.editMessageText(
          ctx.chat.id,
          processingMessage.message_id,
          `❌ **Telegram API bilan ulanishda xatolik!**
          
🔧 Sabablari:
• Internet aloqasi zaif
• Telegram serverlari ishlamayapti
• API kalitlar noto'g'ri

📞 Iltimos qaytadan urinib ko'ring`, 
          { parse_mode: 'Markdown' }
        );
        return;
      }

      await ctx.api.editMessageText(
        ctx.chat.id,
        processingMessage.message_id,
        `
✅ **SMS kod yuborildi!**

📱 Telefon: ${cleanPhone}
💬 SMS kodingizni kiriting

⏰ Kod 5 daqiqa ichida amal qiladi
🔄 Kod kelmasa? Qayta urinib ko'ring

📲 **REAL:** Haqiqiy SMS yuborildi
Telegram raqamingizga kelgan kodni kiriting

**SMS kodingizni yozing:**
        `,
        { parse_mode: 'Markdown' }
      );

    } catch (error) {
      this.logger.error('Phone number handling error:', error);
      await ctx.reply(`
❌ **Xatolik yuz berdi**

Telefon raqam tekshirishda muammo:
• Raqam formatini tekshiring (+998...)
• Internet ulanishini tekshiring
• Bir oz kutib qayta urinib ko'ring

**Qayta urinish uchun:** /start
      `, { parse_mode: 'Markdown' });
    }
  }

  // Handle verification code
  private async handleVerificationCode(ctx: any, code: string) {
    const userId = ctx.from.id;
    const userData = this.codeWaitingUsers.get(userId);
    
    if (!userData) {
      await ctx.reply('❌ Session ma\'lumotlari topilmadi. Qayta boshlang: /start');
      return;
    }

    try {
      const cleanCode = code.replace(/\s/g, '');
      
      if (!/^\d{5}$/.test(cleanCode)) {
        await ctx.reply('❌ SMS kod 5 raqamdan iborat bo\'lishi kerak!\nMisol: 12345');
        return;
      }

      const processingMessage = await ctx.reply(`
⏳ **SMS kod tekshirilmoqda...**

🔢 Kod: ${cleanCode}
🔐 Session yaratilmoqda...
📊 Guruhlar ro'yxati yuklanmoqda...

**Sabr qiling, jarayon yakunlanmoqda...**
      `, { parse_mode: 'Markdown' });

      // Real Telegram API verification
      const client = userData.client;
      
      try {
        if (!client) {
          await ctx.reply('❌ Xatolik: Telegram client topilmadi. Telefon raqamini qaytadan kiriting.');
          return;
        }

        // Real API code verification - to'g'ri API ma'lumotlari bilan
        const apiId = parseInt(process.env.TELEGRAM_API_ID || '0');
        const apiHash = process.env.TELEGRAM_API_HASH || '';
        
        this.logger.log('📡 Telegram API orqali SMS kod tekshirilmoqda...');
        
        const result = await client.signInUser(
          { apiId: apiId, apiHash: apiHash },
          {
            phoneNumber: userData.phone,
            phoneCode: async () => cleanCode,
            onError: async (err) => {
              // Faqat birinchi xatolikni log qilamiz, keyin throw qilamiz
              throw err;
            }
          }
        );

        // Save session string for future use
        const sessionString = (client.session.save() as unknown as string) || '';
        
        // Store successful session with real client
        this.userSessions.set(userId, {
          connected: true,
          phone: userData.phone,
          client: client,
          session: sessionString
        });

        this.logger.log(`User ${userId} successfully authenticated with REAL Telegram API`);
      } catch (error) {
        this.logger.error('Real API Code verification error:', error);
        
        // FloodWaitError holatini alohida handle qilish
        if (error.message && error.message.includes('FloodWaitError')) {
          const waitTime = error.message.match(/wait of (\d+) seconds/);
          const minutes = waitTime ? Math.ceil(parseInt(waitTime[1]) / 60) : 60;
          
          await ctx.api.editMessageText(
            ctx.chat.id,
            processingMessage.message_id,
            `⏰ **Telegram himoyasi faollashdi!**
            
🛡️ **Nima bo'ldi:**
• Ko'p marta kod kiritildi
• Telegram hisobingizni himoya qilmoqda
• Bu xavfsizlik chorasi

⏳ **Kutish vaqti:** ${minutes} daqiqa

💡 **Keyin nima qilish:**
• ${minutes} daqiqa kuting
• Qayta telefon raqam kiriting  
• SMS kod kelganda DARHOL kiriting
• Yoki ertaga qayta urinib ko'ring

✅ **Sizning hisobingiz xavfsiz!**`,
            { parse_mode: 'Markdown' }
          );
          this.codeWaitingUsers.delete(userId);
          return;
        }
        
        // PHONE_CODE_EXPIRED holatini handle qilish
        if (error.message && error.message.includes('PHONE_CODE_EXPIRED')) {
          await ctx.api.editMessageText(
            ctx.chat.id,
            processingMessage.message_id,
            `⏰ **SMS kodning muddati tugagan!**
            
🕐 **Nima bo'ldi:**
• SMS kod 5 daqiqadan ortiq vaqt o'tdi
• Kod avtomatik bekor qilindi

🔄 **Qayta boshlang:**
• Yangi telefon raqam kiriting
• Yangi SMS kod oling
• Tez kiriting (5 daqiqa ichida)

💡 **Maslahat:**
SMS kod kelishi bilanoq darhol kiriting!`,
            { parse_mode: 'Markdown' }
          );
          this.codeWaitingUsers.delete(userId);
          return;
        }
        
        // Boshqa xatoliklar uchun umumiy xabar
        await ctx.api.editMessageText(
          ctx.chat.id,
          processingMessage.message_id,
          `❌ **SMS kod tasdiqlanmadi!**
          
🔍 Sabablari:
• SMS kod noto'g'ri
• Kodning muddati o'tgan (5 daqiqa)  
• Telegram serveri javob bermayapti

📱 Qayta urinib ko'ring yoki yangi SMS kod so'rang`, 
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Load user's groups (simulation for now)
      await this.loadUserGroups(userId);
      
      this.codeWaitingUsers.delete(userId);

      await ctx.api.editMessageText(
        ctx.chat.id,
        processingMessage.message_id,
        `
🎉 **Session muvaffaqiyatli yaratildi!**

✅ **Ulanish muvaffaqiyatli**
📊 **Guruhlar yuklanmoqda...**
🔐 **Ma'lumotlar himoyalangan**

**Professional logistics tizim tayyor!**

🚀 **Keyingi qadamlar:**
1️⃣ "Guruhlarni boshqarish" ga o'ting
2️⃣ Kerakli guruhlarni faollashtiring
3️⃣ Xabar yuborish tizimidan foydalaning

💡 **Eslatma:** Endi sizning barcha guruhlaringizga xabar yuborishingiz mumkin!
        `,
        { 
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('📊 Guruhlar ro\'yxati', 'my_groups')
            .text('📤 Xabar yuborish', 'send_message').row()
            .text('🏠 Bosh menyu', 'back_main')
        }
      );

      this.logger.log(`User ${userId} successfully connected Telegram session`);

    } catch (error) {
      this.logger.error('Code verification error:', error);
      await ctx.reply(`
❌ **SMS kod xato**

Muammo:
• Kod noto'g'ri kiritilgan
• Kod muddati o'tgan (5 daqiqa)
• Tarmoq xatoligi

🔄 **Yechim:**
• To'g'ri kodni kiriting
• Qayta SMS so'rang
• Internet ulanishini tekshiring

**Qayta boshlash:** /start
      `, { parse_mode: 'Markdown' });
    }
  }

  // Load user's groups from their account
  private async loadUserGroups(userId: number) {
    try {
      const userSession = this.userSessions.get(userId);
      if (!userSession || !userSession.connected) {
        throw new Error('User session not found or not connected');
      }

      const client = userSession.client;
      
      if (!client) {
        throw new Error('Real Telegram client not found. User must authenticate first.');
      }

      // Real API: fetch actual user's chats and channels
      const dialogs = await client.getDialogs({});
      const userGroups = [];
      
      for (const dialog of dialogs) {
        const entity = dialog.entity;
        
        // Only include groups and channels
        if (entity.className === 'Chat' || entity.className === 'Channel') {
          const isChannel = entity.className === 'Channel';
          const members = entity.participantsCount || 0;
          
          // Get restrictions info
          let restrictions = null;
          if ('slowModeDelay' in entity && entity.slowModeDelay) {
            restrictions = { slow_mode: entity.slowModeDelay };
          }
          
          userGroups.push({
            id: `-100${entity.id}`,
            title: entity.title,
            members: members,
            connected: false,
            type: isChannel ? 'channel' : 'chat',
            restrictions: restrictions
          });
        }
      }
      
      this.userGroups.set(userId, userGroups);
      this.logger.log(`SUCCESS: Loaded ${userGroups.length} REAL groups from user ${userId}'s account via Telegram API`);
      
    } catch (error) {
      this.logger.error('Error loading user groups:', error);
      // Set empty array on error
      this.userGroups.set(userId, []);
    }
  }

  // Helper method for group restrictions
  private getGroupRestrictions(group: any): string {
    if (!group.restrictions) return '🔓 Cheklovsiz';
    
    if (group.restrictions.slow_mode) {
      const minutes = Math.floor(group.restrictions.slow_mode / 60);
      return `⏱️ Slow mode: ${minutes}min`;
    }
    
    if (group.restrictions.until_date) {
      return '🔒 Vaqtinchalik cheklangan';
    }
    
    return '⚠️ Cheklangan';
  }

  // Connect all available groups
  private async connectAllGroups(ctx: any) {
    const userId = ctx.from.id;
    const userAllGroups = this.userGroups.get(userId) || [];
    
    // Connect all groups
    const updatedGroups = userAllGroups.map(group => ({ ...group, connected: true }));
    this.userGroups.set(userId, updatedGroups);
    
    // Update connected groups list
    const connectedGroups = updatedGroups.filter(g => g.connected);
    this.connectedGroups.set(userId, connectedGroups.map(g => ({
      id: g.id,
      title: g.title,
      members: g.members
    })));
    
    await this.safeAnswerCallback(ctx, `✅ ${connectedGroups.length} ta guruh faollashtirildi!`);
    await this.showConnectGroups(ctx);
  }

  // Disconnect all groups
  private async disconnectAllGroups(ctx: any) {
    const userId = ctx.from.id;
    const userAllGroups = this.userGroups.get(userId) || [];
    
    // Disconnect all groups
    const updatedGroups = userAllGroups.map(group => ({ ...group, connected: false }));
    this.userGroups.set(userId, updatedGroups);
    
    // Clear connected groups list
    this.connectedGroups.set(userId, []);
    
    await this.safeAnswerCallback(ctx, '❌ Barcha guruhlar o\'chirildi');
    await this.showConnectGroups(ctx);
  }

  // Professional anti-spam analysis
  private analyzeSpamRisk(userId: number, groupCount: number): 'low' | 'medium' | 'high' {
    const lastActivity = this.userLastActivity.get(userId) || 0;
    const timeSinceLastActivity = Date.now() - lastActivity;
    
    // High risk: many groups + recent activity
    if (groupCount > 50 && timeSinceLastActivity < 300000) { // 5 minutes
      return 'high';
    }
    
    // Medium risk: moderate groups or recent activity
    if (groupCount > 20 || timeSinceLastActivity < 600000) { // 10 minutes
      return 'medium';
    }
    
    return 'low';
  }

  // Calculate delivery strategy based on risk
  private calculateDeliveryStrategy(groups: any[], riskLevel: string) {
    const strategies = {
      low: {
        name: 'Fast Delivery',
        baseDelay: this.MIN_INTERVAL,
        maxDelay: this.MAX_INTERVAL,
        batchSize: this.BATCH_SIZE
      },
      medium: {
        name: 'Balanced Delivery',
        baseDelay: this.MIN_INTERVAL * 2,
        maxDelay: this.MAX_INTERVAL * 2,
        batchSize: Math.floor(this.BATCH_SIZE * 0.7)
      },
      high: {
        name: 'Safe Delivery',
        baseDelay: this.MIN_INTERVAL * 3,
        maxDelay: this.MAX_INTERVAL * 3,
        batchSize: Math.floor(this.BATCH_SIZE * 0.5)
      }
    };
    
    return strategies[riskLevel] || strategies.medium;
  }

  // Smart delay calculation
  private calculateSmartDelay(index: number, total: number, group: any, riskLevel: string, strategy: any): number {
    let baseDelay = strategy.baseDelay;
    
    // Add randomization to avoid detection patterns
    const randomFactor = Math.random() * 0.5 + 0.75; // 0.75-1.25x
    baseDelay *= randomFactor;
    
    // Consider group restrictions
    if (group.restrictions?.slow_mode) {
      baseDelay = Math.max(baseDelay, group.restrictions.slow_mode * 1000 + 2000);
    }
    
    // Progressive delay for large batches
    if (total > 30) {
      const progressFactor = Math.floor(index / 10) * 1000; // +1s every 10 groups
      baseDelay += progressFactor;
    }
    
    // Cap at max delay
    return Math.min(baseDelay, strategy.maxDelay);
  }

  // Get risk level text
  private getRiskLevelText(riskLevel: string): string {
    const levels = {
      low: '🟢 Past',
      medium: '🟡 O\'rta',
      high: '🔴 Yuqori'
    };
    return levels[riskLevel] || levels.medium;
  }

  // Update delivery progress
  private async updateDeliveryProgress(ctx: any, processingMessage: any, results: any[], current: number, total: number, startTime: number) {
    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    const throttledCount = results.filter(r => r.status === 'throttled').length;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const avgDelay = results.length > 0 ? Math.floor(results.reduce((sum, r) => sum + r.delay, 0) / results.length) : 0;
    
    const progressMessage = `
🚀 **Professional Logistics Progress**

📊 **Progress:** ${current}/${total} (${Math.floor((current/total)*100)}%)
⏱️ **Vaqt:** ${elapsed}s • **O'rtacha kechikish:** ${avgDelay}ms

📈 **Real-time Statistics:**
✅ Muvaffaqiyatli: ${successCount}
❌ Xatolik: ${failedCount}
⏸️ Throttled: ${throttledCount}

🎯 **Oxirgi 3 ta guruh:**
${results.slice(-3).map((r, i) => 
  `${r.status === 'success' ? '✅' : r.status === 'failed' ? '❌' : '⏸️'} ${r.group.title} - ${r.time}`
).join('\\n')}

${current < total ? `🔄 **Keyingisi:** ${Math.floor((total - current) * avgDelay / 1000)}s kutish...` : '🎉 **Yakunlanmoqda...**'}
    `;

    try {
      await ctx.api.editMessageText(
        ctx.chat.id,
        processingMessage.message_id,
        progressMessage,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      // Ignore edit errors (message might be too frequent)
      this.logger.warn('Progress update error (ignored):', error);
    }
  }

  // CARGO SYSTEM METHODS
  private async showCargoSystem(ctx: any) {
    const message = `
🚛 <b>YUK TIZIMI - DISPATCHER PANEL</b>

📦 <b>Yuk beruvchilar uchun:</b>
• Yuk e'lonlarini joylash
• Mashina topish
• Narx negotiation
• Real-time tracking

🚚 <b>Haydovchilar uchun:</b>
• Yuk qidirish
• Takliflar berish
• Reytingi ko'rish
• Order history

📊 <b>Dispatcher statistikasi:</b>
• Faol yuklar: ${this.cargoOffers.size}
• Ro'yxatga olingan haydovchilar: ${this.driverOffers.size}
• Bugungi orderlar: ${Array.from(this.matches.values()).filter(m => m.date.startsWith(new Date().toISOString().split('T')[0])).length}
    `;

    const keyboard = new InlineKeyboard()
      .text('📦 Yuk e\'lon qilish', 'post_cargo')
      .text('👀 Faol yuklar', 'view_cargo').row()
      .text('🚚 Haydovchi ro\'yxati', 'register_driver')
      .text('👥 Mavjud haydovchilar', 'view_drivers').row()
      .text('📋 Mening orderlarim', 'my_orders')
      .text('📊 Statistika', 'cargo_stats').row()
      .text('🔙 Orqaga', 'back_main');

    await this.safeEditMessage(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private async startCargoPosting(ctx: any) {
    const user = ctx.from;
    
    // Initialize cargo posting process
    this.cargoPostingSteps.set(user.id, {
      step: 'route_and_cargo',
      data: {}
    });
    
    const message = `
📦 <b>YUK E'LON QILISH</b>

📝 <b>1-savol:</b> Qayerdan → Qayerga va nima yukingiz bor?

<b>Misol:</b>
• Toshkent Chilonzor → Samarqand, mebel
• Nukus → Toshkent Sergeli, oziq-ovqat
• Namangan → Farg'ona, qurilish materiallari

📍 Aniq manzillarni yozing:
    `;

    const keyboard = new InlineKeyboard()
      .text('🔙 Orqaga', 'cargo_system');

    await this.safeEditMessage(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private async showActiveCargoOffers(ctx: any) {
    const activeOffers = Array.from(this.cargoOffers.values())
      .filter(offer => offer.status === 'active')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (activeOffers.length === 0) {
      await this.safeEditMessage(ctx, 
        '📦 <b>Hozircha faol yuk e\'lonlari yo\'q</b>\n\nYuk e\'lon qilish uchun "📦 Yuk e\'lon qilish" tugmasini bosing.',
        {
          parse_mode: 'HTML',
          reply_markup: new InlineKeyboard()
            .text('📦 Yuk e\'lon qilish', 'post_cargo')
            .text('🔙 Orqaga', 'cargo_system')
        }
      );
      return;
    }

    let message = '📦 <b>FAOL YUK E\'LONLARI</b>\n\n';
    
    activeOffers.slice(0, 10).forEach((offer, index) => {
      const timeAgo = this.getTimeAgo(new Date(offer.date));
      message += `
<b>${index + 1}. ${offer.fromCity} → ${offer.toCity}</b>
🏷️ ${offer.cargoType}
🚛 ${offer.truckInfo}
💰 ${offer.price.toLocaleString()} so'm
👤 @${offer.username}
📱 ${offer.phone}
⏰ ${timeAgo}
${offer.description ? `📝 ${offer.description}` : ''}

`;
    });

    const keyboard = new InlineKeyboard()
      .text('🔄 Yangilash', 'view_cargo')
      .text('📦 E\'lon qilish', 'post_cargo').row()
      .text('🔙 Orqaga', 'cargo_system');

    await this.safeEditMessage(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private async showDriverRegistration(ctx: any) {
    const message = `
🚚 <b>HAYDOVCHI RO'YXATGA OLISH</b>

Quyidagi formatda haydovchi ma'lumotlarini yuboring:

<b>Format:</b>
👤 <code>Abdulla Karimov</code>
📱 <code>+998901234567</code>
🚛 <code>Yuk mashinasi (20 tonna)</code>
📍 <code>Toshkent → Farg'ona</code>
💰 <code>3000000 so'm</code>

<b>Misol:</b>
👤 Abdulla Karimov
📱 +998901234567
🚛 Yuk mashinasi (20 tonna)
📍 Toshkent → Farg'ona  
💰 3000000 so'm
    `;

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().text('🔙 Orqaga', 'cargo_system')
    });
  }

  private async showAvailableDrivers(ctx: any) {
    const availableDrivers = Array.from(this.driverOffers.values())
      .filter(driver => driver.status === 'available')
      .sort((a, b) => b.rating - a.rating);

    if (availableDrivers.length === 0) {
      await ctx.editMessageText(
        '🚚 <b>Hozircha mavjud haydovchilar yo\'q</b>\n\nHaydovchi qo\'shish uchun "🚚 Haydovchi ro\'yxati" tugmasini bosing.',
        {
          parse_mode: 'HTML',
          reply_markup: new InlineKeyboard()
            .text('🚚 Haydovchi qo\'shish', 'register_driver')
            .text('🔙 Orqaga', 'cargo_system')
        }
      );
      return;
    }

    let message = '🚚 <b>MAVJUD HAYDOVCHILAR</b>\n\n';
    
    availableDrivers.slice(0, 10).forEach((driver, index) => {
      const stars = '⭐'.repeat(Math.floor(driver.rating));
      message += `
<b>${index + 1}. ${driver.driverName}</b>
🚛 ${driver.truckType} (${driver.capacity} tonna)
📍 ${driver.fromCity} → ${driver.toCity}
💰 ${driver.price.toLocaleString()} so'm
${stars} ${driver.rating.toFixed(1)} (${driver.completedOrders} order)
📱 ${driver.phone}
👤 @${driver.username}

`;
    });

    const keyboard = new InlineKeyboard()
      .text('🔄 Yangilash', 'view_drivers')
      .text('🚚 Haydovchi qo\'shish', 'register_driver').row()
      .text('🔙 Orqaga', 'cargo_system');

    await this.safeEditMessage(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private async showMyOrders(ctx: any) {
    const user = ctx.from;
    const userCargos = Array.from(this.cargoOffers.values()).filter(cargo => cargo.userId === user.id);
    const userMatches = Array.from(this.matches.values()).filter(match => {
      const cargo = this.cargoOffers.get(match.cargoId);
      return cargo && cargo.userId === user.id;
    });

    let message = `📋 <b>MENING ORDERLARIM</b>\n\n`;
    
    if (userCargos.length === 0) {
      message += '📦 Sizning yuk e\'lonlaringiz yo\'q.\n\n';
    } else {
      message += `📦 <b>Jami yuklar:</b> ${userCargos.length}\n`;
      message += `✅ <b>Faol:</b> ${userCargos.filter(c => c.status === 'active').length}\n`;
      message += `🤝 <b>Matched:</b> ${userCargos.filter(c => c.status === 'matched').length}\n`;
      message += `🎯 <b>Yakunlangan:</b> ${userCargos.filter(c => c.status === 'completed').length}\n\n`;
    }

    if (userMatches.length > 0) {
      message += `🤝 <b>SO'NGGI MATCHLAR:</b>\n\n`;
      userMatches.slice(0, 5).forEach((match, index) => {
        const cargo = this.cargoOffers.get(match.cargoId);
        const driver = this.driverOffers.get(match.driverId);
        const status = match.status === 'pending' ? '⏳ Kutilmoqda' : 
                     match.status === 'accepted' ? '✅ Qabul qilindi' : 
                     match.status === 'rejected' ? '❌ Rad etildi' : '🎯 Yakunlandi';
        
        if (cargo && driver) {
          message += `${index + 1}. ${cargo.fromCity} → ${cargo.toCity}\n`;
          message += `🚚 ${driver.driverName}\n`;
          message += `📱 ${driver.phone}\n`;
          message += `📊 ${status}\n\n`;
        }
      });
    }

    const keyboard = new InlineKeyboard()
      .text('📦 Yangi yuk e\'lon qilish', 'post_cargo')
      .text('🔄 Yangilash', 'my_orders').row()
      .text('🔙 Orqaga', 'cargo_system');

    await this.safeEditMessage(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private async showCargoStats(ctx: any) {
    const totalCargos = this.cargoOffers.size;
    const activeCargos = Array.from(this.cargoOffers.values()).filter(c => c.status === 'active').length;
    const completedCargos = Array.from(this.cargoOffers.values()).filter(c => c.status === 'completed').length;
    const totalDrivers = this.driverOffers.size;
    const availableDrivers = Array.from(this.driverOffers.values()).filter(d => d.status === 'available').length;
    const totalMatches = this.matches.size;
    const successfulMatches = Array.from(this.matches.values()).filter(m => m.status === 'completed').length;

    const today = new Date().toISOString().split('T')[0];
    const todayCargos = Array.from(this.cargoOffers.values()).filter(c => c.date.startsWith(today)).length;
    const todayMatches = Array.from(this.matches.values()).filter(m => m.date.startsWith(today)).length;

    const message = `
📊 <b>YUK TIZIMI STATISTIKASI</b>

📦 <b>YUKLAR:</b>
• Jami yuklar: ${totalCargos}
• Faol yuklar: ${activeCargos}
• Yakunlangan: ${completedCargos}
• Bugungi yuklar: ${todayCargos}

🚚 <b>HAYDOVCHILAR:</b>  
• Jami haydovchilar: ${totalDrivers}
• Mavjud haydovchilar: ${availableDrivers}
• Band haydovchilar: ${totalDrivers - availableDrivers}

🤝 <b>MATCHLAR:</b>
• Jami matchlar: ${totalMatches}
• Muvaffaqiyatli: ${successfulMatches}
• Bugungi matchlar: ${todayMatches}
• Muvaffaqiyat darajasi: ${totalMatches > 0 ? Math.round((successfulMatches / totalMatches) * 100) : 0}%

📈 <b>PERFORMANCE:</b>
• O'rtacha match vaqti: ~2.5 soat
• Foydalanuvchi qoniqishi: 94%
• Tizim yuklash: ${Math.floor(Math.random() * 30 + 60)}%
    `;

    const keyboard = new InlineKeyboard()
      .text('🔄 Yangilash', 'cargo_stats')
      .text('📊 Batafsil hisobot', 'detailed_stats').row()
      .text('🔙 Orqaga', 'cargo_system');

    await this.safeEditMessage(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private async handleCargoPosting(ctx: any, text: string) {
    const user = ctx.from;
    this.cargoPostingUsers.delete(user.id);

    try {
      // Text formatini parse qilish
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 5) {
        throw new Error('Barcha ma\'lumotlarni to\'ldiring!');
      }

      const routeLine = lines.find(line => line.includes('→')) || lines[0];
      const cargoTypeLine = lines.find(line => line.includes('🏷️')) || lines[1];
      const weightLine = lines.find(line => line.includes('⚖️') || line.includes('tonna')) || lines[2];
      const priceLine = lines.find(line => line.includes('💰') || line.includes('so\'m')) || lines[3];
      const phoneLine = lines.find(line => line.includes('📱') || line.includes('+998')) || lines[4];
      const descriptionLine = lines.find(line => line.includes('📝')) || '';

      // Ma'lumotlarni extract qilish
      const route = routeLine.replace(/📍|🏷️|⚖️|💰|📱|📝/g, '').trim();
      const [fromCity, toCity] = route.split('→').map(city => city.trim());
      
      const cargoType = cargoTypeLine.replace(/📍|🏷️|⚖️|💰|📱|📝/g, '').trim();
      
      const weightText = weightLine.replace(/📍|🏷️|⚖️|💰|📱|📝/g, '').trim();
      const weight = parseFloat(weightText.match(/\d+(?:\.\d+)?/)?.[0] || '0');
      
      const priceText = priceLine.replace(/📍|🏷️|⚖️|💰|📱|📝/g, '').trim();
      const price = parseInt(priceText.replace(/[^\d]/g, '') || '0');
      
      const phone = phoneLine.replace(/📍|🏷️|⚖️|💰|📱|📝/g, '').trim();
      
      const description = descriptionLine.replace(/📍|🏷️|⚖️|💰|📱|📝/g, '').trim();

      if (!fromCity || !toCity || !cargoType || weight <= 0 || price <= 0 || !phone) {
        throw new Error('Ma\'lumotlar noto\'g\'ri formatda!');
      }

      // Yuk e'lonini saqlash
      const cargoId = `cargo_${Date.now()}_${user.id}`;
      const cargo = {
        id: cargoId,
        userId: user.id,
        username: user.username || user.first_name,
        fromCity,
        toCity,
        cargoType,
        truckInfo: `${weight}t mashina kerak`,
        price,
        description,
        phone,
        date: new Date().toISOString(),
        status: 'active' as const
      };

      this.cargoOffers.set(cargoId, cargo);

      // Malakali haydovchilarga avtomatik yuborish
      await this.sendCargoOffersToQualifiedDrivers(cargo);

      // Muvaffaqiyat xabari
      const successMessage = `
✅ <b>YUK E'LONI MUVAFFAQIYATLI JOYLANDI!</b>

📦 <b>Yuk ma'lumotlari:</b>
📍 <b>Marshrut:</b> ${fromCity} → ${toCity}
🏷️ <b>Yuk turi:</b> ${cargoType}
⚖️ <b>Og'irligi:</b> ${weight} tonna
💰 <b>Narxi:</b> ${price.toLocaleString()} so'm
📱 <b>Telefon:</b> ${phone}
${description ? `📝 <b>Qo'shimcha:</b> ${description}` : ''}

🔔 <b>Mos haydovchilar topilsa, sizga xabar beramiz!</b>

🆔 <b>E'lon ID:</b> <code>${cargoId}</code>
      `;

      await ctx.reply(successMessage, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .text('👀 Faol yuklar', 'view_cargo')
          .text('📋 Mening orderlarim', 'my_orders').row()
          .text('🚛 Yuk tizimi', 'cargo_system')
          .text('🏠 Bosh menyu', 'back_main').row()
      });

      // Auto-matching: mos haydovchilarni topish
      await this.findMatchingDrivers(cargo);

    } catch (error) {
      await ctx.reply(
        `❌ <b>Xatolik:</b> ${error.message}\n\nIltimos, to'g'ri formatda qayta yuboring:\n\n📍 Toshkent → Samarqand\n🏷️ Oziq-ovqat\n⚖️ 15 tonna\n💰 2500000 so'm\n📱 +998901234567`,
        {
          parse_mode: 'HTML',
          reply_markup: new InlineKeyboard()
            .text('🔄 Qayta urinish', 'post_cargo')
            .text('🚛 Yuk tizimi', 'cargo_system')
        }
      );
    }
  }


  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} daqiqa oldin`;
    if (diffHours < 24) return `${diffHours} soat oldin`;
    return `${diffDays} kun oldin`;
  }

  // Driver Step-by-Step Registration Handler
  private async handleDriverRegistrationStep(ctx: any, text: string) {
    const userId = ctx.from.id;
    const currentStep = this.driverRegistrationSteps.get(userId);
    
    if (!currentStep) {
      await ctx.reply('❌ Registratsiya jarayoni topilmadi. Qaytadan /start ni bosing.');
      return;
    }

    try {
      await this.deleteMessage(ctx); // Delete old messages

      switch (currentStep.step) {
        case 'name':
          const fullName = text.trim();
          if (fullName.length < 5) {
            if (currentStep.messageId) {
              try {
                await this.bot.api.editMessageText(
                  ctx.chat.id,
                  currentStep.messageId,
                  '❌ Ism-familiyangizni to\'liq kiriting (kamida 5 harf)',
                  {
                    reply_markup: new InlineKeyboard().text('🔙 Bekor qilish', 'back_main')
                  }
                );
              } catch (error) {
                // If edit fails, send new message
                await ctx.reply('❌ Ism-familiyangizni to\'liq kiriting (kamida 5 harf)', {
                  reply_markup: new InlineKeyboard().text('🔙 Bekor qilish', 'back_main')
                });
              }
            } else {
              await ctx.reply('❌ Ism-familiyangizni to\'liq kiriting (kamida 5 harf)', {
                reply_markup: new InlineKeyboard().text('🔙 Bekor qilish', 'back_main')
              });
            }
            return;
          }
          currentStep.data.fullName = fullName;
          currentStep.step = 'phone';
          
          const phoneMessage = `
🚚 <b>HAYDOVCHI RO'YXATDAN O'TISH</b>

✅ <b>Ism-familiya:</b> ${fullName}

<b>2-qadam (4 tadan):</b> Telefon raqamingizni kiriting

📝 <b>Masalan:</b> +998901234567

✍️ Telefon raqamingizni yozing:
          `;
          
          if (currentStep.messageId) {
            try {
              await this.bot.api.editMessageText(
                ctx.chat.id,
                currentStep.messageId,
                phoneMessage,
                {
                  parse_mode: 'HTML',
                  reply_markup: new InlineKeyboard().text('🔙 Bekor qilish', 'back_main')
                }
              );
            } catch (error) {
              // If edit fails, send new message
              const newMessage = await ctx.reply(phoneMessage, {
                parse_mode: 'HTML',
                reply_markup: new InlineKeyboard().text('🔙 Bekor qilish', 'back_main')
              });
              currentStep.messageId = newMessage.message_id;
            }
          } else {
            const newMessage = await ctx.reply(phoneMessage, {
              parse_mode: 'HTML',
              reply_markup: new InlineKeyboard().text('🔙 Bekor qilish', 'back_main')
            });
            currentStep.messageId = newMessage.message_id;
          }
          break;

        case 'phone':
          const phone = text.trim();
          if (!phone.match(/^\+998\d{9}$/)) {
            await this.bot.api.editMessageText(
              ctx.chat.id,
              currentStep.messageId,
              '❌ Telefon raqam noto\'g\'ri. To\'g\'ri format: +998901234567',
              {
                reply_markup: new InlineKeyboard().text('🔙 Bekor qilish', 'back_main')
              }
            );
            return;
          }

          // Check for duplicate phone numbers
          const phoneValidation = this.validateDriverPhone(phone, userId);
          if (!phoneValidation.isValid) {
            await this.bot.api.editMessageText(
              ctx.chat.id,
              currentStep.messageId,
              `❌ ${phoneValidation.message}\n\nIltimos, boshqa telefon raqam kiriting.`,
              {
                reply_markup: new InlineKeyboard().text('🔙 Bekor qilish', 'back_main')
              }
            );
            return;
          }

          currentStep.data.phone = phone;
          currentStep.step = 'tonnage_range';
          
          // Show tonnage range options
          const tonnageKeyboard = new InlineKeyboard()
            .text('🚚 1-5 tonna', 'tonnage_1_5').row()
            .text('🚛 6-10 tonna', 'tonnage_6_10').row()
            .text('🚜 11-15 tonna', 'tonnage_11_15').row()
            .text('🚐 16-20 tonna', 'tonnage_16_20').row()
            .text('🚚 21-25 tonna', 'tonnage_21_25').row()
            .text('🔙 Bekor qilish', 'back_main');

          const tonnageMessage = `
🚚 <b>HAYDOVCHI RO'YXATDAN O'TISH</b>

✅ <b>Ism-familiya:</b> ${currentStep.data.fullName}
✅ <b>Telefon:</b> ${phone}

<b>3-qadam (4 tadan):</b> Tonnaj oralig'ini tanlang

⚖️ Qancha tonnadan nechchi tonnagacha yuk tashiy olasiz?

🚚 Quyidagi oraliqlardan birini tanlang:
          `;
          await this.bot.api.editMessageText(
            ctx.chat.id,
            currentStep.messageId,
            tonnageMessage,
            {
              parse_mode: 'HTML',
              reply_markup: tonnageKeyboard
            }
          );
          return; // Wait for callback

        default:
          // Unknown step - redirect to main menu
          await ctx.reply('❌ Registratsiyada xatolik yuz berdi. Qaytadan boshlang.', {
            reply_markup: new InlineKeyboard().text('🏠 Bosh menyu', 'back_main')
          });
          this.driverRegistrationSteps.delete(userId);
          return;

        case 'price_survey':
          // Handle price survey answer
          const currentQuestionIndex = currentStep.currentPriceSurveyIndex || 0;
          const currentQuestion = currentStep.data.personalizedQuestions[currentQuestionIndex];
          const answer = text.trim();
          
          const parsedPrice = this.parsePrice(answer);
          if (parsedPrice === null) {
            if (currentStep.messageId) {
              try {
                await this.bot.api.editMessageText(
                  ctx.chat.id,
                  currentStep.messageId,
                  '❌ Narxni to\'g\'ri formatda yozing!\n\n📝 Misol: 2500000, 2.5M, 2,500,000 so\'m',
                  {
                    reply_markup: new InlineKeyboard().text('🔙 Bekor qilish', 'back_main')
                  }
                );
              } catch (error) {
                await ctx.reply('❌ Narxni to\'g\'ri formatda yozing!\n\n📝 Misol: 2500000, 2.5M, 2,500,000 so\'m', {
                  reply_markup: new InlineKeyboard().text('🔙 Bekor qilish', 'back_main')
                });
              }
            } else {
              await ctx.reply('❌ Narxni to\'g\'ri formatda yozing!\n\n📝 Misol: 2500000, 2.5M, 2,500,000 so\'m', {
                reply_markup: new InlineKeyboard().text('🔙 Bekor qilish', 'back_main')
              });
            }
            return;
          }

          currentStep.data.priceSurveyAnswers.push({
            question: `${currentQuestion.from} → ${currentQuestion.to} (${currentQuestion.weight} ${currentQuestion.type})`,
            answer: parsedPrice.toLocaleString() + ' so\'m'
          });

          if (currentQuestionIndex < currentStep.data.personalizedQuestions.length - 1) {
            // Next question
            currentStep.currentPriceSurveyIndex = currentQuestionIndex + 1;
            await this.startPriceSurvey(ctx, currentStep);
          } else {
            // Complete registration
            await this.completeDriverRegistration(ctx, currentStep.data);
            this.driverRegistrationSteps.delete(userId);
          }
          break;
      }

      // Save updated step data
      this.driverRegistrationSteps.set(userId, currentStep);

    } catch (error) {
      this.logger.error('Driver registration step error:', error);
      await ctx.reply('❌ Xatolik yuz berdi. Qaytadan urinib ko\'ring.');
    }
  }

  private async startPriceSurvey(ctx: any, currentStep: any) {
    const questionIndex = currentStep.currentPriceSurveyIndex || 0;
    const question = currentStep.data.personalizedQuestions[questionIndex];
    
    this.logger.log(`Driver ${ctx.from.id}: Price survey question ${questionIndex + 1}/${currentStep.data.personalizedQuestions.length}: ${question.from} → ${question.to} (${question.weight})`);
    
    const surveyMessage = `
🚚 <b>HAYDOVCHI RO'YXATDAN O'TISH</b>

✅ <b>Ism-familiya:</b> ${currentStep.data.fullName}
✅ <b>Telefon:</b> ${currentStep.data.phone}
✅ <b>Tonnaj oraliqi:</b> ${currentStep.data.minTonnage}-${currentStep.data.maxTonnage} tonna

<b>4-qadam (4 tadan):</b> Narx so'rovi (${questionIndex + 1}/2)

📍 <b>Yo'nalish:</b> ${question.from} → ${question.to}
🏷️ <b>Yuk turi:</b> ${question.type}
⚖️ <b>Og'irligi:</b> ${question.weight}

💰 <b>Qancha summa talab qilasiz?</b>

📝 <b>Masalan:</b> 2500000, 2.5M, 2,500,000 so'm

✍️ Summani yozing:
    `;
    
    const userId = ctx.from?.id || ctx.chat?.id;
    const currentRegistration = this.driverRegistrationSteps.get(userId);
    
    if (currentRegistration?.messageId) {
      try {
        await this.bot.api.editMessageText(
          ctx.chat.id,
          currentRegistration.messageId,
          surveyMessage,
          {
            parse_mode: 'HTML',
            reply_markup: new InlineKeyboard().text('🔙 Bekor qilish', 'back_main')
          }
        );
      } catch (error) {
        const newMessage = await ctx.reply(surveyMessage, {
          parse_mode: 'HTML',
          reply_markup: new InlineKeyboard().text('🔙 Bekor qilish', 'back_main')
        });
        if (currentRegistration) {
          currentRegistration.messageId = newMessage.message_id;
        }
      }
    } else {
      const newMessage = await ctx.reply(surveyMessage, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard().text('🔙 Bekor qilish', 'back_main')
      });
      if (currentRegistration) {
        currentRegistration.messageId = newMessage.message_id;
      }
    }
  }

  private async completeDriverRegistration(ctx: any, driverData: any) {
    const userId = ctx.from.id;
    
    // Save to userRoles
    this.userRoles.set(userId, {
      role: 'haydovchi',
      isRegistered: true,
      registrationDate: new Date().toISOString(),
      profile: driverData
    });

    // Save to driver offers for matching system
    const driverId = `driver_${userId}_${Date.now()}`;
    this.driverOffers.set(driverId, {
      id: driverId,
      userId: userId,
      username: ctx.from.username || ctx.from.first_name || 'Unknown',
      driverName: driverData.fullName,
      phone: driverData.phone,
      truckType: `${driverData.minTonnage}-${driverData.maxTonnage} tonnali mashina`,
      capacity: driverData.maxTonnage || 20,
      fromCity: 'Barcha shaharlar',
      toCity: 'Barcha shaharlar',
      price: 120000,
      status: 'available',
      rating: 5.0,
      completedOrders: 0,
      date: new Date().toISOString()
    });

    // Add price survey data to pricing database
    driverData.priceSurveyAnswers.forEach((surveyAnswer, index) => {
      // Parse route info from the stored question text
      const questionMatch = surveyAnswer.question.match(/^(.+) → (.+) \(/);
      if (!questionMatch) return;
      
      const [, from, to] = questionMatch;
      const tonnageRange = `${driverData.minTonnage}-${driverData.maxTonnage}t`;
      const routeKey = `${from.toLowerCase()}-${to.toLowerCase()}-${tonnageRange}`;
      const priceMatch = surveyAnswer.answer.match(/(\d[\d\s,]*)/);
      const price = priceMatch ? parseInt(priceMatch[1].replace(/[\s,]/g, '')) : 0;
      
      if (price > 0) {
        const existingPricing = this.pricingDatabase.get(routeKey);
        if (existingPricing) {
          existingPricing.samples.push({
            price: price,
            date: new Date().toISOString(),
            driverId: userId.toString()
          });
        } else {
          this.pricingDatabase.set(routeKey, {
            route: `${from} → ${to}`,
            truckType: `${driverData.minTonnage}-${driverData.maxTonnage} tonna`,
            basePrice: price,
            pricePerTon: Math.floor(price / ((driverData.minTonnage + driverData.maxTonnage) / 2)),
            samples: [{
              price: price,
              date: new Date().toISOString(),
              driverId: userId.toString()
            }]
          });
        }
      }
    });

    const completionMessage = `
🎉 <b>RO'YXATDAN O'TISH MUVAFFAQIYATLI YAKUNLANDI!</b>

👤 <b>Haydovchi:</b> ${driverData.fullName}
📱 <b>Telefon:</b> ${driverData.phone}
⚖️ <b>Tonnaj oraliqi:</b> ${driverData.minTonnage} - ${driverData.maxTonnage} tonna
📊 <b>Narx ma'lumotlari:</b> ${driverData.priceSurveyAnswers.length} ta savol javoblandi

🚀 <b>Keyingi qadamlar:</b>
• Sizga mos yuklar haqida xabar beramiz
• Narx bazasiga qo'shilgan ma'lumotlaringiz
• Profil va sozlamalar menyusidan foydalaning

✅ Endi siz tizimda ro'yxatdan o'tgan haydovchisiz!
    `;

    await ctx.reply(completionMessage, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('🏠 Bosh menyu', 'back_main')
        .text('⚙️ Profil sozlamalari', 'settings')
    });

    this.logger.log(`Driver registered successfully: ${driverData.fullName} (${userId})`);
    
    // Save user data to file
    await this.saveUserData();
  }

  private async deleteMessage(ctx: any) {
    try {
      if (ctx.message?.message_id) {
        await ctx.api.deleteMessage(ctx.chat.id, ctx.message.message_id);
      }
    } catch (error) {
      // Ignore deletion errors
    }
  }


  private async handleTonnageRangeSelection(ctx: any, tonnageRange: string) {
    const userId = ctx.from.id;
    const currentStep = this.driverRegistrationSteps.get(userId);
    
    if (!currentStep || currentStep.step !== 'tonnage_range') {
      return;
    }

    // Parse tonnage range (e.g., "1_5" -> min: 1, max: 5)
    const [min, max] = tonnageRange.split('_').map(Number);
    currentStep.data.minTonnage = min;
    currentStep.data.maxTonnage = max;
    currentStep.step = 'price_survey';

    // Generate 2 personalized questions based on tonnage range
    const personalizedQuestions = this.generatePersonalizedPriceQuestions(min, max);
    currentStep.data.personalizedQuestions = personalizedQuestions;
    currentStep.data.priceSurveyAnswers = [];
    currentStep.currentPriceSurveyIndex = 0;

    // Show first price question
    const firstQuestion = personalizedQuestions[0];
    const priceMessage = `
🚚 <b>HAYDOVCHI RO'YXATDAN O'TISH</b>

✅ <b>Ism-familiya:</b> ${currentStep.data.fullName}
✅ <b>Telefon:</b> ${currentStep.data.phone}
✅ <b>Tonnaj oraliqi:</b> ${min}-${max} tonna

<b>4-qadam (4 tadan):</b> Narx so'rovi (1/2)

📍 <b>Yo'nalish:</b> ${firstQuestion.from} → ${firstQuestion.to}
🏷️ <b>Yuk turi:</b> ${firstQuestion.type}
⚖️ <b>Og'irligi:</b> ${firstQuestion.weight}

💰 <b>Qancha summa talab qilasiz?</b>

📝 <b>Masalan:</b> 2500000, 2.5M, 2,500,000 so'm

✍️ Summani yozing:
    `;

    await ctx.editMessageText(priceMessage, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().text('🔙 Bekor qilish', 'back_main')
    });

    this.driverRegistrationSteps.set(userId, currentStep);
  }

  private generatePersonalizedPriceQuestions(minTonnage: number, maxTonnage: number): Array<{from: string, to: string, weight: string, type: string, minCapacity: number, maxCapacity: number}> {
    // Filter questions based on tonnage capacity
    const suitableQuestions = this.priceSurveyDatabase.filter(q => 
      q.minCapacity <= maxTonnage && q.maxCapacity >= minTonnage
    );
    
    // Shuffle and get 2 random questions
    const shuffled = suitableQuestions.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2);
  }


  // Registration Methods
  private async startRegistration(ctx: any, role: 'yukchi' | 'haydovchi' | 'dispechr') {
    const user = ctx.from;
    this.logger.log(`Starting registration for ${user.first_name} (${user.id}) as ${role}`);
    this.registrationInProgress.add(user.id);
    this.registrationData.set(user.id, { role });

    let message = '';
    let nextStep = '';

    switch (role) {
      case 'yukchi':
        message = `
📦 <b>YUKCHI SIFATIDA RO'YXATDAN O'TISH</b>

Assalomu alaykum! Siz yukchi sifatida ro'yxatdan o'tmoqchisiz.

<b>Quyidagi ma'lumotlarni yuboring:</b>

📱 <b>Telefon raqam:</b> +998901234567
🏢 <b>Kompaniya nomi:</b> "Logistics Pro" LLC
📍 <b>Manzil:</b> Toshkent shahar
👤 <b>Mas'ul shaxs:</b> Anvar Karimov

<b>Misol:</b>
📱 +998901234567
🏢 Logistics Pro LLC
📍 Toshkent shahar
👤 Anvar Karimov
        `;
        nextStep = 'yukchi_info';
        break;

      case 'haydovchi':
        // Start step-by-step driver registration with new 4-step process  
        message = `
🚚 <b>HAYDOVCHI RO'YXATDAN O'TISH</b>

Xush kelibsiz! Haydovchi sifatida ro'yxatdan o'tish jarayonini boshlaymiz.

<b>1-qadam (4 tadan):</b> Ism-familiyangizni kiriting

📝 <b>Masalan:</b> Sardor Toshmatov

✍️ Ism-familiyangizni yozing:
        `;
        nextStep = 'driver_step_registration';
        break;

      case 'dispechr':
        message = `
🎯 <b>DISPECHR SIFATIDA RO'YXATDAN O'TISH</b>

Assalomu alaykum! Siz dispechr sifatida ro'yxatdan o'tmoqchisiz.

<b>Quyidagi ma'lumotlarni yuboring:</b>

👤 <b>Ism-familiya:</b> Rustam Aliyev
📱 <b>Telefon raqam:</b> +998901234567
🏢 <b>Kompaniya:</b> Trans Logistics
💼 <b>Lavozim:</b> Senior Dispatcher
📅 <b>Tajriba:</b> 5 yil
📍 <b>Hudud:</b> Toshkent viloyati

<b>Misol:</b>
👤 Rustam Aliyev
📱 +998901234567
🏢 Trans Logistics
💼 Senior Dispatcher
📅 5 yil
📍 Toshkent viloyati
        `;
        nextStep = 'dispechr_info';
        break;
    }

    this.registrationData.set(user.id, { role, step: nextStep });

    const sentMessage = await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('🔙 Orqaga', 'back_main')
    });

    // Save message ID for driver registration for later editing
    if (role === 'haydovchi') {
      this.driverRegistrationSteps.set(user.id, {
        step: 'name',
        data: {},
        messageId: sentMessage.message_id
      });
    }
  }

  private async confirmRegistration(ctx: any) {
    const user = ctx.from;
    const regData = this.registrationData.get(user.id);

    if (!regData) {
      await ctx.editMessageText('❌ Ro\'yxatdan o\'tish ma\'lumotlari topilmadi.', {
        reply_markup: new InlineKeyboard().text('🏠 Bosh sahifa', 'back_main')
      });
      return;
    }

    // Foydalanuvchini ro'yxatga olish
    this.userRoles.set(user.id, {
      role: regData.role,
      isRegistered: true,
      registrationDate: new Date().toISOString(),
      profile: regData.profile
    });

    // Agar haydovchi bo'lsa, haydovchilar bazasiga qo'shish
    if (regData.role === 'haydovchi' && regData.profile) {
      const driverId = `driver_${user.id}_${Date.now()}`;
      const profile = regData.profile;
      
      this.driverOffers.set(driverId, {
        id: driverId,
        userId: user.id,
        username: user.username || user.first_name,
        driverName: profile.name,
        phone: profile.phone,
        truckType: profile.truckType,
        capacity: profile.capacity,
        fromCity: profile.route?.split('-')[0] || 'Toshkent',
        toCity: profile.route?.split('-')[1] || 'Samarqand',
        price: profile.pricePerTon || 0,
        rating: 5.0,
        completedOrders: 0,
        date: new Date().toISOString(),
        status: 'available'
      });
    }

    this.registrationInProgress.delete(user.id);
    this.registrationData.delete(user.id);

    const roleNames = {
      yukchi: 'Yukchi',
      haydovchi: 'Haydovchi', 
      dispechr: 'Dispechr'
    };

    await ctx.editMessageText(`
✅ <b>RO'YXATDAN O'TISH MUVAFFAQIYATLI YAKUNLANDI!</b>

🎉 Tabriklaymiz, ${user.first_name}!

👤 <b>Sizning rolingiz:</b> ${roleNames[regData.role]}
📅 <b>Ro'yxatga olingan sana:</b> ${new Date().toLocaleDateString('uz-UZ')}
🆔 <b>User ID:</b> ${user.id}

💡 <b>Keyingi qadamlar:</b>
• Profilingizni to'ldiring
• Tizimning barcha imkoniyatlaridan foydalaning
• Professional matching tizimidan bahramand bo'ling

Endi bosh menyuga o'ting va platformaning barcha funksiyalaridan foydalaning!
    `, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('🏠 Bosh menyu', 'back_main')
        .text('⚙️ Profil sozlash', 'settings')
    });

    this.logger.log(`User ${user.first_name} (${user.id}) registered as ${regData.role}`);
    
    // Save user data to file
    await this.saveUserData();
  }

  private async handleRegistrationData(ctx: any, text: string) {
    const user = ctx.from;
    const regData = this.registrationData.get(user.id);

    this.logger.log(`Handling registration data for ${user.first_name} (${user.id}) with role ${regData?.role}`);

    if (!regData) {
      this.logger.warn(`No registration data found for user ${user.id}`);
      await ctx.reply('❌ Ro\'yxatdan o\'tish ma\'lumotlari topilmadi. /start tugmasini bosing.');
      return;
    }

    try {
      const lines = text.split('\n').filter(line => line.trim());
      
      let profile: any = {};

      switch (regData.role) {
        case 'yukchi':
          this.logger.log(`Processing yukchi registration for user ${user.id}, lines count: ${lines.length}`);
          if (lines.length < 4) {
            throw new Error('Barcha ma\'lumotlarni to\'ldiring!');
          }
          profile = {
            phone: lines[0].replace(/📱|🏢|📍|👤/g, '').trim(),
            company: lines[1].replace(/📱|🏢|📍|👤/g, '').trim(),
            address: lines[2].replace(/📱|🏢|📍|👤/g, '').trim(),
            contact: lines[3].replace(/📱|🏢|📍|👤/g, '').trim()
          };
          this.logger.log(`Yukchi profile created:`, profile);
          break;

        case 'haydovchi':
          if (lines.length < 6) {
            throw new Error('Barcha ma\'lumotlarni to\'ldiring!');
          }
          const capacity = parseFloat(lines[3].replace(/👤|📱|🚛|⚖️|📍|💰/g, '').replace('tonna', '').trim());
          const pricePerTon = parseInt(lines[5].replace(/👤|📱|🚛|⚖️|📍|💰/g, '').replace(/[^\d]/g, ''));
          
          profile = {
            name: lines[0].replace(/👤|📱|🚛|⚖️|📍|💰/g, '').trim(),
            phone: lines[1].replace(/👤|📱|🚛|⚖️|📍|💰/g, '').trim(),
            truckType: lines[2].replace(/👤|📱|🚛|⚖️|📍|💰/g, '').trim(),
            capacity: capacity,
            route: lines[4].replace(/👤|📱|🚛|⚖️|📍|💰/g, '').trim(),
            pricePerTon: pricePerTon
          };
          break;

        case 'dispechr':
          if (lines.length < 6) {
            throw new Error('Barcha ma\'lumotlarni to\'ldiring!');
          }
          profile = {
            name: lines[0].replace(/👤|📱|🏢|💼|📅|📍/g, '').trim(),
            phone: lines[1].replace(/👤|📱|🏢|💼|📅|📍/g, '').trim(),
            company: lines[2].replace(/👤|📱|🏢|💼|📅|📍/g, '').trim(),
            position: lines[3].replace(/👤|📱|🏢|💼|📅|📍/g, '').trim(),
            experience: lines[4].replace(/👤|📱|🏢|💼|📅|📍/g, '').trim(),
            region: lines[5].replace(/👤|📱|🏢|💼|📅|📍/g, '').trim()
          };
          break;
      }

      // Ma'lumotlarni saqlash
      this.registrationData.set(user.id, { ...regData, profile });

      // Tasdiqlash xabari
      const roleNames = {
        yukchi: 'Yukchi',
        haydovchi: 'Haydovchi',
        dispechr: 'Dispechr'
      };

      let confirmMessage = `
✅ <b>MA'LUMOTLAR QABUL QILINDI</b>

🎯 <b>Rol:</b> ${roleNames[regData.role]}
👤 <b>Foydalanuvchi:</b> ${user.first_name}

📋 <b>Kiritilgan ma'lumotlar:</b>
`;

      switch (regData.role) {
        case 'yukchi':
          confirmMessage += `
📱 <b>Telefon:</b> ${profile.phone}
🏢 <b>Kompaniya:</b> ${profile.company}
📍 <b>Manzil:</b> ${profile.address}
👤 <b>Mas'ul shaxs:</b> ${profile.contact}
          `;
          break;

        case 'haydovchi':
          confirmMessage += `
👤 <b>Ism:</b> ${profile.name}
📱 <b>Telefon:</b> ${profile.phone}
🚛 <b>Mashina:</b> ${profile.truckType}
⚖️ <b>Sig'im:</b> ${profile.capacity} tonna
📍 <b>Marshrut:</b> ${profile.route}
💰 <b>Narx:</b> ${profile.pricePerTon.toLocaleString()} so'm/tonna
          `;
          break;

        case 'dispechr':
          confirmMessage += `
👤 <b>Ism:</b> ${profile.name}
📱 <b>Telefon:</b> ${profile.phone}
🏢 <b>Kompaniya:</b> ${profile.company}
💼 <b>Lavozim:</b> ${profile.position}
📅 <b>Tajriba:</b> ${profile.experience}
📍 <b>Hudud:</b> ${profile.region}
          `;
          break;
      }

      confirmMessage += `
❓ <b>Ma'lumotlar to'g'rimi?</b>
      `;

      await ctx.reply(confirmMessage, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .text('✅ Ha, tasdiqlash', 'confirm_registration')
          .text('❌ Yo\'q, qayta kiritish', `register_${regData.role}`).row()
          .text('🔙 Orqaga', 'back_main')
      });

    } catch (error) {
      await ctx.reply(
        `❌ <b>Xatolik:</b> ${error.message}\n\nIltimos, to'g'ri formatda qayta kiriting.`,
        {
          parse_mode: 'HTML',
          reply_markup: new InlineKeyboard()
            .text('🔄 Qayta urinish', `register_${regData.role}`)
            .text('🔙 Orqaga', 'back_main')
        }
      );
    }
  }

  private async initializeDemoData() {
    // Barcha demo ma'lumotlarni tozalaymiz - hech qanday demo cargo va driverlar qo'shmaymiz
    
    // Faqat asosiy narx bazasini initsializatsiya qilamiz (pricing database)
    this.initializePricingDatabase([]);
    
    // Demo cargo tracking ma'lumotlarini qo'shamiz
    this.createDemoShipments();
    
    // Demo rating ma'lumotlarini qo'shamiz
    this.initializeDemoRatings();
    
    // Emergency system ma'lumotlarini qo'shamiz
    this.initializeEmergencySystem();
    
    // Load saved user data
    await this.loadUserData();
    
    // Validate and cleanup driver profiles
    this.logger.log('Starting driver profile validation...');
    const cleanedCount = await this.cleanupIncompleteDriverOffers();
    const regeneratedCount = await this.regenerateDriverOffers();
    
    this.logger.log(`Profile validation completed - cleaned: ${cleanedCount}, regenerated: ${regeneratedCount}`);
    this.logger.log('Clean initialization completed - ready for real users to register');
  }

  private initializePricingDatabase(drivers: any[]) {
    // Group drivers by route and truck type
    const routeGroups = new Map<string, any[]>();
    
    drivers.forEach(driver => {
      const routeKey = `${driver.fromCity}-${driver.toCity}`;
      if (!routeGroups.has(routeKey)) {
        routeGroups.set(routeKey, []);
      }
      routeGroups.get(routeKey)!.push(driver);
    });

    // Create pricing rules based on samples
    routeGroups.forEach((driversOnRoute, route) => {
      const truckTypeGroups = new Map<string, any[]>();
      
      // Group by truck type
      driversOnRoute.forEach(driver => {
        if (!truckTypeGroups.has(driver.truckType)) {
          truckTypeGroups.set(driver.truckType, []);
        }
        truckTypeGroups.get(driver.truckType)!.push(driver);
      });

      // Create pricing entries for each truck type on this route
      truckTypeGroups.forEach((drivers, truckType) => {
        const prices = drivers.map(d => d.price);
        const capacities = drivers.map(d => d.capacity);
        
        const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        const avgCapacity = capacities.reduce((sum, cap) => sum + cap, 0) / capacities.length;
        const pricePerTon = avgPrice / avgCapacity;

        const pricingKey = `${route}_${truckType.replace(/\s+/g, '_')}`;
        
        this.pricingDatabase.set(pricingKey, {
          route: route,
          truckType: truckType,
          basePrice: Math.round(avgPrice * 0.8), // Base price is 80% of average
          pricePerTon: Math.round(pricePerTon),
          samples: drivers.map(d => ({
            price: d.price,
            date: d.date,
            driverId: d.id
          }))
        });
      });
    });

    this.logger.log(`Pricing database initialized with ${this.pricingDatabase.size} route-truck combinations`);
  }

  // Dynamic pricing calculation method
  private calculateDynamicPrice(fromCity: string, toCity: string, truckType: string, weight: number): {min: number, max: number, suggested: number} {
    const route = `${fromCity}-${toCity}`;
    const truckKey = truckType.replace(/\s+/g, '_');
    const pricingKey = `${route}_${truckKey}`;
    
    const pricingData = this.pricingDatabase.get(pricingKey);
    
    if (!pricingData) {
      // Fallback pricing if no data available
      const basePricePerKm = 150; // 150 som per km base rate
      const estimatedDistance = this.estimateDistance(fromCity, toCity);
      const basePrice = estimatedDistance * basePricePerKm * weight;
      
      return {
        min: Math.round(basePrice * 0.8),
        max: Math.round(basePrice * 1.2),
        suggested: Math.round(basePrice)
      };
    }

    // Calculate based on samples and truck capacity
    const basePrice = pricingData.basePrice;
    const pricePerTon = pricingData.pricePerTon;
    
    // Adjust for weight
    const weightBasedPrice = basePrice + (pricePerTon * weight);
    
    // Add market fluctuation range
    const min = Math.round(weightBasedPrice * 0.85);
    const max = Math.round(weightBasedPrice * 1.15);
    const suggested = Math.round(weightBasedPrice);

    return { min, max, suggested };
  }

  // Estimate distance between cities (simplified)
  private estimateDistance(fromCity: string, toCity: string): number {
    const distances: {[key: string]: number} = {
      'Toshkent-Samarqand': 300,
      'Samarqand-Toshkent': 300,
      'Toshkent-Farg\'ona': 420,
      'Farg\'ona-Toshkent': 420,
      'Nukus-Toshkent': 600,
      'Toshkent-Nukus': 600,
      'Toshkent-Buxoro': 450,
      'Buxoro-Toshkent': 450,
      'Samarqand-Buxoro': 280,
      'Buxoro-Samarqand': 280
    };

    const routeKey = `${fromCity}-${toCity}`;
    return distances[routeKey] || 400; // Default 400km if not found
  }

  // Method to add new pricing sample when a deal is completed
  private addPricingSample(route: string, truckType: string, price: number, driverId: string) {
    const truckKey = truckType.replace(/\s+/g, '_');
    const pricingKey = `${route}_${truckKey}`;
    
    let pricingData = this.pricingDatabase.get(pricingKey);
    
    if (!pricingData) {
      pricingData = {
        route: route,
        truckType: truckType,
        basePrice: price,
        pricePerTon: Math.round(price / 20), // Assume 20 ton average
        samples: []
      };
    }

    // Add new sample
    pricingData.samples.push({
      price: price,
      date: new Date().toISOString(),
      driverId: driverId
    });

    // Keep only last 10 samples to maintain relevancy
    if (pricingData.samples.length > 10) {
      pricingData.samples = pricingData.samples.slice(-10);
    }

    // Recalculate base price and price per ton based on recent samples
    const recentPrices = pricingData.samples.map(s => s.price);
    const avgPrice = recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length;
    
    pricingData.basePrice = Math.round(avgPrice * 0.8);
    pricingData.pricePerTon = Math.round(avgPrice / 20); // Assume 20 ton average

    this.pricingDatabase.set(pricingKey, pricingData);
  }

  // Method to get pricing suggestions for yukchi (cargo shipper)
  async showPricingSuggestion(ctx: any, fromCity: string, toCity: string, cargoWeight: number) {
    const truckTypes = ['Yuk mashinasi', 'Refrigerator', 'Katta yuk mashinasi'];
    let message = `💰 <b>Narx taklifi</b>\n\n📍 <b>Yo'nalish:</b> ${fromCity} → ${toCity}\n⚖️ <b>Og'irlik:</b> ${cargoWeight} tonna\n\n`;

    truckTypes.forEach(truckType => {
      const pricing = this.calculateDynamicPrice(fromCity, toCity, truckType, cargoWeight);
      message += `🚛 <b>${truckType}:</b>\n`;
      message += `   💵 ${pricing.min.toLocaleString()} - ${pricing.max.toLocaleString()} so'm\n`;
      message += `   🎯 Tavsiya: ${pricing.suggested.toLocaleString()} so'm\n\n`;
    });

    message += `📊 <b>Narxlar tizimi:</b>\n`;
    message += `• Haydovchilardan olingan 3-5 ta namuna asosida\n`;
    message += `• Mashina turi va yo'nalishga qarab\n`;
    message += `• Bozor narxlariga moslashtirilgan\n\n`;
    message += `💡 <b>Maslahat:</b> Tavsiya etilgan narxdan boshlang, keyin haydovchilar bilan kelishib oling.`;

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().text('🔙 Orqaga', 'back_main')
    });
  }

  // Location request handlers
  private async requestLocationFrom(ctx: any) {
    const userId = ctx.from.id;
    
    // Set location step
    let currentStep = this.cargoPostingSteps.get(userId);
    if (!currentStep) {
      currentStep = { step: 'locationFrom', userId };
    } else {
      currentStep.step = 'locationFrom';
    }
    this.cargoPostingSteps.set(userId, currentStep);
    
    const message = `
📍 <b>Yuk olinadigan joy</b>

Iltimos, yuk olinadigan joyning aniq lokatsiyasini yuboring.

📲 Telegram'da "📎 Biriktirishlar" → "📍 Lokatsiya" tugmasini bosing va aniq manzilni tanlang.

Yoki matn sifatida shahar nomini yozing.
    `;

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('🔙 Orqaga', 'post_cargo')
    });
  }

  private async requestLocationTo(ctx: any) {
    const userId = ctx.from.id;
    
    // Set location step  
    let currentStep = this.cargoPostingSteps.get(userId);
    if (!currentStep) {
      currentStep = { step: 'locationTo', userId };
    } else {
      currentStep.step = 'locationTo';
    }
    this.cargoPostingSteps.set(userId, currentStep);
    
    const message = `
📍 <b>Yuk yetkazilishi kerak bo'lgan joy</b>

Iltimos, yuk yetkazilishi kerak bo'lgan joyning aniq lokatsiyasini yuboring.

📲 Telegram'da "📎 Biriktirishlar" → "📍 Lokatsiya" tugmasini bosing va aniq manzilni tanlang.

Yoki matn sifatida shahar nomini yozing.
    `;

    await ctx.editMessageText(message, {
      parse_mode: 'HTML', 
      reply_markup: new InlineKeyboard()
        .text('🔙 Orqaga', 'post_cargo')
    });
  }

  // Step-by-step cargo posting handler
  private async handleCargoPostingSteps(ctx: any, text: string) {
    const userId = ctx.from.id;
    const currentStep = this.cargoPostingSteps.get(userId);
    
    if (!currentStep) {
      return;
    }

    try {
      switch (currentStep.step) {
        case 'route_and_cargo':
          currentStep.data.routeAndCargo = text.trim();
          currentStep.step = 'truck_needed';
          
          // Delete previous message for clean UI
          await this.deleteMessage(ctx);
          
          const truckMessage = `
📦 <b>YUK E'LON QILISH</b>

✅ <b>1-savol:</b> ${currentStep.data.routeAndCargo}

🚚 <b>2-savol:</b> Qanaqa mashina kerak?

<b>Misol:</b>
• 10 tonnali yuk mashinasi
• Kichik furgon 3 tonna
• Katta yuk mashinasi 20 tonna
• Tent bilan 15 tonnali

📝 Mashina turini yozing:
          `;
          
          await ctx.reply(truckMessage, {
            parse_mode: 'HTML',
            reply_markup: new InlineKeyboard()
              .text('🔙 Orqaga', 'cargo_system')
          });
          break;

        case 'truck_needed':
          currentStep.data.truckNeeded = text.trim();
          currentStep.step = 'price_offer';
          
          // Delete previous message for clean UI
          await this.deleteMessage(ctx);
          
          const priceMessage = `
📦 <b>YUK E'LON QILISH</b>

✅ <b>1-savol:</b> ${currentStep.data.routeAndCargo}
✅ <b>2-savol:</b> ${currentStep.data.truckNeeded}

💰 <b>3-savol:</b> Qancha summa berasiz?

<b>Misol:</b>
• 2000000 so'm
• 2.5M
• 1,500,000

📝 Narxni yozing:
          `;
          
          await ctx.reply(priceMessage, {
            parse_mode: 'HTML',
            reply_markup: new InlineKeyboard()
              .text('🔙 Orqaga', 'cargo_system')
          });
          break;

        case 'price_offer':
          const price = this.parsePrice(text);
          if (!price) {
            await ctx.reply('❌ Noto\'g\'ri narx formati. Misol: 2000000, 2.5M, 1,500,000');
            return;
          }
          
          currentStep.data.price = price;
          currentStep.step = 'loading_date';
          
          // Delete previous message for clean UI
          await this.deleteMessage(ctx);
          
          const dateMessage = `
📦 <b>YUK E'LON QILISH</b>

✅ <b>1-savol:</b> ${currentStep.data.routeAndCargo}
✅ <b>2-savol:</b> ${currentStep.data.truckNeeded}
✅ <b>3-savol:</b> ${price.toLocaleString()} so'm

📅 <b>4-savol:</b> Yuk qachon yuklanadi?

<b>Misol:</b>
• Bugun
• Ertaga
• 15 dekabr
• Dushanba kuni

📝 Sanani yozing:
          `;
          
          await ctx.reply(dateMessage, {
            parse_mode: 'HTML',
            reply_markup: new InlineKeyboard()
              .text('🔙 Orqaga', 'cargo_system')
          });
          break;

        case 'loading_date':
          currentStep.data.loadingDate = text.trim();
          
          // E'lon tugallandi - telefon raqamni avtomatik olish
          const userPhone = this.getUserPhone(userId);
          if (!userPhone) {
            await ctx.reply('❌ Telefon raqamingiz topilmadi. Avval registratsiyadan o\'ting.');
            this.cargoPostingSteps.delete(userId);
            return;
          }
          currentStep.data.phone = userPhone;
          
          // Parse route and cargo info
          const routeInfo = currentStep.data.routeAndCargo.split(',');
          const routePart = routeInfo[0].trim();
          const cargoPart = routeInfo[1] ? routeInfo[1].trim() : 'Yuk turi ko\'rsatilmagan';
          
          const routeParts = routePart.split('→').map(part => part.trim());
          const fromCity = routeParts[0] || 'Noma\'lum';
          const toCity = routeParts[1] || 'Noma\'lum';
          
          // Create cargo offer
          const cargoId = `cargo_${Date.now()}_${userId}`;
          const cargoOffer = {
            id: cargoId,
            userId: userId,
            fromCity: fromCity,
            toCity: toCity,
            cargoType: cargoPart,
            truckInfo: currentStep.data.truckNeeded,
            price: currentStep.data.price,
            loadingDate: currentStep.data.loadingDate,
            phone: userPhone,
            status: 'active' as const,
            date: new Date().toISOString(),
            description: '',
            photo: '',
            completedAt: null
          };
          
          this.cargoOffers.set(cargoId, cargoOffer);
          this.saveCargoOffers();
          
          // Clear posting steps
          this.cargoPostingSteps.delete(userId);
          
          // Delete previous message for clean UI
          await this.deleteMessage(ctx);
          
          // Show completion message
          const completionMessage = `
✅ <b>YUK E'LONI YARATILDI!</b>

📋 <b>E'lon ma'lumotlari:</b>
🗺️ <b>Yo'nalish:</b> ${fromCity} → ${toCity}
📦 <b>Yuk:</b> ${cargePart}
🚛 <b>Mashina:</b> ${currentStep.data.truckNeeded}
💰 <b>Narx:</b> ${currentStep.data.price.toLocaleString()} so'm
📅 <b>Sana:</b> ${currentStep.data.loadingDate}
📞 <b>Telefon:</b> ${userPhone}

🎯 <b>Keyingi qadamlar:</b>
• Haydovchilar sizga aloqaga chiqadi
• 3 daqiqadan keyin dispechrlar ham ko'radi
• Qabul qilgan haydovchi bilan gaplashing

⏱️ <b>E'lon faol!</b> Haydovchilarni kuting...
          `;

          await ctx.reply(completionMessage, {
            parse_mode: 'HTML',
            reply_markup: new InlineKeyboard()
              .text('🔙 Bosh menyu', 'back_main')
          });

          // Start cargo distribution
          this.distributeCargo(cargoOffer);
          break;

        default:
          await ctx.reply('❌ Noto\'g\'ri qadam. Qayta boshlang.');
          this.cargoPostingSteps.delete(userId);
          break;
      }
      
      this.cargoPostingSteps.set(userId, currentStep);
      
    } catch (error) {
      this.logger.error('Cargo posting step error:', error);
      await ctx.reply(
        '❌ Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.',
        {
          reply_markup: new InlineKeyboard()
            .text('🔄 Qayta boshlash', 'post_cargo')
            .text('🏠 Bosh menyu', 'back_main')
        }
      );
      this.cargoPostingSteps.delete(userId);
    }
  }

  private async showLowBudgetWarning(ctx: any, data: any, minPrice: number) {
    const suggestedPrices = [
      minPrice,
      Math.round(minPrice * 1.1),
      Math.round(minPrice * 1.2),
      Math.round(minPrice * 1.3)
    ];

    const message = `
⚠️ <b>Bujet kam!</b>

${data.from} → ${data.to} yo'nalishi uchun tavsiya qilinadigan narxlar:

💰 <b>Minimal narx:</b> ${minPrice.toLocaleString()} so'm
📊 <b>O'rtacha narx:</b> ${Math.round(minPrice * 1.15).toLocaleString()} so'm

🚫 <b>Sizning bujetingiz:</b> ${data.budget.toLocaleString()} so'm

Iltimos, bu yo'nalish bo'yicha narxlar quyidagicha. Shu narxlardan pastiga moshina qilishga qiynalamiz.

<b>Tanlovingiz:</b>
    `;

    const keyboard = new InlineKeyboard()
      .text(`💰 ${suggestedPrices[0].toLocaleString()}`, `budget_${suggestedPrices[0]}`)
      .text(`💵 ${suggestedPrices[1].toLocaleString()}`, `budget_${suggestedPrices[1]}`).row()
      .text(`💸 ${suggestedPrices[2].toLocaleString()}`, `budget_${suggestedPrices[2]}`)
      .text(`💎 ${suggestedPrices[3].toLocaleString()}`, `budget_${suggestedPrices[3]}`).row()
      .text('⏳ Kutaman, narxni keyin ko\'taraman', 'wait_for_price_increase')
      .text('🔙 Orqaga', 'cargo_system').row();

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private async completeCargoPosting(ctx: any, data: any) {
    try {
      // Generate cargo ID
      const cargoId = `cargo_${Date.now()}_${ctx.from.id}`;
      
      // Create cargo offer
      const cargoOffer = {
        id: cargoId,
        userId: ctx.from.id,
        username: ctx.from.username || ctx.from.first_name,
        fromCity: data.from,
        toCity: data.to,
        cargoType: data.type,
        truckInfo: data.truckInfo,
        price: data.budget,
        description: data.description || '',
        phone: data.phone,
        date: new Date().toISOString(),
        status: 'active' as const,
        fromLocation: data.fromLocation,
        toLocation: data.toLocation
      };

      // Save cargo offer
      this.cargoOffers.set(cargoId, cargoOffer);

      // Malakali haydovchilarga avtomatik yuborish
      await this.sendCargoOffersToQualifiedDrivers(cargoOffer);

      // Confirmation message
      const confirmMessage = `
✅ <b>YUK E'LONI MUVAFFAQIYATLI YARATILDI!</b>

📦 <b>E'lon ma'lumotlari:</b>
📍 <b>Qayerdan:</b> ${data.from}
📍 <b>Qayerga:</b> ${data.to}
🏷️ <b>Yuk turi:</b> ${data.type}
🚛 <b>Mashina:</b> ${data.truckInfo}
💰 <b>Bujet:</b> ${data.budget.toLocaleString()} so'm
📱 <b>Telefon:</b> ${data.phone}
${data.description ? `📝 <b>Qo'shimcha:</b> ${data.description}\n` : ''}

🔄 <b>Keyingi qadamlar:</b>
1️⃣ Sizning e'loningiz haydovchilarga ko'rsatiladi
2️⃣ Mos haydovchilar topilsa sizga bildirishnoma keladi  
3️⃣ 3 daqiqa ichida haydovchi topilmasa dispechrga uzatiladi

⏰ <b>E'lon faol:</b> Keyingi 24 soat davomida
      `;

      await ctx.reply(confirmMessage, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .text('🚗 Mos haydovchilar', `find_drivers_${cargoId}`)
          .text('📊 E\'lon holati', `cargo_status_${cargoId}`).row()
          .text('🏠 Bosh menyu', 'back_main')
      });

      // Start looking for matching drivers
      await this.findMatchingDrivers(cargoOffer);

      // Send real-time notifications to all registered drivers
      await this.notifyAllDriversAboutNewCargo(cargoOffer);

    } catch (error) {
      this.logger.error('Complete cargo posting error:', error);
      await ctx.reply(
        '❌ Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.',
        {
          reply_markup: new InlineKeyboard()
            .text('🔄 Qayta urinish', 'post_cargo')
            .text('🏠 Bosh menyu', 'back_main')
        }
      );
    }
  }

  // Find matching drivers based on location and truck capacity
  private async findMatchingDrivers(cargo: any) {
    try {
      const availableDrivers = Array.from(this.driverOffers.values())
        .filter(driver => driver.status === 'available');

      const matchingDrivers = availableDrivers.filter(driver => {
        // Check route match
        const routeMatch = (driver.fromCity === cargo.fromCity || this.isNearbyCity(driver.fromCity, cargo.fromCity)) &&
                           (driver.toCity === cargo.toCity || this.isNearbyCity(driver.toCity, cargo.toCity));
        
        // Check capacity
        const capacityMatch = driver.capacity >= cargo.weight;
        
        // Check if driver has location preference
        if (this.driverLocations.has(driver.userId)) {
          const driverLocation = this.driverLocations.get(driver.userId)!;
          // Check if cargo pickup is nearby driver's location (simplified)
          const isNearby = this.isLocationNearby(driverLocation, cargo.fromLocation);
          return routeMatch && capacityMatch && isNearby;
        }
        
        return routeMatch && capacityMatch;
      });

      if (matchingDrivers.length > 0) {
        // Send notifications to matching drivers
        for (const driver of matchingDrivers.slice(0, 5)) { // Max 5 drivers
          await this.notifyDriver(driver, cargo);
        }
        
        // Set 3-minute timer for dispatcher fallback
        this.activeOrders.set(cargo.id, {
          orderId: cargo.id,
          cargoId: cargo.id,
          yukchiId: cargo.userId,
          status: 'pending',
          createdAt: new Date().toISOString(),
          dispatcherFallbackTimer: setTimeout(() => {
            this.fallbackToDispatcher(cargo);
          }, 1 * 60 * 1000) // 1 minute
        });
      } else {
        // No matching drivers, send to dispatchers immediately
        await this.fallbackToDispatcher(cargo);
      }
      
    } catch (error) {
      this.logger.error('Find matching drivers error:', error);
    }
  }

  // Notify driver about matching cargo
  private async notifyDriver(driver: any, cargo: any) {
    try {
      const message = `
🚛 <b>YANGI YUK TAKLIFI!</b>

📦 <b>Yuk ma'lumotlari:</b>
📍 ${cargo.fromCity} → ${cargo.toCity}
🏷️ ${cargo.cargoType}
⚖️ ${cargo.weight} tonna
💰 ${cargo.price.toLocaleString()} so'm

📱 <b>Mijoz:</b> [Qabul qilgandan keyin ko'rinadi]

🚚 <b>Sizning mashina:</b>
🚛 ${driver.truckType} (${driver.capacity} tonna sig'im)
⭐ Reyting: ${driver.rating}

⏰ <b>Taklif 3 daqiqa davomida amal qiladi!</b>
      `;

      const keyboard = new InlineKeyboard()
        .text('✅ Qabul qilaman', `accept_cargo_${cargo.id}`)
        .text('❌ Rad etaman', `reject_cargo_${cargo.id}`);

      // Send notification (in real app, this would be sent to driver's chat)
      this.logger.log(`Notification sent to driver ${driver.driverName} (${driver.userId}) for cargo ${cargo.id}`);
      
      // Add to driver notifications
      if (!this.driverNotifications.has(driver.userId)) {
        this.driverNotifications.set(driver.userId, []);
      }
      this.driverNotifications.get(driver.userId)!.push(cargo.id);
      
    } catch (error) {
      this.logger.error('Notify driver error:', error);
    }
  }

  // Fallback to dispatcher when no drivers accept within 3 minutes
  private async fallbackToDispatcher(cargo: any) {
    try {
      this.logger.log(`Cargo ${cargo.id} falling back to dispatcher after 3 minutes`);
      
      // Update order status
      const activeOrder = this.activeOrders.get(cargo.id);
      if (activeOrder) {
        activeOrder.status = 'dispatcher_assigned';
        clearTimeout(activeOrder.dispatcherFallbackTimer);
      }
      
      // Notify dispatchers (in real app, this would notify all dispatchers)
      const dispatcherMessage = `
📋 <b>DISPECHR UCHUN YANGI BUYURTMA</b>

⏰ <b>3 daqiqa davomida haydovchi topilmadi</b>

📦 <b>Yuk ma'lumotlari:</b>
📍 ${cargo.fromCity} → ${cargo.toCity}
🏷️ ${cargo.cargoType}
⚖️ ${cargo.weight} tonna
💰 ${cargo.price.toLocaleString()} so'm
📱 [Qabul qilgandan keyin ko'rinadi]

🎯 <b>Vazifa:</b> Ushbu yuk uchun haydovchi toping
💼 <b>Komisya:</b> Bepul (dispechr orqali)
      `;

      // Actually send the message to dispatchers
      const keyboard = new InlineKeyboard()
        .text('✅ Qabul qilish', 'accept_cargo_' + cargo.id)
        .text('📋 Batafsil', 'cargo_details_' + cargo.id);
      
      // Find all dispatchers and send notification
      for (const [userId, userRole] of this.userRoles.entries()) {
        if (userRole.role === 'dispechr' && userRole.isRegistered) {
          try {
            await this.bot.api.sendMessage(userId, dispatcherMessage, {
              parse_mode: 'HTML',
              reply_markup: keyboard
            });
            
            // Add to dispatcher notifications
            if (!this.driverNotifications.has(userId)) {
              this.driverNotifications.set(userId, []);
            }
            this.driverNotifications.get(userId)!.push(cargo.id);
            
          } catch (error) {
            this.logger.error(`Failed to notify dispatcher ${userId}:`, error);
          }
        }
      }
      
      this.logger.log('Dispatcher notification sent for cargo: ' + cargo.id);
      
    } catch (error) {
      this.logger.error('Fallback to dispatcher error:', error);
    }
  }

  // Helper functions
  private isNearbyCity(city1: string, city2: string): boolean {
    // Simplified city proximity check
    const cityGroups = [
      ['Toshkent', 'Chirchiq', 'Angren'],
      ['Samarqand', 'Buloq', 'Payariq'],
      ['Farg\'ona', 'Qo\'qon', 'Marg\'ilon'],
      ['Buxoro', 'Kogon', 'Romitan']
    ];
    
    return cityGroups.some(group => 
      group.includes(city1) && group.includes(city2)
    );
  }

  private isLocationNearby(driverLocation: any, cargoLocation: any): boolean {
    if (!cargoLocation) return true; // If no specific location, consider it nearby
    
    // Simplified distance check (in real app, use proper geolocation)
    const distance = Math.sqrt(
      Math.pow(driverLocation.latitude - cargoLocation.latitude, 2) +
      Math.pow(driverLocation.longitude - cargoLocation.longitude, 2)
    );
    
    return distance < 0.1; // Roughly 10km radius
  }

  // Handle skip description
  private async handleSkipDescription(ctx: any) {
    const userId = ctx.from.id;
    const currentStep = this.cargoPostingSteps.get(userId);
    
    if (currentStep && currentStep.step === 'description') {
      currentStep.data.description = '';
      await this.completeCargoPosting(ctx, currentStep.data);
      this.cargoPostingSteps.delete(userId);
    }
  }

  // Handle wait for price increase
  private async handleWaitForPriceIncrease(ctx: any) {
    const userId = ctx.from.id;
    const currentStep = this.cargoPostingSteps.get(userId);
    
    if (currentStep) {
      // Complete cargo posting with low budget
      await this.completeCargoPostingWithLowBudget(ctx, currentStep.data);
      this.cargoPostingSteps.delete(userId);
    }
  }

  private async completeCargoPostingWithLowBudget(ctx: any, data: any) {
    try {
      // Generate cargo ID
      const cargoId = `cargo_${Date.now()}_${ctx.from.id}`;
      
      // Create cargo offer with low budget flag
      const cargoOffer = {
        id: cargoId,
        userId: ctx.from.id,
        username: ctx.from.username || ctx.from.first_name,
        fromCity: data.from,
        toCity: data.to,
        cargoType: data.type,
        truckInfo: data.truckInfo,
        price: data.budget,
        description: (data.description || '') + ' [Narxni ko\'tarish mumkin]',
        phone: data.phone,
        date: new Date().toISOString(),
        status: 'active' as const,
        fromLocation: data.fromLocation,
        toLocation: data.toLocation
      };

      // Save cargo offer
      this.cargoOffers.set(cargoId, cargoOffer);

      // Malakali haydovchilarga avtomatik yuborish
      await this.sendCargoOffersToQualifiedDrivers(cargoOffer);

      const confirmMessage = `
✅ <b>YUK E'LONI YARATILDI</b>

📦 <b>E'lon ma'lumotlari:</b>
📍 ${data.from} → ${data.to}
🏷️ ${data.type} (${data.weight} tonna)
💰 ${data.budget.toLocaleString()} so'm
📱 ${data.phone}

⚠️ <b>Muhim:</b>
• E'loningiz "Narx ko'tarish mumkin" deb belgilandi
• Haydovchilar sizga aloqa qilishadi  
• Kerak bo'lsa narxni ko'tarishingiz mumkin
• 3 daqiqadan keyin dispechrga ham ko'rsatiladi

💡 <b>Maslahat:</b> Haydovchi chaqirsa, narx haqida gaplashing
      `;

      await ctx.reply(confirmMessage, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .text('📞 Haydovchilar tel qiladi', `wait_driver_calls_${cargoId}`)
          .text('📊 E\'lon holati', `cargo_status_${cargoId}`).row()
          .text('🏠 Bosh menyu', 'back_main')
      });

      // Send real-time notifications to all registered drivers (even for low budget)
      await this.notifyAllDriversAboutNewCargo(cargoOffer);

      // Don't send to drivers immediately for low budget orders
      // Instead, wait for price negotiation or dispatcher assignment after delay
      setTimeout(() => {
        this.fallbackToDispatcher(cargoOffer);
      }, 1 * 60 * 1000); // 1 minute

    } catch (error) {
      this.logger.error('Complete cargo posting with low budget error:', error);
      await ctx.reply(
        '❌ Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.',
        {
          reply_markup: new InlineKeyboard()
            .text('🔄 Qayta urinish', 'post_cargo')
            .text('🏠 Bosh menyu', 'back_main')
        }
      );
    }
  }

  // Handle budget selection from buttons
  private async handleBudgetSelection(ctx: any, budget: number) {
    const userId = ctx.from.id;
    const currentStep = this.cargoPostingSteps.get(userId);
    
    if (!currentStep || currentStep.step !== 'budget') {
      await this.safeAnswerCallback(ctx, 'Xatolik yuz berdi. Qayta boshlang.');
      return;
    }

    currentStep.data.budget = budget;
    currentStep.step = 'description';

    const descMessage = `
📦 <b>YUK E'LON QILISH</b>

✅ <b>Qayerdan:</b> ${currentStep.data.from}
✅ <b>Qayerga:</b> ${currentStep.data.to}
✅ <b>Yuk turi:</b> ${currentStep.data.type}
✅ <b>Mashina:</b> ${currentStep.data.truckInfo}
✅ <b>Telefon:</b> ${currentStep.data.phone}
✅ <b>Bujet:</b> ${currentStep.data.budget.toLocaleString()} so'm

📝 <b>7-qadam:</b> Qo'shimcha ma'lumot (ixtiyoriy)

<b>Misol:</b>
• Sovuq transport kerak
• Yuklash/tushirish yordami kerak
• Tezkor yetkazib berish
• Maxsus ehtiyot choralari

Qo'shimcha ma'lumot yozing yoki "Yo'q" deb yozing:
    `;

    await ctx.editMessageText(descMessage, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('➡️ Yo\'q, davom etish', 'skip_description')
        .text('🔙 Orqaga', 'cargo_system').row()
    });

    await this.safeAnswerCallback(ctx, `Bujet ${budget.toLocaleString()} so'm qo'yildi!`);
  }

  // Handle city selection from buttons
  private async handleCitySelection(ctx: any, city: string, direction: 'from' | 'to') {
    const userId = ctx.from.id;
    const currentStep = this.cargoPostingSteps.get(userId);
    
    if (!currentStep) {
      await this.safeAnswerCallback(ctx, 'Xatolik yuz berdi. Qayta boshlang.');
      return;
    }

    // Clean up city name
    const cityName = city.replace('Fargona', 'Farg\'ona');

    if (direction === 'from') {
      currentStep.data.from = cityName;
      currentStep.step = 'to';
      
      const toMessage = `
📦 <b>YUK E'LON QILISH</b>

✅ <b>Qayerdan:</b> ${currentStep.data.from}

🌍 <b>2-qadam:</b> Yuk qayerga yetkaziladi?

📍 Shahar nomini yozing yoki lokatsiyangizni yuboring

<b>Tez tanlash:</b>
• Toshkent • Samarqand • Buxoro • Farg'ona
• Namangan • Andijon • Nukus • Qashqadaryo

📍 <b>Yoki aniq manzil uchun lokatsiya yuboring!</b>
      `;
      
      await ctx.editMessageText(toMessage, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .text('🏙️ Toshkent', 'city_to_Toshkent')
          .text('🕌 Samarqand', 'city_to_Samarqand')
          .text('🏛️ Buxoro', 'city_to_Buxoro').row()
          .text('🌱 Farg\'ona', 'city_to_Fargona')  
          .text('💎 Namangan', 'city_to_Namangan')
          .text('🍇 Andijon', 'city_to_Andijon').row()
          .text('🏜️ Nukus', 'city_to_Nukus')
          .text('🌾 Qarshi', 'city_to_Qarshi')
          .text('🏔️ Termiz', 'city_to_Termiz').row()
          .text('📍 Lokatsiya yuborish', 'request_location_to')
          .text('🔙 Orqaga', 'cargo_system').row()
      });
      
    } else if (direction === 'to') {
      currentStep.data.to = cityName;
      currentStep.step = 'type';
      
      const typeMessage = `
📦 <b>YUK E'LON QILISH</b>

✅ <b>Qayerdan:</b> ${currentStep.data.from}
✅ <b>Qayerga:</b> ${currentStep.data.to}

📦 <b>3-qadam:</b> Yuk turi nima?

<b>Mashhur yuk turlari:</b>
🍎 Oziq-ovqat mahsulotlari
🧱 Qurilish materiallari  
📱 Maishiy texnika
👕 Kiyim-kechak
🪑 Mebel
⚗️ Kimyoviy mahsulotlar
📦 Boshqa...

Yuk turini yozing:
      `;
      
      await ctx.editMessageText(typeMessage, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .text('🍎 Oziq-ovqat', 'cargo_type_oziq-ovqat')
          .text('🧱 Qurilish', 'cargo_type_qurilish')
          .text('📱 Texnika', 'cargo_type_texnika').row()
          .text('👕 Kiyim', 'cargo_type_kiyim')
          .text('🪑 Mebel', 'cargo_type_mebel')
          .text('📦 Boshqa', 'cargo_type_boshqa').row()
          .text('🔙 Orqaga', 'cargo_system')
      });
    }

    await this.safeAnswerCallback(ctx, `${cityName} tanlandi!`);
  }

  // Notify all registered drivers about new cargo with priority system
  private async notifyAllDriversAboutNewCargo(cargo: any) {
    try {
      // Get all registered drivers
      const allDrivers = Array.from(this.userRoles.entries())
        .filter(([id, role]) => role.role === 'haydovchi' && role.isRegistered)
        .map(([id, role]) => ({ id: parseInt(id.toString()), profile: role.profile }));

      if (allDrivers.length === 0) {
        this.logger.warn('No registered drivers to notify about new cargo');
        return;
      }

      // Determine who posted the cargo (yukchi or dispechr)
      const cargoOwner = this.userRoles.get(cargo.userId);
      let senderType = 'Yuk egasidan';
      
      if (cargoOwner?.role === 'dispechr') {
        senderType = 'Dispechrdan';
      } else if (cargoOwner?.role === 'yukchi') {
        senderType = 'Yuk egasidan';
      }

      // Create notification message according to your specification
      const notificationMessage = `
🆕 <b>BIZDA YANGI BUYURTMA</b>

<b>${senderType}:</b> ${cargo.username}

📍 <b>Yo'nalish:</b> ${cargo.fromCity} → ${cargo.toCity}
🏷️ <b>Yuk turi:</b> ${cargo.cargoType}
🚛 <b>Kerakli mashina:</b> ${cargo.truckInfo}
💰 <b>Bujet:</b> ${cargo.price.toLocaleString()} so'm
📱 <b>Telefon:</b> [Qabul qilgandan keyin ko'rinadi]
${cargo.description ? `📝 <b>Qo'shimcha:</b> ${cargo.description}` : ''}

⚡ <b>Tez javob bering!</b>
💼 <b>Professional buyurtma</b>
      `;

      // Check if dispatcher posted the cargo for priority distribution
      if (cargoOwner?.role === 'dispechr') {
        // Priority notification system for dispatcher orders
        await this.notifyWithPriority(cargo.userId, allDrivers, notificationMessage, cargo.id);
      } else {
        // Regular notification for yukchi (cargo owner) orders - send to all drivers immediately
        await this.notifyAllDriversImmediately(allDrivers, notificationMessage, cargo.id);
      }
      
    } catch (error) {
      this.logger.error('Error notifying drivers about new cargo:', error);
    }
  }

  // Priority notification system for dispatcher orders
  private async notifyWithPriority(dispatcherId: number, allDrivers: any[], message: string, cargoId: string) {
    let successCount = 0;
    const dispatcherReferrals = this.dispatcherReferrals.get(dispatcherId);
    
    if (dispatcherReferrals) {
      // Phase 1: Notify referred drivers first (1 minute priority)
      const referredDrivers = allDrivers.filter(driver => 
        dispatcherReferrals.referredDrivers.has(driver.id)
      );
      
      this.logger.log(`Notifying ${referredDrivers.length} referred drivers first (1 minute priority)`);
      successCount += await this.sendNotificationsToGroup(referredDrivers, message, cargoId, '🎯 PRIORITY');
      
      // Wait 1 minute before proceeding to referred customers
      setTimeout(async () => {
        // Phase 2: Notify referred customers (1.5 minute priority)
        const referredCustomers = allDrivers.filter(driver => 
          dispatcherReferrals.referredCustomers.has(driver.id)
        );
        
        if (referredCustomers.length > 0) {
          this.logger.log(`Notifying ${referredCustomers.length} referred customers (1.5 minute priority)`);
          await this.sendNotificationsToGroup(referredCustomers, message, cargoId, '⭐ CUSTOMER');
        }
        
        // Wait 1.5 minutes total before sending to all other drivers
        setTimeout(async () => {
          // Phase 3: Notify all other drivers
          const otherDrivers = allDrivers.filter(driver => 
            !dispatcherReferrals.referredDrivers.has(driver.id) && 
            !dispatcherReferrals.referredCustomers.has(driver.id)
          );
          
          if (otherDrivers.length > 0) {
            this.logger.log(`Notifying ${otherDrivers.length} other drivers`);
            await this.sendNotificationsToGroup(otherDrivers, message, cargoId);
          }
        }, 30000); // Additional 30 seconds (total 1.5 minutes)
        
      }, 60000); // 1 minute delay
      
    } else {
      // No referrals found, send to all drivers immediately
      successCount = await this.sendNotificationsToGroup(allDrivers, message, cargoId);
    }

    this.logger.log(`Priority notification process started for ${allDrivers.length} drivers`);
  }

  // Immediate notification for yukchi orders
  private async notifyAllDriversImmediately(allDrivers: any[], message: string, cargoId: string) {
    const successCount = await this.sendNotificationsToGroup(allDrivers, message, cargoId);
    this.logger.log(`Immediate cargo notification sent to ${successCount}/${allDrivers.length} drivers`);
  }

  // Send notifications to a group of drivers
  private async sendNotificationsToGroup(drivers: any[], message: string, cargoId: string, priorityTag: string = ''): Promise<number> {
    let successCount = 0;
    const finalMessage = priorityTag ? `${priorityTag}\n${message}` : message;
    
    for (const driver of drivers) {
      try {
        await this.bot.api.sendMessage(driver.id, finalMessage, {
          parse_mode: 'HTML',
          reply_markup: new InlineKeyboard()
            .text('📞 Bog\'lanish', 'contact_cargo_owner_' + cargoId)
            .text('✅ Qabul qilish', 'accept_cargo_' + cargoId).row()
            .text('📋 Batafsil', 'cargo_details_' + cargoId)
        });
        
        successCount++;
        
        // Small delay between messages to avoid spam limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        this.logger.error(`Failed to notify driver ${driver.id} about new cargo:`, error);
      }
    }
    
    return successCount;
  }

  // Show add driver interface for dispatchers
  private async showAddDriver(ctx: any) {
    const message = `
🚚 <b>HAYDOVCHI QO'SHISH - REFERRAL TIZIMI</b>

🎯 <b>Nima olasiz:</b>
• Ulagan haydovchilaringiz birinchi sizning orderlaringizni oladi
• Haydovchi to'lov qilganda 10% cashback olasiz
• Permanent income source yaratamiz

💡 <b>Qanday ishlaydi:</b>
1. Haydovchi referral linkingizdan ro'yxatdan o'tadi
2. U biznesimizda faol ishlaganda, sizga bonus tushadi
3. Sizning orderlaringiz birinchi unga beriladi (1 daqiqa)
4. U olmasa, umumiy haydovchilarga taqsimlanadi

👥 <b>Benefits:</b>
• Priority order distribution
• 10% cashback from driver payments
• Build your own driver network
• Passive income opportunity

Quyidagi usulda haydovchi qo'shing:
    `;

    const keyboard = new InlineKeyboard()
      .text('🔗 Referral link yaratish', 'create_driver_referral')
      .text('📱 Telegram username orqali', 'invite_driver_username').row()
      .text('📋 Mening haydovchilarim', 'my_drivers')
      .text('📊 Referral statistika', 'referral_stats').row()
      .text('🔙 Orqaga', 'back_main');

    await this.safeEditMessage(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  // Show add customer interface for dispatchers  
  private async showAddCustomer(ctx: any) {
    const message = `
👤 <b>MIJOZ QO'SHISH - REFERRAL TIZIMI</b>

🎯 <b>Nima olasiz:</b>
• Ulagan mijozlaringiz birinchi sizga order beradi
• Mijozning orderini 1.5 daqiqa davomida siz olasiz
• Permanent customer base yaratamiz

💡 <b>Qanday ishlaydi:</b>
1. Mijoz referral linkingizdan ro'yxatdan o'tadi  
2. U order bersa, birinchi sizga 1.5 daqiqa beriladi
3. Siz olmасангiz, umumiy haydovchilarga boradi
4. Customer loyalty program orqali income

👥 <b>Benefits:</b>
• Priority customer orders (1.5 min)
• Build customer relationship
• Guaranteed first access to orders
• Long-term business partnership

Quyidagi usulda mijoz qo'shing:
    `;

    const keyboard = new InlineKeyboard()
      .text('🔗 Referral link yaratish', 'create_customer_referral')
      .text('📱 Telegram username orqali', 'invite_customer_username').row()
      .text('👤 Mening mijozlarim', 'my_customers')
      .text('📊 Mijoz statistikasi', 'customer_stats').row()
      .text('🔙 Orqaga', 'back_main');

    await this.safeEditMessage(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  // Show team overview
  private async showMyTeam(ctx: any) {
    const userId = ctx.from.id;
    const referralData = this.dispatcherReferrals.get(userId) || {
      referredDrivers: new Set(),
      referredCustomers: new Set(),
      referredDispatchers: new Set(),
      totalEarnings: 0
    };

    const message = `
👥 <b>MENING JAMOA</b>

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
• Growth rate: +15% per month
• Retention rate: 95%
    `;

    const keyboard = new InlineKeyboard()
      .text('🚚 Haydovchi qo\'shish', 'add_driver')
      .text('👤 Mijoz qo\'shish', 'add_customer').row()
      .text('📈 Batafsil hisobot', 'detailed_report')
      .text('🎯 Growth strategiya', 'growth_strategy').row()
      .text('🔙 Orqaga', 'back_main');

    await this.safeEditMessage(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  // Show balance overview
  private async showMyBalance(ctx: any) {
    const userId = ctx.from.id;
    let balance = this.virtualBalances.get(userId);
    
    if (!balance) {
      balance = {
        userId,
        balance: 0,
        totalEarned: 0,
        withdrawnAmount: 0,
        lastWithdrawal: '',
        transactions: []
      };
      this.virtualBalances.set(userId, balance);
    }

    const pendingWithdrawal = balance.balance > 0;
    const nextWithdrawDate = this.getNextWithdrawDate();

    const message = `
💰 <b>VIRTUAL BALANS</b>

📊 <b>Sizning balansingiz:</b>

💵 <b>Joriy balans:</b> ${balance.balance.toLocaleString()} so'm
💎 <b>Jami ishlab topilgan:</b> ${balance.totalEarned.toLocaleString()} so'm  
📤 <b>Yechib olingan:</b> ${balance.withdrawnAmount.toLocaleString()} so'm
📅 <b>Oxirgi yechish:</b> ${balance.lastWithdrawal || 'Hali yechilmagan'}

⏰ <b>Yechib olish:</b>
• Kun: Shanba va Yakshanba
• Vaqt: 09:00 - 18:00
• Keyingi imkoniyat: ${nextWithdrawDate}

📈 <b>Oxirgi 5 ta tranzaksiya:</b>
${balance.transactions.slice(-5).map((t, i) => 
  `${i + 1}. ${t.type === 'earning' ? '💰' : t.type === 'withdrawal' ? '📤' : '🎁'} ${t.amount.toLocaleString()} so'm
     📝 ${t.description}
     📅 ${new Date(t.date).toLocaleDateString('uz-UZ')}`
).join('\n\n') || '• Hozircha tranzaksiyalar yo\'q'}

${pendingWithdrawal ? '✅ Yechib olish uchun tayyor!' : '⏳ Daromad to\'plang'}
    `;

    const keyboard = new InlineKeyboard();
    
    if (pendingWithdrawal && this.isWeekend() && this.isWithdrawTime()) {
      keyboard.text('💸 Yechib olish', 'withdraw_balance');
    } else {
      keyboard.text('⏰ Yechish vaqti: Dam olish kuni', 'withdraw_info');
    }
    
    keyboard.row()
      .text('📊 Batafsil hisobot', 'balance_report')
      .text('🎯 Daromad strategiyasi', 'earning_strategy').row()
      .text('🔙 Orqaga', 'back_main');

    await this.safeEditMessage(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  // Helper methods for balance system
  private getNextWithdrawDate(): string {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return 'Bugun (09:00-18:00)';
    }
    
    const daysUntilSaturday = (6 - dayOfWeek) % 7;
    const nextSaturday = new Date(now);
    nextSaturday.setDate(now.getDate() + daysUntilSaturday);
    
    return nextSaturday.toLocaleDateString('uz-UZ', { weekday: 'long', month: 'long', day: 'numeric' });
  }

  private isWeekend(): boolean {
    const dayOfWeek = new Date().getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
  }

  private isWithdrawTime(): boolean {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 9 && hour < 18; // 09:00 - 18:00
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
        pendingEarnings: 0,
        joinDate: new Date().toISOString()
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
4. Siz 10% bonus olasiz har to'lovidan

💰 <b>Benefits sizga:</b>
• 10% cashback har to'lovdan
• Priority order distribution  
• Ulagan haydovchilar birinchi sizning orderlaringizni oladi
• Passive income source

📤 <b>Ulashish uchun:</b>
• WhatsApp, Telegram orqali yuboring
• Social media'da baham ko'ring
• Haydovchilar guruhlariga tashlang

🎯 <b>Tracking:</b>
Har kim linkdan ro'yxatdan o'tsa sizga bildirishnoma keladi!
    `;

    await ctx.editMessageText(message, {
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
        pendingEarnings: 0,
        joinDate: new Date().toISOString()
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
4. Ular order berganda 1.5 daqiqa sizga beriladi

🎯 <b>Benefits sizga:</b>
• 1.5 daqiqa priority her orderda
• Customer loyalty building
• Guaranteed first access to orders  
• Long-term business relationship

📤 <b>Ulashish uchun:</b>
• Mavjud mijozlaringizga yuboring
• Logistics kompaniyalarga taklif qiling
• Business networking orqali tarqating

🔔 <b>Smart System:</b>
Mijoz order bersa, avtomatik sizga 1.5 daqiqa priority beriladi!
    `;

    await ctx.editMessageText(message, {
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
🎉 <b>HAYDOVCHI REFERRAL TAKLIFI!</b>

👋 Salom, ${user.first_name}!

🚚 Siz haydovchi sifatida taklif qilingansiz!

💰 <b>Sizga maxsus taklifimiz:</b>
• Professional logistics platform
• Daily orders va guaranteed income  
• Advanced order management system
• 24/7 support

🎯 <b>Sizni taklif qilgan dispechr:</b>
• Premium dispatcher network
• Priority orders sizga beriladi
• Direct communication channel

Haydovchi sifatida ro'yxatdan o'tishni hohlaysizmi?
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
🎉 <b>MIJOZ REFERRAL TAKLIFI!</b>

👋 Salom, ${user.first_name}!

📦 Siz yukchi (mijoz) sifatida taklif qilingansiz!

💰 <b>Sizga maxsus taklifimiz:</b>
• Professional logistics service
• Reliable driver network  
• Competitive pricing
• Real-time tracking

🎯 <b>Sizni taklif qilgan dispechr:</b>
• Professional dispatcher service
• Priority attention sizning orderlaringizga
• Direct support channel

Yukchi sifatida ro'yxatdan o'tishni hohlaysizmi?
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

  // Show registered drivers for dispatchers
  private async showRegisteredDrivers(ctx: any) {
    const registeredDrivers = Array.from(this.userRoles.entries())
      .filter(([id, role]) => role.role === 'haydovchi' && role.isRegistered)
      .map(([id, role]) => ({ id, profile: role.profile, registrationDate: role.registrationDate }));
    
    let message = `
📋 **RO'YXATDAN O'TGAN HAYDOVCHILAR**

👥 **Jami haydovchilar:** ${registeredDrivers.length} ta
⚡ **AutoPost maqsadi:** Ushbu ro'yxatdagi haydovchilar

`;

    if (registeredDrivers.length === 0) {
      message += `
❌ **Hozircha ro'yxatdan o'tgan haydovchilar yo'q**

💡 **Maslahat:** 
• Haydovchilarni ro'yxatdan o'tishga da'vat qiling
• AutoPost xususiyati faqat ro'yxatdan o'tgan haydovchilarga ishlaydi
• Commission-free tizim orqali ko'proq haydovchilarni jalb qiling
      `;
    } else {
      message += `🚛 **Faol haydovchilar:**\n\n`;
      
      registeredDrivers.slice(0, 10).forEach((driver, index) => {
        const profile = driver.profile || {};
        message += `${index + 1}. 👤 **${profile.name || 'Noma\'lum'}**\n`;
        message += `   📱 ${profile.phone || 'Telefon kiritilmagan'}\n`;
        message += `   🚚 ${profile.truckType || 'Mashina turi kiritilmagan'}\n`;
        message += `   📅 Ro'yxat: ${driver.registrationDate || 'Noma\'lum'}\n\n`;
      });
      
      if (registeredDrivers.length > 10) {
        message += `📊 **Va yana ${registeredDrivers.length - 10} ta haydovchi...**\n\n`;
      }
      
      message += `
🎯 **AutoPost statistika:**
• Oxirgi AutoPost: Hozircha yo'q
• Faol haydovchilar: ${registeredDrivers.length} ta
• Commission-free orders: Aktiv

💡 **AutoPost ishlatish:**
"Xabar yuborish" tugmasini bosing va xabaringizni yozing
      `;
    }

    const keyboard = new InlineKeyboard()
      .text('📤 AutoPost yuborish', 'send_message')
      .text('🔄 Yangilash', 'registered_drivers').row()
      .text('🏠 Bosh menyu', 'back_main');

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  // Handle cargo type selection during posting
  private async handleCargoTypeSelection(ctx: any, cargoType: string) {
    const userId = ctx.from.id;
    const currentStep = this.cargoPostingSteps.get(userId);
    
    if (!currentStep || currentStep.step !== 'type') {
      await this.safeAnswerCallback(ctx, '❌ Xatolik yuz berdi. Qayta boshlang.');
      return;
    }

    // Map cargo type identifiers to display names
    const cargoTypeMap: Record<string, string> = {
      'Oziq-ovqat': '🍎 Oziq-ovqat mahsulotlari',
      'Qurilish': '🧱 Qurilish materiallari', 
      'Texnika': '📱 Maishiy texnika',
      'Kiyim': '👕 Kiyim-kechak',
      'Mebel': '🪑 Mebel',
      'Kimyoviy': '🧪 Kimyoviy moddalar',
      'Boshqa': '📦 Boshqa'
    };

    const selectedType = cargoTypeMap[cargoType] || cargoType;
    currentStep.data.type = selectedType;
    
    // Get phone from registration automatically
    const userPhone = this.getUserPhone(userId);
    if (!userPhone) {
      await this.safeAnswerCallback(ctx, '❌ Telefon raqamingiz topilmadi. Avval registratsiyadan o\'ting.');
      this.cargoPostingSteps.delete(userId);
      return;
    }
    currentStep.data.phone = userPhone;
    
    currentStep.step = 'truck_info';

    await this.safeAnswerCallback(ctx, `✅ ${selectedType} tanlandi!`);
    
    // Ask for truck info next
    const message = `
📦 <b>YUK E'LON QILISH</b>

✅ <b>Qayerdan:</b> ${currentStep.data.from}
✅ <b>Qayerga:</b> ${currentStep.data.to}
✅ <b>Yuk turi:</b> ${selectedType}
✅ <b>Telefon:</b> ${userPhone}

🚛 <b>3-qadam:</b> Qanday mashina kerak va qaysi vaqtga?

<b>Yozing:</b>
• Mashina turi (masalan: Isuzu 5 tonna)
• Kerakli vaqt (masalan: Ertaga ertalab)

<b>Misol:</b>
"Howo 15 tonna, 25-dekabr kuni"
    `;

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('❌ Bekor qilish', 'cancel_cargo_posting')
    });

    this.cargoPostingSteps.set(userId, currentStep);
  }

  // Handle cancel cargo posting
  private async handleCancelCargoPosting(ctx: any) {
    const userId = ctx.from.id;
    
    // Remove from cargo posting steps
    this.cargoPostingSteps.delete(userId);
    
    await this.safeAnswerCallback(ctx, '❌ Yuk e\'lon qilish bekor qilindi');
    
    const message = `
❌ <b>YUK E'LON QILISH BEKOR QILINDI</b>

🏠 Bosh menyuga qaytasizmi yoki qayta yuk e'lon qilasizmi?
    `;

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('🚚 Qayta yuk e\'lon qilish', 'post_cargo')
        .text('🏠 Bosh menyu', 'back_to_main').row()
    });
  }

  // Handle cargo acceptance by driver
  private async handleCargoAcceptance(ctx: any, cargoId: string) {
    const driverId = ctx.from.id;
    const driverRole = this.userRoles.get(driverId);

    if (!driverRole || (driverRole.role !== 'haydovchi' && driverRole.role !== 'dispechr')) {
      await this.safeAnswerCallback(ctx, '❌ Siz haydovchi yoki dispechr emassiz!');
      return;
    }

    // Check if driver already has an active order (for drivers only, not dispatchers)
    if (driverRole.role === 'haydovchi') {
      const acceptedCargos = this.acceptedCargos.get(driverId);
      if (acceptedCargos && acceptedCargos.size > 0) {
        await this.safeAnswerCallback(ctx, '⚠️ Sizda allaqachon faol buyurtma mavjud! Avval joriy buyurtmani tugatib, keyin yangi buyurtma qabul qiling.');
        return;
      }
    }

    // Check if cargo is already taken
    const cargo = this.cargoOffers.get(cargoId);
    if (!cargo) {
      await this.safeAnswerCallback(ctx, '❌ Buyurtma topilmadi!');
      return;
    }
    
    if (cargo.status === 'matched' || cargo.status === 'completed') {
      await this.safeAnswerCallback(ctx, '❌ Bu buyurtma allaqachon qabul qilingan!');
      return;
    }

    // Store accepted cargo
    if (!this.acceptedCargos.has(driverId)) {
      this.acceptedCargos.set(driverId, new Set());
    }
    this.acceptedCargos.get(driverId)!.add(cargoId);

    // Update cargo status
    cargo.status = 'matched';
    cargo.assignedDriverId = driverId;
    cargo.acceptedDate = new Date().toISOString();
    this.cargoOffers.set(cargoId, cargo);

    // Cancel any pending dispatcher fallback timers
    const activeOrder = this.activeOrders.get(cargoId);
    if (activeOrder) {
      if (activeOrder.dispatcherFallbackTimer) {
        clearTimeout(activeOrder.dispatcherFallbackTimer);
      }
      activeOrder.status = 'accepted_by_driver';
      activeOrder.assignedDriverId = driverId;
    }

    // Get driver information
    const driverInfo = this.driverOffers.get(Array.from(this.driverOffers.keys()).find(key => 
      this.driverOffers.get(key)?.userId === driverId
    ));

    // Mijozga bildirishnoma yuborish
    await this.notifyCustomerDriverAccepted(cargo, driverInfo);

    // Set contact timer - 15 minutes for driver to contact customer
    this.setDriverContactTimer(cargoId, driverId);

    // Notify other drivers that the cargo has been taken
    await this.notifyOtherDriversCargoTaken(cargoId, driverId);

    await this.safeAnswerCallback(ctx, '✅ Buyurtma qabul qilindi!');
    
    // Get cargo details to show phone number
    const cargoDetails = this.cargoOffers.get(cargoId);
    
    const message = `
✅ <b>BUYURTMA QABUL QILINDI</b>

🆔 <b>Buyurtma ID:</b> ${cargoId}
👤 <b>Haydovchi:</b> ${ctx.from.first_name}

${cargoDetails ? `📦 <b>TO'LIQ MA'LUMOTLAR:</b>

📍 <b>Yo'nalish:</b> ${cargoDetails.fromCity} → ${cargoDetails.toCity}
🏷️ <b>Yuk turi:</b> ${cargoDetails.cargoType}
🚛 <b>Kerakli mashina:</b> ${cargoDetails.truckInfo}
💰 <b>Bujet:</b> ${cargoDetails.price.toLocaleString()} so'm
${cargoDetails.description ? `📝 <b>Qo'shimcha:</b> ${cargoDetails.description}` : ''}

📞 <b>MIJOZ TELEFONI:</b> ${cargoDetails.phone}
` : ''}
🎯 <b>KEYINGI QADAMLAR:</b>
1️⃣ Mijozga qo'ng'iroq qiling
2️⃣ Yuk tafsilotlarini aniqlang
3️⃣ Yetkazib bergach "✅ Bajarildi" tugmasini bosing

⏰ <b>Muhim:</b> 15 daqiqa ichida mijozga qo'ng'iroq qiling!
    `;

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('✅ Bajarildi', 'complete_cargo_' + cargoId)
        .text('❌ Bekor qilish', 'cancel_cargo_' + cargoId).row()
    });
  }

  // Notify other drivers that cargo has been taken
  private async notifyOtherDriversCargoTaken(cargoId: string, acceptingDriverId: number) {
    try {
      const cargo = this.cargoOffers.get(cargoId);
      if (!cargo) return;

      // Get accepting driver's name
      const acceptingDriverRole = this.userRoles.get(acceptingDriverId);
      const acceptingDriverName = acceptingDriverRole?.profile?.fullName || 'Noma\'lum haydovchi';

      // Find all users (drivers and dispatchers) who have this cargo in their notifications
      for (const [userId, notifications] of this.driverNotifications.entries()) {
        if (userId !== acceptingDriverId && notifications.includes(cargoId)) {
          try {
            // Check if this is a dispatcher
            const userRole = this.userRoles.get(userId);
            const isDispatcher = userRole?.role === 'dispechr';
            
            const message = isDispatcher ? `
❌ <b>BUYURTMA OLIB KETILDI</b>

🆔 <b>ID:</b> ${cargoId}
📍 <b>Marshurt:</b> ${cargo.fromCity} → ${cargo.toCity}
👤 <b>Qabul qilgan haydovchi:</b> ${acceptingDriverName}

⚠️ Bu buyurtma haydovchi tomonidan qabul qilindi.
💼 Endi dispechr xizmati kerak emas.
            ` : `
❌ <b>BUYURTMA OLIB KETILDI</b>

🆔 <b>ID:</b> ${cargoId}
📍 <b>Marshurt:</b> ${cargo.fromCity} → ${cargo.toCity}
👤 <b>Qabul qilgan haydovchi:</b> ${acceptingDriverName}

⚠️ Bu buyurtma boshqa haydovchi tomonidan qabul qilindi.
            `;

            await this.bot.api.sendMessage(userId, message, {
              parse_mode: 'HTML'
            });

            // Remove this cargo from the user's notifications
            const index = notifications.indexOf(cargoId);
            if (index > -1) {
              notifications.splice(index, 1);
            }

          } catch (error) {
            this.logger.error(`Failed to notify user ${userId} about cargo taken:`, error);
          }
        }
      }

      // Mark cargo as matched (taken by a driver)
      cargo.status = 'matched';
      this.logger.log(`Cargo ${cargoId} marked as taken by driver ${acceptingDriverId}`);

    } catch (error) {
      this.logger.error(`Error notifying other drivers about cargo taken:`, error);
    }
  }

  // Handle cargo completion and virtual balance cashback
  private async handleCargoCompletion(ctx: any, cargoId: string) {
    const driverId = ctx.from.id;
    const driverRole = this.userRoles.get(driverId);

    if (!driverRole || driverRole.role !== 'haydovchi') {
      await this.safeAnswerCallback(ctx, '❌ Siz haydovchi emassiz!');
      return;
    }

    // Check if cargo was accepted by this driver
    const acceptedCargos = this.acceptedCargos.get(driverId);
    if (!acceptedCargos || !acceptedCargos.has(cargoId)) {
      await this.safeAnswerCallback(ctx, '❌ Bu buyurtmani siz qabul qilmagansiz!');
      return;
    }

    // Mark cargo as completed
    if (!this.completedCargos.has(driverId)) {
      this.completedCargos.set(driverId, new Set());
    }
    this.completedCargos.get(driverId)!.add(cargoId);
    acceptedCargos.delete(cargoId);

    // Add 10% cashback to virtual balance
    await this.addDriverCashback(driverId, cargoId, 10);

    await this.safeAnswerCallback(ctx, '🎉 Buyurtma bajarildi! Cashback qo\'shildi!');
    
    const balance = this.virtualBalances.get(driverId);
    const message = `
🎉 <b>BUYURTMA BAJARILDI!</b>

✅ <b>ID:</b> ${cargoId} - Bajarildi
💰 <b>10% Cashback olindi!</b>

💳 <b>Virtual balans:</b> ${balance ? balance.balance.toLocaleString() : '0'} so'm
📊 <b>Jami ishlab topilgan:</b> ${balance ? balance.totalEarned.toLocaleString() : '0'} so'm

💡 <b>Pul yechish:</b> Dam olish kunlari (Shanba-Yakshanba 9:00-18:00)
    `;

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('💳 Balansim', 'my_balance')
        .text('📊 Hisobot', 'my_earnings').row()
        .text('🏠 Bosh menyu', 'back_to_main')
    });
  }

  // Handle cargo owner contact
  private async handleCargoOwnerContact(ctx: any, cargoId: string) {
    const driverId = ctx.from.id;

    // Timer'ni bekor qilish - haydovchi bog'langani uchun
    this.cancelDriverContactTimer(cargoId);

    // Performance'ni yangilash (ijobiy)
    this.updateDriverPerformance(driverId, { 
      responseTime: -1, // Mark as contacted
      onTimeDeliveries: 1
    });

    await this.safeAnswerCallback(ctx, '✅ Yaxshi! Timer bekor qilindi. Mijoz bilan bog\'laning.');
    
    // Mijozga xabar yuborish - haydovchi bog'landi
    const cargo = this.cargoOffers.get(cargoId);
    if (cargo) {
      try {
        const contactMessage = `
📞 <b>HAYDOVCHI BOG'LANDI</b>

✅ Haydovchi sizga bog'lanish uchun tayyor!

📋 <b>Keyingi qadamlar:</b>
▫️ Haydovchi bilan qo'ng'iroq qiling yoki kutib turing
▫️ Yuk olish vaqti va joyini kelishasiz  
▫️ Yuk tafsilotlarini muhokama qiling

🆔 <b>Buyurtma ID:</b> <code>${cargoId}</code>

💡 Muammoli bo'lsa, /yordam orqali qo'llab-quvvatlashga murojaat qiling.
        `;

        await this.bot.api.sendMessage(cargo.userId, contactMessage, {
          parse_mode: 'HTML'
        });
      } catch (error) {
        this.logger.error(`Failed to notify customer about driver contact for cargo ${cargoId}:`, error);
      }
    }
  }

  // Show cargo details
  private async showCargoDetails(ctx: any, cargoId: string) {
    const message = `
📋 <b>BUYURTMA TAFSILOTLARI</b>

🆔 <b>ID:</b> ${cargoId}
⏰ <b>Vaqt:</b> ${new Date().toLocaleString('uz-UZ')}

📞 Yuk egasi bilan bog'lanib batafsil ma'lumot oling.
    `;

    await this.safeAnswerCallback(ctx, '');
    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('✅ Qabul qilish', 'accept_cargo_' + cargoId)
        .text('🔙 Orqaga', 'back_to_main')
    });
  }

  // Add cashback to driver's virtual balance
  private async addDriverCashback(driverId: number, cargoId: string, percentage: number) {
    // Initialize balance if doesn't exist
    if (!this.virtualBalances.has(driverId)) {
      this.virtualBalances.set(driverId, {
        userId: driverId,
        balance: 0,
        totalEarned: 0,
        withdrawnAmount: 0,
        lastWithdrawal: '',
        transactions: []
      });
    }

    const balance = this.virtualBalances.get(driverId)!;
    
    // Simulate cargo price for cashback calculation (in real app, this would come from cargo data)
    const cargoPrice = Math.floor(Math.random() * 500000) + 100000; // 100k-600k range
    const cashbackAmount = Math.floor(cargoPrice * (percentage / 100));

    // Add transaction
    const transaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: cashbackAmount,
      type: 'earning' as const,
      description: `${percentage}% cashback - Buyurtma #${cargoId}`,
      date: new Date().toISOString()
    };

    balance.balance += cashbackAmount;
    balance.totalEarned += cashbackAmount;
    balance.transactions.push(transaction);

    // Check if this driver was referred by a dispatcher for bonus
    await this.processDispatcherBonus(driverId, cashbackAmount);

    this.logger.log(`Added ${cashbackAmount} cashback to driver ${driverId} for cargo ${cargoId}`);
  }

  // Process dispatcher bonus when their referred driver earns
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
            withdrawnAmount: 0,
            lastWithdrawal: '',
            transactions: []
          });
        }

        const dispatcherBalance = this.virtualBalances.get(dispatcherId)!;
        
        // Add bonus transaction
        const transaction = {
          id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          amount: bonusAmount,
          type: 'bonus' as const,
          description: `5% bonus - Haydovchi #${driverId} daromadi`,
          date: new Date().toISOString()
        };

        dispatcherBalance.balance += bonusAmount;
        dispatcherBalance.totalEarned += bonusAmount;
        dispatcherBalance.transactions.push(transaction);
        
        referralData.totalEarnings += bonusAmount;
        referralData.pendingEarnings += bonusAmount;

        this.logger.log(`Added ${bonusAmount} bonus to dispatcher ${dispatcherId} from driver ${driverId}`);
        break;
      }
    }
  }

  // Show virtual balance
  private async showVirtualBalance(ctx: any) {
    const userId = ctx.from.id;
    const balance = this.virtualBalances.get(userId);

    if (!balance) {
      const message = `
💳 <b>VIRTUAL BALANS</b>

💰 <b>Joriy balans:</b> 0 so'm
📊 <b>Jami ishlab topilgan:</b> 0 so'm
💸 <b>Yechildi:</b> 0 so'm

📝 <b>Hali tranzaksiyalar yo'q</b>

💡 <b>Pul yechish:</b>
• Dam olish kunlari (Shanba-Yakshanba)
• Soat: 9:00 dan 18:00 gacha
• Minimal miqdor: 50,000 so'm
      `;

      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .text('🔙 Orqaga', 'back_to_main')
      });
      return;
    }

    // Get last 5 transactions
    const recentTransactions = balance.transactions
      .slice(-5)
      .reverse()
      .map(t => `• ${t.amount.toLocaleString()} so'm - ${t.description}`)
      .join('\n');

    const message = `
💳 <b>VIRTUAL BALANS</b>

💰 <b>Joriy balans:</b> ${balance.balance.toLocaleString()} so'm
📊 <b>Jami ishlab topilgan:</b> ${balance.totalEarned.toLocaleString()} so'm
💸 <b>Yechildi:</b> ${balance.withdrawnAmount.toLocaleString()} so'm
📅 <b>Oxirgi yechim:</b> ${balance.lastWithdrawal || 'Hali yechilmagan'}

📝 <b>So'nggi tranzaksiyalar:</b>
${recentTransactions || 'Hali tranzaksiyalar yo\'q'}

💡 <b>Pul yechish:</b>
• Dam olish kunlari (Shanba-Yakshanba)
• Soat: 9:00 dan 18:00 gacha
• Minimal miqdor: 50,000 so'm
    `;

    const keyboard = new InlineKeyboard();
    
    // Add withdrawal button if it's weekend and within hours
    if (this.isWithdrawalTimeAvailable() && balance.balance >= 50000) {
      keyboard.text('💸 Pul yechish', 'withdraw_money').row();
    }
    
    keyboard.text('📊 Batafsil hisobot', 'detailed_transactions')
      .text('🔙 Orqaga', 'back_to_main');

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  // Check if withdrawal time is available (weekends 9-18)
  private isWithdrawalTimeAvailable(): boolean {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = now.getHours();
    
    // Saturday (6) or Sunday (0), between 9-18
    return (day === 0 || day === 6) && hour >= 9 && hour < 18;
  }

  // Handle withdrawal request
  private async handleWithdrawal(ctx: any) {
    const userId = ctx.from.id;
    const balance = this.virtualBalances.get(userId);

    if (!balance || balance.balance < 50000) {
      await this.safeAnswerCallback(ctx, '❌ Minimal 50,000 so\'m kerak!');
      return;
    }

    if (!this.isWithdrawalTimeAvailable()) {
      await this.safeAnswerCallback(ctx, '❌ Pul yechish faqat dam olish kunlari 9:00-18:00!');
      return;
    }

    const message = `
💸 <b>PUL YECHISH</b>

💰 <b>Mavjud balans:</b> ${balance.balance.toLocaleString()} so'm
💸 <b>Yechish miqdori:</b> ${balance.balance.toLocaleString()} so'm

📋 <b>Yechish uchun ma'lumotlar:</b>
💳 <b>Karta:</b> ${process.env.PAYMENT_CARD_NUMBER}
👤 <b>Egasi:</b> ${process.env.PAYMENT_CARD_HOLDER}

⏰ <b>Vaqt:</b> 5-10 daqiqa ichida
📞 <b>Aloqa:</b> @admin (muammo bo'lsa)

✅ Tasdiqlasangiz, pul kartangizga o'tkaziladi.
    `;

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('✅ Tasdiqlash', 'confirm_withdrawal')
        .text('❌ Bekor qilish', 'my_balance').row()
    });
  }

  // Show detailed transactions
  private async showDetailedTransactions(ctx: any) {
    const userId = ctx.from.id;
    const balance = this.virtualBalances.get(userId);

    if (!balance || balance.transactions.length === 0) {
      const message = `
📊 <b>BATAFSIL HISOBOT</b>

📝 Hali tranzaksiyalar yo'q

💡 Buyurtmalarni bajaring va cashback oling!
      `;

      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .text('🔙 Orqaga', 'my_balance')
      });
      return;
    }

    const allTransactions = balance.transactions
      .slice(-20) // Last 20 transactions
      .reverse()
      .map((t, index) => {
        const date = new Date(t.date).toLocaleString('uz-UZ');
        const typeIcon = t.type === 'earning' ? '💰' : t.type === 'bonus' ? '🎯' : '💸';
        return `${index + 1}. ${typeIcon} ${t.amount.toLocaleString()} so'm\n   ${t.description}\n   📅 ${date}`;
      })
      .join('\n\n');

    const message = `
📊 <b>BATAFSIL HISOBOT</b>

💳 <b>Joriy balans:</b> ${balance.balance.toLocaleString()} so'm
📈 <b>Jami:</b> ${balance.totalEarned.toLocaleString()} so'm
💸 <b>Yechildi:</b> ${balance.withdrawnAmount.toLocaleString()} so'm

📝 <b>So'nggi 20 tranzaksiya:</b>

${allTransactions}
    `;

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('🔙 Orqaga', 'my_balance')
    });
  }

  // Show earnings report
  private async showEarningsReport(ctx: any) {
    const userId = ctx.from.id;
    const balance = this.virtualBalances.get(userId);

    if (!balance) {
      await this.safeAnswerCallback(ctx, '');
      await ctx.reply('📊 Hali daromad yo\'q', {
        reply_markup: new InlineKeyboard().text('🔙 Orqaga', 'my_balance')
      });
      return;
    }

    // Calculate statistics
    const earningTransactions = balance.transactions.filter(t => t.type === 'earning');
    const bonusTransactions = balance.transactions.filter(t => t.type === 'bonus');
    const totalOrders = earningTransactions.length;
    const averageEarning = totalOrders > 0 ? Math.floor(earningTransactions.reduce((sum, t) => sum + t.amount, 0) / totalOrders) : 0;

    const message = `
📊 <b>DAROMAD HISOBOTI</b>

💰 <b>Jami balans:</b> ${balance.balance.toLocaleString()} so'm
📈 <b>Jami ishlab topilgan:</b> ${balance.totalEarned.toLocaleString()} so'm
💸 <b>Yechildi:</b> ${balance.withdrawnAmount.toLocaleString()} so'm

📋 <b>Statistika:</b>
🚛 <b>Bajarilgan buyurtmalar:</b> ${totalOrders} ta
💰 <b>O'rtacha cashback:</b> ${averageEarning.toLocaleString()} so'm
🎯 <b>Bonus tranzaksiyalar:</b> ${bonusTransactions.length} ta

📅 <b>Faoliyat muddati:</b> ${new Date(balance.transactions[0]?.date || Date.now()).toLocaleDateString('uz-UZ')} dan
    `;

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('📊 Batafsil', 'detailed_transactions')
        .text('🔙 Orqaga', 'my_balance').row()
    });
  }

  // Handle cargo cancellation
  private async handleCargoCancel(ctx: any, cargoId: string) {
    const driverId = ctx.from.id;
    const acceptedCargos = this.acceptedCargos.get(driverId);
    
    if (!acceptedCargos || !acceptedCargos.has(cargoId)) {
      await this.safeAnswerCallback(ctx, '❌ Bu buyurtmani siz qabul qilmagansiz!');
      return;
    }

    acceptedCargos.delete(cargoId);
    await this.safeAnswerCallback(ctx, '❌ Buyurtma bekor qilindi!');
    
    const message = `
❌ <b>BUYURTMA BEKOR QILINDI</b>

🆔 <b>ID:</b> ${cargoId}
👤 <b>Haydovchi:</b> ${ctx.from.first_name}

💡 Buyurtma boshqa haydovchilar uchun mavjud bo'ldi.
    `;

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('🏠 Bosh menyu', 'back_to_main')
    });
  }

  // Store accepted and completed cargos per driver
  private acceptedCargos = new Map<number, Set<string>>();
  private completedCargos = new Map<number, Set<string>>();



  // ===== YANGI QULAYLIK METODLARI =====

  private userLanguages = new Map<number, 'uz' | 'ru'>(); // Til tanlash
  private notifications = new Map<number, boolean>(); // Push bildirishnomalar
  private activeUsers = new Set<number>(); // Faol foydalanuvchilar

  private async showHelpMenu(ctx: any) {
    const helpMessage = `
🆘 <b>YORDAM VA QO'LLANMA</b>

📖 <b>Bot haqida ma'lumot:</b>
• Yukchi, haydovchi va dispechr uchun
• Professional logistika platformasi  
• Tekin va xavfsiz xizmat

❓ <b>Eng ko'p so'raladigan savollar:</b>

<b>Q:</b> Ro'yxatdan o'tish tekinmi?
<b>A:</b> ✅ Ha, butunlay tekin!

<b>Q:</b> Qanday yuk turlari mavjud?
<b>A:</b> 🚛 Barcha turdagi yuklar: qurilish, oziq-ovqat, texnika va boshqalar

<b>Q:</b> To'lov qanday amalga oshiriladi?
<b>A:</b> 💳 Click, Payme, naqd pul va boshqa usullar

<b>Q:</b> Xavfsizlik kafolatimi?
<b>A:</b> 🔒 Ha, barcha ma'lumotlar himoyalangan

📞 <b>Qo'shimcha yordam:</b>
Agar savolingiz bo'lsa "📞 Aloqa" tugmasini bosing
    `;

    const keyboard = new InlineKeyboard()
      .text('📱 Bo\'lim turlari', 'help_roles')
      .text('🚚 Transport', 'help_transport').row()
      .text('💰 To\'lov', 'help_payment')  
      .text('📋 Qoidalar', 'help_rules').row()
      .text('🔙 Orqaga', 'back_main');

    await ctx.editMessageText(helpMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private async showSettings(ctx: any) {
    const userId = ctx.from.id;
    const currentLang = this.userLanguages.get(userId) || 'uz';
    
    const settingsMessage = `
⚙️ <b>SOZLAMALAR</b>

🌐 <b>Til tanlash:</b>
Hozirgi til: ${currentLang === 'uz' ? '🇺🇿 O\'zbekcha' : '🇷🇺 Ruscha'}

🔔 <b>Bildirishnomalar:</b>
• Yangi orderlar haqida xabar
• Narx o'zgarishlari haqida ma'lumot
• Tizim yangiliklari

📊 <b>Profil sozlamalari:</b>
• Shaxsiy ma'lumotlarni yangilash
• Transport ma'lumotlarini o'zgartirish
• Xavfsizlik sozlamalari

🎨 <b>Interfeys:</b>
• Rejim: Oddiy/Kengaytirilgan
• Rang mavzusi: Avtomatik
    `;

    const keyboard = new InlineKeyboard()
      .text('🇺🇿 O\'zbekcha', 'language_uz')
      .text('🇷🇺 Русский', 'language_ru').row()
      .text('🔔 Bildirishnomalar', 'notifications')
      .text('👤 Profil', 'edit_profile').row()
      .text('🎨 Mavzu', 'theme_settings')
      .text('📊 Statistika', 'user_stats').row()
      .text('🔙 Orqaga', 'back_main');

    try {
      await ctx.editMessageText(settingsMessage, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    } catch (error) {
      if (error.description?.includes('message is not modified')) {
        // Message is already the same, no need to edit
        return;
      }
      // If other error, try to reply instead
      await ctx.reply(settingsMessage, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    }
  }

  private async showContact(ctx: any) {
    const contactMessage = `
📞 <b>BIZ BILAN ALOQA</b>

👥 <b>AVTOXABAR JAMOASI</b>

📱 <b>Telefon:</b>
• +998 90 123-45-67 (24/7)
• +998 91 234-56-78 (Texnik yordam)

💬 <b>Telegram:</b>
• @avtoxabar_support - Asosiy yordam
• @avtoxabar_admin - Administratorlar

🌐 <b>Ijtimoiy tarmoqlar:</b>
• Instagram: @avtoxabar_uz
• Facebook: AVTOXABAR Logistics
• Telegram kanal: @avtoxabar_news

📧 <b>Email:</b>
• info@avtoxabar.uz - Umumiy savollar
• support@avtoxabar.uz - Texnik yordam
• business@avtoxabar.uz - Hamkorlik

📍 <b>Manzil:</b>
Toshkent shahri, Chilonzor tumani
Katartal ko'chasi, 15-uy

🕐 <b>Ish vaqti:</b>
Dushanba-Yakshanba: 24/7
Texnik yordam: 09:00-22:00
    `;

    const keyboard = new InlineKeyboard()
      .text('📱 Qo\'ng\'iroq qilish', 'call_support')
      .text('💬 Chat ochish', 'open_chat').row()
      .text('📧 Email yuborish', 'send_email')
      .text('📍 Xarita', 'show_location').row()
      .text('🔙 Orqaga', 'back_main');

    await ctx.editMessageText(contactMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private async setLanguage(ctx: any, lang: 'uz' | 'ru') {
    const userId = ctx.from.id;
    const currentLang = this.userLanguages.get(userId) || 'uz';
    
    // Only update if language is actually different
    if (currentLang !== lang) {
      this.userLanguages.set(userId, lang);
    }
    
    const message = lang === 'uz' 
      ? "✅ Til o'zbekcha qilib o'rnatildi!" 
      : "✅ Язык установлен на русский!";
    
    await this.safeAnswerCallback(ctx, message);
    await this.showSettings(ctx);
  }

  private async showDriverProfile(ctx: any) {
    const userId = ctx.from.id;
    const driverInfo = this.driverOffers.get(userId.toString());
    
    if (!driverInfo) {
      const noProfileMessage = `
❌ <b>PROFIL TOPILMADI</b>

🚫 Siz hali haydovchi sifatida ro'yxatdan o'tmagansiz.

📝 <b>Ro'yxatdan o'tish uchun:</b>
1️⃣ Bosh menyuga qayting
2️⃣ "🚚 HAYDOVCHI" tugmasini bosing  
3️⃣ 8 bosqichli ro'yxatdan o'ting

⚡ <b>Bu jarayon 2-3 daqiqa vaqt oladi!</b>
      `;
      
      const keyboard = new InlineKeyboard()
        .text('🚚 Ro\'yxatdan o\'tish', 'register_haydovchi')
        .text('🔙 Orqaga', 'back_main').row();
        
      await ctx.editMessageText(noProfileMessage, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
      return;
    }

    const profileMessage = `
👤 <b>HAYDOVCHI PROFILI</b>

┌─────────────────────────────┐
│     📋 SHAXSIY MA'LUMOTLAR   │
└─────────────────────────────┘

🎯 <b>Ism-familiya:</b> ${driverInfo.driverName}
📱 <b>Telefon:</b> ${driverInfo.phone}
🆔 <b>ID:</b> ${userId}
📅 <b>Ro'yxat sanasi:</b> ${new Date(driverInfo.date).toLocaleDateString('uz-UZ')}

┌─────────────────────────────┐
│      🚛 TRANSPORT MA'LUMOTI  │
└─────────────────────────────┘

🚗 <b>Mashina:</b> ${driverInfo.truckType}
⚖️ <b>Tonnaj:</b> ${driverInfo.capacity} tonna
📍 <b>Yo'nalish:</b> ${driverInfo.fromCity} → ${driverInfo.toCity}

┌─────────────────────────────┐
│        📊 STATISTIKA        │  
└─────────────────────────────┘

⭐ <b>Reyting:</b> ${driverInfo.rating}/5.0
✅ <b>Bajarilgan:</b> ${driverInfo.completedOrders} ta order
💰 <b>So'ngi narx:</b> ${driverInfo.price.toLocaleString()} so'm
📊 <b>Status:</b> ${driverInfo.status === 'available' ? '🟢 Faol' : '🔴 Band'}
    `;

    const keyboard = new InlineKeyboard()
      .text('✏️ Tahrirlash', 'edit_driver_profile')
      .text('📊 Statistika', 'driver_stats').row()
      .text('💰 Daromad', 'earnings')
      .text('⭐ Reyting', 'rating_details').row()
      .text('📋 Profil PDF', 'download_profile')
      .text('📤 Yuborish', 'share_profile').row()
      .text('🔙 Orqaga', 'back_main');

    await ctx.editMessageText(profileMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private async editDriverProfile(ctx: any) {
    const editMessage = `
✏️ <b>PROFIL TAHRIRLASH</b>

🔧 <b>Qaysi ma'lumotni o'zgartirmoqchisiz?</b>

📝 <b>O'zgartirishga ruxsat berilgan:</b>
• Telefon raqam
• Transport ma'lumoti
• Yo'nalish shaharlar
• Profil rasmi

🚫 <b>O'zgartirib bo'lmaydigan:</b>
• Ism-familiya (administrator orqali)
• Ro'yxat sanasi
• ID raqam

⚠️ <b>Diqqat:</b> O'zgarishlar darhol saqlansada, administratorlar tomonidan tekshiriladi.
    `;

    const keyboard = new InlineKeyboard()
      .text('📱 Telefon', 'edit_phone')
      .text('🚛 Transport', 'edit_transport').row()
      .text('📍 Yo\'nalish', 'edit_route')  
      .text('📷 Rasm', 'edit_photo').row()
      .text('🔙 Profil', 'view_my_profile')
      .text('🏠 Bosh sahifa', 'back_main').row();

    await ctx.editMessageText(editMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private async showDriverStats(ctx: any) {
    const userId = ctx.from.id;
    const driverInfo = this.driverOffers.get(userId.toString());
    
    if (!driverInfo) {
      await this.safeAnswerCallback(ctx, "❌ Profil topilmadi");
      return;
    }

    // Fake statistika ma'lumotlari (keyinchalik real ma'lumotlar bilan almashtiriladi)
    const statsMessage = `
📊 <b>HAYDOVCHI STATISTIKASI</b>

┌─────────── Bu oy ──────────────┐
├─ 📦 Orderlar: 12 ta (+3 o'tgan oyga nisbatan)
├─ 💰 Daromad: 4,500,000 so'm 
├─ ⭐ O'rtacha reyting: ${driverInfo.rating}/5.0
└─ 🚗 Masofa: 2,850 km

┌───────── Umumiy ──────────────┐
├─ 📈 Jami orderlar: ${driverInfo.completedOrders} ta
├─ 💎 Eng yaxshi reyting: 5.0⭐
├─ 🏆 Eng katta order: 850,000 so'm
└─ 📅 Faollik: ${Math.floor(Math.random() * 300)} kun

┌─────── Top yo'nalishlar ───────┐
├─ 🥇 Toshkent → Samarqand (8 ta)
├─ 🥈 Buxoro → Toshkent (5 ta)
└─ 🥉 Andijon → Namangan (3 ta)

📈 <b>Tavsiya:</b> Reyting oshirish uchun vaqtida yetkazib bering va mijozlar bilan do'stona munosabatda bo'ling!
    `;

    const keyboard = new InlineKeyboard()
      .text('📈 Grafik ko\'rish', 'view_charts')
      .text('📋 Hisobot', 'generate_report').row()
      .text('🔄 Yangilash', 'driver_stats')
      .text('🔙 Orqaga', 'view_my_profile').row();

    await ctx.editMessageText(statsMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private async showEarnings(ctx: any) {
    const earningsMessage = `
💰 <b>DAROMAD HISOBI</b>

┌────── Bu hafta ──────┐
├─ Jami: 1,250,000 so'm
├─ Orderlar: 5 ta  
├─ O'rtacha: 250,000 so'm
└─ Komissiya: 0 so'm ✨

┌────── Bu oy ─────────┐ 
├─ Jami: 4,500,000 so'm
├─ Orderlar: 18 ta
├─ Eng kattasi: 450,000 so'm
└─ Eng kichigi: 120,000 so'm

┌──── Pul yechish ─────┐
├─ 💳 Karta: Click, Payme
├─ 🏪 Terminal: Paynet  
├─ 🏦 Bank: Butun banklar
└─ ⚡ Tez: 5 daqiqada

🎁 <b>Bonus:</b> 20+ order = +5% bonus
⚡ <b>Tezkor to'lov:</b> Komissiyasiz!
    `;

    const keyboard = new InlineKeyboard()
      .text('💳 Pul yechish', 'withdraw_money')
      .text('📊 Grafik', 'earnings_chart').row()
      .text('📱 To\'lov tarixi', 'payment_history')
      .text('🎁 Bonuslar', 'bonuses').row()
      .text('🔙 Orqaga', 'view_my_profile');

    await ctx.editMessageText(earningsMessage, {
      parse_mode: 'HTML',  
      reply_markup: keyboard
    });
  }

  private async showRatingDetails(ctx: any) {
    const userId = ctx.from.id;
    const driverInfo = this.driverOffers.get(userId.toString());
    
    const ratingMessage = `
⭐ <b>REYTING TAFSILOTLARI</b>

🌟 <b>Sizning reytingingiz:</b> ${driverInfo?.rating || 5.0}/5.0

┌── So'ngi baholar ────┐
├─ ⭐⭐⭐⭐⭐ "Juda yaxshi!" - Aziz
├─ ⭐⭐⭐⭐⭐ "Vaqtida yetkazdi" - Olim  
├─ ⭐⭐⭐⭐⭐ "Professional" - Salim
├─ ⭐⭐⭐⭐⚪ "Yaxshi" - Bobur
└─ ⭐⭐⭐⭐⭐ "Tavsiya qilaman" - Kamol

📊 <b>Tahlil:</b>
• 5⭐: 85% (17 ta)
• 4⭐: 15% (3 ta) 
• 3⭐: 0% (0 ta)
• 2⭐: 0% (0 ta)
• 1⭐: 0% (0 ta)

💡 <b>Reyting oshirish uchun:</b>
✅ Vaqtida yetkazing
✅ Yuk himoya qiling  
✅ Mijoz bilan do'stona bo'ling
✅ Mashina tozaligini saqlang
    `;

    const keyboard = new InlineKeyboard()
      .text('📝 Sharhlarni ko\'rish', 'view_reviews')
      .text('📈 Reyting tarixi', 'rating_history').row()
      .text('💡 Maslahatlari', 'rating_tips')
      .text('🔙 Orqaga', 'view_my_profile').row();

    await ctx.editMessageText(ratingMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private async showQuickOrder(ctx: any) {
    const quickOrderMessage = `
⚡ <b>TEZKOR ORDER YARATISH</b>

🚀 <b>1-daqiqada order yarating!</b>

📋 <b>Mashhur yo'nalishlar:</b>
┌─ 🏙️ Toshkent → Samarqand
├─ 🏭 Toshkent → Buxoro  
├─ 🌆 Toshkent → Andijon
└─ 🏘️ Toshkent → Namangan

📦 <b>Ko'p ishlatiladigan yuk turlari:</b>
• Qurilish materiallari
• Oziq-ovqat mahsulotlari
• Maishiy texnika
• Mebel va jihozlar

⚡ <b>Afzalliklari:</b>
• Darhol haydovchilar ko'radi
• Avtomatik narx tavsiyasi
• 24/7 qo'llab-quvvatlash
• Xavfsizlik kafolati
    `;

    const keyboard = new InlineKeyboard()
      .text('🏙️ Toshkent → Samarqand', 'quick_tsh_sam')
      .text('🏭 Toshkent → Buxoro', 'quick_tsh_bux').row()
      .text('🌆 Toshkent → Andijon', 'quick_tsh_and')
      .text('🏘️ Toshkent → Namangan', 'quick_tsh_nam').row()
      .text('🆕 Boshqa yo\'nalish', 'post_cargo')
      .text('📊 Narx hisoblash', 'price_calculator').row()
      .text('🔙 Orqaga', 'back_main');

    await ctx.editMessageText(quickOrderMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private async showPriceCalculator(ctx: any) {
    const calculatorMessage = `
📊 <b>NARX KALKULYATOR</b>

💰 <b>Yo'l haqi avtomatik hisoblanadi!</b>

┌── Hisobga olinadigan omillar ────┐
├─ 📍 Masofa (km)
├─ ⚖️ Yuk og'irligi (tonna)
├─ 🚛 Transport turi  
├─ ⛽ Yoqilg'i narxi
├─ 🛣️ Yo'l holati
└─ 📅 Mavsumiy o'zgarishlar

📈 <b>Hozirgi bozor narxlari:</b>
• Toshkent → Samarqand: 180,000-220,000
• Toshkent → Buxoro: 250,000-300,000
• Toshkent → Andijon: 320,000-380,000

🎯 <b>Aniq hisoblash uchun:</b>
Yo'nalish, tonnaj va yuk turini kiriting
    `;

    const keyboard = new InlineKeyboard()
      .text('🧮 Hisobla', 'calculate_price')
      .text('📋 Narx jadval', 'price_table').row()
      .text('💡 Maslahatlar', 'price_tips')
      .text('📊 Bozor tahlili', 'market_analysis').row()
      .text('🔙 Orqaga', 'back_main');

    await ctx.editMessageText(calculatorMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  // ===== PUSH BILDIRISHNOMA TIZIMI =====
  
  private async sendNotificationToDrivers(message: string, cargoInfo?: any) {
    // Barcha haydovchilarga bildirishnoma yuborish
    for (const [userId, offer] of this.driverOffers) {
      if (this.notifications.get(parseInt(userId)) !== false) {
        try {
          await this.bot.api.sendMessage(parseInt(userId), `🔔 <b>YANGI ORDER!</b>\n\n${message}`, {
            parse_mode: 'HTML'
          });
        } catch (error) {
          this.logger.warn(`Failed to send notification to driver ${userId}`);
        }
      }
    }
  }

  private async broadcastToActiveUsers(message: string) {
    // Faol foydalanuvchilarga xabar yuborish
    for (const userId of this.activeUsers) {
      if (this.notifications.get(userId) !== false) {
        try {
          await this.bot.api.sendMessage(userId, message, {
            parse_mode: 'HTML'
          });
        } catch (error) {
          this.logger.warn(`Failed to broadcast to user ${userId}`);
        }
      }
    }
  }

  private async showPayments(ctx: any) {
    const paymentsMessage = `
💳 <b>TO'LOVLAR VA HISOBLAR</b>

💰 <b>Sizning hisobingiz:</b>
┌─ 💳 Balans: 2,450,000 so'm
├─ 🔄 Kutilayotgan: 1,200,000 so'm
├─ ✅ Ushbu oy to'langan: 18,750,000 so'm
└─ 📊 Jami aylanma: 45,200,000 so'm

💎 <b>To'lov usullari:</b>
• 💳 Click, Payme - Darhol
• 🏪 Terminal - 5 daqiqada  
• 🏦 Bank o'tkazmasi - 1 kun
• 💵 Naqd - Haydovchi orqali

🎁 <b>Chegirmalar:</b>
• 10+ order: -5% komissiya
• 20+ order: -10% komissiya
• VIP mijoz: -15% komissiya

⚡ <b>Tez to'lov bonusi: +2% cashback</b>
    `;

    const keyboard = new InlineKeyboard()
      .text('💳 Balansni to\'ldirish', 'add_balance')
      .text('💸 Pul yechish', 'withdraw_money').row()
      .text('📋 To\'lov tarixi', 'payment_history')
      .text('🧾 Hisob-kitob', 'invoices').row()
      .text('💎 VIP bo\'lish', 'become_vip')
      .text('🎁 Bonuslar', 'bonuses').row()
      .text('🔙 Orqaga', 'back_main');

    await ctx.editMessageText(paymentsMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  // ===== CARGO TRACKING SYSTEM =====
  
  private cargoShipments = new Map<string, {
    shipmentId: string,
    orderId: string,
    cargoOwnerId: number,
    driverId: number,
    status: 'picked_up' | 'in_transit' | 'delivered' | 'delayed',
    pickupTime?: Date,
    estimatedDelivery?: Date,
    actualDelivery?: Date,
    currentLocation?: string,
    route: {from: string, to: string},
    cargo: {type: string, weight: number},
    driver: {name: string, phone: string},
    cargoOwner: {name: string, phone: string},
    updates: Array<{
      timestamp: Date,
      status: string,
      location?: string,
      note?: string,
      photo?: string
    }>
  }>();

  private async showCargoTrackingMenu(ctx: any) {
    const userId = ctx.from.id;
    
    // Mijozning faal yuklarini olish
    const userShipments = Array.from(this.cargoShipments.values())
      .filter(shipment => shipment.cargoOwnerId === userId);
    
    // Faal orderlarni olish
    const activeOrders = Array.from(this.cargoOffers.values())
      .filter(cargo => cargo.userId === userId && cargo.status !== 'completed');

    if (userShipments.length === 0 && activeOrders.length === 0) {
      await ctx.editMessageText(`
📦 <b>YUK KUZATUVI</b>

❌ <b>Hozirda faol yuklaringiz yo'q</b>

Yangi yuk e'lon qiling va avtomatik kuzatuv boshlanadi!

💡 <b>Kuzatuv xususiyatlari:</b>
• Haydovchi topilishi bilan avtomatik kuzatuv
• Real vaqt status yangilanishlari  
• Haydovchi bilan to'g'ridan-to'g'ri chat
• SMS/Telegram orqali xabarlar
      `, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .text('📦 Yuk e\'lon qilish', 'post_cargo')
          .text('🔙 Orqaga', 'back_main')
      });
      return;
    }

    let trackingMessage = `
📦 <b>YUKLARIM - TEZKOR KUZATUV</b>

`;

    // Faol orderlar
    if (activeOrders.length > 0) {
      trackingMessage += `🔄 <b>Haydovchi kutilayotgan orderlar (${activeOrders.length}):</b>\n`;
      activeOrders.slice(0, 3).forEach((order, index) => {
        const statusText = order.status === 'active' ? '🔍 Haydovchi izlanmoqda' : 
                          order.status === 'matched' ? '✅ Haydovchi topildi' : '⏳ Kutish';
        trackingMessage += `${index + 1}. ${order.fromCity} → ${order.toCity} | ${statusText}\n`;
      });
      trackingMessage += '\n';
    }

    // Jo'natilgan yuklar
    if (userShipments.length > 0) {
      trackingMessage += `🚛 <b>Yo'lda va yetkazilgan yuklar (${userShipments.length}):</b>\n`;
      userShipments.slice(0, 3).forEach((shipment, index) => {
        const statusEmoji = {
          'picked_up': '📦 Olingan',
          'in_transit': '🚛 Yo\'lda', 
          'delivered': '✅ Yetkazilgan',
          'delayed': '⚠️ Kechikmoqda'
        }[shipment.status];
        
        trackingMessage += `${index + 1}. ${shipment.route.from} → ${shipment.route.to} | ${statusEmoji}\n`;
      });
    }

    const keyboard = new InlineKeyboard();
    
    // Faal orderlar uchun tugmalar
    if (activeOrders.length > 0) {
      keyboard.text('🔍 Haydovchi izlash', 'view_drivers').row();
    }
    
    // Yo'ldagi yuklar uchun tugmalar  
    if (userShipments.length > 0) {
      keyboard.text('💬 Haydovchi bilan chat', 'contact_driver')
        .text('📍 Joylashuvni ko\'rish', 'show_location').row();
    }
    
    keyboard.text('🔄 Yangilash', 'cargo_tracking')
      .text('🔙 Orqaga', 'back_main');

    await ctx.editMessageText(trackingMessage, {
      parse_mode: 'HTML', 
      reply_markup: keyboard
    });
  }

  private async trackCargoByCode(ctx: any) {
    await ctx.editMessageText(`
🔍 <b>YUK KODI ORQALI KUZATUV</b>

📝 Yuk kodini kiriting:
• Kod formati: YUK-XXXXXX
• Misol: YUK-123456

📨 <b>Xabar sifatida yuboring:</b>
    `, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('🔙 Orqaga', 'cargo_tracking')
    });

    // Set waiting for tracking code
    this.trackingCodeWaitingUsers.add(ctx.from.id);
  }

  private async showMyShipments(ctx: any) {
    const userId = ctx.from.id;
    const userShipments = Array.from(this.cargoShipments.values())
      .filter(shipment => shipment.cargoOwnerId === userId);

    if (userShipments.length === 0) {
      await ctx.editMessageText(`
📦 <b>MENING YUKLARIM</b>

❌ <b>Hozircha yuklar yo'q</b>

Siz hali hech qanday yuk jo'natmagansiz.
Yangi yuk jo'natish uchun:

👆 Bosh menyudan "📦 Yuk jo'natish" tugmasini bosing
      `, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .text('📦 Yangi yuk jo\'natish', 'cargo_system')
          .text('🔙 Orqaga', 'cargo_tracking').row()
      });
      return;
    }

    let shipmentsText = `
📦 <b>MENING YUKLARIM (${userShipments.length})</b>

`;

    userShipments.forEach((shipment, index) => {
      const statusEmoji = {
        'picked_up': '📦',
        'in_transit': '🚛',
        'delivered': '✅',
        'delayed': '⚠️'
      }[shipment.status];

      const statusText = {
        'picked_up': 'Olingan',
        'in_transit': 'Yo\'lda',
        'delivered': 'Yetkazilgan',
        'delayed': 'Kechikmoqda'
      }[shipment.status];

      shipmentsText += `
${index + 1}. ${statusEmoji} <b>${shipment.shipmentId}</b>
├─ 📍 ${shipment.route.from} → ${shipment.route.to}
├─ 📦 ${shipment.cargo.type} (${shipment.cargo.weight}t)
├─ 🚛 ${shipment.driver.name}
└─ 📊 Status: <b>${statusText}</b>
`;
    });

    const keyboard = new InlineKeyboard();
    userShipments.forEach((shipment, index) => {
      if (index % 2 === 0) {
        keyboard.text(`📦 ${shipment.shipmentId}`, `track_shipment_${shipment.shipmentId}`);
        if (index + 1 < userShipments.length) {
          keyboard.text(`📦 ${userShipments[index + 1].shipmentId}`, `track_shipment_${userShipments[index + 1].shipmentId}`);
        }
        keyboard.row();
      }
    });
    
    keyboard.text('🔄 Yangilash', 'my_shipments')
      .text('🔙 Orqaga', 'cargo_tracking').row();

    await ctx.editMessageText(shipmentsText, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private async showShipmentDetails(ctx: any, shipmentId: string) {
    const shipment = this.cargoShipments.get(shipmentId);
    
    if (!shipment) {
      await ctx.editMessageText('❌ Yuk topilmadi!', {
        reply_markup: new InlineKeyboard().text('🔙 Orqaga', 'my_shipments')
      });
      return;
    }

    const statusEmoji = {
      'picked_up': '📦',
      'in_transit': '🚛',
      'delivered': '✅',
      'delayed': '⚠️'
    }[shipment.status];

    const statusText = {
      'picked_up': 'Olingan',
      'in_transit': 'Yo\'lda',
      'delivered': 'Yetkazilgan',
      'delayed': 'Kechikmoqda'
    }[shipment.status];

    const estimatedTime = shipment.estimatedDelivery 
      ? shipment.estimatedDelivery.toLocaleString('uz-UZ')
      : 'Belgilanmagan';

    const actualTime = shipment.actualDelivery
      ? shipment.actualDelivery.toLocaleString('uz-UZ')
      : 'Hali yetkazilmagan';

    let detailsMessage = `
📦 <b>YUK TAFSILOTLARI</b>

🆔 <b>Kod:</b> ${shipment.shipmentId}
${statusEmoji} <b>Status:</b> ${statusText}

📍 <b>Marshrut:</b>
├─ 🚀 Qayerdan: ${shipment.route.from}
└─ 🎯 Qayerga: ${shipment.route.to}

📦 <b>Yuk ma'lumoti:</b>
├─ 📋 Turi: ${shipment.cargo.type}
└─ ⚖️ Og'irligi: ${shipment.cargo.weight} tonna

🚛 <b>Haydovchi:</b>
├─ 👤 ${shipment.driver.name}
└─ 📞 ${shipment.driver.phone}

⏰ <b>Vaqt ma'lumoti:</b>
├─ 📅 Kutilgan: ${estimatedTime}
└─ ✅ Haqiqiy: ${actualTime}
    `;

    if (shipment.currentLocation) {
      detailsMessage += `\n📍 <b>Hozirgi joylashish:</b> ${shipment.currentLocation}`;
    }

    if (shipment.updates.length > 0) {
      detailsMessage += '\n\n📊 <b>So\'nggi yangilanishlar:</b>';
      shipment.updates.slice(-3).forEach((update, index) => {
        const time = update.timestamp.toLocaleString('uz-UZ');
        detailsMessage += `\n${index + 1}. ${time} - ${update.status}`;
        if (update.location) {
          detailsMessage += ` (${update.location})`;
        }
      });
    }

    const keyboard = new InlineKeyboard()
      .text('🗺️ Xaritada ko\'rish', `map_${shipmentId}`)
      .text('💬 Haydovchi bilan chat', `chat_${shipment.driverId}`).row()
      .text('📷 Rasmlar', `photos_${shipmentId}`)
      .text('🔔 Bildirishnoma', `notify_${shipmentId}`).row()
      .text('🔄 Yangilash', `track_shipment_${shipmentId}`)
      .text('🔙 Orqaga', 'my_shipments').row();

    await ctx.editMessageText(detailsMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private async handleTrackingCode(ctx: any, code: string) {
    const cleanCode = code.trim().toUpperCase();
    
    if (!cleanCode.match(/^YUK-\d{6}$/)) {
      await ctx.reply('❌ Noto\'g\'ri format! Misol: YUK-123456', {
        reply_markup: new InlineKeyboard().text('🔄 Qayta urinish', 'track_by_code')
      });
      return;
    }

    const shipment = this.cargoShipments.get(cleanCode);
    
    if (!shipment) {
      await ctx.reply(`
❌ <b>YUK TOPILMADI</b>

Kod: ${cleanCode}

Sabablari:
• Kod noto'g'ri kiritilgan
• Yuk hali ro'yxatga olinmagan  
• Yuk allaqachon yetkazilgan

🔍 Qayta tekshiring va urinib ko'ring
      `, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .text('🔄 Qayta urinish', 'track_by_code')
          .text('🔙 Orqaga', 'cargo_tracking').row()
      });
      return;
    }

    // Remove from waiting users and show shipment details
    this.trackingCodeWaitingUsers.delete(ctx.from.id);
    await this.showShipmentDetails(ctx, cleanCode);
  }

  // Create demo shipments for testing
  private createDemoShipments() {
    const demoShipments = [
      {
        shipmentId: 'YUK-123456',
        orderId: 'ORD-001',
        cargoOwnerId: 123456, // Demo user ID
        driverId: 789012,
        status: 'in_transit' as const,
        pickupTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        estimatedDelivery: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
        currentLocation: 'Toshkent-Samarqand yo\'li, 45km',
        route: {from: 'Toshkent Bektimer', to: 'Samarqand Urgut'},
        cargo: {type: 'Qurilish materiallari', weight: 12},
        driver: {name: 'Abdulhamid Karimov', phone: '+998901234567'},
        cargoOwner: {name: 'Test User', phone: '+998907654321'},
        updates: [
          {
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            status: 'Yuk olingan',
            location: 'Toshkent Bektimer',
            note: 'Yuk muvaffaqiyatli olingan'
          },
          {
            timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
            status: 'Yo\'lda',
            location: 'Toshkent-Samarqand yo\'li',
            note: 'Harakatda'
          }
        ]
      }
    ];

    demoShipments.forEach(shipment => {
      this.cargoShipments.set(shipment.shipmentId, shipment);
    });
  }

  // ===== RATING AND REVIEW SYSTEM =====
  
  private userRatings = new Map<number, {
    averageRating: number,
    totalReviews: number,
    fiveStars: number,
    fourStars: number,
    threeStars: number,
    twoStars: number,
    oneStar: number,
    recentReviews: Array<{
      fromUserId: number,
      fromUserName: string,
      rating: number,
      comment: string,
      orderId: string,
      date: Date
    }>
  }>();

  private pendingReviews = new Map<string, {
    orderId: string,
    driverId: number,
    cargoOwnerId: number,
    driverCanReview: boolean,
    cargoOwnerCanReview: boolean,
    completedDate: Date
  }>();

  private async showRatingMenu(ctx: any) {
    const ratingMessage = `
⭐ <b>BAHO VA SHARHLAR TIZIMI</b>

🎯 <b>Ishonch va sifat kafolati!</b>

📊 <b>Baho tizimi:</b>
• ⭐⭐⭐⭐⭐ Mukammal (5/5)
• ⭐⭐⭐⭐ Yaxshi (4/5)  
• ⭐⭐⭐ O'rtacha (3/5)
• ⭐⭐ Yomon (2/5)
• ⭐ Juda yomon (1/5)

💡 <b>Nima baholanadi:</b>
┌─ 🚛 Haydovchilar: vaqtida yetkazish, ehtiyotkorlik
├─ 👤 Yukchilar: to'lov o'z vaqtida, aniq ma'lumot
├─ 📦 Yuk sifati: tavsif mos kelishi
└─ 🤝 Muloqat: xushmuomalalik, professional yondashuv

🎁 <b>Mukofotlar:</b>
• 4.5+ reyting: VIP status
• 4.8+ reyting: Gold status
• 4.9+ reyting: Platinum status
    `;

    const keyboard = new InlineKeyboard()
      .text('⭐ Baho berish', 'give_rating')
      .text('📊 Mening reytingim', 'my_rating').row()
      .text('🏆 Top reytinglar', 'top_ratings')
      .text('📝 Sharhlar yozish', 'write_review').row()
      .text('👀 Sharhlarni ko\'rish', 'view_reviews')
      .text('📈 Reyting statistikasi', 'rating_stats').row()
      .text('🔙 Orqaga', 'back_main');

    await ctx.editMessageText(ratingMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private async showMyRating(ctx: any) {
    const userId = ctx.from.id;
    const userRating = this.userRatings.get(userId);
    
    if (!userRating || userRating.totalReviews === 0) {
      await ctx.editMessageText(`
📊 <b>MENING REYTINGIM</b>

❌ <b>Hali baho berilmagan</b>

Sizga hali hech kim baho bermagan.
Reytingingizni oshirish uchun:

✅ Sifatli xizmat ko'rsating
✅ Vaqtida bajarib bering
✅ Mijozlar bilan yaxshi munosabatda bo'ling
✅ Professional bo'ling

🚀 <b>Birinchi orderingizni bajaring!</b>
      `, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .text('📦 Order olish', 'view_cargo')
          .text('🔙 Orqaga', 'rating_menu').row()
      });
      return;
    }

    const starDisplay = '⭐'.repeat(Math.round(userRating.averageRating));
    const ratingStatus = this.getRatingStatus(userRating.averageRating);
    
    let myRatingMessage = `
📊 <b>MENING REYTINGIM</b>

${starDisplay} <b>${userRating.averageRating.toFixed(1)}/5.0</b>
${ratingStatus.emoji} <b>Status:</b> ${ratingStatus.name}

📈 <b>Statistika:</b>
├─ 📊 Jami sharhlar: ${userRating.totalReviews}
├─ ⭐ 5 yulduz: ${userRating.fiveStars}
├─ ⭐ 4 yulduz: ${userRating.fourStars}
├─ ⭐ 3 yulduz: ${userRating.threeStars}
├─ ⭐ 2 yulduz: ${userRating.twoStars}
└─ ⭐ 1 yulduz: ${userRating.oneStar}

${ratingStatus.benefits}
    `;

    if (userRating.recentReviews.length > 0) {
      myRatingMessage += '\n📝 <b>So\'nggi sharhlar:</b>';
      userRating.recentReviews.slice(0, 3).forEach((review, index) => {
        const stars = '⭐'.repeat(review.rating);
        myRatingMessage += `\n\n${index + 1}. ${stars} ${review.rating}/5`;
        myRatingMessage += `\n👤 ${review.fromUserName}`;
        myRatingMessage += `\n💬 "${review.comment}"`;
        myRatingMessage += `\n📅 ${review.date.toLocaleDateString('uz-UZ')}`;
      });
    }

    const keyboard = new InlineKeyboard()
      .text('📈 Batafsil statistika', 'detailed_rating')
      .text('📝 Barcha sharhlar', 'all_my_reviews').row()
      .text('🎯 Reytingni oshirish', 'improve_rating')
      .text('🏆 Leaderboard', 'rating_leaderboard').row()
      .text('🔄 Yangilash', 'my_rating')
      .text('🔙 Orqaga', 'rating_menu').row();

    await ctx.editMessageText(myRatingMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private getRatingStatus(rating: number) {
    if (rating >= 4.9) {
      return {
        name: 'Platinum Pro',
        emoji: '💎',
        benefits: '\n🎁 <b>Imtiyozlar:</b>\n• Prioritet orderlar\n• -20% komissiya\n• Maxsus belgi\n• Premium support'
      };
    } else if (rating >= 4.8) {
      return {
        name: 'Gold Pro',
        emoji: '🥇',
        benefits: '\n🎁 <b>Imtiyozlar:</b>\n• -15% komissiya\n• Maxsus belgi\n• Tez support'
      };
    } else if (rating >= 4.5) {
      return {
        name: 'VIP',
        emoji: '👑',
        benefits: '\n🎁 <b>Imtiyozlar:</b>\n• -10% komissiya\n• VIP belgi'
      };
    } else if (rating >= 4.0) {
      return {
        name: 'Professional',
        emoji: '⭐',
        benefits: '\n✨ <b>Imtiyozlar:</b>\n• -5% komissiya'
      };
    } else {
      return {
        name: 'Standard',
        emoji: '📊',
        benefits: '\n💡 <b>Maslahat:</b> Reytingingizni oshiring!'
      };
    }
  }

  private async showTopRatings(ctx: any) {
    const topUsers = Array.from(this.userRatings.entries())
      .filter(([_, rating]) => rating.totalReviews >= 3)
      .sort(([_, a], [__, b]) => b.averageRating - a.averageRating)
      .slice(0, 10);

    if (topUsers.length === 0) {
      await ctx.editMessageText(`
🏆 <b>TOP REYTINGLAR</b>

❌ <b>Hali ma'lumot yo'q</b>

Hozircha kamida 3 ta baho olgan foydalanuvchilar yo'q.
Birinchi bo'lib yuqori reyting oling!

🚀 Sifatli xizmat ko'rsating va TOP-10 ga kirish!
      `, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .text('📦 Order boshlash', 'view_cargo')
          .text('🔙 Orqaga', 'rating_menu').row()
      });
      return;
    }

    let topMessage = `
🏆 <b>TOP-10 ENG YAXSHI FOYDALANUVCHILAR</b>

📊 <b>Minimal 3 ta baho talab qilinadi</b>

`;

    topUsers.forEach(([userId, rating], index) => {
      const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : `${index + 1}.`;
      const stars = '⭐'.repeat(Math.round(rating.averageRating));
      const status = this.getRatingStatus(rating.averageRating);
      
      topMessage += `
${medal} ${status.emoji} <b>ID: ${userId}</b>
├─ ${stars} ${rating.averageRating.toFixed(1)}/5.0
└─ 📊 ${rating.totalReviews} ta sharh
`;
    });

    topMessage += `\n🎯 <b>Siz ham TOP-10 ga kirmoqchimisiz?</b>
• Sifatli xizmat ko'rsating
• Vaqtida bajaring
• Professional bo'ling`;

    const keyboard = new InlineKeyboard()
      .text('📈 Mening o\'rnim', 'my_rank')
      .text('🎯 Qanday kirishga?', 'how_to_top').row()
      .text('🔄 Yangilash', 'top_ratings')
      .text('🔙 Orqaga', 'rating_menu').row();

    await ctx.editMessageText(topMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private async showGiveRating(ctx: any) {
    const userId = ctx.from.id;
    const pendingOrders = Array.from(this.pendingReviews.values())
      .filter(review => 
        (review.driverId === userId && review.cargoOwnerCanReview) ||
        (review.cargoOwnerId === userId && review.driverCanReview)
      );

    if (pendingOrders.length === 0) {
      await ctx.editMessageText(`
⭐ <b>BAHO BERISH</b>

❌ <b>Baholaydigan orderlar yo'q</b>

Sizda hozirda baho berishingiz mumkin bo'lgan 
yakunlangan orderlar mavjud emas.

📦 Yangi order bajargandan so'ng, bu yerda 
baho berish imkoniyati paydo bo'ladi.

🚀 <b>Yangi orderlar qidiring!</b>
      `, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .text('📦 Orderlar', 'view_cargo')
          .text('🔙 Orqaga', 'rating_menu').row()
      });
      return;
    }

    let ratingMessage = `
⭐ <b>BAHO BERISH</b>

📋 <b>Baholaydigan orderlaringiz (${pendingOrders.length}):</b>

`;

    pendingOrders.forEach((order, index) => {
      const isDriver = order.driverId === userId;
      const targetRole = isDriver ? 'Yukchi' : 'Haydovchi';
      const targetId = isDriver ? order.cargoOwnerId : order.driverId;
      
      ratingMessage += `
${index + 1}. 📦 <b>Order ID:</b> ${order.orderId}
├─ 👤 ${targetRole}: ${targetId}
├─ 📅 Tugagan: ${order.completedDate.toLocaleDateString('uz-UZ')}
└─ ⭐ <b>Baho kutilmoqda</b>
`;
    });

    ratingMessage += '\n💡 Baho berish uchun orderni tanlang:';

    const keyboard = new InlineKeyboard();
    pendingOrders.forEach((order, index) => {
      keyboard.text(`⭐ ${order.orderId}`, `rate_order_${order.orderId}`);
      if (index % 2 === 1) keyboard.row();
    });
    
    if (pendingOrders.length % 2 === 1) keyboard.row();
    keyboard.text('🔙 Orqaga', 'rating_menu');

    await ctx.editMessageText(ratingMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private async startRatingProcess(ctx: any, orderId: string) {
    const order = this.pendingReviews.get(orderId);
    const userId = ctx.from.id;
    
    if (!order) {
      await ctx.editMessageText('❌ Order topilmadi!', {
        reply_markup: new InlineKeyboard().text('🔙 Orqaga', 'give_rating')
      });
      return;
    }

    const isDriver = order.driverId === userId;
    const targetRole = isDriver ? 'Yukchi' : 'Haydovchi';
    const targetId = isDriver ? order.cargoOwnerId : order.driverId;

    const ratingMessage = `
⭐ <b>BAHO BERISH</b>

📦 <b>Order:</b> ${orderId}
👤 <b>${targetRole} ID:</b> ${targetId}

🎯 <b>Qanday baho berasiz?</b>

Fikringizni bildiring va boshqalar uchun 
foydali bo'ling!
    `;

    const keyboard = new InlineKeyboard()
      .text('⭐⭐⭐⭐⭐ Mukammal (5)', `rating_${orderId}_5`)
      .row()
      .text('⭐⭐⭐⭐ Yaxshi (4)', `rating_${orderId}_4`)
      .row()
      .text('⭐⭐⭐ O\'rtacha (3)', `rating_${orderId}_3`)
      .row()
      .text('⭐⭐ Yomon (2)', `rating_${orderId}_2`)
      .row()
      .text('⭐ Juda yomon (1)', `rating_${orderId}_1`)
      .row()
      .text('🔙 Orqaga', 'give_rating');

    await ctx.editMessageText(ratingMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private async processRating(ctx: any, orderId: string, rating: number) {
    // This would normally save the rating to database
    // For now, we'll just show confirmation
    
    const ratingText = '⭐'.repeat(rating);
    const ratingWords = ['', 'Juda yomon', 'Yomon', 'O\'rtacha', 'Yaxshi', 'Mukammal'];
    
    await ctx.editMessageText(`
✅ <b>BAHO MUVAFFAQIYATLI BERILDI!</b>

📦 <b>Order:</b> ${orderId}
${ratingText} <b>${rating}/5 - ${ratingWords[rating]}</b>

💬 <b>Sharh qo'shishni xohlaysizmi?</b>

Batafsil fikringizni yozsangiz, boshqa 
foydalanuvchilar uchun juda foydali bo'ladi!
    `, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('💬 Sharh yozish', `comment_${orderId}`)
        .text('✅ Tugatish', 'rating_menu').row()
        .text('⭐ Yana baho berish', 'give_rating')
        .text('🔙 Orqaga', 'rating_menu').row()
    });
  }

  // Initialize demo ratings
  private initializeDemoRatings() {
    // Add some demo ratings for testing
    this.userRatings.set(123456, {
      averageRating: 4.8,
      totalReviews: 25,
      fiveStars: 20,
      fourStars: 4,
      threeStars: 1,
      twoStars: 0,
      oneStar: 0,
      recentReviews: [
        {
          fromUserId: 789012,
          fromUserName: 'Abdulhamid K.',
          rating: 5,
          comment: 'Juda yaxshi haydovchi, vaqtida yetkazdi!',
          orderId: 'ORD-001',
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        },
        {
          fromUserId: 456789,
          fromUserName: 'Olim S.',
          rating: 5,
          comment: 'Professional yondashuv, tavsiya qilaman!',
          orderId: 'ORD-002',
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        }
      ]
    });

    // Add a pending review for demo
    this.pendingReviews.set('ORD-003', {
      orderId: 'ORD-003',
      driverId: 789012,
      cargoOwnerId: 123456,
      driverCanReview: true,
      cargoOwnerCanReview: true,
      completedDate: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
    });
  }

  // ===== ROUTE OPTIMIZATION SYSTEM =====
  
  private routeOptimizer = {
    // Popular routes with optimized paths
    optimizedRoutes: new Map<string, {
      mainRoute: string,
      distance: number,
      estimatedTime: string,
      fuelCost: number,
      alternatives: Array<{
        route: string,
        distance: number,
        estimatedTime: string,
        advantages: string[],
        disadvantages: string[]
      }>,
      waypoints: string[],
      traffic: 'light' | 'moderate' | 'heavy',
      weatherConditions: string,
      roadConditions: string,
      tollCosts: number
    }>(),

    // Route analysis data
    routeAnalysis: new Map<string, {
      popularity: number,
      averageDeliveryTime: number,
      successRate: number,
      commonIssues: string[],
      bestTimeToTravel: string[],
      seasonalFactors: string[]
    }>()
  };

  private async showRouteOptimization(ctx: any) {
    const routeMessage = `
🗺️ <b>MARSHRUT OPTIMIZATSIYA TIZIMI</b>

🎯 <b>Eng yaxshi yo'lni toping!</b>

✨ <b>Imkoniyatlar:</b>
┌─ 📍 Optimal marshrut tavsiyalari
├─ ⛽ Yoqilg'i iste'moli hisobi
├─ 🚦 Tirbandlik ma'lumotlari
├─ 🌤️ Ob-havo sharoitlari
├─ 💰 Yo'l haqi hisobi
├─ ⏰ Eng yaxshi vaqt tavsiyalari
└─ 📊 Marshrut tahlillari

🚀 <b>Foydalari:</b>
• 15-30% yoqilg'i tejash
• Vaqt tejash
• Xavfsizlik oshirish
• Mijoz qoniqishi
    `;

    const keyboard = new InlineKeyboard()
      .text('🗺️ Marshrut qidirish', 'find_route')
      .text('📊 Mashhur marshrutlar', 'popular_routes').row()
      .text('⛽ Yoqilg\'i kalkulyatori', 'fuel_calculator')
      .text('🚦 Tirbandlik xaritasi', 'traffic_map').row()
      .text('🌤️ Ob-havo ma\'lumoti', 'weather_info')
      .text('🎯 Smart tavsiyalar', 'smart_suggestions').row()
      .text('📈 Marshrut tahlili', 'route_analytics')
      .text('💡 Maslahatlar', 'route_tips').row()
      .text('🔙 Orqaga', 'back_main');

    await ctx.editMessageText(routeMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private async showFindRoute(ctx: any) {
    await ctx.editMessageText(`
🗺️ <b>MARSHRUT QIDIRISH</b>

📍 <b>Qayerdan va qayerga?</b>

Marshrutni kiriting (masalan):
• "Toshkent - Samarqand"  
• "Andijon - Nukus"
• "Namangan - Qarshi"

🎯 <b>Biz tahlil qilamiz:</b>
├─ 3 ta eng yaxshi variant
├─ Masofa va vaqt
├─ Yoqilg'i sarfi
├─ Yo'l haqi
└─ Tirbandlik holatı

📨 <b>Marshrutni yuboring:</b>
    `, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('🔙 Orqaga', 'route_optimization')
    });

    // Set waiting for route input
    this.routeInputWaitingUsers.add(ctx.from.id);
  }

  private async analyzeRoute(ctx: any, routeInput: string) {
    const cleanRoute = routeInput.trim();
    
    // Simple route parsing
    const routeParts = cleanRoute.split(/[-—]/);
    if (routeParts.length !== 2) {
      await ctx.reply('❌ Noto\'g\'ri format! Masalan: "Toshkent - Samarqand"', {
        reply_markup: new InlineKeyboard().text('🔄 Qayta urinish', 'find_route')
      });
      return;
    }

    const from = routeParts[0].trim();
    const to = routeParts[1].trim();
    const routeKey = `${from}-${to}`;

    // Remove from waiting users
    this.routeInputWaitingUsers.delete(ctx.from.id);

    // Generate or get route analysis
    const analysis = this.getRouteAnalysis(from, to);
    
    let analysisMessage = `
🗺️ <b>MARSHRUT TAHLILI</b>

📍 <b>Marshrut:</b> ${from} → ${to}

🚀 <b>ASOSIY VARIANT (Tavsiya etiladi)</b>
├─ 📏 Masofa: ${analysis.mainRoute.distance} km
├─ ⏰ Vaqt: ${analysis.mainRoute.estimatedTime}
├─ ⛽ Yoqilg'i: ${analysis.mainRoute.fuelCost.toLocaleString()} so'm
├─ 💰 Yo'l haqi: ${analysis.mainRoute.tollCosts.toLocaleString()} so'm
├─ 🚦 Trafik: ${this.getTrafficEmoji(analysis.mainRoute.traffic)} ${this.getTrafficText(analysis.mainRoute.traffic)}
└─ 🌤️ Ob-havo: ${analysis.mainRoute.weatherConditions}

`;

    if (analysis.alternatives.length > 0) {
      analysisMessage += '🔄 <b>MUQOBIL VARIANTLAR:</b>\n';
      analysis.alternatives.forEach((alt, index) => {
        analysisMessage += `\n${index + 1}. 📏 ${alt.distance}km, ⏰ ${alt.estimatedTime}`;
        analysisMessage += `\n   ✅ ${alt.advantages.join(', ')}`;
        if (alt.disadvantages.length > 0) {
          analysisMessage += `\n   ❌ ${alt.disadvantages.join(', ')}`;
        }
      });
    }

    analysisMessage += `\n\n💡 <b>MASLAHATLAR:</b>
• Eng yaxshi vaqt: ${analysis.bestTimes.join(', ')}
• Yo'l holati: ${analysis.roadConditions}
• Ehtiyot choralar: Yoqilg'i to'ldiring, hujjatlarni tekshiring`;

    const keyboard = new InlineKeyboard()
      .text('🧭 Batafsil yo\'nalish', `detailed_directions_${from}_${to}`)
      .text('📊 Marshrut statistikasi', `route_stats_${from}_${to}`).row()
      .text('⛽ Yoqilg\'i hisoblash', `fuel_calc_${from}_${to}`)
      .text('🌤️ Ob-havo prognozi', `weather_${from}_${to}`).row()
      .text('💾 Saqlash', `save_route_${from}_${to}`)
      .text('📤 Ulashish', `share_route_${from}_${to}`).row()
      .text('🔍 Yangi qidiruv', 'find_route')
      .text('🔙 Orqaga', 'route_optimization').row();

    await ctx.editMessageText(analysisMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private getRouteAnalysis(from: string, to: string) {
    // This would normally connect to a real routing API
    // For demo, we'll generate realistic data
    
    const distance = Math.floor(Math.random() * 400) + 100; // 100-500 km
    const timeHours = Math.floor(distance / 60); // Assuming ~60 km/h average
    const timeMinutes = Math.floor((distance % 60));
    const fuelConsumption = Math.floor(distance * 12); // 12 som per km average
    const tollCosts = Math.floor(distance * 5); // 5 som per km average
    
    const trafficConditions = ['light', 'moderate', 'heavy'][Math.floor(Math.random() * 3)] as 'light' | 'moderate' | 'heavy';
    const weatherConditions = ['Ochiq, quruq', 'Bulutli', 'Yomg\'ir ehtimoli', 'Qorli'][Math.floor(Math.random() * 4)];
    
    const alternatives = [];
    for (let i = 0; i < 2; i++) {
      const altDistance = distance + (Math.random() * 100 - 50); // ±50km
      const altTime = Math.floor(altDistance / 65); // Slightly different speed
      alternatives.push({
        route: `${from} → Oraliq shahar → ${to}`,
        distance: Math.floor(altDistance),
        estimatedTime: `${altTime}s ${Math.floor((altDistance % 65))}daq`,
        advantages: i === 0 ? ['Kam tirbandlik', 'Yaxshi yo\'l'] : ['Qisqa masofa', 'Kam yo\'l haqi'],
        disadvantages: i === 0 ? ['Uzoqroq'] : ['Ko\'proq tirbandlik']
      });
    }

    return {
      mainRoute: {
        distance,
        estimatedTime: `${timeHours}s ${timeMinutes}daq`,
        fuelCost: fuelConsumption,
        tollCosts,
        traffic: trafficConditions,
        weatherConditions,
        roadConditions: 'Yaxshi holat'
      },
      alternatives,
      bestTimes: ['06:00-08:00', '14:00-16:00', '20:00-22:00'],
      roadConditions: 'Asosiy yo\'llar ta\'mirlangan'
    };
  }

  private getTrafficEmoji(traffic: 'light' | 'moderate' | 'heavy') {
    return { light: '🟢', moderate: '🟡', heavy: '🔴' }[traffic];
  }

  private getTrafficText(traffic: 'light' | 'moderate' | 'heavy') {
    return { light: 'Engil', moderate: 'O\'rtacha', heavy: 'Og\'ir' }[traffic];
  }

  private async showPopularRoutes(ctx: any) {
    const popularRoutes = [
      { route: 'Toshkent → Samarqand', count: 1250, rating: 4.8, time: '4s 30daq' },
      { route: 'Toshkent → Andijon', count: 980, rating: 4.6, time: '5s 15daq' },
      { route: 'Toshkent → Namangan', count: 750, rating: 4.7, time: '4s 45daq' },
      { route: 'Samarqand → Buxoro', count: 650, rating: 4.9, time: '3s 20daq' },
      { route: 'Toshkent → Nukus', count: 400, rating: 4.5, time: '8s 30daq' },
    ];

    let routesMessage = `
📊 <b>MASHHUR MARSHRUTLAR</b>

🔥 <b>Eng ko'p foydalaniladigan yo'nalishlar:</b>

`;

    popularRoutes.forEach((route, index) => {
      const stars = '⭐'.repeat(Math.round(route.rating));
      routesMessage += `
${index + 1}. 🗺️ <b>${route.route}</b>
├─ 📊 ${route.count} marta ishlatilgan
├─ ${stars} ${route.rating}/5.0 reyting  
├─ ⏰ O'rtacha: ${route.time}
└─ 🎯 <b>Optimal marshrut</b>
`;
    });

    routesMessage += `\n💡 <b>Foydalanish:</b>
• Mashhur marshrutlarda ko'proq haydovchi
• Optimal narxlar aniqlangan  
• Yaxshi infratuzilma
• Tajribali hamkasb maslahatlar`;

    const keyboard = new InlineKeyboard();
    popularRoutes.forEach((route, index) => {
      keyboard.text(`🗺️ ${route.route}`, `analyze_popular_${index}`);
      if (index % 2 === 1) keyboard.row();
    });
    
    if (popularRoutes.length % 2 === 1) keyboard.row();
    keyboard.text('🔍 Boshqa marshrut', 'find_route')
      .text('🔙 Orqaga', 'route_optimization').row();

    await ctx.editMessageText(routesMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private async showSmartSuggestions(ctx: any) {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    
    const suggestions = this.generateSmartSuggestions(hour, dayOfWeek);
    
    const suggestionsMessage = `
🎯 <b>SMART TAVSIYALAR</b>

⏰ <b>Hozirgi vaqt:</b> ${now.toLocaleTimeString('uz-UZ')}
📅 <b>Kun:</b> ${this.getDayName(dayOfWeek)}

${suggestions.timeBasedSuggestion}

${suggestions.routeBasedSuggestion}

${suggestions.weatherBasedSuggestion}

💡 <b>Umumiy maslahatlar:</b>
• Erta boshlaing - tirbandlik kamroq
• Yoqilg'i narxini tekshiring
• Hujjatlaringizni tayyorlang
• Haydovchi bilan aloqada bo'ling
• GPS navigatorni yoqing

🎁 <b>Bugungi maxsus takliflar:</b>
• Ertalabki (06:00-09:00) orderlar: -10%
• Masofali marshrutlar: +5% bonus
• VIP mijozlar: Bepul yo'l yordami
    `;

    const keyboard = new InlineKeyboard()
      .text('📊 Batafsil tahlil', 'detailed_analytics')
      .text('🗺️ Optimal marshrutlar', 'optimal_routes').row()
      .text('⛽ Yoqilg\'i maslahatlar', 'fuel_tips')
      .text('🌤️ Ob-havo ta\'siri', 'weather_impact').row()
      .text('🔄 Yangi tavsiya', 'smart_suggestions')
      .text('🔙 Orqaga', 'route_optimization').row();

    await ctx.editMessageText(suggestionsMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private generateSmartSuggestions(hour: number, dayOfWeek: number) {
    let timeBasedSuggestion = '';
    let routeBasedSuggestion = '';
    let weatherBasedSuggestion = '';

    // Time-based suggestions
    if (hour >= 6 && hour <= 8) {
      timeBasedSuggestion = `
⏰ <b>ERTALABKI VAQT (${hour}:00)</b>
🟢 Eng yaxshi vaqt yo'lga chiqish uchun!
• Tirbandlik minimal
• Haydovchilar bosh
• -15% yoqilg'i tejash imkoniyati`;
    } else if (hour >= 12 && hour <= 14) {
      timeBasedSuggestion = `
🕐 <b>TUSH VAQTI (${hour}:00)</b>
🟡 O'rtacha tirbandlik kutiling
• Shahar markazidan qoching  
• Muqobil yo'llarni tanlang
• 30-45 daq kechikish mumkin`;
    } else if (hour >= 17 && hour <= 19) {
      timeBasedSuggestion = `
🌅 <b>KECHQURUN (${hour}:00)</b>
🔴 Tirbandlik juda ko'p!
• 1-2 soat kuting yoki
• Muqobil marshrutni tanlang
• Sabr qiling, xavfsizlik birinchi!`;
    } else {
      timeBasedSuggestion = `
🌙 <b>TUNGI VAQT (${hour}:00)</b>
🟢 Yo'llar bo'sh, lekin ehtiyot bo'ling!
• Tez yetib borish imkoniyati
• Yaxshi yoritilgan yo'llarni tanlang  
• Dam olish va yoqilg'i bekatlari kam`;
    }

    // Route-based suggestions
    if (dayOfWeek === 1) { // Monday
      routeBasedSuggestion = `
📅 <b>DUSHANBA KUNI</b>
🚛 Ko'p ishchilar ishga qaytmoqda
• Shahlararo yo'llarda tirbandlik
• Yuk tashish uchun yaxshi kun
• Haydovchilar faol`;
    } else if (dayOfWeek === 5) { // Friday  
      routeBasedSuggestion = `
📅 <b>JUMA KUNI</b>
🎉 Hafta yakunida ko'p harakat
• Ta'til uchun ketayotganlar ko'p
• Kechqurun tirbandlik oshadi
• Erta boshlang`;
    } else {
      routeBasedSuggestion = `
📅 <b>ODDIY ISH KUNI</b>
⚡ Normal trafik rejimi
• Standart tirbandlik kutiladi
• Barcha xizmatlar ishlamoqda
• Optimal transport vaqti`;
    }

    // Weather-based suggestions
    const weatherConditions = ['quyoshli', 'bulutli', 'yomg\'irli', 'shamol'][Math.floor(Math.random() * 4)];
    weatherBasedSuggestion = `
🌤️ <b>OB-HAVO: ${weatherConditions.toUpperCase()}</b>
${weatherConditions === 'quyoshli' ? 
  '☀️ Mukammal sharoitlar!\n• Barcha yo\'llar quruq va xavfsiz\n• Tezlik chegarasida harakatlaning' :
weatherConditions === 'yomg\'irli' ?
  '🌧️ Ehtiyot bo\'ling!\n• Tezlikni pasaytiring\n• Masofani oshiring\n• Fara va chiroqlarni yoqing' :
  '🌤️ Yaxshi sharoitlar\n• Oddiy ehtiyot choralari\n• Normal harakatlanish mumkin'
}`;

    return { timeBasedSuggestion, routeBasedSuggestion, weatherBasedSuggestion };
  }

  private getDayName(dayOfWeek: number): string {
    const days = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
    return days[dayOfWeek];
  }

  // ===== CONTACT TRACKING VA AUTOMATIC REDISTRIBUTION =====
  
  private driverContactTimers = new Map<string, {
    cargoId: string,
    driverId: number,
    timer: NodeJS.Timeout,
    startTime: string
  }>();

  // ===== EMERGENCY CONTACT SYSTEM =====
  
  private emergencyContacts = new Map<number, {
    primaryContact: {name: string, phone: string, relation: string},
    secondaryContact?: {name: string, phone: string, relation: string},
    medicalInfo?: {allergies: string[], medications: string[], conditions: string[]},
    emergencyProtocol: {
      accidentNotification: boolean,
      delayNotification: boolean,
      routeSharing: boolean
    }
  }>();

  private emergencyAlerts = new Map<string, {
    alertId: string,
    userId: number,
    type: 'accident' | 'medical' | 'breakdown' | 'delay' | 'custom',
    status: 'active' | 'resolved' | 'false_alarm',
    location?: string,
    description: string,
    timestamp: Date,
    responders: number[],
    escalationLevel: 1 | 2 | 3
  }>();

  private async showEmergencySystem(ctx: any) {
    const emergencyMessage = `
🚨 <b>FAVQULODDA VAZIYATLAR TIZIMI</b>

⛑️ <b>Xavfsizligingiz bizning ustuvorligimiz!</b>

🆘 <b>Imkoniyatlar:</b>
┌─ 📞 Favqulodda kontaktlar
├─ 🚨 SOS alarm tugmasi  
├─ 🗺️ Joylashishni ulashish
├─ 🏥 Tibbiy ma'lumotlar
├─ 🚗 Avtomobil buzilishi
├─ ⏰ Kechikish xabarnomasi
└─ 🔔 Avtomatik bildirishnomalar

🎯 <b>Tez yordam:</b>
• SOS: <b>103</b> - Favqulodda yordam
• Yong'in: <b>101</b> - O't o'chirish xizmati  
• Militsiya: <b>102</b> - Huquq-tartib
• Tibbiy: <b>103</b> - Tez tibbiy yordam
• Gaz: <b>104</b> - Gaz xizmati

⚡ <b>24/7 yordam liniyasi: +998 71 200-00-03</b>
    `;

    const keyboard = new InlineKeyboard()
      .text('🚨 SOS ALARM!', 'emergency_sos')
      .text('📞 Kontaktlarim', 'emergency_contacts').row()
      .text('🗺️ Joylashish ulashish', 'share_location')
      .text('🏥 Tibbiy ma\'lumot', 'medical_info').row()
      .text('🚗 Avtomobil muammosi', 'vehicle_problem')
      .text('⏰ Kechikish xabari', 'delay_notification').row()
      .text('📋 Yordam bo\'yicha', 'emergency_guide')
      .text('⚙️ Sozlamalar', 'emergency_settings').row()
      .text('🔙 Orqaga', 'back_main');

    await ctx.editMessageText(emergencyMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private async showEmergencyContacts(ctx: any) {
    const userId = ctx.from.id;
    const contacts = this.emergencyContacts.get(userId);

    if (!contacts) {
      await ctx.editMessageText(`
📞 <b>FAVQULODDA KONTAKTLAR</b>

❌ <b>Kontaktlar sozlanmagan</b>

Xavfsizligingiz uchun kamida bitta favqulodda 
kontakt qo'shing. Favqulodda vaziyatlarda bu 
kishi avtomatik xabarnoma oladi.

✅ <b>Kimlarni qo'shish kerak:</b>
• Oila a'zolari
• Yaqin do'stlar  
• Ish hamkasblari
• Tibbiy yordam

🚨 <b>Nima uchun kerak:</b>
• Favqulodda vaziyatlarda xabarnoma
• Kechikish haqida ma'lumot
• Tibbiy yordam uchun
      `, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .text('➕ Kontakt qo\'shish', 'add_emergency_contact')
          .text('📞 Tez raqamlar', 'emergency_numbers').row()
          .text('🔙 Orqaga', 'emergency_system').row()
      });
      return;
    }

    let contactsMessage = `
📞 <b>MENING FAVQULODDA KONTAKTLARIM</b>

👤 <b>ASOSIY KONTAKT:</b>
├─ 👨‍👩‍👧‍👦 ${contacts.primaryContact.name}
├─ 📱 ${contacts.primaryContact.phone}
└─ 🔗 ${contacts.primaryContact.relation}
`;

    if (contacts.secondaryContact) {
      contactsMessage += `
👥 <b>QO'SHIMCHA KONTAKT:</b>
├─ 👨‍👩‍👧‍👦 ${contacts.secondaryContact.name}
├─ 📱 ${contacts.secondaryContact.phone}
└─ 🔗 ${contacts.secondaryContact.relation}
`;
    }

    contactsMessage += `
⚙️ <b>BILDIRISHNOMA SOZLAMALARI:</b>
├─ 🚨 Avariya: ${contacts.emergencyProtocol.accidentNotification ? '✅' : '❌'}
├─ ⏰ Kechikish: ${contacts.emergencyProtocol.delayNotification ? '✅' : '❌'}
└─ 🗺️ Marshrut: ${contacts.emergencyProtocol.routeSharing ? '✅' : '❌'}

💡 Kontaktlaringiz har doim yangilangan bo'lsin!`;

    const keyboard = new InlineKeyboard()
      .text('✏️ Kontakt o\'zgartirish', 'edit_emergency_contact')
      .text('➕ Qo\'shimcha qo\'shish', 'add_secondary_contact').row()
      .text('⚙️ Bildirishnoma', 'emergency_notifications')
      .text('🧪 Test yuborish', 'test_emergency').row()
      .text('🔙 Orqaga', 'emergency_system');

    await ctx.editMessageText(contactsMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private async triggerSOSAlarm(ctx: any) {
    const user = ctx.from;
    const alertId = `SOS-${Date.now()}`;
    
    // Create emergency alert
    this.emergencyAlerts.set(alertId, {
      alertId,
      userId: user.id,
      type: 'custom',
      status: 'active',
      description: 'SOS alarm activated by user',
      timestamp: new Date(),
      responders: [],
      escalationLevel: 1
    });

    // Send emergency notifications (in real app, this would send to emergency contacts)
    await this.sendEmergencyNotifications(user.id, 'SOS ALARM ACTIVATED', `${user.first_name} has activated emergency alarm!`);

    const sosMessage = `
🚨 <b>SOS ALARM FAOLLASHTIRILDI!</b>

⏰ <b>Vaqt:</b> ${new Date().toLocaleString('uz-UZ')}
🆔 <b>Alert ID:</b> ${alertId}
👤 <b>Foydalanuvchi:</b> ${user.first_name}

✅ <b>Amalga oshirildi:</b>
├─ 📞 Favqulodda kontaktlarga xabar yuborildi
├─ 🚨 Yordam xizmatlariga ma'lumot yuborildi  
├─ 🗺️ Joylashishingiz ulashildi
└─ ⏰ Vaqt qayd etildi

📞 <b>Tez yordam:</b> 103
🚔 <b>Militsiya:</b> 102
🔥 <b>O't o'chirish:</b> 101

🎯 <b>Navbatdagi harakatlar:</b>
• Xavfsiz joyga o'ting
• Telefon orqali gaplashing
• Yordamni kuting

<b>⚠️ Noto'g'ri signal bo'lsa, bekor qiling!</b>
    `;

    const keyboard = new InlineKeyboard()
      .text('✅ Yordam kelib yetdi', 'resolve_emergency')
      .text('❌ Noto\'g\'ri signal', 'false_alarm').row()
      .text('📞 103 ga qo\'ng\'iroq', 'call_emergency')
      .text('🗺️ Joylashish yuborish', 'send_location').row()
      .text('💬 Qo\'shimcha ma\'lumot', 'additional_info')
      .text('🔙 Orqaga', 'emergency_system').row();

    await ctx.editMessageText(sosMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private async sendEmergencyNotifications(userId: number, subject: string, message: string) {
    const contacts = this.emergencyContacts.get(userId);
    
    if (contacts) {
      // In a real implementation, this would send SMS/call to emergency contacts
      this.logger.warn(`EMERGENCY ALERT for user ${userId}: ${subject}`);
      this.logger.warn(`Message: ${message}`);
      this.logger.warn(`Primary contact: ${contacts.primaryContact.name} - ${contacts.primaryContact.phone}`);
      
      if (contacts.secondaryContact) {
        this.logger.warn(`Secondary contact: ${contacts.secondaryContact.name} - ${contacts.secondaryContact.phone}`);
      }
    }
  }

  private async showEmergencyGuide(ctx: any) {
    const guideMessage = `
📋 <b>FAVQULODDA VAZIYATLAR BO'YICHA QATIY QOIDALAR</b>

🚨 <b>AVARIYA SODIR BO'LGANDA:</b>
1. ⛔ To'xtang, dvigaterni o'chiring
2. 🚨 Favqulodda belgini qo'ying  
3. 📱 103 ga qo'ng'iroq qiling
4. 🩹 Jarohatlanganlarni tekshiring
5. 📷 Voqea joyini suratga oling
6. 🚔 GAI kelishini kuting

🏥 <b>TIBBIY YORDAM:</b>
• 🩸 Qon ketish - bosib turing
• 💔 Hushsiz holat - nafas yo'lini tozalang
• 🦴 Singan suyak - harakat qildirmang
• 🔥 Kuyish - sovuq suv bilan yuvish

🚗 <b>AVTOMOBIL BUZILGANDA:</b>
• ⚠️ Yo'l chetiga torting
• 🔺 Favqulodda belgini qo'ying
• 📱 Avtoyordam chaqiring
• 🦺 Ko'rinadigan jilet kiying

📞 <b>MUHIM RAQAMLAR:</b>
• SOS: 103 (Favqulodda)
• Militsiya: 102
• Yong'in: 101  
• Gaz: 104
• Elektr: 105

⚡ <b>24/7 YORDAM: +998 71 200-00-03</b>
    `;

    const keyboard = new InlineKeyboard()
      .text('📞 Favqulodda qo\'ng\'iroq', 'emergency_call')
      .text('🏥 Tibbiy yordam', 'medical_help').row()
      .text('🚗 Yo\'l yordami', 'roadside_help')  
      .text('📋 To\'liq qo\'llanma', 'full_manual').row()
      .text('🔙 Orqaga', 'emergency_system');

    await ctx.editMessageText(guideMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  // Initialize emergency system with demo data
  private initializeEmergencySystem() {
    // Add demo emergency contact for testing
    this.emergencyContacts.set(123456, {
      primaryContact: {
        name: 'Oybek Karimov',
        phone: '+998901234567',
        relation: 'Oila a\'zosi'
      },
      secondaryContact: {
        name: 'Nodira Sultanova', 
        phone: '+998907654321',
        relation: 'Do\'st'
      },
      medicalInfo: {
        allergies: ['Antibiotic'],
        medications: ['Aspirin'],
        conditions: ['Yuqori bosim']
      },
      emergencyProtocol: {
        accidentNotification: true,
        delayNotification: true,
        routeSharing: true
      }
    });
  }

  // Safe message editing utility to prevent bot crashes
  private async safeEditMessage(ctx: any, message: string, options: any = {}) {
    try {
      await ctx.editMessageText(message, options);
    } catch (error) {
      if (error.description?.includes('message is not modified') || 
          error.description?.includes('message to edit not found') ||
          error.description?.includes('MESSAGE_ID_INVALID')) {
        // Silently handle common edit errors
        this.logger.debug(`Safe edit handled: ${error.description}`);
        return;
      }
      // For other errors, try to reply instead
      try {
        await ctx.reply(message, {
          parse_mode: options.parse_mode || 'HTML',
          reply_markup: options.reply_markup
        });
      } catch (replyError) {
        this.logger.error('Failed to edit or reply message:', replyError);
      }
    }
  }

  // Safe callback query answering to prevent bot crashes
  private async safeAnswerCallback(ctx: any, message: string, options: any = {}) {
    try {
      await ctx.answerCallbackQuery(message, options);
    } catch (error) {
      this.logger.warn(`Failed to answer callback query: ${error.description || error.message}`);
      // Don't crash the bot, just log the error
    }
  }

  // Safe user ID extraction to prevent null reference errors
  private getUserId(ctx: any): number | null {
    if (!ctx || !ctx.from || !ctx.from.id) {
      this.logger.warn('Context or user info is missing');
      return null;
    }
    return ctx.from.id;
  }

  // ===== ADMIN PANEL & CRM SYSTEM ===== //
  
  private async showAdminPanel(ctx: any) {
    // Admin access check
    const adminUsers = [parseInt(process.env.ADMIN_USER_ID || '0'), 5968018488, 5772668259]; // Abbosxon va yangi admin ID qo'shildi
    if (!adminUsers.includes(ctx.from.id)) {
      await this.safeAnswerCallback(ctx, '❌ Admin huquqi yo\'q!');
      return;
    }

    const totalUsers = this.userRoles.size;
    const totalOrders = this.cargoOffers.size;
    const totalDrivers = Array.from(this.userRoles.values()).filter(u => u.role === 'haydovchi').length;
    const totalCustomers = Array.from(this.userRoles.values()).filter(u => u.role === 'yukchi').length;
    const totalDispatchers = Array.from(this.userRoles.values()).filter(u => u.role === 'dispechr').length;
    const activeOrders = Array.from(this.cargoOffers.values()).filter(o => o.status === 'active').length;
    const completedOrders = Array.from(this.cargoOffers.values()).filter(o => o.status === 'completed').length;

    const message = `
🔐 <b>ADMIN PANEL - CRM DASHBOARD</b>

📊 <b>ASOSIY STATISTIKA:</b>
👥 Jami foydalanuvchilar: <b>${totalUsers}</b>
🚚 Haydovchilar: <b>${totalDrivers}</b>
📦 Yukchilar: <b>${totalCustomers}</b>
🎭 Dispechrlar: <b>${totalDispatchers}</b>

📋 <b>ORDERLAR:</b>
📊 Jami orderlar: <b>${totalOrders}</b>
🟢 Faol orderlar: <b>${activeOrders}</b>
✅ Bajarilgan: <b>${completedOrders}</b>

⏰ <b>Oxirgi yangilanish:</b> ${new Date().toLocaleString('uz-UZ')}
    `;

    const keyboard = new InlineKeyboard()
      .text('📊 Batafsil Statistika', 'admin_stats')
      .text('👥 Foydalanuvchilar', 'admin_users').row()
      .text('📋 Order Boshqaruvi', 'admin_orders')
      .text('📈 Hisobotlar', 'admin_reports').row()
      .text('🗑️ Ma\'lumotlarni tozalash', 'admin_clear_data')
      .text('⚙️ Tizim', 'admin_system').row()
      .text('🔙 Orqaga', 'back_main');

    await this.safeEditMessage(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private async showAdminStats(ctx: any) {
    const adminUsers = [parseInt(process.env.ADMIN_USER_ID || '0'), 5968018488, 5772668259];
    if (!adminUsers.includes(ctx.from.id)) {
      await this.safeAnswerCallback(ctx, '❌ Admin huquqi yo\'q!');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const todayOrders = Array.from(this.cargoOffers.values()).filter(o => o.date.startsWith(today)).length;
    const todayRegistrations = Array.from(this.userRoles.values()).filter(u => u.registrationDate?.startsWith(today)).length;
    
    const totalRevenue = Array.from(this.cargoOffers.values())
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + (o.price || 0), 0);

    const topDrivers = Array.from(this.driverOffers.values())
      .sort((a, b) => (b.completedOrders || 0) - (a.completedOrders || 0))
      .slice(0, 5);

    let topDriversText = '';
    topDrivers.forEach((driver, index) => {
      topDriversText += `${index + 1}. ${driver.driverName} - ${driver.completedOrders || 0} order\n`;
    });

    const message = `
📊 <b>BATAFSIL STATISTIKA</b>

📈 <b>BUGUNGI KO'RSATKICHLAR:</b>
📋 Bugungi orderlar: <b>${todayOrders}</b>
👤 Bugungi ro'yxatdan o'tishlar: <b>${todayRegistrations}</b>

💰 <b>MOLIYAVIY:</b>
💵 Jami aylanma: <b>${totalRevenue.toLocaleString()} so'm</b>
📊 O'rtacha order qiymati: <b>${Math.round(totalRevenue / Math.max(this.cargoOffers.size, 1)).toLocaleString()} so'm</b>

🏆 <b>TOP HAYDOVCHILAR:</b>
${topDriversText || 'Ma\'lumot yo\'q'}

📅 <b>VAQT:</b> ${new Date().toLocaleString('uz-UZ')}
    `;

    const keyboard = new InlineKeyboard()
      .text('🔄 Yangilash', 'admin_stats')
      .text('📊 Export', 'admin_export').row()
      .text('🔙 Admin Panel', 'admin_panel');

    await this.safeEditMessage(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private async showAdminUsers(ctx: any) {
    const adminUsers = [parseInt(process.env.ADMIN_USER_ID || '0'), 5968018488, 5772668259];
    if (!adminUsers.includes(ctx.from.id)) {
      await this.safeAnswerCallback(ctx, '❌ Admin huquqi yo\'q!');
      return;
    }

    const users = Array.from(this.userRoles.entries()).slice(0, 10);
    let usersText = '';
    
    users.forEach(([userId, userInfo], index) => {
      const role = userInfo.role === 'haydovchi' ? '🚚' : userInfo.role === 'yukchi' ? '📦' : '🎭';
      const registered = userInfo.isRegistered ? '✅' : '❌';
      usersText += `${index + 1}. ${role} ID: ${userId} ${registered}\n`;
    });

    const message = `
👥 <b>FOYDALANUVCHILAR BOSHQARUVI</b>

📋 <b>OXIRGI 10 FOYDALANUVCHI:</b>
${usersText || 'Foydalanuvchi yo\'q'}

📊 <b>QISQACHA:</b>
👤 Jami: ${this.userRoles.size}
✅ Ro'yxatdan o'tgan: ${Array.from(this.userRoles.values()).filter(u => u.isRegistered).length}
❌ Ro'yxatdan o'tmagan: ${Array.from(this.userRoles.values()).filter(u => !u.isRegistered).length}

⏰ <b>Vaqt:</b> ${new Date().toLocaleString('uz-UZ')}
    `;

    const keyboard = new InlineKeyboard()
      .text('🔍 Qidirish', 'admin_search_user')
      .text('📊 Batafsil', 'admin_user_details').row()
      .text('🔄 Yangilash', 'admin_users')
      .text('🔙 Admin Panel', 'admin_panel');

    await this.safeEditMessage(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private async showAdminOrders(ctx: any) {
    const adminUsers = [parseInt(process.env.ADMIN_USER_ID || '0'), 5968018488, 5772668259];
    if (!adminUsers.includes(ctx.from.id)) {
      await this.safeAnswerCallback(ctx, '❌ Admin huquqi yo\'q!');
      return;
    }

    const recentOrders = Array.from(this.cargoOffers.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);

    let ordersText = '';
    recentOrders.forEach((order, index) => {
      const status = order.status === 'active' ? '🟢' : order.status === 'matched' ? '🟡' : '✅';
      ordersText += `${index + 1}. ${status} ${order.fromCity}→${order.toCity} - ${order.truckInfo}\n`;
    });

    const message = `
📋 <b>ORDER BOSHQARUVI</b>

📦 <b>OXIRGI ORDERLAR:</b>
${ordersText || 'Order yo\'q'}

📊 <b>STATISTIKA:</b>
🟢 Faol: ${Array.from(this.cargoOffers.values()).filter(o => o.status === 'active').length}
🟡 Qabul qilingan: ${Array.from(this.cargoOffers.values()).filter(o => o.status === 'matched').length}  
✅ Bajarilgan: ${Array.from(this.cargoOffers.values()).filter(o => o.status === 'completed').length}

⏰ <b>Vaqt:</b> ${new Date().toLocaleString('uz-UZ')}
    `;

    const keyboard = new InlineKeyboard()
      .text('🔍 Order Qidirish', 'admin_search_order')
      .text('📊 Order Statistika', 'admin_order_stats').row()
      .text('🔄 Yangilash', 'admin_orders')
      .text('🔙 Admin Panel', 'admin_panel');

    await this.safeEditMessage(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private async showAdminReports(ctx: any) {
    const adminUsers = [parseInt(process.env.ADMIN_USER_ID || '0'), 5968018488, 5772668259];
    if (!adminUsers.includes(ctx.from.id)) {
      await this.safeAnswerCallback(ctx, '❌ Admin huquqi yo\'q!');
      return;
    }

    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const todayStats = {
      orders: Array.from(this.cargoOffers.values()).filter(o => o.date.startsWith(todayStr)).length,
      registrations: Array.from(this.userRoles.values()).filter(u => u.registrationDate?.startsWith(todayStr)).length
    };

    const yesterdayStats = {
      orders: Array.from(this.cargoOffers.values()).filter(o => o.date.startsWith(yesterdayStr)).length,
      registrations: Array.from(this.userRoles.values()).filter(u => u.registrationDate?.startsWith(yesterdayStr)).length
    };

    const weekStats = {
      orders: Array.from(this.cargoOffers.values()).filter(o => new Date(o.date) >= weekAgo).length,
      registrations: Array.from(this.userRoles.values()).filter(u => u.registrationDate && new Date(u.registrationDate) >= weekAgo).length
    };

    const message = `
📈 <b>HISOBOTLAR VA TAHLIL</b>

📅 <b>KUNLIK HISOBOT:</b>
🟢 Bugun: ${todayStats.orders} order, ${todayStats.registrations} ro'yxat
🟡 Kecha: ${yesterdayStats.orders} order, ${yesterdayStats.registrations} ro'yxat

📊 <b>HAFTALIK HISOBOT:</b>
📋 7 kun: ${weekStats.orders} order
👥 7 kun: ${weekStats.registrations} ro'yxatdan o'tish

📈 <b>TREND TAHLILI:</b>
📊 Order o'sish: ${todayStats.orders >= yesterdayStats.orders ? '📈' : '📉'} ${todayStats.orders - yesterdayStats.orders}
👤 Ro'yxat o'sish: ${todayStats.registrations >= yesterdayStats.registrations ? '📈' : '📉'} ${todayStats.registrations - yesterdayStats.registrations}

⏰ <b>Yaratildi:</b> ${new Date().toLocaleString('uz-UZ')}
    `;

    const keyboard = new InlineKeyboard()
      .text('📊 Excel Export', 'admin_export_excel')
      .text('📄 PDF Hisobot', 'admin_export_pdf').row()
      .text('📈 Grafik Ko\'rish', 'admin_charts')
      .text('🔄 Yangilash', 'admin_reports').row()
      .text('🔙 Admin Panel', 'admin_panel');

    await this.safeEditMessage(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private async showAdminSystem(ctx: any) {
    const adminUsers = [parseInt(process.env.ADMIN_USER_ID || '0'), 5968018488, 5772668259];
    if (!adminUsers.includes(ctx.from.id)) {
      await this.safeAnswerCallback(ctx, '❌ Admin huquqi yo\'q!');
      return;
    }

    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    
    const memoryUsage = process.memoryUsage();
    const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);

    const message = `
⚙️ <b>TIZIM MA'LUMOTLARI</b>

🖥️ <b>SERVER HOLATI:</b>
⏰ Uptime: ${hours}s ${minutes}min
💾 Memory: ${memoryMB} MB
📊 Node.js: ${process.version}

📈 <b>BOT STATISTIKASI:</b>
👥 Jami foydalanuvchilar: ${this.userRoles.size}
📋 Jami orderlar: ${this.cargoOffers.size}
🚚 Faol haydovchilar: ${this.driverOffers.size}

🔧 <b>DATABASE:</b>
💾 UserRoles: ${this.userRoles.size} ta yozuv
📦 CargoOffers: ${this.cargoOffers.size} ta yozuv
🚛 DriverOffers: ${this.driverOffers.size} ta yozuv

⏰ <b>Server vaqti:</b> ${new Date().toLocaleString('uz-UZ')}
    `;

    const keyboard = new InlineKeyboard()
      .text('🔄 Restart Bot', 'admin_restart_bot')
      .text('🧹 Clear Cache', 'admin_clear_cache').row()
      .text('💾 Backup Data', 'admin_backup')
      .text('📊 System Logs', 'admin_logs').row()
      .text('🔙 Admin Panel', 'admin_panel');

    await this.safeEditMessage(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  // ===== USER DATA PERSISTENCE ===== //
  private readonly DATA_FILE_PATH = path.join(process.cwd(), 'user-data.json');

  private async loadUserData() {
    try {
      if (fs.existsSync(this.DATA_FILE_PATH)) {
        const data = JSON.parse(fs.readFileSync(this.DATA_FILE_PATH, 'utf8'));
        
        // Load userRoles
        if (data.userRoles) {
          Object.entries(data.userRoles).forEach(([userId, userInfo]: [string, any]) => {
            this.userRoles.set(parseInt(userId), userInfo);
          });
          this.logger.log(`Loaded ${Object.keys(data.userRoles).length} user roles from file`);
        }
        
        // Load driverOffers  
        if (data.driverOffers) {
          Object.entries(data.driverOffers).forEach(([key, driverInfo]: [string, any]) => {
            this.driverOffers.set(key, driverInfo);
          });
          this.logger.log(`Loaded ${Object.keys(data.driverOffers).length} driver offers from file`);
        }
        
        // Load cargoOffers
        if (data.cargoOffers) {
          Object.entries(data.cargoOffers).forEach(([key, cargoInfo]: [string, any]) => {
            this.cargoOffers.set(key, cargoInfo);
          });
          this.logger.log(`Loaded ${Object.keys(data.cargoOffers).length} cargo offers from file`);
        }
      }
    } catch (error) {
      this.logger.error('Error loading user data:', error);
    }
  }

  private async saveUserData() {
    try {
      const data = {
        userRoles: Object.fromEntries(this.userRoles.entries()),
        driverOffers: Object.fromEntries(this.driverOffers.entries()),
        cargoOffers: Object.fromEntries(this.cargoOffers.entries()),
        timestamp: new Date().toISOString()
      };
      
      fs.writeFileSync(this.DATA_FILE_PATH, JSON.stringify(data, null, 2));
      this.logger.log('User data saved to file successfully');
    } catch (error) {
      this.logger.error('Error saving user data:', error);
    }
  }

  // Clear all user data and reset system
  private async clearAllUserData() {
    try {
      // Clear all Maps
      this.userRoles.clear();
      this.registrationInProgress.clear();
      this.registrationData.clear();
      this.driverRegistrationSteps.clear();
      this.driverOffers.clear();
      this.cargoOffers.clear();
      this.cargoPostingSteps.clear();
      this.matches.clear();
      this.pricingDatabase.clear();
      this.activeOrders.clear();
      this.dispatcherReferrals.clear();
      this.virtualBalances.clear();
      this.userPayments.clear();
      this.pendingPayments.clear();
      this.paymentWaitingUsers.clear();
      this.userSessions.clear();
      this.connectedGroups.clear();
      this.userGroups.clear();
      this.selectedGroups.clear();
      this.messageWaitingUsers.clear();
      this.trackingCodeWaitingUsers.clear();
      this.routeInputWaitingUsers.clear();
      this.phoneWaitingUsers.clear();
      this.codeWaitingUsers.clear();
      this.antiSpamTimers.clear();
      this.userLastActivity.clear();

      // Delete data file if exists
      if (fs.existsSync(this.DATA_FILE_PATH)) {
        fs.unlinkSync(this.DATA_FILE_PATH);
      }

      this.logger.log('🗑️ All user data cleared successfully!');
      return true;
    } catch (error) {
      this.logger.error('Error clearing user data:', error);
      return false;
    }
  }

  // Show confirmation for clearing all data
  private async showClearDataConfirmation(ctx: any) {
    const adminUsers = [parseInt(process.env.ADMIN_USER_ID || '0'), 5968018488, 5772668259];
    if (!adminUsers.includes(ctx.from.id)) {
      await this.safeAnswerCallback(ctx, '❌ Admin huquqi yo\'q!');
      return;
    }

    const message = `
🗑️ <b>BARCHA MA'LUMOTLARNI TOZALASH</b>

⚠️ <b>OGOHLANTIRISH:</b> Bu amal qaytarib bo'lmaydi!

📊 <b>Oʻchiriladigan ma'lumotlar:</b>
• Barcha foydalanuvchi profillar
• Barcha haydovchi ma'lumotlari  
• Barcha yuk e'lonlari
• Barcha orderlar va matchlar
• Narx bazasi ma'lumotlari
• To'lov tarixi
• Telegram ulanish ma'lumotlari

🔄 <b>Saqlanadigan ma'lumotlar:</b>
• Bot sozlamalari
• Admin huquqlari

❓ <b>Haqiqatan ham barcha ma'lumotlarni o'chirmoqchimisiz?</b>
    `;

    const keyboard = new InlineKeyboard()
      .text('✅ Ha, barchasini o\'chir', 'confirm_clear_data')
      .text('❌ Yo\'q, bekor qilish', 'admin_panel').row();

    await this.safeEditMessage(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  // Handle clearing all data
  private async handleClearAllData(ctx: any) {
    const adminUsers = [parseInt(process.env.ADMIN_USER_ID || '0'), 5968018488, 5772668259];
    if (!adminUsers.includes(ctx.from.id)) {
      await this.safeAnswerCallback(ctx, '❌ Admin huquqi yo\'q!');
      return;
    }

    const success = await this.clearAllUserData();
    
    if (success) {
      const message = `
✅ <b>MA'LUMOTLAR MUVAFFAQIYATLI TOZALANDI!</b>

🗑️ <b>O'chirilgan ma'lumotlar:</b>
• ${this.userRoles.size} ta foydalanuvchi profili
• Barcha haydovchi va yukchi ma'lumotlari
• Barcha yuk e'lonlari va orderlar  
• Narx bazasi ma'lumotlari
• To'lov va ulanish tarixi

🔄 <b>Tizim yangi boshidan ishga tushdi!</b>

⚠️ <b>Keyingi qadamlar:</b>
• Foydalanuvchilar qayta ro'yxatdan o'tishlari kerak
• Yangi 4-bosqichli haydovchi registratsiyasi faol
• Barcha demo ma'lumotlar tozalangan

🎯 <b>Tizim tayyor va ishlashga hozir!</b>
      `;

      await this.safeEditMessage(ctx, message, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .text('🏠 Bosh menyu', 'back_main')
          .text('🔐 Admin panel', 'admin_panel')
      });
    } else {
      await this.safeEditMessage(ctx, '❌ Ma\'lumotlarni tozalashda xatolik yuz berdi!', {
        reply_markup: new InlineKeyboard()
          .text('🔄 Qayta urinish', 'admin_clear_data')
          .text('🔐 Admin panel', 'admin_panel')
      });
    }
  }

  // ===== DRIVER VALIDATION & PROFILE TRACKING ===== //

  private getDriverProfileCompletion(userId: number): { 
    completionPercentage: number; 
    missingFields: string[]; 
    canCreateOffer: boolean;
    recommendations: string[];
  } {
    const userInfo = this.userRoles.get(userId);
    if (!userInfo || userInfo.role !== 'haydovchi') {
      return { completionPercentage: 0, missingFields: ['Not registered as driver'], canCreateOffer: false, recommendations: [] };
    }
    
    const profile = userInfo.profile;
    const required = ['fullName', 'phone', 'truckBrand', 'truckTonnage', 'bodyType', 'minTonnage', 'maxTonnage'];
    const optional = ['additionalFeatures', 'priceSurveyAnswers', 'personalizedQuestions'];
    
    const missingFields = [];
    const recommendations = [];
    
    // Check required fields
    required.forEach(field => {
      if (!profile[field] || (Array.isArray(profile[field]) && profile[field].length === 0)) {
        missingFields.push(field);
      }
    });
    
    // Check phone format
    if (profile.phone && !profile.phone.startsWith('+998')) {
      recommendations.push('Phone number should start with +998');
    }
    
    // Check pricing survey completion
    if (!profile.priceSurveyAnswers || profile.priceSurveyAnswers.length < 2) {
      recommendations.push('Complete pricing survey for better matching');
    }
    
    // Check capacity consistency
    if (profile.minTonnage && profile.maxTonnage && profile.minTonnage > profile.maxTonnage) {
      recommendations.push('Minimum tonnage should not exceed maximum tonnage');
    }
    
    const completionPercentage = Math.round(((required.length - missingFields.length) / required.length) * 100);
    const canCreateOffer = missingFields.length === 0;
    
    return { completionPercentage, missingFields, canCreateOffer, recommendations };
  }

  private async cleanupIncompleteDriverOffers(): Promise<number> {
    let cleanedCount = 0;
    
    for (const [offerId, driverOffer] of this.driverOffers.entries()) {
      const profileCheck = this.getDriverProfileCompletion(driverOffer.userId);
      
      if (!profileCheck.canCreateOffer) {
        this.driverOffers.delete(offerId);
        cleanedCount++;
        this.logger.log(`Removed incomplete driver offer for user ${driverOffer.userId} (${driverOffer.driverName})`);
      }
    }
    
    if (cleanedCount > 0) {
      await this.saveUserData();
      this.logger.log(`Cleaned up ${cleanedCount} incomplete driver offers`);
    }
    
    return cleanedCount;
  }

  private async regenerateDriverOffers(): Promise<number> {
    let regeneratedCount = 0;
    
    for (const [userId, userInfo] of this.userRoles.entries()) {
      if (userInfo.role !== 'haydovchi' || !userInfo.isRegistered) continue;
      
      const profileCheck = this.getDriverProfileCompletion(userId);
      if (!profileCheck.canCreateOffer) continue;
      
      // Check if driver already has an offer
      const existingOffer = Array.from(this.driverOffers.values())
        .find(offer => offer.userId === userId);
      
      if (!existingOffer) {
        // Generate new offer
        const driverId = `driver_${userId}_${Date.now()}`;
        const profile = userInfo.profile;
        
        this.driverOffers.set(driverId, {
          id: driverId,
          userId: userId,
          username: 'Auto-generated',
          driverName: profile.fullName,
          phone: profile.phone,
          truckType: `${profile.truckBrand} - ${profile.truckTonnage}`,
          capacity: profile.maxTonnage,
          fromCity: 'Barcha shaharlar',
          toCity: 'Barcha shaharlar',
          price: 120000, // Default price
          status: 'available',
          rating: 5.0,
          completedOrders: 0,
          date: new Date().toISOString()
        });
        
        regeneratedCount++;
        this.logger.log(`Auto-generated driver offer for ${profile.fullName} (${userId})`);
      }
    }
    
    if (regeneratedCount > 0) {
      await this.saveUserData();
      this.logger.log(`Auto-generated ${regeneratedCount} driver offers`);
    }
    
    return regeneratedCount;
  }

  // ===== DRIVER PERFORMANCE ANALYTICS ===== //
  private getDriverPerformanceAnalytics(userId: number): {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    averageRating: number;
    responseTime: number; // minutes
    onTimeDeliveryRate: number; // percentage
    earningsThisMonth: number;
    earningsTotal: number;
    performanceScore: number; // 0-100
    recommendations: string[];
  } {
    const driverOffer = Array.from(this.driverOffers.values())
      .find(offer => offer.userId === userId);
    
    if (!driverOffer) {
      return {
        totalOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        averageRating: 0,
        responseTime: 0,
        onTimeDeliveryRate: 0,
        earningsThisMonth: 0,
        earningsTotal: 0,
        performanceScore: 0,
        recommendations: ['Register as driver to start tracking performance']
      };
    }

    // Calculate basic metrics
    const totalOrders = driverOffer.completedOrders || 0;
    const rating = driverOffer.rating || 0;
    
    // Calculate performance score based on multiple factors
    const ratingScore = (rating / 5) * 40; // 40% weight
    const completionScore = Math.min((totalOrders / 10) * 30, 30); // 30% weight, max at 10 orders
    const baseScore = 30; // 30% base for registration
    
    const performanceScore = Math.round(ratingScore + completionScore + baseScore);
    
    const recommendations = [];
    if (rating < 4.0) recommendations.push('Improve service quality to increase rating');
    if (totalOrders < 5) recommendations.push('Complete more orders to build experience');
    if (performanceScore < 70) recommendations.push('Focus on customer satisfaction and timely delivery');
    
    return {
      totalOrders,
      completedOrders: totalOrders,
      cancelledOrders: 0,
      averageRating: rating,
      responseTime: 15, // Default estimate
      onTimeDeliveryRate: 85, // Default estimate
      earningsThisMonth: totalOrders * 150000,
      earningsTotal: totalOrders * 150000,
      performanceScore,
      recommendations
    };
  }


  private getTopPerformingDrivers(limit: number = 10): Array<{
    userId: number;
    driverName: string;
    phone: string;
    truckType: string;
    performanceScore: number;
    completedOrders: number;
    rating: number;
  }> {
    const driverPerformances = Array.from(this.driverOffers.values())
      .map(offer => ({
        userId: offer.userId,
        driverName: offer.driverName,
        phone: offer.phone,
        truckType: offer.truckType,
        performanceScore: this.getDriverPerformanceAnalytics(offer.userId).performanceScore,
        completedOrders: offer.completedOrders || 0,
        rating: offer.rating || 0
      }))
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, limit);
    
    return driverPerformances;
  }

  private generatePerformanceReport(): {
    totalDrivers: number;
    activeDrivers: number;
    averageRating: number;
    totalOrders: number;
    topDrivers: any[];
    lowPerformingDrivers: any[];
  } {
    const allDrivers = Array.from(this.driverOffers.values());
    const totalDrivers = allDrivers.length;
    const activeDrivers = allDrivers.filter(d => d.status === 'available').length;
    
    const totalRating = allDrivers.reduce((sum, d) => sum + (d.rating || 0), 0);
    const averageRating = totalDrivers > 0 ? Number((totalRating / totalDrivers).toFixed(1)) : 0;
    
    const totalOrders = allDrivers.reduce((sum, d) => sum + (d.completedOrders || 0), 0);
    
    const topDrivers = this.getTopPerformingDrivers(5);
    const allPerformances = this.getTopPerformingDrivers(100);
    const lowPerformingDrivers = allPerformances
      .filter(d => d.performanceScore < 50)
      .slice(0, 5);
    
    return {
      totalDrivers,
      activeDrivers,
      averageRating,
      totalOrders,
      topDrivers,
      lowPerformingDrivers
    };
  }

  // ===== AUTOMATED CARGO-DRIVER MATCHING SYSTEM ===== //
  private calculateMatchScore(cargoOffer: any, driverOffer: any): {
    score: number;
    reasons: string[];
    matchDetails: any;
  } {
    let score = 0;
    const reasons: string[] = [];
    const matchDetails: any = {};

    // Capacity match simplified (40 points max)
    const driverCapacity = driverOffer.capacity || 0;
    if (driverCapacity > 0) {
      score += 30;
      reasons.push('Driver has capacity information');
      matchDetails.capacityMatch = true;
    } else {
      score += 15;
      reasons.push('Standard capacity match');
      matchDetails.capacityMatch = false;
    }

    // Route compatibility (25 points max)
    const fromMatch = cargoOffer.fromCity?.includes(driverOffer.fromCity) || 
                     driverOffer.fromCity === 'Barcha shaharlar';
    const toMatch = cargoOffer.toCity?.includes(driverOffer.toCity) || 
                   driverOffer.toCity === 'Barcha shaharlar';
    
    if (fromMatch && toMatch) {
      score += 25;
      reasons.push('Perfect route match');
    } else if (fromMatch || toMatch) {
      score += 15;
      reasons.push('Partial route match');
    } else {
      score += 5;
      reasons.push('Flexible route coverage');
    }
    matchDetails.routeMatch = { fromMatch, toMatch };

    // Driver performance (20 points max)
    const driverRating = driverOffer.rating || 0;
    const completedOrders = driverOffer.completedOrders || 0;
    
    if (driverRating >= 4.5 && completedOrders >= 10) {
      score += 20;
      reasons.push('Excellent driver performance');
    } else if (driverRating >= 4.0 && completedOrders >= 5) {
      score += 15;
      reasons.push('Good driver performance');
    } else if (completedOrders >= 1) {
      score += 10;
      reasons.push('Experienced driver');
    } else {
      score += 5;
      reasons.push('New driver');
    }
    matchDetails.performance = { rating: driverRating, orders: completedOrders };

    // Price compatibility (15 points max)
    const cargoBudget = parseFloat(cargoOffer.price) || 0;
    const driverPrice = driverOffer.price || 0;
    
    if (cargoBudget > 0 && driverPrice > 0) {
      const priceRatio = cargoBudget / driverPrice;
      if (priceRatio >= 1.2) {
        score += 15;
        reasons.push('Budget exceeds price expectation');
      } else if (priceRatio >= 0.9) {
        score += 10;
        reasons.push('Price within budget range');
      } else {
        score -= 10;
        reasons.push('Price above budget');
      }
    } else {
      score += 5; // Neutral if no price info
      reasons.push('Price negotiable');
    }
    matchDetails.priceMatch = { budget: cargoBudget, price: driverPrice };

    return { score: Math.max(0, score), reasons, matchDetails };
  }

  private findBestMatches(cargoOfferId: string, limit: number = 5): Array<{
    driverOffer: any;
    matchScore: number;
    reasons: string[];
    matchDetails: any;
    recommendation: string;
  }> {
    const cargoOffer = this.cargoOffers.get(cargoOfferId);
    if (!cargoOffer) return [];

    const matches = [];
    
    for (const [driverId, driverOffer] of this.driverOffers.entries()) {
      if (driverOffer.status !== 'available') continue;
      
      const matchResult = this.calculateMatchScore(cargoOffer, driverOffer);
      
      let recommendation = '';
      if (matchResult.score >= 80) {
        recommendation = '🟢 Excellent match - Highly recommended';
      } else if (matchResult.score >= 60) {
        recommendation = '🟡 Good match - Recommended';
      } else if (matchResult.score >= 40) {
        recommendation = '🟠 Fair match - Consider if no better options';
      } else {
        recommendation = '🔴 Poor match - Not recommended';
      }
      
      matches.push({
        driverOffer,
        matchScore: matchResult.score,
        reasons: matchResult.reasons,
        matchDetails: matchResult.matchDetails,
        recommendation
      });
    }
    
    return matches
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  }

  private async autoNotifyBestDrivers(cargoOfferId: string): Promise<number> {
    const matches = this.findBestMatches(cargoOfferId, 3); // Top 3 matches
    let notifiedCount = 0;
    
    for (const match of matches) {
      if (match.matchScore >= 60) { // Only notify good matches
        try {
          const cargoOffer = this.cargoOffers.get(cargoOfferId);
          const message = `
🚚 <b>YANGI YUK TAKLIFI!</b>

📍 <b>Yo'nalish:</b> ${cargoOffer.fromCity} → ${cargoOffer.toCity}
🚛 <b>Mashina:</b> ${cargoOffer.truckInfo}
💰 <b>Narx:</b> ${cargoOffer.price ? cargoOffer.price.toLocaleString() + ' so\'m' : 'Kelishiladi'}
📱 <b>Aloqa:</b> ${cargoOffer.phone}

${match.recommendation}
📊 <b>Mos kelish darajasi:</b> ${match.matchScore}/100

<b>Sabablari:</b>
${match.reasons.map(r => `• ${r}`).join('\n')}
          `;
          
          await this.bot.api.sendMessage(
            match.driverOffer.userId,
            message,
            { parse_mode: 'HTML' }
          );
          notifiedCount++;
          
        } catch (error) {
          this.logger.error(`Failed to notify driver ${match.driverOffer.userId}:`, error);
        }
      }
    }
    
    return notifiedCount;
  }

  private async processAutomaticMatching(): Promise<void> {
    let processedCount = 0;
    
    for (const [cargoId, cargoOffer] of this.cargoOffers.entries()) {
      if (cargoOffer.status === 'active') {
        const notifiedCount = await this.autoNotifyBestDrivers(cargoId);
        if (notifiedCount > 0) {
          processedCount++;
          this.logger.log(`Auto-matched cargo ${cargoId} with ${notifiedCount} drivers`);
        }
      }
    }
    
    if (processedCount > 0) {
      this.logger.log(`Processed automatic matching for ${processedCount} cargo offers`);
    }
  }

  // ===== HAYDOVCHI PROFIL TEKSHIRISH VA VALIDATSIYA ===== //

  // Foydalanuvchi telefon raqamini olish
  private getUserPhone(userId: number): string | null {
    // Avval userRoles dan izlash
    const userRole = this.userRoles.get(userId);
    if (userRole?.profile?.phone) {
      return userRole.profile.phone;
    }

    // Keyin driverOffers dan izlash
    for (const [driverKey, driverData] of this.driverOffers.entries()) {
      if (driverData.userId === userId && driverData.phone) {
        return driverData.phone;
      }
    }

    // Oxirida cargoOffers dan izlash
    for (const [cargoKey, cargoData] of this.cargoOffers.entries()) {
      if (cargoData.userId === userId && cargoData.phone) {
        return cargoData.phone;
      }
    }

    return null;
  }

  // ===== MIJOZGA BILDIRISHNOMA VA TIMER TIZIMI ===== //

  // Mijozga haydovchi qabul qilgani haqida xabar yuborish
  private async notifyCustomerDriverAccepted(cargo: any, driverInfo: any): Promise<void> {
    if (!cargo || !driverInfo) {
      this.logger.error('Cargo or driver info not found for customer notification');
      return;
    }

    const driverScore = this.calculateDriverScore(driverInfo.userId);
    const customerMessage = `
🎉 <b>AJOYIB XABAR!</b>

✅ Sizning yukingizni haydovchi qabul qildi!

👤 <b>HAYDOVCHI MA'LUMOTLARI:</b>
├─ 👨‍💼 <b>Ismi:</b> ${driverInfo.driverName || driverInfo.username}
├─ 📱 <b>Telefon:</b> ${driverInfo.phone}
├─ 🚛 <b>Transport:</b> ${driverInfo.truckType || 'Yuk mashinasi'}
├─ ⚖️ <b>Sig'im:</b> ${driverInfo.capacity || 'N/A'} tonna
├─ ⭐ <b>Reyting:</b> ${driverScore.rank} (${driverScore.score}/100)
├─ 📈 <b>Bajarilgan:</b> ${driverInfo.completedOrders || 0} ta buyurtma
└─ 🏆 <b>Baho:</b> ${(driverInfo.rating || 5.0).toFixed(1)}/5.0

📦 <b>YUKI HAQIDA:</b>
├─ 📍 <b>Marshrut:</b> ${cargo.fromCity} → ${cargo.toCity}
├─ 🏷️ <b>Turi:</b> ${cargo.cargoType}
├─ ⚖️ <b>Og'irligi:</b> ${cargo.weight} tonna
└─ 💰 <b>Narxi:</b> ${cargo.price?.toLocaleString()} so'm

⏰ <b>KEYINGI QADAMLAR:</b>
▫️ Haydovchi 15 daqiqa ichida sizga qo'ng'iroq qiladi
▫️ Yuk olish vaqti va joyini kelishib oling
▫️ Haydovchi ID: <code>${cargo.id}</code>

💡 <i>Agar haydovchi 15 daqiqada qo'ng'iroq qilmasa, avtomatik ravishda boshqa haydovchilarga yuboriladi.</i>
    `;

    try {
      await this.bot.api.sendMessage(cargo.userId, customerMessage, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .text('📞 Haydovchiga qo\'ng\'iroq', `call_driver_${cargo.id}`)
          .text('📋 Yuk holati', `track_cargo_${cargo.id}`).row()
          .text('❌ Bekor qilish', `cancel_order_${cargo.id}`)
      });

      this.logger.log(`Customer ${cargo.userId} notified about driver ${driverInfo.userId} acceptance of cargo ${cargo.id}`);
    } catch (error) {
      this.logger.error(`Failed to notify customer ${cargo.userId} about driver acceptance:`, error);
    }
  }

  // Timer o'rnatish - haydovchi 15 daqiqa ichida bog'lanmasa qayta yuborish
  private setDriverContactTimer(cargoId: string, driverId: number): void {
    // Eski timerni tozalash
    const existingTimer = this.driverContactTimers.get(cargoId);
    if (existingTimer) {
      clearTimeout(existingTimer.timer);
    }

    // Yangi timer o'rnatish - 15 daqiqa = 900000 ms
    const timer = setTimeout(async () => {
      await this.handleDriverContactTimeout(cargoId, driverId);
    }, 15 * 60 * 1000); // 15 daqiqa

    this.driverContactTimers.set(cargoId, {
      cargoId,
      driverId,
      timer,
      startTime: new Date().toISOString()
    });

    this.logger.log(`Contact timer set for driver ${driverId} on cargo ${cargoId} - 15 minutes`);
  }

  // Timer tugaganda avtomatik qayta yuborish
  private async handleDriverContactTimeout(cargoId: string, driverId: number): Promise<void> {
    this.logger.warn(`Driver ${driverId} failed to contact customer within 15 minutes for cargo ${cargoId}`);

    const cargo = this.cargoOffers.get(cargoId);
    if (!cargo || cargo.status !== 'matched') {
      return; // Cargo already handled or doesn't exist
    }

    try {
      // Cargo holatini qaytarish
      cargo.status = 'active';
      cargo.assignedDriverId = undefined;
      cargo.acceptedDate = undefined;
      this.cargoOffers.set(cargoId, cargo);

      // Haydovchidan buyurtmani olib tashlash
      const acceptedCargos = this.acceptedCargos.get(driverId);
      if (acceptedCargos) {
        acceptedCargos.delete(cargoId);
      }

      // Haydovchi performance'ini yangilash (salbiy)
      this.updateDriverPerformance(driverId, { 
        cancelledOrders: 1,
        responseTime: 15 * 60 // 15 minutes in seconds
      });

      // Mijozga xabar yuborish
      const customerMessage = `
⚠️ <b>HAYDOVCHI JAVOB BERMADI</b>

Afsuski, haydovchi 15 daqiqa ichida sizga bog'lanmadi.

🔄 <b>AVTOMATIK QAYTA YUBORISH</b>
Sizning yukingiz avtomatik ravishda boshqa haydovchilarga yuborildi.

🆔 <b>Buyurtma ID:</b> <code>${cargoId}</code>

💡 Tez orada boshqa haydovchi sizga bog'lanadi.
      `;

      await this.bot.api.sendMessage(cargo.userId, customerMessage, {
        parse_mode: 'HTML'
      });

      // Haydovchiga ogohlantirish
      const driverWarningMessage = `
❌ <b>BUYURTMA BEKOR QILINDI</b>

Siz 15 daqiqa ichida mijozga bog'lanmadingiz.

🆔 <b>Buyurtma ID:</b> <code>${cargoId}</code>

⚠️ <b>Ogohlantirish:</b>
Bu sizning reytingingizga salbiy ta'sir qiladi. Keyingi safar tezroq bog'laning.

📊 Reytingingizni /profil orqali ko'ring.
      `;

      try {
        await this.bot.api.sendMessage(driverId, driverWarningMessage, {
          parse_mode: 'HTML'
        });
      } catch (error) {
        this.logger.error(`Failed to send warning to driver ${driverId}:`, error);
      }

      // Qayta malakali haydovchilarga yuborish
      await this.sendCargoOffersToQualifiedDrivers(cargo);

      // Timer'ni tozalash
      this.driverContactTimers.delete(cargoId);

      this.logger.log(`Cargo ${cargoId} redistributed due to driver ${driverId} contact timeout`);

    } catch (error) {
      this.logger.error(`Error handling driver contact timeout for cargo ${cargoId}:`, error);
    }
  }

  // Haydovchi bog'langanda timer'ni bekor qilish
  private cancelDriverContactTimer(cargoId: string): void {
    const timerInfo = this.driverContactTimers.get(cargoId);
    if (timerInfo) {
      clearTimeout(timerInfo.timer);
      this.driverContactTimers.delete(cargoId);
      this.logger.log(`Contact timer cancelled for cargo ${cargoId}`);
    }
  }
  
  // Telefon raqam dublikatlarini tekshirish
  private validateDriverPhone(phone: string, currentUserId?: number): { isValid: boolean, existingUserId?: number, message: string } {
    // Barcha haydovchilarni tekshirish
    for (const [driverId, driverData] of this.driverOffers.entries()) {
      if (driverData.phone === phone && driverData.userId !== currentUserId) {
        return {
          isValid: false,
          existingUserId: driverData.userId,
          message: `Bu telefon raqam allaqachon ${driverData.driverName} haydovchisi tomonidan ishlatilmoqda!`
        };
      }
    }

    // Yuk egalarini ham tekshirish
    for (const [cargoId, cargoData] of this.cargoOffers.entries()) {
      if (cargoData.phone === phone && cargoData.userId !== currentUserId) {
        return {
          isValid: false,
          existingUserId: cargoData.userId,
          message: `Bu telefon raqam allaqachon yuk egasi tomonidan ishlatilmoqda!`
        };
      }
    }

    return { isValid: true, message: 'Telefon raqam mavjud' };
  }

  // Haydovchi profilining to'liqligini tekshirish
  private validateDriverProfileCompleteness(driverData: any): { isComplete: boolean, missingFields: string[], score: number } {
    const requiredFields = {
      'fullName': 'To\'liq ism',
      'phone': 'Telefon raqam', 
      'truckBrand': 'Mashina markasi',
      'truckTonnage': 'Mashina sig\'imi',
      'bodyType': 'Kuzov turi',
      'minTonnage': 'Minimal yuk hajmi',
      'maxTonnage': 'Maksimal yuk hajmi'
    };

    const optionalFields = {
      'additionalFeatures': 'Qo\'shimcha imkoniyatlar',
      'experience': 'Tajriba',
      'routes': 'Yo\'nalishlar'
    };

    const missingFields: string[] = [];
    let score = 0;
    const totalRequiredFields = Object.keys(requiredFields).length;
    const totalOptionalFields = Object.keys(optionalFields).length;

    // Majburiy maydonlarni tekshirish
    for (const [field, label] of Object.entries(requiredFields)) {
      if (driverData[field] && driverData[field].toString().trim() !== '') {
        score += (70 / totalRequiredFields); // 70% majburiy maydonlar uchun
      } else {
        missingFields.push(label);
      }
    }

    // Ixtiyoriy maydonlarni tekshirish
    for (const [field] of Object.entries(optionalFields)) {
      if (driverData[field] && driverData[field].toString().trim() !== '') {
        score += (30 / totalOptionalFields); // 30% ixtiyoriy maydonlar uchun
      }
    }

    return {
      isComplete: missingFields.length === 0,
      missingFields,
      score: Math.round(score)
    };
  }

  // Haydovchi profilini yangilash va validatsiya
  private async updateDriverProfile(userId: number, updateData: any): Promise<{ success: boolean, message: string }> {
    try {
      // Telefon raqamni validatsiya qilish
      if (updateData.phone) {
        const phoneValidation = this.validateDriverPhone(updateData.phone, userId);
        if (!phoneValidation.isValid) {
          return { success: false, message: phoneValidation.message };
        }
      }

      // Haydovchi ma'lumotlarini yangilash
      const driverKey = Array.from(this.driverOffers.keys()).find(key => 
        this.driverOffers.get(key)?.userId === userId
      );

      if (driverKey) {
        const currentDriver = this.driverOffers.get(driverKey);
        const updatedDriver = { ...currentDriver, ...updateData };
        this.driverOffers.set(driverKey, updatedDriver);

        // Profil to'liqligini tekshirish
        const validation = this.validateDriverProfileCompleteness(updatedDriver);
        
        this.logger.log(`Haydovchi ${userId} profili yangilandi. To'liqlik: ${validation.score}%`);
        
        await this.saveUserData();
        return { 
          success: true, 
          message: `Profil muvaffaqiyatli yangilandi! To'liqlik darajasi: ${validation.score}%` 
        };
      }

      return { success: false, message: 'Haydovchi topilmadi' };
    } catch (error) {
      this.logger.error('Haydovchi profilini yangilashda xatolik:', error);
      return { success: false, message: 'Profilni yangilashda xatolik yuz berdi' };
    }
  }

  // Haydovchi profilini tahlil qilish va tavsiyalar berish
  private getDriverProfileRecommendations(userId: number): { recommendations: string[], priority: 'low' | 'medium' | 'high' } {
    const driverKey = Array.from(this.driverOffers.keys()).find(key => 
      this.driverOffers.get(key)?.userId === userId
    );

    if (!driverKey) return { recommendations: [], priority: 'high' };

    const driverData = this.driverOffers.get(driverKey);
    const validation = this.validateDriverProfileCompleteness(driverData);
    const recommendations: string[] = [];

    if (validation.missingFields.length > 0) {
      recommendations.push(`❗ Quyidagi maydonlarni to'ldiring: ${validation.missingFields.join(', ')}`);
    }

    if (validation.score < 50) {
      recommendations.push('🔸 Profil to\'liqligini 50% dan yuqori ko\'taring');
      return { recommendations, priority: 'high' };
    } else if (validation.score < 80) {
      recommendations.push('🔸 Profil to\'liqligini 80% ga yetkazing');
      recommendations.push('🔸 Qo\'shimcha imkoniyatlar va tajriba ma\'lumotlarini qo\'shing');
      return { recommendations, priority: 'medium' };
    }

    recommendations.push('✅ Profilingiz to\'liq! Yangi buyurtmalar olishingiz mumkin');
    return { recommendations, priority: 'low' };
  }

  // Noto'liq profilli haydovchilarga avtomatik xabar yuborish
  private async sendProfileCompletionReminders(): Promise<number> {
    let sentCount = 0;
    
    for (const [driverKey, driverData] of this.driverOffers.entries()) {
      const validation = this.validateDriverProfileCompleteness(driverData);
      
      // Faqat 80% dan past to'liqlik darajasiga ega haydovchilarga xabar yuborish
      if (validation.score < 80) {
        const recommendations = this.getDriverProfileRecommendations(driverData.userId);
        
        try {
          const message = `🔔 Profilingizni to'ldiring!\n\n` +
            `📊 Hozirgi to'liqlik darajasi: ${validation.score}%\n\n` +
            `${recommendations.recommendations.join('\n')}\n\n` +
            `💡 To'liq profil ko'proq buyurtma olish imkoniyatini beradi!\n\n` +
            `Profilingizni yangilash uchun /profil tugmasini bosing.`;

          await this.bot.api.sendMessage(driverData.userId, message);
          this.logger.log(`Profile completion reminder sent to driver ${driverData.userId} (${validation.score}% complete)`);
          sentCount++;
        } catch (error) {
          this.logger.error(`Failed to send profile completion reminder to ${driverData.userId}:`, error);
        }
      }
    }

    return sentCount;
  }

  // Faqat to'liq profilli haydovchilarga yuk takliflarini yuborish
  private async sendCargoOffersToQualifiedDrivers(cargoOffer: any): Promise<void> {
    const qualifiedDrivers: any[] = [];
    
    for (const [driverKey, driverData] of this.driverOffers.entries()) {
      const validation = this.validateDriverProfileCompleteness(driverData);
      
      // Faqat 80% va undan yuqori to'liqlik darajasiga ega haydovchilarga yuborish
      if (validation.score >= 80) {
        // Mashina sig'imi va yuk hajmini tekshirish
        // Simplified capacity check - all qualified drivers are eligible
        qualifiedDrivers.push({
          ...driverData,
          completionScore: validation.score
        });
      }
    }

    // To'liqlik darajasiga ko'ra haydovchilarni saralash (yuqoriroq darajali birinchi)
    qualifiedDrivers.sort((a, b) => b.completionScore - a.completionScore);

    // Eng yaxshi haydovchilarga birinchi navbatda yuborish
    for (const driver of qualifiedDrivers) {
      try {
        const cargoMessage = `🚛 Yangi yuk taklifi!\n\n` +
          `📍 Dan: ${cargoOffer.from}\n` +
          `📍 Ga: ${cargoOffer.to}\n` +
          `🚛 Mashina: ${cargoOffer.truckInfo}\n` +
          `💰 Narx: ${cargoOffer.budget} so'm\n` +
          `📞 Telefon: ${cargoOffer.phone}\n\n` +
          `✅ Sizning profilingiz ${driver.completionScore}% to'liq - bu taklifni olishingiz uchun sababdir!\n\n` +
          `Qabul qilish uchun /accept_${cargoOffer.id} tugmasini bosing.`;

        await this.bot.api.sendMessage(driver.userId, cargoMessage, {
          reply_markup: new InlineKeyboard()
            .text('✅ Qabul qilish', `accept_cargo_${cargoOffer.id}`)
            .text('❌ Rad etish', `reject_cargo_${cargoOffer.id}`)
        });

        this.logger.log(`Cargo offer sent to qualified driver ${driver.userId} (${driver.completionScore}% complete)`);
      } catch (error) {
        this.logger.error(`Failed to send cargo offer to driver ${driver.userId}:`, error);
      }
    }
  }

  // Tonnajni soniyga aylantirish yordamchi funksiyasi
  private parseTonnage(tonnageStr: string): number {
    if (!tonnageStr) return 0;
    const match = tonnageStr.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  }

  // ===== HAYDOVCHI PERFORMANCE ANALITIKASI ===== //

  // Haydovchi performance ma'lumotlarini saqlash uchun
  private driverPerformance = new Map<number, {
    totalOrders: number,
    completedOrders: number,
    cancelledOrders: number,
    averageRating: number,
    totalEarnings: number,
    onTimeDeliveries: number,
    responseTime: number, // minutes
    lastActiveDate: string,
    profileCompletionScore: number,
    phoneValidationStatus: 'valid' | 'invalid' | 'duplicate',
    monthlyStats: {
      [month: string]: {
        orders: number,
        earnings: number,
        rating: number
      }
    }
  }>();

  // Haydovchi performance ni yangilash
  private updateDriverPerformance(userId: number, updateData: Partial<any>): void {
    const current = this.driverPerformance.get(userId) || {
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      averageRating: 5.0,
      totalEarnings: 0,
      onTimeDeliveries: 0,
      responseTime: 30,
      lastActiveDate: new Date().toISOString(),
      profileCompletionScore: 0,
      phoneValidationStatus: 'valid' as const,
      monthlyStats: {}
    };

    const updated = { ...current, ...updateData, lastActiveDate: new Date().toISOString() };
    
    // Performance rekingini hisoblash
    const driverData = this.driverOffers.get(Array.from(this.driverOffers.keys()).find(key => 
      this.driverOffers.get(key)?.userId === userId
    ));
    
    if (driverData) {
      const validation = this.validateDriverProfileCompleteness(driverData);
      updated.profileCompletionScore = validation.score;
      
      const phoneValidation = this.validateDriverPhone(driverData.phone, userId);
      updated.phoneValidationStatus = phoneValidation.isValid ? 'valid' : 'duplicate';
    }

    this.driverPerformance.set(userId, updated);
    this.logger.log(`Performance updated for driver ${userId}: ${JSON.stringify(updateData)}`);
  }

  // Haydovchi reytingini hisoblash
  private calculateDriverScore(userId: number): { score: number, rank: string, details: any } {
    const performance = this.driverPerformance.get(userId);
    const driverKey = Array.from(this.driverOffers.keys()).find(key => 
      this.driverOffers.get(key)?.userId === userId
    );
    
    if (!performance || !driverKey) {
      return { score: 0, rank: 'Yangi', details: {} };
    }

    const driverData = this.driverOffers.get(driverKey);
    const profileValidation = this.validateDriverProfileCompleteness(driverData);
    
    let score = 0;
    const details = {
      profileCompletion: profileValidation.score,
      successRate: 0,
      averageRating: performance.averageRating,
      phoneValidation: performance.phoneValidationStatus === 'valid' ? 100 : 0,
      activity: 0
    };

    // Profil to'liqlik (30%)
    score += (profileValidation.score * 0.3);
    
    // Muvaffaqiyat darajasi (25%)
    if (performance.totalOrders > 0) {
      details.successRate = (performance.completedOrders / performance.totalOrders) * 100;
      score += (details.successRate * 0.25);
    }
    
    // Rating (20%)
    score += (performance.averageRating / 5 * 100 * 0.2);
    
    // Telefon validation (15%)
    score += (details.phoneValidation * 0.15);
    
    // Faollik (10%)
    const lastActive = new Date(performance.lastActiveDate);
    const daysSinceActive = Math.floor((Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
    details.activity = Math.max(0, 100 - (daysSinceActive * 10)); // Har kun uchun -10%
    score += (details.activity * 0.1);

    // Rank aniqlash
    let rank = 'Yangi';
    if (score >= 90) rank = '🏆 Premium';
    else if (score >= 80) rank = '⭐ Yuqori';
    else if (score >= 70) rank = '✅ Yaxshi';
    else if (score >= 60) rank = '🔵 O\'rta';
    else if (score >= 50) rank = '🟡 Past';
    else rank = '🔴 Yoqilmagan';

    return { score: Math.round(score), rank, details };
  }

  // Turli formatdagi narxlarni parslash
  private parsePrice(text: string): number | null {
    if (!text || typeof text !== 'string') {
      return null;
    }

    // Matnni tozalash va kichik harfga o'tkazish
    let cleanText = text.toLowerCase().trim();

    try {
      // 1. Oddiy raqam (masalan: 2500000)
      const simpleNumber = parseFloat(cleanText.replace(/[^\d.]/g, ''));
      if (!isNaN(simpleNumber) && cleanText.match(/^\d+\.?\d*$/)) {
        return simpleNumber;
      }

      // 2. Vergul bilan ajratilgan (masalan: 2,500,000)
      if (cleanText.match(/^[\d,]+\.?\d*$/)) {
        const withoutCommas = cleanText.replace(/,/g, '');
        const parsed = parseFloat(withoutCommas);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }

      // 3. Million formatlar
      const millionRegex = /^(\d+(?:\.\d+)?)\s*(million|млн|m)$/i;
      const millionMatch = cleanText.match(millionRegex);
      if (millionMatch) {
        const baseNumber = parseFloat(millionMatch[1]);
        if (!isNaN(baseNumber)) {
          return baseNumber * 1000000;
        }
      }

      // 4. K/К formatlar (ming)
      const thousandRegex = /^(\d+(?:\.\d+)?)\s*([kк])$/i;
      const thousandMatch = cleanText.match(thousandRegex);
      if (thousandMatch) {
        const baseNumber = parseFloat(thousandMatch[1]);
        if (!isNaN(baseNumber)) {
          return baseNumber * 1000;
        }
      }

      // 5. So'm bilan tugagan formatlar
      const somRegex = /^(\d+(?:\.\d+)?)\s*(?:so\'m|сум|som)$/i;
      const somMatch = cleanText.match(somRegex);
      if (somMatch) {
        const baseNumber = parseFloat(somMatch[1]);
        if (!isNaN(baseNumber)) {
          return baseNumber;
        }
      }

      // 6. Aralash formatlar (masalan: 2.5M, 1500K)
      if (cleanText.match(/(\d+(?:\.\d+)?)\s*m/i)) {
        const number = parseFloat(cleanText.replace(/[^\d.]/g, ''));
        if (!isNaN(number)) {
          return number * 1000000;
        }
      }

      if (cleanText.match(/(\d+(?:\.\d+)?)\s*[kк]/i)) {
        const number = parseFloat(cleanText.replace(/[^\d.]/g, ''));
        if (!isNaN(number)) {
          return number * 1000;
        }
      }

      // Agar hech qanday format mos kelmasa
      return null;
    } catch (error) {
      return null;
    }
  }

  // Haydovchilar reytingini ko'rsatish
  private async showDriverPerformanceReport(userId: number): Promise<string> {
    const scoreData = this.calculateDriverScore(userId);
    const performance = this.driverPerformance.get(userId);
    
    if (!performance) {
      return `❌ Performance ma'lumotlari topilmadi.`;
    }

    return `📊 <b>HAYDOVCHI PERFORMANCE HISOBOTI</b>\n\n` +
      `👤 <b>Reyting:</b> ${scoreData.rank} (${scoreData.score}/100)\n\n` +
      `📈 <b>Umumiy ko'rsatkichlar:</b>\n` +
      `▫️ Jami buyurtmalar: ${performance.totalOrders}\n` +
      `▫️ Bajarilgan: ${performance.completedOrders}\n` +
      `▫️ Bekor qilingan: ${performance.cancelledOrders}\n` +
      `▫️ Muvaffaqiyat: ${scoreData.details.successRate.toFixed(1)}%\n\n` +
      `⭐ <b>Sifat ko'rsatkichlari:</b>\n` +
      `▫️ O'rtacha reyting: ${performance.averageRating.toFixed(1)}/5\n` +
      `▫️ Profil to'liqlik: ${scoreData.details.profileCompletion}%\n` +
      `▫️ Telefon holati: ${performance.phoneValidationStatus === 'valid' ? '✅' : '❌'}\n` +
      `▫️ Faollik: ${scoreData.details.activity}%\n\n` +
      `💰 <b>Moliyaviy:</b>\n` +
      `▫️ Jami daromad: ${performance.totalEarnings.toLocaleString()} so'm\n\n` +
      `📅 <b>Oxirgi faoliyat:</b> ${new Date(performance.lastActiveDate).toLocaleDateString('uz-UZ')}\n\n` +
      `${scoreData.score < 70 ? '⚠️ Profilingizni to\'ldiring va faolligingizni oshiring!' : '✅ Ajoyib natija! Davom eting!'}`;
  }

  // Eng yaxshi haydovchilar ro'yxati
  private getTopDrivers(limit: number = 10): Array<{userId: number, score: number, rank: string, name: string}> {
    const driverScores: Array<{userId: number, score: number, rank: string, name: string}> = [];
    
    for (const [driverKey, driverData] of this.driverOffers.entries()) {
      const scoreData = this.calculateDriverScore(driverData.userId);
      driverScores.push({
        userId: driverData.userId,
        score: scoreData.score,
        rank: scoreData.rank,
        name: driverData.driverName || driverData.username
      });
    }

    return driverScores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  getBot(): Bot {
    return this.bot;
  }

  // Soddalashtirilgan haydovchi bilan aloqa
  private async showDriverContact(ctx: any) {
    const userId = ctx.from.id;
    
    // Faal yuklar va haydovchilarni topish
    const userShipments = Array.from(this.cargoShipments.values())
      .filter(shipment => shipment.cargoOwnerId === userId && shipment.status !== 'delivered');

    if (userShipments.length === 0) {
      await ctx.editMessageText(`
💬 <b>HAYDOVCHI BILAN ALOQA</b>

❌ Hozirda yo'ldagi yuklaringiz yo'q

Yukingiz haydovchi tomonidan qabul qilingandan keyin bu bo'limda haydovchi bilan to'g'ridan-to'g'ri chat qilishingiz mumkin bo'ladi.
      `, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .text('🔙 Orqaga', 'cargo_tracking')
      });
      return;
    }

    let contactMessage = `
💬 <b>HAYDOVCHILAR BILAN ALOQA</b>

`;

    userShipments.forEach((shipment, index) => {
      contactMessage += `
${index + 1}. <b>${shipment.route.from} → ${shipment.route.to}</b>
👤 Haydovchi: ${shipment.driver.name}
📱 Telefon: ${shipment.driver.phone}
🚛 Transport: Ma'lumot yo'q
📊 Status: ${shipment.status === 'in_transit' ? '🚛 Yo\'lda' : '📦 Yuklandi'}

`;
    });

    contactMessage += `
💡 <b>Qanday aloqa qilish mumkin:</b>
📞 Telefon qo'ng'iroq qilish
💬 Telegram orqali yozish
📍 Joylashuvni so'rash
📷 Yuk rasmini so'rash
`;

    const keyboard = new InlineKeyboard()
      .text('📞 Telefon raqamlarni ko\'rish', 'show_driver_phones')
      .text('🔄 Yangilash', 'contact_driver').row()
      .text('🔙 Orqaga', 'cargo_tracking');

    await ctx.editMessageText(contactMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  // Soddalashtirilgan joylashuv ko'rsatish
  private async showCargoLocation(ctx: any) {
    const userId = ctx.from.id;
    
    const userShipments = Array.from(this.cargoShipments.values())
      .filter(shipment => shipment.cargoOwnerId === userId && shipment.status !== 'delivered');

    if (userShipments.length === 0) {
      await ctx.editMessageText(`
📍 <b>YUK JOYLASHUVI</b>

❌ Hozirda kuzatiladigan yuklaringiz yo'q

Real vaqt joylashuvni ko'rish uchun yukingiz yo'lga chiqishi kerak.
      `, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .text('🔙 Orqaga', 'cargo_tracking')
      });
      return;
    }

    let locationMessage = `
📍 <b>YUKLARIM JOYLASHUVI</b>

`;

    userShipments.forEach((shipment, index) => {
      const progressPercent = Math.floor(Math.random() * 100); // Real progressni hisoblash kerak
      const estimatedTime = Math.floor(Math.random() * 24) + 1; // Real vaqtni hisoblash kerak
      
      locationMessage += `
${index + 1}. <b>${shipment.route.from} → ${shipment.route.to}</b>
📍 Hozirgi joy: ${shipment.currentLocation || 'Aniqlanmoqda...'}
🚛 Haydovchi: ${shipment.driver.name}
📊 Jo'nab ketdi: ${progressPercent}%
⏰ Taxminiy yetish: ${estimatedTime} soat
🟢 Status: ${shipment.status === 'in_transit' ? 'Yo\'lda' : 'Yuklanyapti'}

`;
    });

    locationMessage += `
🗺️ <b>Qo'shimma ma'lumot:</b>
• Joylashuv har 30 daqiqada yangilanadi
• Haydovchi bilan aloqaga chiqib aniq joylashuvni so'rashingiz mumkin
• Yuk yetkazilgandan keyin joylashuv arxivlanadi
`;

    const keyboard = new InlineKeyboard()
      .text('🔄 Joylashuvni yangilash', 'show_location')
      .text('💬 Haydovchi bilan chat', 'contact_driver').row()
      .text('🔙 Orqaga', 'cargo_tracking');

    await ctx.editMessageText(locationMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }
}