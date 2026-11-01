// One config drives every admin page, form, table and API route.
// type: text | number | money | date | select | textarea

export interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'money' | 'date' | 'select' | 'textarea';
  options?: string[];
  required?: boolean;
}

export interface ModuleConfig {
  title: string;
  singular: string;
  fields: FieldConfig[];
  columns: string[];
}

const S = (key: string, label: string, options: string[], extra: Partial<FieldConfig> = {}): FieldConfig => ({
  key,
  label,
  type: 'select',
  options,
  ...extra,
});

const T = (key: string, label: string, extra: Partial<FieldConfig> = {}): FieldConfig => ({
  key,
  label,
  type: 'text',
  ...extra,
});

const M = (key: string, label: string): FieldConfig => ({
  key,
  label,
  type: 'money',
  required: true,
});

const D = (key: string, label: string, extra: Partial<FieldConfig> = {}): FieldConfig => ({
  key,
  label,
  type: 'date',
  ...extra,
});

export const MODULES: Record<string, ModuleConfig> = {
  users: {
    title: 'Users',
    singular: 'user',
    fields: [
      T('name', 'Full name', { required: true }),
      T('phone', 'Phone', { required: true }),
      T('email', 'Email'),
      S('role', 'Role', ['Customer', 'Staff', 'Driver', 'Admin']),
      S('status', 'Status', ['Active', 'Blocked']),
    ],
    columns: ['name', 'phone', 'email', 'role', 'status'],
  },
  vehicles: {
    title: 'Vehicles',
    singular: 'vehicle',
    fields: [
      T('number', 'Registration no.', { required: true }),
      S('type', 'Type', ['Car', 'Van', 'Tempo Traveller', 'Mini Bus', 'Bus']),
      T('model', 'Model'),
      { key: 'seats', label: 'Seats', type: 'number' },
      T('driver', 'Driver'),
      S('status', 'Status', ['Available', 'On trip', 'Maintenance']),
      D('insuranceExpiry', 'Insurance expiry'),
      D('serviceDue', 'Next service'),
    ],
    columns: ['number', 'type', 'model', 'seats', 'driver', 'status', 'insuranceExpiry'],
  },
  trips: {
    title: 'Trips',
    singular: 'trip',
    fields: [
      T('customer', 'Customer', { required: true }),
      T('vehicle', 'Vehicle no.'),
      T('from', 'From', { required: true }),
      T('to', 'To', { required: true }),
      D('startDate', 'Start date', { required: true }),
      D('endDate', 'End date'),
      M('amount', 'Trip amount'),
      S('status', 'Status', ['Scheduled', 'Ongoing', 'Completed', 'Cancelled']),
      { key: 'note', label: 'Note', type: 'textarea' },
    ],
    columns: ['customer', 'vehicle', 'from', 'to', 'startDate', 'amount', 'status'],
  },
  payments: {
    title: 'Payments',
    singular: 'payment',
    fields: [
      T('customer', 'Customer', { required: true }),
      T('tripRef', 'Trip (from → to)'),
      M('amount', 'Amount'),
      D('date', 'Date', { required: true }),
      S('method', 'Method', ['Cash', 'UPI', 'Bank transfer', 'Card', 'Cheque']),
      S('status', 'Status', ['Paid', 'Partial', 'Pending']),
      { key: 'note', label: 'Note', type: 'textarea' },
    ],
    columns: ['date', 'customer', 'tripRef', 'amount', 'method', 'status'],
  },
  expenses: {
    title: 'Expenses',
    singular: 'expense',
    fields: [
      S('category', 'Category', ['Fuel', 'Maintenance', 'Salary', 'Toll', 'Insurance', 'Permit', 'Other']),
      T('vehicle', 'Vehicle no.'),
      M('amount', 'Amount'),
      D('date', 'Date', { required: true }),
      { key: 'note', label: 'Note', type: 'textarea' },
    ],
    columns: ['date', 'category', 'vehicle', 'amount', 'note'],
  },
  cashbook: {
    title: 'Cash book',
    singular: 'entry',
    fields: [
      D('date', 'Date', { required: true }),
      S('type', 'Type', ['In', 'Out']),
      T('description', 'Description', { required: true }),
      M('amount', 'Amount'),
      S('mode', 'Mode', ['Cash', 'Bank', 'UPI']),
    ],
    columns: ['date', 'type', 'description', 'mode', 'amount'],
  },
  reminders: {
    title: 'Reminders',
    singular: 'reminder',
    fields: [
      T('title', 'Title', { required: true }),
      S('type', 'Type', ['Insurance', 'Service', 'Permit', 'Payment', 'Other']),
      D('dueDate', 'Due date', { required: true }),
      S('status', 'Status', ['Pending', 'Done']),
      { key: 'note', label: 'Note', type: 'textarea' },
    ],
    columns: ['dueDate', 'title', 'type', 'status'],
  },
};

export const SLUGS = Object.keys(MODULES);

export const inr = (n: unknown) => '₹' + Number(n || 0).toLocaleString('en-IN');

const genId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export const SEED: Record<string, Record<string, unknown>[]> = {
  users: [],
  vehicles: [],
  trips: [],
  payments: [],
  expenses: [],
  cashbook: [],
  reminders: [],
};
