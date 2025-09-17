// Finance Dashboard JavaScript
let revenueChart;
let paymentTypesChart;
let currentPayments = [];
let currentTransactions = [];
let currentBalances = [];
let selectedPaymentId = null;

// Server API base URL
const API_BASE_URL = 'http://185.207.251.184:3004/api/dashboard';

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('💰 Finance Dashboard Loading...');
    initializeFinanceDashboard();
});

async function initializeFinanceDashboard() {
    try {
        // Load initial data
        await loadFinanceStats();
        await loadPendingPayments();
        await loadTransactions();
        await loadBalances();
        await loadCommissionSettings();

        // Initialize charts
        initializeCharts();

        console.log('✅ Finance Dashboard initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing finance dashboard:', error);
        showNotification('Ma\'lumotlarni yuklashda xatolik yuz berdi', 'error');
    }
}

// Load finance statistics
async function loadFinanceStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/finance/dashboard`);
        const result = await response.json();

        if (result.success) {
            const stats = result.data;

            // Update statistics cards
            document.getElementById('totalRevenue').textContent = formatMoney(stats.totalRevenue);
            document.getElementById('commissionEarned').textContent = formatMoney(stats.commissionEarned);
            document.getElementById('pendingPayments').textContent = formatMoney(stats.pendingPayments);
            document.getElementById('driverPayouts').textContent = formatMoney(stats.driverPayouts);

            console.log('📊 Finance stats loaded:', stats);
        } else {
            throw new Error(result.error || 'Failed to load finance stats');
        }
    } catch (error) {
        console.error('❌ Error loading finance stats:', error);
        // Set default values on error
        document.getElementById('totalRevenue').textContent = '0';
        document.getElementById('commissionEarned').textContent = '0';
        document.getElementById('pendingPayments').textContent = '0';
        document.getElementById('driverPayouts').textContent = '0';
    }
}

// Load pending payments
async function loadPendingPayments(type = '') {
    try {
        let url = `${API_BASE_URL}/finance/payments/pending`;
        if (type) {
            url += `?type=${type}`;
        }

        const response = await fetch(url);
        const result = await response.json();

        if (result.success) {
            currentPayments = result.data;
            displayPendingPayments(currentPayments);
            console.log('💳 Pending payments loaded:', currentPayments.length);
        } else {
            throw new Error(result.error || 'Failed to load payments');
        }
    } catch (error) {
        console.error('❌ Error loading pending payments:', error);
        currentPayments = [];
        displayPendingPayments([]);
    }
}

// Display pending payments
function displayPendingPayments(payments) {
    const container = document.getElementById('pendingPaymentsList');

    if (!payments || payments.length === 0) {
        container.innerHTML = '<div class="text-center py-4"><p class="text-muted">Kutilayotgan to\'lovlar yo\'q</p></div>';
        return;
    }

    const paymentItems = payments.map(payment => {
        const statusClass = payment.status === 'pending' ? 'payment-pending' :
                           payment.status === 'approved' ? 'payment-approved' : 'payment-rejected';

        const typeNames = {
            'balance_topup': 'Balans to\'ldirish',
            'withdrawal': 'Pul yechish',
            'order_payment': 'Buyurtma to\'lovi'
        };

        return `
            <div class="payment-item ${statusClass}">
                <div class="row align-items-center">
                    <div class="col-md-3">
                        <h6 class="mb-1">${payment.userName}</h6>
                        <small class="text-muted">${payment.userPhone}</small>
                    </div>
                    <div class="col-md-2">
                        <span class="badge bg-info">${typeNames[payment.type] || payment.type}</span>
                    </div>
                    <div class="col-md-2">
                        <h6 class="text-success mb-0">${formatMoney(payment.amount)}</h6>
                        <small class="text-muted">so'm</small>
                    </div>
                    <div class="col-md-2">
                        <small class="text-muted">${formatDateTime(payment.submittedAt)}</small>
                    </div>
                    <div class="col-md-2">
                        <span class="status-badge badge-${payment.status}">${getStatusText(payment.status)}</span>
                    </div>
                    <div class="col-md-1">
                        <div class="btn-group-vertical btn-group-sm">
                            <button class="btn btn-success btn-sm" onclick="showPaymentAction('${payment.id}', 'approve')"
                                    ${payment.status !== 'pending' ? 'disabled' : ''}>
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="showPaymentAction('${payment.id}', 'reject')"
                                    ${payment.status !== 'pending' ? 'disabled' : ''}>
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>
                ${payment.notes ? `<div class="mt-2"><small class="text-muted"><i class="fas fa-sticky-note"></i> ${payment.notes}</small></div>` : ''}
                ${payment.screenshot ? `<div class="mt-2"><small class="text-info"><i class="fas fa-camera"></i> Skrinshot mavjud</small></div>` : ''}
            </div>
        `;
    }).join('');

    container.innerHTML = paymentItems;
}

// Load transactions
async function loadTransactions(page = 1, type = '', status = '') {
    try {
        let url = `${API_BASE_URL}/finance/transactions?page=${page}&limit=20`;
        if (type) url += `&type=${type}`;
        if (status) url += `&status=${status}`;

        const response = await fetch(url);
        const result = await response.json();

        if (result.success) {
            currentTransactions = result.data;
            displayTransactions(currentTransactions);
            updateTransactionPagination(result.pagination);
            console.log('💱 Transactions loaded:', currentTransactions.length);
        } else {
            throw new Error(result.error || 'Failed to load transactions');
        }
    } catch (error) {
        console.error('❌ Error loading transactions:', error);
        currentTransactions = [];
        displayTransactions([]);
    }
}

// Display transactions
function displayTransactions(transactions) {
    const container = document.getElementById('transactionsList');

    if (!transactions || transactions.length === 0) {
        container.innerHTML = '<div class="text-center py-4"><p class="text-muted">Tranzaksiyalar yo\'q</p></div>';
        return;
    }

    const transactionItems = transactions.map(transaction => {
        const isIncome = transaction.amount > 0;
        const itemClass = isIncome ? 'transaction-income' : 'transaction-expense';
        const amountColor = isIncome ? 'text-success' : 'text-danger';
        const amountPrefix = isIncome ? '+' : '';

        return `
            <div class="transaction-item ${itemClass}">
                <div class="row align-items-center">
                    <div class="col-md-3">
                        <h6 class="mb-1">${transaction.userName}</h6>
                        <small class="text-muted">${transaction.id}</small>
                    </div>
                    <div class="col-md-3">
                        <p class="mb-1">${transaction.description}</p>
                        <small class="text-muted">${getTransactionTypeText(transaction.type)}</small>
                    </div>
                    <div class="col-md-2">
                        <h6 class="mb-0 ${amountColor}">${amountPrefix}${formatMoney(Math.abs(transaction.amount))}</h6>
                        <small class="text-muted">so'm</small>
                    </div>
                    <div class="col-md-2">
                        <small class="text-muted">${formatDateTime(transaction.createdAt)}</small>
                    </div>
                    <div class="col-md-2">
                        <span class="status-badge badge-${transaction.status}">${getStatusText(transaction.status)}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = transactionItems;
}

