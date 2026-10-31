// Types for the entire application
// ─── Vehicle ───
export interface Vehicle {
  id: string
  registrationNumber: string
  registrationNumberNormalized: string
  name: string
  type?: string
  extraKmRate: number
  currentKm: number
  nextServiceKm: number
  insuranceExpiry: string
  permitExpiry: string
  pollutionExpiry: string
  status: 'active' | 'inactive' | 'service_due'
  photoUrl?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

// ─── Trip ───
export type TripStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

export interface Trip {
  id: string
  tripNumber: string
  receiptNumber?: string
  tripDate: string
  vehicleId: string
  vehicleName?: string
  driverName: string
  customerName: string
  customerPhone: string
  from: string
  to: string
  startingKm: number
  endingKm: number
  includedKm: number
  extraKmRate: number
  baseFare: number
  extraKmCharge: number
  advanceReceived: number
  driverAgreedPay: number
  totalFare: number
  customerPaid: number
  customerBalance: number
  driverPaid: number
  driverBalance: number
  status: TripStatus
  notes?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
}

// ─── Payment ───
export type PaymentType = 'customer_received' | 'driver_payment'
export type PaymentMode = 'cash' | 'bank_transfer' | 'upi' | 'card' | 'other'

export interface Payment {
  id: string
  tripId: string
  type: PaymentType
  amount: number
  paymentDate: string
  paymentMode: PaymentMode
  notes?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
}

// ─── Expense ───
export type ExpenseCategory = 'fuel' | 'food' | 'maintenance' | 'tolls' | 'parking' | 'office_expense' | 'other'

export interface Expense {
  id: string
  expenseDate: string
  category: ExpenseCategory
  description: string
  amount: number
  paymentMode: PaymentMode
  tripId?: string
  tripNumber?: string
  vehicleId?: string
  vehicleName?: string
  notes?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
}

// ─── Reminder ───
export type ReminderCategory = 'trip' | 'vehicle_service' | 'documents' | 'driver' | 'general'
export type ReminderStatus = 'pending' | 'upcoming' | 'overdue' | 'completed'

export interface Reminder {
  id: string
  title: string
  dueDate: string
  category: ReminderCategory
  relatedEntityType?: string
  relatedEntityId?: string
  notes?: string
  status: ReminderStatus
  completedAt?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
}

// ─── Settings ───
export interface AppSettings {
  defaultCurrency: string
  dateFormat: string
  timeFormat: string
  enableNotifications: boolean
  showAnalytics: boolean
  lastBackup?: string
  appVersion: string
}

// ─── Dashboard ───
export interface DashboardMetrics {
  totalTrips: number
  totalCollection: number
  totalExpenses: number
  profitLoss: number
  pendingCustomerPayment: number
  driverPaymentPending: number
  vehicleServiceDue: number
  todayTrips: number
}

// ─── Cash Book ───
export interface CashBookEntry {
  id: string
  date: string
  tripId?: string
  description: string
  cashIn: number
  cashOut: number
  balance: number
  type: 'receipt' | 'expense' | 'driver_payment'
  paymentMode: PaymentMode
  createdAt: string
}

// ─── Report ───
export interface TripReport {
  tripId: string
  date: string
  vehicle: string
  customer: string
  route: string
  km: number
  fareWithExtra: number
  receipts: number
  driverPay: number
  profitLoss: number
  status: TripStatus
}

// ─── User Profile ───
export type UserRole = 'admin' | 'manager' | 'staff'

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  role: UserRole
  phone?: string
  userId?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}
