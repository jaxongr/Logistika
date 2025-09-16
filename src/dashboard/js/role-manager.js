// Role-based Access Control for Dashboard
class RoleManager {
    constructor() {
        this.currentUser = null;
        this.permissions = null;
        this.init();
    }

    async init() {
        await this.loadCurrentUser();
        this.applyRoleRestrictions();
    }

    async loadCurrentUser() {
        try {
            // Bu yerda haqiqiy authentication qo'shilganda userId session'dan olinadi
            const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');

            if (!userId) {
                console.warn('User ID not found in session');
                return;
            }

            const response = await fetch(`/api/dashboard/users/${userId}`);
            const result = await response.json();

            if (result.success) {
                this.currentUser = result.data;
                await this.loadPermissions();
            }
        } catch (error) {
            console.error('Error loading current user:', error);
        }
    }

    async loadPermissions() {
        try {
            if (!this.currentUser) return;

            const response = await fetch(`/api/dashboard/users/${this.currentUser.id}/permissions`);
            const result = await response.json();

            if (result.success) {
                this.permissions = result.data.permissions;
            }
        } catch (error) {
            console.error('Error loading permissions:', error);
        }
    }

    applyRoleRestrictions() {
        if (!this.permissions) return;

        this.filterSidebarMenu();
        this.updateUserInfo();
        this.restrictOrderAccess();
    }

    filterSidebarMenu() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        const menuItems = sidebar.querySelectorAll('.nav-item');
        const allowedSections = this.permissions.allowedSections;

        menuItems.forEach(item => {
            const page = item.getAttribute('data-page');

            // Har doim dashboard ko'rsatish
            if (page === 'dashboard') {
                item.style.display = 'flex';
                return;
            }

            // Ruxsat berilgan bo'limlarni ko'rsatish
            if (allowedSections.includes(page)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });

        // Operator uchun faqat kerakli bo'limlarni ko'rsatish
        if (this.currentUser?.role === 'operator') {
            this.hideRestrictedMenuItems(['dispatchers', 'customers', 'users', 'staff', 'finance']);
        }
    }

    hideRestrictedMenuItems(restrictedPages) {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        restrictedPages.forEach(page => {
            const menuItem = sidebar.querySelector(`[data-page="${page}"]`);
            if (menuItem) {
                menuItem.style.display = 'none';
            }
        });
    }

    updateUserInfo() {
        if (!this.currentUser) return;

        // Header'dagi foydalanuvchi ma'lumotlarini yangilash
        const userNameElement = document.getElementById('userName');
        const userRoleElement = document.getElementById('userRole');

        if (userNameElement) {
            userNameElement.textContent = this.currentUser.name;
        }

        if (userRoleElement) {
            const roleNames = {
                'admin': 'Administrator',
                'moderator': 'Moderator',
                'operator': 'Operator'
            };
            userRoleElement.textContent = roleNames[this.currentUser.role] || this.currentUser.role;
        }

        // Role badge qo'shish
        this.addRoleBadge();
    }

    addRoleBadge() {
        const header = document.querySelector('.header-content');
        if (!header || !this.currentUser) return;

        // Mavjud badge'ni olib tashlash
        const existingBadge = header.querySelector('.role-badge');
        if (existingBadge) {
            existingBadge.remove();
        }

        // Yangi badge yaratish
        const badge = document.createElement('div');
        badge.className = 'role-badge';
        badge.innerHTML = `
            <span class="role-text">${this.currentUser.role.toUpperCase()}</span>
        `;

        // Badge uchun CSS
        const style = document.createElement('style');
        style.textContent = `
            .role-badge {
                background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                color: white;
                padding: 0.5rem 1rem;
                border-radius: 1rem;
                font-size: 0.75rem;
                font-weight: 600;
                letter-spacing: 0.05em;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
            }

            .role-badge.operator {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            }

            .role-badge.moderator {
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
            }
        `;
        document.head.appendChild(style);

        if (this.currentUser.role === 'operator') {
            badge.classList.add('operator');
        } else if (this.currentUser.role === 'moderator') {
            badge.classList.add('moderator');
        }

        // Header'ning o'ng tomoniga qo'shish
        const rightSection = header.querySelector('.header-right') || header;
        rightSection.insertBefore(badge, rightSection.firstChild);
    }