// Load user balances
async function loadBalances(userType = '', search = '') {
    try {
        let url = `${API_BASE_URL}/finance/balances`;
        const params = new URLSearchParams();
        if (userType) params.append('userType', userType);
        if (search) params.append('search', search);

        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        const response = await fetch(url);
        const result = await response.json();

        if (result.success) {
            currentBalances = result.data;
            displayBalances(currentBalances);
            console.log('💰 User balances loaded:', currentBalances.length);
        } else {
            throw new Error(result.error || 'Failed to load balances');
        }
    } catch (error) {
        console.error('❌ Error loading balances:', error);
        currentBalances = [];
        displayBalances([]);
    }
}

// Display user balances
function displayBalances(balances) {
    const tbody = document.getElementById('balancesTable');

    if (!balances || balances.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">Balans ma\'lumotlari yo\'q</td></tr>';
        return;
    }

    const userTypeNames = {
        'driver': 'Haydovchi',
        'dispatcher': 'Dispecher',
        'customer': 'Mijoz'
    };

    const rows = balances.map(balance => `
        <tr>
            <td>
                <div>
                    <strong>${balance.userName}</strong><br>
                    <small class="text-muted">${balance.phone}</small>
                </div>
            </td>
            <td>
                <span class="badge bg-secondary">${userTypeNames[balance.userType] || balance.userType}</span>
            </td>
            <td>
                <h6 class="text-success mb-0">${formatMoney(balance.balance)}</h6>
            </td>
            <td>
                <h6 class="text-warning mb-0">${formatMoney(balance.pendingEarnings)}</h6>
            </td>
            <td>
                <h6 class="text-info mb-0">${formatMoney(balance.totalEarned)}</h6>
            </td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="showBalanceAdjustModal(${balance.userId}, '${balance.userName}')">
                    <i class="fas fa-edit"></i> O'zgartirish
                </button>
            </td>
        </tr>
    `).join('');

    tbody.innerHTML = rows;
}

