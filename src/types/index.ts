// Types for the entire application

// ─── Soft Delete & Recovery System Metadata ───
export interface SoftDeleteMetadata {
  isDeleted?: boolean
  deletedAt?: string | null
  deletedBy?: {
    uid?: string
    email?: string
    displayName?: string
    role?: string
  } | null
  originalCollection?: string
  deletionReason?: string
  restoredAt?: string | null
  restoredBy?: {
    uid?: string
    email?: string
  } | null
}

// ─── Vehicle ───
export interface Vehicle extends SoftDeleteMetadata {
  id: string
  registrationNumber: string
  registrationNumberNormalized: string
  name: string
  type?: string
  seats?: number
  extraKmRate: number
  currentKm: number
  nextServiceKm: number
  insuranceExpiry: string
  permitExpiry: string
  pollutionExpiry: string
  status: 'active' | 'inactive' | 'service_due'
  photoUrl?: string
  notes?: string
  isConfirmed?: boolean
  confirmedAt?: string
  confirmedBy?: string
  createdAt: string
  updatedAt: string
}

// ─── Trip ───
export type TripStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

export interface Trip extends SoftDeleteMetadata {
  id: string
  tripNumber: string
  receiptNumber?: string
  tripDate: string
  vehicleId: string
  vehicleName?: string
  driverName: string
  driverPhone?: string
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
  isConfirmed?: boolean
  confirmedAt?: string
  confirmedBy?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
  customer?: string
  pickupTime?: string
  time?: string
  reportingTime?: string
}

// ─── Payment ───
export type PaymentType = 'customer_received' | 'driver_payment'
export type PaymentStage = 'advance' | 'balance' | 'full'
export type PaymentMode = 'cash' | 'bank_transfer' | 'upi' | 'card' | 'other'

export interface Payment extends SoftDeleteMetadata {
  id: string
  tripId: string
  type: PaymentType
  paymentStage?: PaymentStage
  amount: number
  paymentDate: string
  paymentMode: PaymentMode
  notes?: string
  isConfirmed?: boolean
  confirmedAt?: string
  confirmedBy?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
}

// ─── Expense ───
export type ExpenseCategory =
  | 'fuel'
  | 'food'
  | 'maintenance'
  | 'tolls'
  | 'parking'
  | 'office_expense'
  | 'other'
  | (string & {})


export interface Expense extends SoftDeleteMetadata {
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
  isConfirmed?: boolean
  confirmedAt?: string
  confirmedBy?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
}

// ─── Reminder ───
export type ReminderCategory = 'trip' | 'vehicle_service' | 'documents' | 'driver' | 'general'
export type ReminderStatus = 'pending' | 'upcoming' | 'overdue' | 'completed'

export interface Reminder extends SoftDeleteMetadata {
  id: string
  title: string
  dueDate: string
  category: ReminderCategory
  relatedEntityType?: string
  relatedEntityId?: string
  notes?: string
  status: ReminderStatus
  completedAt?: string
  isConfirmed?: boolean
  confirmedAt?: string
  confirmedBy?: string
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
export interface CashBookEntry extends SoftDeleteMetadata {
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

export interface UserProfile extends SoftDeleteMetadata {
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

export interface Staff {
  id?: string
  uid: string
  name: string
  displayName: string
  userId: string
  username: string
  email: string
  role: 'staff'
  phone?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ─── Soft Delete & Recovery System ───
export interface SoftDeleteMetadata {
  isDeleted?: boolean
  deletedAt?: string | null
  deletedBy?: {
    uid?: string
    email?: string
    displayName?: string
    role?: string
  } | null
  originalCollection?: string
  deletionReason?: string
  restoredAt?: string | null
  restoredBy?: {
    uid?: string
    email?: string
  } | null
}

export interface TrashItem {
  id: string
  originalId: string
  originalCollection: string
  recordName: string
  recordType: string
  data: Record<string, any>
  isDeleted: boolean
  deletedAt: string
  deletedBy: {
    uid?: string
    email?: string
    displayName?: string
    role?: string
  }
  deletionReason?: string
  restored?: boolean
  restoredAt?: string | null
  restoredBy?: {
    uid?: string
    email?: string
  } | null
  createdAt?: string
  updatedAt?: string
}

// ─── Backup & Recovery System ───
export type BackupType = 'manual' | 'scheduled_daily' | 'scheduled_weekly' | 'pre_restore_safety'
export type BackupStatus = 'success' | 'failed' | 'in_progress'

export interface BackupRecord {
  id: string
  name: string
  createdAt: string
  type: BackupType
  status: BackupStatus
  sizeBytes: number
  sizeFormatted: string
  totalRecords: number
  collections: string[]
  collectionCounts: Record<string, number>
  createdBy: {
    uid?: string
    email?: string
    displayName?: string
  }
  notes?: string
  downloadUrl?: string
  error?: string
  payload?: BackupPayload
  retentionDays?: number
  expiresAt?: string
}

export interface BackupPayload {
  version: string
  timestamp: string
  backupId: string
  type: BackupType
  databaseId: string
  summary: {
    totalCollections: number
    totalDocuments: number
    collectionCounts: Record<string, number>
  }
  collections: Record<string, Record<string, any>[]>
}

// ─── Audit Logging System ───
export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'SOFT_DELETE'
  | 'RESTORE'
  | 'PERMANENT_DELETE'
  | 'BACKUP_CREATE'
  | 'BACKUP_DOWNLOAD'
  | 'BACKUP_RESTORE'
  | 'BACKUP_DELETE'

export interface AuditLogEntry {
  id: string
  action: AuditAction
  collectionName: string
  recordId: string
  userId?: string
  userEmail?: string
  userRole?: string
  timestamp: string
  details?: string
  previousState?: Record<string, any>
  newState?: Record<string, any>
  metadata?: Record<string, any>
}