    restrictOrderAccess() {
        // Buyurtmalar sahifasida foydalanuvchi faqat o'z buyurtmalarini ko'rishi
        if (!this.permissions || this.permissions.canEditAllOrders) return;

        // Orders table'ni filter qilish
        this.filterOrdersTable();
    }

    async filterOrdersTable() {
        // Bu method buyurtmalar sahifasi yuklanganda ishlaydi
        const ordersTable = document.getElementById('ordersTable');
        if (!ordersTable || !this.currentUser) return;

        try {
            // Foydalanuvchining ruxsat berilgan buyurtmalarini olish
            const user = await this.getCurrentUserData();
            const allowedOrders = user.allowedOrders || [];

            // Table rows'ni filter qilish
            const rows = ordersTable.querySelectorAll('tbody tr');
            rows.forEach(row => {
                const orderId = row.getAttribute('data-order-id');
                if (orderId && !allowedOrders.includes(orderId)) {
                    row.style.display = 'none';
                }
            });

            // Edit tugmalarini disable qilish
            this.disableEditButtons();
        } catch (error) {
            console.error('Error filtering orders table:', error);
        }
    }

    disableEditButtons() {
        const editButtons = document.querySelectorAll('.edit-order-btn');
        editButtons.forEach(btn => {
            const orderId = btn.getAttribute('data-order-id');
            if (orderId) {
                this.checkOrderEditPermission(orderId, btn);
            }
        });
    }

    async checkOrderEditPermission(orderId, button) {
        try {
            const response = await fetch(`/api/dashboard/users/${this.currentUser.id}/orders/${orderId}/can-edit`);
            const result = await response.json();

            if (!result.data.canEdit) {
                button.disabled = true;
                button.style.opacity = '0.5';
                button.title = 'Siz bu buyurtmani tahrir qila olmaysiz';
            }
        } catch (error) {
            console.error('Error checking order edit permission:', error);
            button.disabled = true;
        }
    }

    async getCurrentUserData() {
        const response = await fetch(`/api/dashboard/users/${this.currentUser.id}`);
        const result = await response.json();
        return result.data;
    }

    // Admin uchun buyurtmani foydalanuvchiga biriktirish
    async assignOrderToUser(userId, orderId) {
        try {
            const response = await fetch(`/api/dashboard/users/${userId}/orders/${orderId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                console.log('Order assigned successfully');
                return true;
            } else {
                console.error('Error assigning order:', result.message);
                return false;
            }
        } catch (error) {
            console.error('Error assigning order:', error);
            return false;
        }
    }

    // Buyurtmani foydalanuvchidan olib tashlash
    async removeOrderFromUser(userId, orderId) {
        try {
            const response = await fetch(`/api/dashboard/users/${userId}/orders/${orderId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                console.log('Order removed successfully');
                return true;
            } else {
                console.error('Error removing order:', result.message);
                return false;
            }
        } catch (error) {
            console.error('Error removing order:', error);
            return false;
        }
    }

    // Foydalanuvchi role'ini o'zgartirish
    updateUserRole(newRole) {
        if (this.currentUser) {
            this.currentUser.role = newRole;
            this.loadPermissions().then(() => {
                this.applyRoleRestrictions();
            });
        }
    }

    // Test uchun temporary user yaratish
    setTestUser(role = 'operator') {
        this.currentUser = {
            id: 'test_user_123',
            name: 'Test User',
            role: role,
            allowedOrders: ['order_1', 'order_2']
        };

        // Test permissions
        if (role === 'operator') {
            this.permissions = {
                canViewOrders: true,
                canEditOwnOrders: true,
                canEditAllOrders: false,
                canViewDrivers: true,
                canEditDrivers: false,
                canViewFinance: false,
                canEditFinance: false,
                canViewUsers: false,
                canEditUsers: false,
                allowedSections: ['dashboard', 'orders', 'drivers']
            };
        }

        this.applyRoleRestrictions();
    }
}

// Global instance yaratish
window.roleManager = new RoleManager();

// DOM yuklanganda ishga tushirish
document.addEventListener('DOMContentLoaded', () => {
    // Test uchun - keyinroq authentication bilan almashtiriladi
    if (!sessionStorage.getItem('userId')) {
        console.log('Setting test user for demonstration');
        window.roleManager.setTestUser('operator');
    }
});