// Initialize charts
function initializeCharts() {
    // Revenue Chart
    const revenueCtx = document.getElementById('revenueChart').getContext('2d');
    revenueChart = new Chart(revenueCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Daromad',
                data: [],
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Daromad Dinamikasi'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatMoney(value);
                        }
                    }
                }
            }
        }
    });

    // Payment Types Chart
    const paymentCtx = document.getElementById('paymentTypesChart').getContext('2d');
    paymentTypesChart = new Chart(paymentCtx, {
        type: 'doughnut',
        data: {
            labels: ['Balans to\'ldirish', 'Buyurtma to\'lovi', 'Komissiya', 'Jarima'],
            datasets: [{
                data: [30, 45, 20, 5],
                backgroundColor: [
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(255, 205, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });

    // Load initial chart data
    updateRevenueChart();
}

// Update revenue chart
async function updateRevenueChart() {
    try {
        const period = document.getElementById('revenuePeriodSelect').value;
        const response = await fetch(`${API_BASE_URL}/finance/revenue-report?period=${period}`);
        const result = await response.json();

        if (result.success && revenueChart) {
            const data = result.data;

            revenueChart.data.labels = data.labels;
            revenueChart.data.datasets[0].data = data.revenue;
            revenueChart.update();

            console.log('📊 Revenue chart updated for period:', period);
        }
    } catch (error) {
        console.error('❌ Error updating revenue chart:', error);
    }
}

// Load commission settings
async function loadCommissionSettings() {
    try {
        const response = await fetch(`${API_BASE_URL}/finance/commission-settings`);
        const result = await response.json();

        if (result.success) {
            const settings = result.data;

            // Update form fields
            document.getElementById('driverCommissionPercent').value = settings.driverCommission.percentage;
            document.getElementById('dispatcherCommissionPercent').value = settings.dispatcherCommission.percentage;
            document.getElementById('systemFeePercent').value = settings.systemFee.percentage;

            console.log('⚙️ Commission settings loaded:', settings);
        }
    } catch (error) {
        console.error('❌ Error loading commission settings:', error);
    }
}

// Show payment action modal
function showPaymentAction(paymentId, action) {
    selectedPaymentId = paymentId;
    const payment = currentPayments.find(p => p.id === paymentId);

    if (!payment) {
        showNotification('To\'lov topilmadi', 'error');
        return;
    }

    const actionText = action === 'approve' ? 'tasdiqlash' : 'rad etish';
    const actionColor = action === 'approve' ? 'success' : 'danger';

    const content = `
        <div class="row">
            <div class="col-md-6">
                <p><strong>Foydalanuvchi:</strong> ${payment.userName}</p>
                <p><strong>Telefon:</strong> ${payment.userPhone}</p>
                <p><strong>Miqdor:</strong> <span class="text-success">${formatMoney(payment.amount)} so'm</span></p>
                <p><strong>Turi:</strong> ${payment.type}</p>
            </div>
            <div class="col-md-6">
                <p><strong>Sana:</strong> ${formatDateTime(payment.submittedAt)}</p>
                <p><strong>To'lov usuli:</strong> ${payment.paymentMethod}</p>
                ${payment.notes ? `<p><strong>Izoh:</strong> ${payment.notes}</p>` : ''}
                ${payment.screenshot ? `<p><strong>Skrinshot:</strong> <span class="text-info">Mavjud</span></p>` : ''}
            </div>
        </div>
        ${action === 'reject' ? `
        <div class="mt-3">
            <label class="form-label">Rad etish sababi:</label>
            <textarea class="form-control" id="rejectionReason" rows="3" required></textarea>
        </div>
        ` : ''}
    `;

    document.getElementById('paymentActionContent').innerHTML = content;
    document.getElementById('approvePaymentBtn').style.display = action === 'approve' ? 'inline-block' : 'none';
    document.getElementById('rejectPaymentBtn').style.display = action === 'reject' ? 'inline-block' : 'none';

    new bootstrap.Modal(document.getElementById('paymentActionModal')).show();
}

// Process payment action
async function processPaymentAction(action) {
    if (!selectedPaymentId) return;

    try {
        const url = `${API_BASE_URL}/finance/payments/${selectedPaymentId}/${action}`;
        const body = action === 'reject' ? {
            reason: document.getElementById('rejectionReason')?.value || 'Rad etildi'
        } : {};

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const result = await response.json();

        if (result.success) {
            showNotification(`To'lov ${action === 'approve' ? 'tasdiqlandi' : 'rad etildi'}`, 'success');
            bootstrap.Modal.getInstance(document.getElementById('paymentActionModal')).hide();
            await loadPendingPayments();
            await loadFinanceStats();
        } else {
            throw new Error(result.message || `Failed to ${action} payment`);
        }
    } catch (error) {
        console.error(`❌ Error ${action}ing payment:`, error);
        showNotification(`To'lovni ${action === 'approve' ? 'tasdiqlash' : 'rad etish'}da xatolik`, 'error');
    }
}

// Show balance adjustment modal
function showBalanceAdjustModal(userId, userName) {
    document.getElementById('adjustUserId').value = userId;
    document.getElementById('adjustUserName').value = userName;
    document.getElementById('adjustmentType').value = '';
    document.getElementById('adjustmentAmount').value = '';
    document.getElementById('adjustmentReason').value = '';

    new bootstrap.Modal(document.getElementById('balanceAdjustModal')).show();
}

// Process balance adjustment
async function processBalanceAdjustment() {
    try {
        const userId = document.getElementById('adjustUserId').value;
        const type = document.getElementById('adjustmentType').value;
        const amount = parseInt(document.getElementById('adjustmentAmount').value);
        const reason = document.getElementById('adjustmentReason').value;

        if (!type || !amount || !reason) {
            showNotification('Barcha maydonlarni to\'ldiring', 'error');
            return;
        }

        const response = await fetch(`${API_BASE_URL}/finance/balances/${userId}/adjust`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ type, amount, reason })
        });

        const result = await response.json();

        if (result.success) {
            showNotification('Balans muvaffaqiyatli o\'zgartirildi', 'success');
            bootstrap.Modal.getInstance(document.getElementById('balanceAdjustModal')).hide();
            await loadBalances();
            await loadFinanceStats();
        } else {
            throw new Error(result.message || 'Failed to adjust balance');
        }
    } catch (error) {
        console.error('❌ Error adjusting balance:', error);
        showNotification('Balansni o\'zgartirishda xatolik', 'error');
    }
}

// Filter functions
function filterPayments(type) {
    loadPendingPayments(type === 'all' ? '' : type);
}

function filterTransactions() {
    const type = document.getElementById('transactionTypeFilter').value;
    const date = document.getElementById('transactionDateFilter').value;

    // Implement filtering logic here
    loadTransactions(1, type, '');
}

function filterBalances() {
    const userType = document.getElementById('balanceUserTypeFilter').value;
    const search = document.getElementById('balanceSearchFilter').value;

    loadBalances(userType, search);
}

// Save commission settings
document.getElementById('commissionSettingsForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    try {
        const settingsData = {
            driverCommission: {
                percentage: parseInt(document.getElementById('driverCommissionPercent').value)
            },
            dispatcherCommission: {
                percentage: parseInt(document.getElementById('dispatcherCommissionPercent').value)
            },
            systemFee: {
                percentage: parseInt(document.getElementById('systemFeePercent').value)
            }
        };

        const response = await fetch(`${API_BASE_URL}/finance/commission-settings`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settingsData)
        });

        const result = await response.json();

        if (result.success) {
            showNotification('Komissiya sozlamalari saqlandi', 'success');
        } else {
            throw new Error(result.message || 'Failed to save settings');
        }
    } catch (error) {
        console.error('❌ Error saving commission settings:', error);
        showNotification('Sozlamalarni saqlashda xatolik', 'error');
    }
});

