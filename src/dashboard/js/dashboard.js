// LogiMaster Pro Enhanced Dashboard
class LogiMasterDashboard {
    constructor() {
        this.currentPage = 'dashboard';
        this.searchTerm = '';
        this.sidebarCollapsed = false;
        this.currentTime = new Date();
        this.showModal = false;
        this.modalType = '';
        this.selectedItem = null;
        this.formData = {};
        this.callActive = false;
        this.currentCall = null;
        this.apiData = {};
        this.init();
    }

    async init() {
        await this.loadApiData();
        this.setupEventListeners();
        this.loadPage(this.currentPage);
        this.updateLiveStats();
        this.startRealTimeUpdates();
        this.updateTime();
    }

    async loadApiData() {
        console.log('🔄 Loading API data...');
        try {
            // Load dashboard stats
            console.log('📊 Fetching stats...');
            const statsResponse = await fetch('/api/dashboard/stats');
            const statsData = await statsResponse.json();
            console.log('Stats response:', statsData);

            // Load orders
            const ordersResponse = await fetch('/api/dashboard/orders');
            const ordersData = await ordersResponse.json();

            // Load drivers
            const driversResponse = await fetch('/api/dashboard/drivers');
            const driversData = await driversResponse.json();

            // Load payments
            const paymentsResponse = await fetch('/api/dashboard/payments');
            const paymentsData = await paymentsResponse.json();

            this.apiData = {
                stats: statsData.success ? statsData.data : this.getDefaultStats(),
                orders: ordersData.success ? ordersData.data : [],
                drivers: driversData.success ? driversData.data : [],
                payments: paymentsData.success ? paymentsData.data : []
            };

            console.log('✅ API data loaded successfully', this.apiData);
        } catch (error) {
            console.error('❌ Error loading API data:', error);
            this.apiData = {
                stats: this.getDefaultStats(),
                orders: [],
                drivers: [],
                payments: []
            };
        }
    }

    getDefaultStats() {
        return {
            orders: 0,
            drivers: 0,
            dispatchers: 0,
            customers: 0,
            revenue: 0,
            completedOrders: 0
        };
    }

    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');

        // Navigation menu items
        const navItems = document.querySelectorAll('.nav-item');
        console.log(`Found ${navItems.length} navigation items`);

