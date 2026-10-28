# RK Travels

RK Travels – trip, vehicle, payment, cashbook and reminder management (Next.js + Firebase).

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory with your Firebase configuration:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

> If these environment variables are omitted, the app will fall back to default development credentials configured in `src/lib/firebase/config.ts`.

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Features

- **Trips Management**: Schedule, track, and manage travel trips, fares, and driver settlements.
- **Vehicles Management**: Fleet tracking, maintenance, and document expiry reminders.
- **Payments & Expenses**: Record customer receipts, driver payouts, fuel, and trip expenses.
- **Cashbook**: Real-time cash in/out tracking with daily and cumulative balances.
- **Reports & Analytics**: Visual revenue, expense breakdowns, and monthly performance charts.
- **Reminders**: Alerts for vehicle service, insurance, permit renewals, and pending payments.