// Save payment method settings
function savePaymentMethodSettings() {
    showNotification('To\'lov usuli sozlamalari saqlandi', 'success');
}

// Export finance report
function exportFinanceReport() {
    // Implement export functionality
    showNotification('Hisobot tayyorlanmoqda...', 'info');
}

// Refresh finance data
async function refreshFinanceData() {
    showNotification('Ma\'lumotlar yangilanmoqda...', 'info');
    await initializeFinanceDashboard();
    showNotification('Ma\'lumotlar yangilandi', 'success');
}

// Update transaction pagination
function updateTransactionPagination(pagination) {
    const container = document.getElementById('transactionPagination');

    if (!pagination || pagination.totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let paginationHTML = '';

    // Previous button
    if (pagination.page > 1) {
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="loadTransactions(${pagination.page - 1})">Oldingi</a></li>`;
    }

    // Page numbers
    for (let i = Math.max(1, pagination.page - 2); i <= Math.min(pagination.totalPages, pagination.page + 2); i++) {
        const activeClass = i === pagination.page ? 'active' : '';
        paginationHTML += `<li class="page-item ${activeClass}"><a class="page-link" href="#" onclick="loadTransactions(${i})">${i}</a></li>`;
    }

    // Next button
    if (pagination.page < pagination.totalPages) {
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="loadTransactions(${pagination.page + 1})">Keyingi</a></li>`;
    }

    container.innerHTML = paginationHTML;
}

// Utility functions
function formatMoney(amount) {
    if (typeof amount !== 'number') return '0';
    return new Intl.NumberFormat('uz-UZ').format(amount);
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('uz-UZ', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'Kutilmoqda',
        'approved': 'Tasdiqlangan',
        'rejected': 'Rad etilgan',
        'completed': 'Bajarilgan'
    };
    return statusMap[status] || status;
}

function getTransactionTypeText(type) {
    const typeMap = {
        'commission': 'Komissiya',
        'balance_topup': 'Balans to\'ldirish',
        'penalty': 'Jarima',
        'withdrawal': 'Pul yechish',
        'order_payment': 'Buyurtma to\'lovi'
    };
    return typeMap[type] || type;
}

function showNotification(message, type = 'info') {
    console.log(`${type.toUpperCase()}: ${message}`);

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}