        navItems.forEach((item, index) => {
            console.log(`Setting up listener for nav item ${index}:`, item.getAttribute('data-page'));
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.getAttribute('data-page');
                console.log(`🖱️ Clicked navigation item: ${page}`);
                this.setActivePage(page);
                this.loadPage(page);
            });
        });

        // Global search
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.handleSearch();
            });

            // Ctrl+K shortcut for search
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'k') {
                    e.preventDefault();
                    searchInput.focus();
                }
            });
        }

        // Mobile sidebar toggle
        const menuBtn = document.querySelector('[data-sidebar-toggle]');
        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }

        // Notification button
        const notificationBtn = document.getElementById('notificationBtn');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', () => {
                this.showNotifications();
            });
        }
    }

    setActivePage(page) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        const activeItem = document.querySelector(`[data-page="${page}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }

        this.currentPage = page;
    }

    async loadPage(page) {
        console.log(`📄 Loading page: ${page}`);
        const contentArea = document.getElementById('contentArea');
        if (!contentArea) {
            console.error('❌ ContentArea element not found!');
            return;
        }

        let content = '';

        switch(page) {
            case 'dashboard':
                content = this.renderDashboard();
                break;
            case 'orders':
                content = await this.renderOrders();
                break;
            case 'drivers':
                content = await this.renderDrivers();
                break;
            case 'dispatchers':
                content = this.renderDispatchers();
                break;
            case 'customers':
                content = this.renderCustomers();
                break;
            case 'finance':
                content = await this.renderFinance();
                break;
            case 'history':
                content = this.renderHistory();
                break;
            case 'analytics':
                content = this.renderAnalytics();
                break;
            case 'employees':
                content = this.renderEmployees();
                break;
            case 'roles':
                content = this.renderRoles();
                break;
            case 'support':
                content = this.renderSupport();
                break;
            case 'settings':
                content = this.renderSettings();
                break;
            default:
                content = this.renderComingSoon(page);
        }

        contentArea.innerHTML = content;
        this.attachPageEventListeners(page);
    }

    renderDashboard() {
        return `
            <!-- Stats Cards -->
            <div class="stats-grid">
                ${this.renderStatsCards()}
            </div>

            <div style="display: flex; gap: 2rem; flex-wrap: wrap; margin-top: 2rem;">
                <!-- Recent Activity -->
                <div style="flex: 2; min-width: 600px;" class="content-card">
                    <div class="content-header">
                        <h3 class="content-title">So'nggi faollik</h3>
                        <div class="content-actions">
                            <button class="btn-secondary" onclick="dashboard.refreshActivity()">
                                <i class="fas fa-refresh"></i>
                                <span>Yangilash</span>
                            </button>
                        </div>
                    </div>
                    <div class="p-6">
                        <div class="space-y-4" id="recentActivity">
                            ${this.renderRecentActivity()}
                        </div>
                    </div>
                </div>

                <!-- Top Drivers and Live Stats -->
                <div style="flex: 1; min-width: 300px; display: flex; flex-direction: column; gap: 1.5rem;">
                    <!-- Top Drivers -->
                    <div class="content-card">
                        <div style="padding: 1.5rem;">
                            <h3 style="font-size: 1.125rem; font-weight: 700; color: #111827; margin-bottom: 1rem; display: flex; align-items: center;">
                                <i class="fas fa-trophy text-yellow-600 mr-2"></i>
                                Top haydovchilar
                            </h3>
                            <div class="space-y-3">
                                ${this.renderTopDrivers()}
                            </div>
                        </div>
                    </div>

                    <!-- Live Activity Feed -->
                    <div class="content-card" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1)); border: 1px solid rgba(59, 130, 246, 0.2);">
                        <div class="p-6">
                            <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                <i class="fas fa-bolt text-blue-600 mr-2"></i>
                                Jonli faollik
                            </h3>
                            <div class="space-y-3" id="liveActivityFeed">
                                ${this.renderLiveActivityFeed()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderStatsCards() {
        const stats = this.apiData.stats || this.getDefaultStats();
        return `
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-info">
                        <h3>Faol buyurtmalar</h3>
                        <div class="stat-value" id="totalOrders">${stats.orders}</div>
                        <div class="stat-change positive">
                            <i class="fas fa-arrow-up"></i>
                            <span>+18% so'nggi oyga nisbatan</span>
                        </div>
                    </div>
                    <div class="stat-icon blue">
                        <i class="fas fa-box"></i>
                    </div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-info">
                        <h3>Faol haydovchilar</h3>
                        <div class="stat-value" id="totalDrivers">${stats.drivers}</div>
                        <div class="stat-change positive">
                            <i class="fas fa-arrow-up"></i>
                            <span>+12% so'nggi oyga nisbatan</span>
                        </div>
                    </div>
                    <div class="stat-icon green">
                        <i class="fas fa-car"></i>
                    </div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-info">
                        <h3>Bugungi daromad</h3>
                        <div class="stat-value" id="totalRevenue">${this.formatCurrency(stats.revenue)}</div>
                        <div class="stat-change positive">
                            <i class="fas fa-arrow-up"></i>
                            <span>+24% so'nggi oyga nisbatan</span>
                        </div>
                    </div>
                    <div class="stat-icon purple">
                        <i class="fas fa-dollar-sign"></i>
                    </div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-info">
                        <h3>Muvaffaqiyat darajasi</h3>
                        <div class="stat-value" id="successRate">96.8%</div>
                        <div class="stat-change positive">
                            <i class="fas fa-arrow-up"></i>
                            <span>+3% so'nggi oyga nisbatan</span>
                        </div>
                    </div>
                    <div class="stat-icon orange">
                        <i class="fas fa-chart-line"></i>
                    </div>
                </div>
            </div>
        `;
    }

    renderRecentActivity() {
        if (!this.apiData.orders || this.apiData.orders.length === 0) {
            return '<div class="text-center py-8 text-gray-500">Ma\'lumotlar yuklanmoqda...</div>';
        }

        return this.apiData.orders.slice(0, 6).map(order => `
            <div class="flex items-center justify-between p-4 rounded-xl" style="background: rgba(0, 0, 0, 0.02); transition: all 0.3s ease;"
                 onmouseover="this.style.background='rgba(59, 130, 246, 0.05)'"
                 onmouseout="this.style.background='rgba(0, 0, 0, 0.02)'">
                <div class="flex items-center space-x-4">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center"
                         style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white;">
                        <i class="fas fa-box"></i>
                    </div>
                    <div>
                        <h4 class="font-semibold text-gray-900">${order.id}</h4>
                        <p class="text-sm text-gray-600">${order.customer || 'Mijoz nomi'} - ${order.route || 'Marshrut'}</p>
                        <p class="text-xs text-gray-500">Haydovchi: ${order.driver || 'Tayinlanmagan'}</p>
                    </div>
                </div>
                <div class="text-right">
                    <span class="inline-flex px-3 py-1 rounded-full text-xs font-medium ${this.getStatusClass(order.status)}">
                        ${this.getStatusText(order.status)}
                    </span>
                    <p class="text-sm font-bold text-gray-900 mt-1">${this.formatCurrency(order.amount || 0)}</p>
                </div>
            </div>
        `).join('');
    }

    renderTopDrivers() {
        if (!this.apiData.drivers || this.apiData.drivers.length === 0) {
            return '<div class="text-center py-4 text-gray-500">Haydovchilar ma\'lumotlari yuklanmoqda...</div>';
        }

        return this.apiData.drivers.slice(0, 4).map((driver, index) => `
            <div class="flex items-center space-x-3 p-3 rounded-xl border border-gray-100 transition-all duration-300"
                 style="background: linear-gradient(135deg, rgba(0, 0, 0, 0.02), rgba(255, 255, 255, 0.8));"
                 onmouseover="this.style.boxShadow='0 4px 20px rgba(0, 0, 0, 0.1)'"
                 onmouseout="this.style.boxShadow='none'">
                <div class="relative">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center"
                         style="background: linear-gradient(135deg, #10b981, #3b82f6); color: white;">
                        <span class="font-bold text-sm">${driver.name ? driver.name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'DR'}</span>
                    </div>
                    <div class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${driver.status === 'active' ? 'bg-green-500' : driver.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-400'}"></div>
                </div>
                <div class="flex-1">
                    <div class="flex items-center justify-between">
                        <h4 class="font-semibold text-gray-900 text-sm">${driver.name || `Driver #${driver.id}`}</h4>
                        <span class="text-xs font-bold text-green-600">${this.formatCurrency(driver.balance || 0)}</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <p class="text-xs text-gray-600">${driver.orders || 0} buyurtma</p>
                        <div class="flex items-center">
                            <i class="fas fa-star text-yellow-400 w-3 h-3 mr-1"></i>
                            <span class="text-xs text-gray-600">${driver.rating || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderLiveActivityFeed() {
        const activities = [
            { type: 'success', text: 'Yangi buyurtma qabul qilindi', details: 'Toshkentdan Samarqandga • ₽450,000', time: '2 daqiqa oldin', color: 'green' },
            { type: 'info', text: 'Haydovchi muvaffaqiyatli yetkazdi', details: 'Rustam Toshev • #ORD-2841', time: '5 daqiqa oldin', color: 'blue' },
            { type: 'warning', text: 'Balans to\'ldirildi', details: 'Bobur Alimov • +₽50,000', time: '8 daqiqa oldin', color: 'yellow' },
            { type: 'success', text: 'VIP mijoz ro\'yxatdan o\'tdi', details: 'Zarina Ibragimova • Premium', time: '12 daqiqa oldin', color: 'purple' }
        ];

        return activities.map(activity => `
            <div class="flex items-start space-x-3 p-3 rounded-xl border border-white/50 transition-all"
                 style="background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px);"
                 onmouseover="this.style.background='rgba(255, 255, 255, 0.9)'"
                 onmouseout="this.style.background='rgba(255, 255, 255, 0.7)'">
                <div class="w-2 h-2 rounded-full mt-2 ${activity.color === 'green' ? 'bg-green-500' : activity.color === 'blue' ? 'bg-blue-500' : activity.color === 'yellow' ? 'bg-yellow-500' : 'bg-purple-500'}"
                     style="animation: pulse 2s infinite;"></div>
                <div class="flex-1">
                    <h4 class="font-semibold text-sm text-gray-900">${activity.text}</h4>
                    <p class="text-xs text-gray-600">${activity.details}</p>
                    <p class="text-xs text-gray-400 mt-1">${activity.time}</p>
                </div>
            </div>
        `).join('');
    }

    async renderOrders() {
        return `
            <div class="content-card">
                <div class="content-header">
                    <h2 class="content-title">Buyurtmalar nazorati</h2>
                    <div class="content-actions">
                        <button class="btn-primary" onclick="dashboard.openModal('order')">
                            <i class="fas fa-plus"></i>
                            <span>Yangi buyurtma</span>
                        </button>
                        <button class="btn-secondary" onclick="dashboard.refreshOrders()">
                            <i class="fas fa-filter"></i>
                        </button>
                        <button class="btn-secondary">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                </div>

                <div class="table-container">
                    <table class="custom-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Mijoz</th>
                                <th>Marshrut</th>
                                <th>Haydovchi</th>
                                <th>Holat</th>
                                <th>Narx</th>
                                <th>Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.renderOrdersTable()}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderOrdersTable() {
        if (!this.apiData.orders || this.apiData.orders.length === 0) {
            return '<tr><td colspan="7" class="text-center py-8 text-gray-500">Buyurtmalar yuklanmoqda...</td></tr>';
        }

        return this.apiData.orders.map(order => `
            <tr style="transition: background-color 0.3s ease;"
                onmouseover="this.style.background='rgba(59, 130, 246, 0.05)'"
                onmouseout="this.style.background='transparent'">
                <td>
                    <div class="font-medium text-gray-900">${order.id}</div>
                    <div class="text-sm text-gray-500">${order.date || 'N/A'}</div>
                </td>
                <td>
                    <div class="flex items-center space-x-3">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center"
                             style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white;">
                            <span class="text-xs font-bold">${order.customer ? order.customer.split(' ').map(n => n[0]).join('').substring(0, 2) : 'CU'}</span>
                        </div>
                        <div>
                            <div class="text-sm font-medium text-gray-900">${order.customer || 'Noma\'lum mijoz'}</div>
                            <div class="text-sm text-gray-500">+998901234567</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="text-sm text-gray-900">${order.route || 'Noma\'lum → Noma\'lum'}</div>
                    <div class="text-sm text-gray-500">${order.cargoType || 'Yuk turi ko\'rsatilmagan'}</div>
                </td>
                <td class="text-sm text-gray-900">${order.driver || 'Tayinlanmagan'}</td>
                <td>
                    <span class="status-badge ${this.getStatusClass(order.status)}">
                        ${this.getStatusText(order.status)}
                    </span>
                </td>
                <td class="text-sm font-medium text-gray-900">${this.formatCurrency(order.amount || 0)}</td>
                <td>
                    <div class="flex items-center space-x-2">
                        <button onclick="dashboard.startCall('${order.customer}', '+998901234567')"
                                class="p-1 text-green-600 hover:text-green-900 rounded transition-colors"
                                title="Qo'ng'iroq qilish">
                            <i class="fas fa-phone w-4 h-4"></i>
                        </button>
                        <button onclick="dashboard.editOrder('${order.id}')"
                                class="p-1 text-blue-600 hover:text-blue-900 rounded transition-colors"
                                title="Tahrirlash">
                            <i class="fas fa-edit w-4 h-4"></i>
                        </button>
                        <button onclick="dashboard.deleteOrder('${order.id}')"
                                class="p-1 text-red-600 hover:text-red-900 rounded transition-colors"
                                title="O'chirish">
                            <i class="fas fa-trash w-4 h-4"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async renderDrivers() {
        return `
            <div class="content-card">
                <div class="content-header">
                    <h2 class="content-title">Haydovchilar boshqaruvi</h2>
                    <div class="content-actions">
                        <button class="btn-primary" onclick="dashboard.openModal('driver')">
                            <i class="fas fa-user-plus"></i>
                            <span>Yangi haydovchi</span>
                        </button>
                        <button class="btn-secondary">
                            <i class="fas fa-filter"></i>
                        </button>
                        <button class="btn-secondary">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                </div>

                <div class="table-container">
                    <table class="custom-table">
                        <thead>
                            <tr>
                                <th>Haydovchi</th>
                                <th>Telefon</th>
                                <th>Mashina</th>
                                <th>Reyting</th>
                                <th>Balans</th>
                                <th>Holat</th>
                                <th>Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.renderDriversTable()}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderDriversTable() {
        if (!this.apiData.drivers || this.apiData.drivers.length === 0) {
            return '<tr><td colspan="7" class="text-center py-8 text-gray-500">Haydovchilar ma\'lumotlari yuklanmoqda...</td></tr>';
        }

        return this.apiData.drivers.map(driver => `
            <tr style="transition: background-color 0.3s ease;"
                onmouseover="this.style.background='rgba(59, 130, 246, 0.05)'"
                onmouseout="this.style.background='transparent'">
                <td>
                    <div class="flex items-center space-x-3">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center"
                             style="background: linear-gradient(135deg, #10b981, #3b82f6); color: white;">
                            <span class="text-xs font-bold">${driver.name ? driver.name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'DR'}</span>
                        </div>
                        <div>
                            <div class="text-sm font-medium text-gray-900">${driver.name || `Driver #${driver.id}`}</div>
                            <div class="text-sm text-gray-500">${driver.orders || 0} buyurtma</div>
                        </div>
                    </div>
                </td>
                <td class="text-sm text-gray-900">${driver.phone || 'N/A'}</td>
                <td class="text-sm text-gray-900">${driver.vehicle || 'Ma\'lumot yo\'q'}</td>
                <td>
                    <div class="flex items-center">
                        <i class="fas fa-star text-yellow-400 mr-1"></i>
                        <span class="text-sm text-gray-900">${driver.rating || 'N/A'}</span>
                    </div>
                </td>
                <td class="text-sm font-medium text-gray-900">${this.formatCurrency(driver.balance || 0)}</td>
                <td>
                    <span class="status-badge ${this.getStatusClass(driver.status)}">
                        ${this.getStatusText(driver.status)}
                    </span>
                </td>
                <td>
                    <div class="flex items-center space-x-2">
                        <button onclick="dashboard.startCall('${driver.name}', '${driver.phone}')"
                                class="p-1 text-green-600 hover:text-green-900 rounded transition-colors"
                                title="Qo'ng'iroq qilish">
                            <i class="fas fa-phone w-4 h-4"></i>
                        </button>
                        <button onclick="dashboard.addBalance('${driver.id}', '${driver.name}', '${driver.balance}')"
                                class="p-1 text-purple-600 hover:text-purple-900 rounded transition-colors"
                                title="Balans to'ldirish">
                            <i class="fas fa-wallet w-4 h-4"></i>
                        </button>
                        <button onclick="dashboard.editDriver('${driver.id}')"
                                class="p-1 text-blue-600 hover:text-blue-900 rounded transition-colors"
                                title="Tahrirlash">
                            <i class="fas fa-edit w-4 h-4"></i>
                        </button>
                        <button onclick="dashboard.deleteDriver('${driver.id}')"
                                class="p-1 text-red-600 hover:text-red-900 rounded transition-colors"
                                title="O'chirish">
                            <i class="fas fa-trash w-4 h-4"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async renderFinance() {
        return `
            <div class="content-card">
                <div class="content-header">
                    <h2 class="content-title">To'lovlar boshqaruvi</h2>
                    <div class="content-actions">
                        <button class="btn-secondary">
                            <i class="fas fa-filter"></i>
                        </button>
                        <button class="btn-secondary">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                </div>

                <div class="table-container">
                    <table class="custom-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Foydalanuvchi</th>
                                <th>Miqdor</th>
                                <th>Turi</th>
                                <th>Sana</th>
                                <th>Holat</th>
                                <th>Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.renderPaymentsTable()}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderPaymentsTable() {
        if (!this.apiData.payments || this.apiData.payments.length === 0) {
            return '<tr><td colspan="7" class="text-center py-8 text-gray-500">To\'lovlar ma\'lumotlari yuklanmoqda...</td></tr>';
        }

        return this.apiData.payments.map(payment => `
            <tr style="transition: background-color 0.3s ease;"
                onmouseover="this.style.background='rgba(59, 130, 246, 0.05)'"
                onmouseout="this.style.background='transparent'">
                <td class="font-medium text-gray-900">${payment.id}</td>
                <td>
                    <div class="text-sm font-medium text-gray-900">${payment.userName || 'Noma\'lum'}</div>
                    <div class="text-sm text-gray-500">ID: ${payment.userId}</div>
                </td>
                <td class="text-sm font-medium text-gray-900">${this.formatCurrency(payment.amount || 0)}</td>
                <td class="text-sm text-gray-900">${payment.type === 'balance' ? 'Balans to\'ldirish' : payment.type}</td>
                <td class="text-sm text-gray-500">${payment.date || 'N/A'}</td>
                <td>
                    <span class="status-badge ${this.getStatusClass(payment.status)}">
                        ${this.getStatusText(payment.status)}
                    </span>
                </td>
                <td>
                    <div class="flex items-center space-x-2">
                        ${payment.status === 'pending' ? `
                            <button onclick="dashboard.approvePayment('${payment.id}')"
                                    class="p-1 text-green-600 hover:text-green-900 rounded transition-colors"
                                    title="Tasdiqlash">
                                <i class="fas fa-check w-4 h-4"></i>
                            </button>
                            <button onclick="dashboard.rejectPayment('${payment.id}')"
                                    class="p-1 text-red-600 hover:text-red-900 rounded transition-colors"
                                    title="Rad etish">
                                <i class="fas fa-times w-4 h-4"></i>
                            </button>
                        ` : ''}
                        ${payment.screenshot ? `
                            <button onclick="dashboard.viewScreenshot('${payment.id}')"
                                    class="p-1 text-blue-600 hover:text-blue-900 rounded transition-colors"
                                    title="Screenshot ko'rish">
                                <i class="fas fa-image w-4 h-4"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderComingSoon(page) {
        const pageNames = {
            dispatchers: 'Dispecherlar',
            customers: 'Mijozlar',
            history: 'Buyurtmalar tarixi',
            analytics: 'Analitika',
            employees: 'Xodimlar',
            roles: 'Rollar va huquqlar',
            support: 'Qo\'llab-quvvatlash',
            settings: 'Sozlamalar'
        };

        return `
            <div class="content-card p-8">
                <div class="text-center">
                    <div class="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                         style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white;">
                        <i class="fas fa-tools w-10 h-10"></i>
                    </div>
                    <h2 class="text-3xl font-bold text-gray-900 mb-2">
                        ${pageNames[page] || 'Bo\'lim'}
                    </h2>
                    <p class="text-gray-600 mb-8">
                        Bu bo'lim professional darajada ishlab chiqilmoqda...
                    </p>
                    <div class="rounded-xl p-6 border border-blue-100" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(139, 92, 246, 0.05));">
                        <h3 class="text-lg font-semibold text-gray-900 mb-2">Tez orada...</h3>
                        <p class="text-gray-600">Bu bo'lim professional darajada ishlab chiqilmoqda. Barcha funksiyalar va imkoniyatlar qo'shiladi.</p>
                    </div>
                </div>
            </div>
        `;
    }

    attachPageEventListeners(page) {
        // Page-specific event listeners can be added here
        console.log(`✅ Attached event listeners for page: ${page}`);
    }

    // Utility methods
    getStatusClass(status) {
        const statusClasses = {
            'active': 'status-active',
            'completed': 'status-completed',
            'pending': 'status-pending',
            'cancelled': 'bg-red-100 text-red-800',
            'busy': 'bg-yellow-100 text-yellow-800',
            'offline': 'bg-gray-100 text-gray-800',
            'matched': 'status-completed'
        };
        return statusClasses[status] || 'status-pending';
    }

    getStatusText(status) {
        const statusTexts = {
            'active': 'Faol',
            'completed': 'Yakunlangan',
            'pending': 'Kutilmoqda',
            'cancelled': 'Bekor qilingan',
            'busy': 'Band',
            'offline': 'Offline',
            'matched': 'Mos keldi'
        };
        return statusTexts[status] || 'Noma\'lum';
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('uz-UZ', {
            style: 'currency',
            currency: 'UZS',
            minimumFractionDigits: 0
        }).format(amount).replace('UZS', 'so\'m');
    }

    // Action methods
    async refreshActivity() {
        console.log('🔄 Refreshing activity...');
        await this.loadApiData();
        if (this.currentPage === 'dashboard') {
            this.loadPage('dashboard');
        }
        this.showNotification('Ma\'lumotlar yangilandi', 'success');
    }

    async refreshOrders() {
        console.log('🔄 Refreshing orders...');
        await this.loadApiData();
        if (this.currentPage === 'orders') {
            this.loadPage('orders');
        }
        this.showNotification('Buyurtmalar yangilandi', 'success');
    }

    startCall(name, phone) {
        console.log(`📞 Starting call to ${name} - ${phone}`);
        this.currentCall = { name, phone };
        this.callActive = true;
        this.showCallModal();
    }

    showCallModal() {
        // Implementation for call modal
        this.showNotification(`Qo'ng'iroq: ${this.currentCall.name}`, 'info');
    }

    editOrder(orderId) {
        console.log(`✏️ Editing order ${orderId}`);
        this.showNotification('Tahrirlash funksiyasi qo\'shilmoqda', 'info');
    }

    deleteOrder(orderId) {
        if (confirm('Buyurtmani o\'chirishga ishonchingiz komilmi?')) {
            console.log(`🗑️ Deleting order ${orderId}`);
            this.showNotification('Buyurtma o\'chirildi', 'success');
        }
    }

    addBalance(driverId, driverName, currentBalance) {
        console.log(`💰 Adding balance to driver ${driverId}`);
        this.showNotification(`${driverName} balansini to'ldirish funksiyasi qo'shilmoqda`, 'info');
    }

    async approvePayment(paymentId) {
        try {
            const response = await fetch(`/api/dashboard/payments/${paymentId}/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const result = await response.json();

            if (result.success) {
                this.showNotification('To\'lov tasdiqlandi', 'success');
                await this.loadApiData();
                this.loadPage(this.currentPage);
            } else {
                this.showNotification('Xatolik yuz berdi', 'error');
            }
        } catch (error) {
            console.error('Error approving payment:', error);
            this.showNotification('Xatolik yuz berdi', 'error');
        }
    }

    async rejectPayment(paymentId) {
        const reason = prompt('Rad etish sababini kiriting:');
        if (!reason) return;

        try {
            const response = await fetch(`/api/dashboard/payments/${paymentId}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason })
            });
            const result = await response.json();

            if (result.success) {
                this.showNotification('To\'lov rad etildi', 'success');
                await this.loadApiData();
                this.loadPage(this.currentPage);
            } else {
                this.showNotification('Xatolik yuz berdi', 'error');
            }
        } catch (error) {
            console.error('Error rejecting payment:', error);
            this.showNotification('Xatolik yuz berdi', 'error');
        }
    }

    openModal(type) {
        console.log(`📝 Opening ${type} modal`);
        this.modalType = type;
        this.showModal = true;
        this.showNotification(`${type === 'order' ? 'Yangi buyurtma' : 'Yangi haydovchi'} qo'shish funksiyasi qo'shilmoqda`, 'info');
    }

    editDriver(driverId) {
        console.log(`✏️ Editing driver ${driverId}`);
        this.showNotification('Haydovchi tahrirlash funksiyasi qo\'shilmoqda', 'info');
    }

    deleteDriver(driverId) {
        if (confirm('Haydovchini o\'chirishga ishonchingiz komilmi?')) {
            console.log(`🗑️ Deleting driver ${driverId}`);
            this.showNotification('Haydovchi o\'chirildi', 'success');
        }
    }

    viewScreenshot(paymentId) {
        console.log(`📷 Viewing screenshot for payment ${paymentId}`);
        this.showNotification('Screenshot ko\'rish funksiyasi qo\'shilmoqda', 'info');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            type === 'warning' ? 'bg-yellow-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    showNotifications() {
        this.showNotification('Bildirishnomalar bo\'limi qo\'shilmoqda', 'info');
    }

    handleSearch() {
        console.log(`🔍 Searching for: ${this.searchTerm}`);
        // Implement search functionality
    }

    toggleSidebar() {
        this.sidebarCollapsed = !this.sidebarCollapsed;
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('open');
        }
    }

    updateTime() {
        setInterval(() => {
            this.currentTime = new Date();
            const timeElement = document.getElementById('currentTime');
            if (timeElement) {
                timeElement.textContent = this.currentTime.toLocaleTimeString('uz-UZ', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        }, 1000);
    }

    async updateLiveStats() {
        if (this.apiData.stats) {
            // Update stats cards
            const totalOrders = document.getElementById('totalOrders');
            const totalDrivers = document.getElementById('totalDrivers');
            const totalRevenue = document.getElementById('totalRevenue');
            const liveDrivers = document.getElementById('liveDrivers');
            const liveOrders = document.getElementById('liveOrders');
            const liveRevenue = document.getElementById('liveRevenue');

            if (totalOrders) totalOrders.textContent = this.apiData.stats.orders;
            if (totalDrivers) totalDrivers.textContent = this.apiData.stats.drivers;
            if (totalRevenue) totalRevenue.textContent = this.formatCurrency(this.apiData.stats.revenue);
            if (liveDrivers) liveDrivers.textContent = this.apiData.stats.drivers;
            if (liveOrders) liveOrders.textContent = this.apiData.stats.orders;
            if (liveRevenue) liveRevenue.textContent = this.formatCurrency(this.apiData.stats.revenue);
        }
    }

    startRealTimeUpdates() {
        // Update data every 30 seconds
        setInterval(async () => {
            await this.loadApiData();
            this.updateLiveStats();

            // Update current page if needed
            if (this.currentPage === 'dashboard') {
                const recentActivity = document.getElementById('recentActivity');
                if (recentActivity) {
                    recentActivity.innerHTML = this.renderRecentActivity();
                }

                const liveActivityFeed = document.getElementById('liveActivityFeed');
                if (liveActivityFeed) {
                    liveActivityFeed.innerHTML = this.renderLiveActivityFeed();
                }
            }
        }, 30000);
    }
}

// Initialize dashboard when DOM is loaded
if (!window.dashboard) {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🚀 Initializing LogiMaster Pro Dashboard...');
        if (!window.dashboard) {
            window.dashboard = new LogiMasterDashboard();
        }
    });
}

console.log('📊 LogiMaster Pro Dashboard Script Loaded');