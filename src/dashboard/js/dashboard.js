// LogiMaster Pro Dashboard
class LogiMasterDashboard {
    constructor() {
        this.currentPage = 'orders';
        this.searchTerm = '';
        this.sampleData = this.generateSampleData();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadPage(this.currentPage);
        this.updateLiveStats();
        this.startRealTimeUpdates();
    }

    generateSampleData() {
        return {
            orders: [
                { id: "#ORD-001", customer: "Akmal Karimov", from: "Toshkent", to: "Samarqand", driver: "Bobur Alimov", status: "active", price: 450000, time: "14:30" },
                { id: "#ORD-002", customer: "Malika Azimova", from: "Buxoro", to: "Nukus", driver: "Jamshid Umarov", status: "completed", price: 680000, time: "12:15" },
                { id: "#ORD-003", customer: "Dilshod Nazarov", from: "Andijon", to: "Farg'ona", driver: "Rustam Toshev", status: "pending", price: 320000, time: "16:45" },
                { id: "#ORD-004", customer: "Nodira Qosimova", from: "Qarshi", to: "Termiz", driver: "Aziz Rahmonov", status: "active", price: 520000, time: "13:20" },
                { id: "#ORD-005", customer: "Jasur Toshmatov", from: "Gulistan", to: "Jizzax", driver: "Farrux Karimov", status: "cancelled", price: 280000, time: "11:30" }
            ],
            drivers: [
                { id: 1, name: "Bobur Alimov", phone: "+998901234567", car: "Cobalt", rating: 4.8, balance: 125000, status: "active", orders: 156 },
                { id: 2, name: "Jamshid Umarov", phone: "+998907654321", car: "Nexia", rating: 4.6, balance: 89000, status: "active", orders: 142 },
                { id: 3, name: "Rustam Toshev", phone: "+998909876543", car: "Lacetti", rating: 4.9, balance: 152000, status: "busy", orders: 189 },
                { id: 4, name: "Aziz Rahmonov", phone: "+998903456789", car: "Spark", rating: 4.7, balance: 67500, status: "active", orders: 98 },
                { id: 5, name: "Farrux Karimov", phone: "+998905432198", car: "Matiz", rating: 4.5, balance: 91000, status: "offline", orders: 134 }
            ],
            dispatchers: [
                { id: 1, name: "Sarvar Abdullayev", phone: "+998901111111", shift: "Kunduzi", orders: 45, efficiency: "94%", status: "active" },
                { id: 2, name: "Munisa Ergasheva", phone: "+998902222222", shift: "Kechki", orders: 38, efficiency: "97%", status: "active" },
                { id: 3, name: "Otabek Nazarov", phone: "+998903333333", shift: "Tungi", orders: 28, efficiency: "91%", status: "rest" }
            ],
            customers: [
                { id: 1, name: "Akmal Karimov", phone: "+998901234567", email: "akmal@mail.com", orders: 23, total: 125000, rating: 4.8, status: "vip" },
                { id: 2, name: "Malika Azimova", phone: "+998907654321", email: "malika@mail.com", orders: 18, total: 89000, rating: 4.6, status: "regular" },
                { id: 3, name: "Dilshod Nazarov", phone: "+998909876543", email: "dilshod@mail.com", orders: 31, total: 182000, rating: 4.9, status: "vip" },
                { id: 4, name: "Nodira Qosimova", phone: "+998903456789", email: "nodira@mail.com", orders: 12, total: 67500, rating: 4.7, status: "regular" }
            ]
        };
    }

    setupEventListeners() {
        // Navigation menu items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.getAttribute('data-page');
                this.navigateTo(page);
            });
        });

        // Global search
        const globalSearch = document.getElementById('globalSearch');
        if (globalSearch) {
            globalSearch.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.filterCurrentPageData();
            });
        }

        // Mobile sidebar toggle (if needed)
        this.setupMobileNavigation();
    }

    setupMobileNavigation() {
        // Add mobile menu button if screen is small
        if (window.innerWidth <= 1024) {
            this.createMobileMenuButton();
        }

        window.addEventListener('resize', () => {
            if (window.innerWidth <= 1024) {
                this.createMobileMenuButton();
            }
        });
    }

    createMobileMenuButton() {
        const existingBtn = document.getElementById('mobileMenuBtn');
        if (existingBtn) return;

        const btn = document.createElement('button');
        btn.id = 'mobileMenuBtn';
        btn.className = 'btn-icon d-lg-none';
        btn.innerHTML = '<i class="fas fa-bars"></i>';
        btn.style.position = 'absolute';
        btn.style.left = '1rem';
        btn.style.top = '50%';
        btn.style.transform = 'translateY(-50%)';

        btn.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });

        document.querySelector('.logo-section').insertBefore(btn, document.querySelector('.logo-section').firstChild);
    }

    navigateTo(page) {
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`).classList.add('active');

        this.currentPage = page;
        this.loadPage(page);

        // Close mobile menu
        const sidebar = document.getElementById('sidebar');
        if (sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
        }
    }

    loadPage(page) {
        const contentArea = document.getElementById('contentArea');

        // Show loading
        contentArea.innerHTML = this.getLoadingHTML();

        // Simulate loading delay for better UX
        setTimeout(() => {
            switch(page) {
                case 'orders':
                    contentArea.innerHTML = this.getOrdersPageHTML();
                    break;
                case 'drivers':
                    contentArea.innerHTML = this.getDriversPageHTML();
                    break;
                case 'dispatchers':
                    contentArea.innerHTML = this.getDispatchersPageHTML();
                    break;
                case 'customers':
                    contentArea.innerHTML = this.getCustomersPageHTML();
                    break;
                case 'finance':
                    contentArea.innerHTML = this.getFinancePageHTML();
                    break;
                case 'history':
                    contentArea.innerHTML = this.getHistoryPageHTML();
                    break;
                case 'analytics':
                    contentArea.innerHTML = this.getAnalyticsPageHTML();
                    break;
                case 'support':
                    contentArea.innerHTML = this.getSupportPageHTML();
                    break;
                case 'settings':
                    contentArea.innerHTML = this.getSettingsPageHTML();
                    break;
                default:
                    contentArea.innerHTML = this.getOrdersPageHTML();
            }

            this.setupPageEventListeners();
        }, 300);
    }

    getLoadingHTML() {
        return `
            <div class="loading">
                <div class="spinner"></div>
                Ma'lumotlar yuklanmoqda...
            </div>
        `;
    }

    getOrdersPageHTML() {
        const orders = this.filterData(this.sampleData.orders, ['customer', 'from', 'to', 'driver']);

        return `
            <div class="content-card">
                <div class="content-header">
                    <h2 class="content-title">Buyurtmalar nazorati</h2>
                    <div class="content-actions">
                        <button class="btn-primary" onclick="dashboard.showNewOrderModal()">
                            <i class="fas fa-plus"></i>
                            <span>Yangi buyurtma</span>
                        </button>
                        <button class="btn-icon" onclick="dashboard.refreshOrders()">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                        <button class="btn-icon">
                            <i class="fas fa-filter"></i>
                        </button>
                        <button class="btn-icon">
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
                            ${orders.length > 0 ? orders.map(order => `
                                <tr>
                                    <td>
                                        <div style="font-weight: 500;">${order.id}</div>
                                        <div style="font-size: 0.875rem; color: var(--gray-500);">${order.time}</div>
                                    </td>
                                    <td>${order.customer}</td>
                                    <td>
                                        <div>${order.from} → ${order.to}</div>
                                    </td>
                                    <td>${order.driver}</td>
                                    <td>
                                        <span class="status-badge status-${order.status}">
                                            ${this.getStatusText(order.status)}
                                        </span>
                                    </td>
                                    <td style="font-weight: 600;">₽${order.price.toLocaleString()}</td>
                                    <td>
                                        <div class="action-buttons">
                                            <button class="action-btn blue" title="Ko'rish">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                            <button class="action-btn green" title="Tahrirlash">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="action-btn red" title="O'chirish">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('') : `
                                <tr>
                                    <td colspan="7" class="empty-state">
                                        <i class="fas fa-inbox empty-icon"></i>
                                        <div class="empty-title">Buyurtmalar topilmadi</div>
                                        <div class="empty-description">Hozircha bu bo'limda buyurtmalar mavjud emas yoki qidiruv natijasi bo'yicha hech narsa topilmadi.</div>
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    getDriversPageHTML() {
        const drivers = this.filterData(this.sampleData.drivers, ['name', 'phone', 'car']);

        return `
            <div class="content-card">
                <div class="content-header">
                    <h2 class="content-title">Haydovchilar boshqaruvi</h2>
                    <div class="content-actions">
                        <button class="btn-primary">
                            <i class="fas fa-plus"></i>
                            <span>Haydovchi qo'shish</span>
                        </button>
                        <button class="btn-secondary">
                            <i class="fas fa-wallet"></i>
                            <span>Balans to'ldirish</span>
                        </button>
                    </div>
                </div>

                <div class="table-container">
                    <table class="custom-table">
                        <thead>
                            <tr>
                                <th>Haydovchi</th>
                                <th>Telefon</th>
                                <th>Avtomobil</th>
                                <th>Reyting</th>
                                <th>Balans</th>
                                <th>Holat</th>
                                <th>Buyurtmalar</th>
                                <th>Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${drivers.map(driver => `
                                <tr>
                                    <td>
                                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                                            <div class="avatar blue">
                                                ${driver.name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div style="font-weight: 500;">${driver.name}</div>
                                        </div>
                                    </td>
                                    <td>${driver.phone}</td>
                                    <td>${driver.car}</td>
                                    <td>
                                        <div style="display: flex; align-items: center; gap: 0.25rem;">
                                            <i class="fas fa-star" style="color: #f59e0b;"></i>
                                            <span>${driver.rating}</span>
                                        </div>
                                    </td>
                                    <td style="font-weight: 600;">₽${driver.balance.toLocaleString()}</td>
                                    <td>
                                        <span class="status-badge status-${driver.status}">
                                            ${this.getStatusText(driver.status)}
                                        </span>
                                    </td>
                                    <td>${driver.orders}</td>
                                    <td>
                                        <div class="action-buttons">
                                            <button class="action-btn green" title="Balans to'ldirish" onclick="dashboard.addBalance(${driver.id})">
                                                <i class="fas fa-credit-card"></i>
                                            </button>
                                            <button class="action-btn blue" title="Qo'ng'iroq qilish">
                                                <i class="fas fa-phone"></i>
                                            </button>
                                            <button class="action-btn purple" title="Xabar yuborish">
                                                <i class="fas fa-comment"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    getDispatchersPageHTML() {
        const dispatchers = this.sampleData.dispatchers;

        return `
            <div class="content-card">
                <div class="content-header">
                    <h2 class="content-title">Dispecherlar boshqaruvi</h2>
                    <div class="content-actions">
                        <button class="btn-primary">
                            <i class="fas fa-plus"></i>
                            <span>Yangi dispecher</span>
                        </button>
                    </div>
                </div>

                <div class="table-container">
                    <table class="custom-table">
                        <thead>
                            <tr>
                                <th>Dispecher</th>
                                <th>Telefon</th>
                                <th>Smena</th>
                                <th>Buyurtmalar</th>
                                <th>Samaradorlik</th>
                                <th>Holat</th>
                                <th>Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${dispatchers.map(dispatcher => `
                                <tr>
                                    <td>
                                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                                            <div class="avatar purple">
                                                ${dispatcher.name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div style="font-weight: 500;">${dispatcher.name}</div>
                                        </div>
                                    </td>
                                    <td>${dispatcher.phone}</td>
                                    <td>${dispatcher.shift}</td>
                                    <td>${dispatcher.orders}</td>
                                    <td>${dispatcher.efficiency}</td>
                                    <td>
                                        <span class="status-badge status-${dispatcher.status}">
                                            ${this.getStatusText(dispatcher.status)}
                                        </span>
                                    </td>
                                    <td>
                                        <div class="action-buttons">
                                            <button class="action-btn blue" title="Qo'ng'iroq qilish">
                                                <i class="fas fa-phone"></i>
                                            </button>
                                            <button class="action-btn green" title="Tahrirlash">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="action-btn purple" title="Jadval">
                                                <i class="fas fa-calendar"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    getCustomersPageHTML() {
        const customers = this.filterData(this.sampleData.customers, ['name', 'phone', 'email']);

        return `
            <div class="content-card">
                <div class="content-header">
                    <h2 class="content-title">Mijozlar boshqaruvi</h2>
                    <div class="content-actions">
                        <button class="btn-primary">
                            <i class="fas fa-plus"></i>
                            <span>Yangi mijoz</span>
                        </button>
                        <button class="btn-secondary">
                            <i class="fas fa-envelope"></i>
                            <span>Email yuborish</span>
                        </button>
                    </div>
                </div>

                <div class="table-container">
                    <table class="custom-table">
                        <thead>
                            <tr>
                                <th>Mijoz</th>
                                <th>Telefon</th>
                                <th>Email</th>
                                <th>Buyurtmalar</th>
                                <th>Jami xarajat</th>
                                <th>Reyting</th>
                                <th>Holat</th>
                                <th>Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${customers.map(customer => `
                                <tr>
                                    <td>
                                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                                            <div class="avatar orange">
                                                ${customer.name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div style="font-weight: 500;">${customer.name}</div>
                                        </div>
                                    </td>
                                    <td>${customer.phone}</td>
                                    <td>${customer.email}</td>
                                    <td>${customer.orders}</td>
                                    <td style="font-weight: 600;">₽${customer.total.toLocaleString()}</td>
                                    <td>
                                        <div style="display: flex; align-items: center; gap: 0.25rem;">
                                            <i class="fas fa-star" style="color: #f59e0b;"></i>
                                            <span>${customer.rating}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span class="status-badge status-${customer.status === 'vip' ? 'active' : 'pending'}">
                                            ${customer.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td>
                                        <div class="action-buttons">
                                            <button class="action-btn blue" title="Qo'ng'iroq qilish">
                                                <i class="fas fa-phone"></i>
                                            </button>
                                            <button class="action-btn green" title="Email yuborish">
                                                <i class="fas fa-envelope"></i>
                                            </button>
                                            <button class="action-btn purple" title="Batafsil">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    getFinancePageHTML() {
        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                <div class="content-card">
                    <div style="padding: 1.5rem;">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <div>
                                <p style="font-size: 0.875rem; color: var(--gray-600); margin-bottom: 0.25rem;">Bugungi daromad</p>
                                <p style="font-size: 1.875rem; font-weight: 700; color: #059669; margin-bottom: 0.25rem;">₽24,567</p>
                                <p style="font-size: 0.875rem; color: #059669; display: flex; align-items: center; gap: 0.25rem;">
                                    <i class="fas fa-arrow-up"></i> +18% o'tgan haftaga nisbatan
                                </p>
                            </div>
                            <div class="stat-icon green">
                                <i class="fas fa-dollar-sign"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="content-card">
                    <div style="padding: 1.5rem;">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <div>
                                <p style="font-size: 0.875rem; color: var(--gray-600); margin-bottom: 0.25rem;">Haftalik daromad</p>
                                <p style="font-size: 1.875rem; font-weight: 700; color: #2563eb; margin-bottom: 0.25rem;">₽156,890</p>
                                <p style="font-size: 0.875rem; color: #2563eb; display: flex; align-items: center; gap: 0.25rem;">
                                    <i class="fas fa-arrow-up"></i> +12% o'tgan haftaga nisbatan
                                </p>
                            </div>
                            <div class="stat-icon blue">
                                <i class="fas fa-chart-line"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="content-card">
                    <div style="padding: 1.5rem;">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <div>
                                <p style="font-size: 0.875rem; color: var(--gray-600); margin-bottom: 0.25rem;">Oylik daromad</p>
                                <p style="font-size: 1.875rem; font-weight: 700; color: #7c3aed; margin-bottom: 0.25rem;">₽678,234</p>
                                <p style="font-size: 0.875rem; color: #7c3aed; display: flex; align-items: center; gap: 0.25rem;">
                                    <i class="fas fa-arrow-up"></i> +24% o'tgan oyga nisbatan
                                </p>
                            </div>
                            <div class="stat-icon purple">
                                <i class="fas fa-chart-bar"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="content-card">
                    <div style="padding: 1.5rem;">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <div>
                                <p style="font-size: 0.875rem; color: var(--gray-600); margin-bottom: 0.25rem;">Komissiya</p>
                                <p style="font-size: 1.875rem; font-weight: 700; color: #d97706; margin-bottom: 0.25rem;">₽67,823</p>
                                <p style="font-size: 0.875rem; color: #d97706; display: flex; align-items: center; gap: 0.25rem;">
                                    <i class="fas fa-arrow-up"></i> +8% o'tgan oyga nisbatan
                                </p>
                            </div>
                            <div class="stat-icon orange">
                                <i class="fas fa-credit-card"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="content-card">
                <div class="content-header">
                    <h3 class="content-title">Moliyaviy hisobotlar</h3>
                </div>
                <div style="padding: 1.5rem;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
                        <div>
                            <h4 style="font-weight: 600; margin-bottom: 1rem;">Daromad bo'yicha</h4>
                            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background-color: var(--gray-50); border-radius: 0.5rem;">
                                    <span>Buyurtmalar</span>
                                    <span style="font-weight: 600;">₽580,234</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background-color: var(--gray-50); border-radius: 0.5rem;">
                                    <span>Komissiya</span>
                                    <span style="font-weight: 600;">₽67,823</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background-color: var(--gray-50); border-radius: 0.5rem;">
                                    <span>Qo'shimcha xizmatlar</span>
                                    <span style="font-weight: 600;">₽30,177</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 style="font-weight: 600; margin-bottom: 1rem;">Xarajatlar bo'yicha</h4>
                            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background-color: var(--gray-50); border-radius: 0.5rem;">
                                    <span>Haydovchilar to'lovi</span>
                                    <span style="font-weight: 600; color: #dc2626;">₽420,150</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background-color: var(--gray-50); border-radius: 0.5rem;">
                                    <span>Operatsion xarajatlar</span>
                                    <span style="font-weight: 600; color: #dc2626;">₽85,200</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background-color: var(--gray-50); border-radius: 0.5rem;">
                                    <span>Marketing</span>
                                    <span style="font-weight: 600; color: #dc2626;">₽25,000</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getComingSoonHTML(title) {
        return `
            <div class="content-card">
                <div class="content-header">
                    <h2 class="content-title">${title}</h2>
                </div>
                <div class="empty-state">
                    <i class="fas fa-tools empty-icon"></i>
                    <div class="empty-title">Tez orada...</div>
                    <div class="empty-description">Bu bo'lim hozircha ishlab chiqilmoqda. Tez orada yangi funksiyalar qo'shiladi.</div>
                </div>
            </div>
        `;
    }

    getHistoryPageHTML() {
        return this.getComingSoonHTML("Buyurtmalar tarixi");
    }

    getAnalyticsPageHTML() {
        return this.getComingSoonHTML("Analitika va statistika");
    }

    getSupportPageHTML() {
        return this.getComingSoonHTML("Qo'llab-quvvatlash");
    }

    getSettingsPageHTML() {
        return this.getComingSoonHTML("Sozlamalar");
    }

    setupPageEventListeners() {
        // Add event listeners for page-specific actions
        // These will be handled by specific methods
    }

    // Utility methods
    filterData(data, searchFields) {
        if (!this.searchTerm) return data;

        return data.filter(item => {
            return searchFields.some(field =>
                item[field] && item[field].toString().toLowerCase().includes(this.searchTerm.toLowerCase())
            );
        });
    }

    filterCurrentPageData() {
        this.loadPage(this.currentPage);
    }

    getStatusText(status) {
        const statusMap = {
            active: 'Faol',
            completed: 'Yakunlangan',
            pending: 'Kutilmoqda',
            cancelled: 'Bekor qilingan',
            busy: 'Band',
            offline: 'Offline',
            rest: 'Dam olish',
            regular: 'Oddiy',
            vip: 'VIP'
        };
        return statusMap[status] || status;
    }

    updateLiveStats() {
        // Update sidebar live stats
        try {
            this.fetchDashboardStats();
        } catch (error) {
            // Use sample data if API fails
            document.getElementById('liveDrivers').textContent = this.sampleData.drivers.filter(d => d.status === 'active').length;
            document.getElementById('liveOrders').textContent = this.sampleData.orders.filter(o => o.status === 'active').length;
            document.getElementById('liveRevenue').textContent = '₽24,567';
        }

        // Update main stats cards
        document.getElementById('totalOrders').textContent = this.sampleData.orders.length;
        document.getElementById('totalDrivers').textContent = this.sampleData.drivers.length;
        document.getElementById('totalRevenue').textContent = '₽24,567';
        document.getElementById('successRate').textContent = '96.8%';
    }

    async fetchDashboardStats() {
        try {
            const response = await fetch('/api/dashboard/stats');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    document.getElementById('liveDrivers').textContent = data.data.drivers;
                    document.getElementById('liveOrders').textContent = data.data.orders;
                    document.getElementById('liveRevenue').textContent = '₽' + data.data.revenue.toLocaleString();

                    document.getElementById('totalOrders').textContent = data.data.orders;
                    document.getElementById('totalDrivers').textContent = data.data.drivers;
                    document.getElementById('totalRevenue').textContent = '₽' + data.data.revenue.toLocaleString();
                }
            }
        } catch (error) {
            console.log('Using demo data - API not available');
        }
    }

    startRealTimeUpdates() {
        // Update stats every 30 seconds
        setInterval(() => {
            this.updateLiveStats();
        }, 30000);

        // Update current time every second
        this.updateCurrentTime();
        setInterval(() => {
            this.updateCurrentTime();
        }, 1000);
    }

    updateCurrentTime() {
        const now = new Date();
        const timeString = now.toLocaleString('uz-UZ', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        // Update time in notification area or add time display
        const existingTime = document.getElementById('currentTime');
        if (!existingTime) {
            const timeDiv = document.createElement('div');
            timeDiv.id = 'currentTime';
            timeDiv.style.fontSize = '0.75rem';
            timeDiv.style.color = 'var(--gray-500)';
            timeDiv.textContent = timeString;
            document.querySelector('.user-details').appendChild(timeDiv);
        } else {
            existingTime.textContent = timeString;
        }
    }

    // Action methods
    showNewOrderModal() {
        alert('Yangi buyurtma modal oynasi ochiladi...');
    }

    refreshOrders() {
        this.loadPage('orders');
        this.showNotification('Buyurtmalar yangilandi', 'success');
    }

    addBalance(driverId) {
        const amount = prompt('Balans qo\'shish summasi (so\'m):');
        if (amount && !isNaN(amount) && amount > 0) {
            alert(`Haydovchi #${driverId} ga ${parseInt(amount).toLocaleString()} so'm qo'shildi`);
            this.loadPage('drivers');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 2rem;
            right: 2rem;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            z-index: 9999;
            font-weight: 500;
            animation: slideIn 0.3s ease;
        `;

        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; font-size: 1.2rem; margin-left: 0.5rem; cursor: pointer;">×</button>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
}

// Add slide in animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new LogiMasterDashboard();
});