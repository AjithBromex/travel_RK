/**
 * One-time server-side script to assign the custom claim `admin: true`
 * to an existing Firebase Auth account (e.g. admin@gmail.com).
 *
 * Usage:
 *   npx tsx scripts/setAdminClaim.ts [email]
 *
 * Example:
 *   npx tsx scripts/setAdminClaim.ts admin@gmail.com
 */

import fs from 'fs'
import path from 'path'

// Helper to manually load .env or .env.local if not already loaded in the environment
function loadEnvFiles() {
  const envFiles = ['.env.local', '.env']
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file)
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8')
      content.split('\n').forEach((line) => {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) return
        const eqIdx = trimmed.indexOf('=')
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim()
          let val = trimmed.slice(eqIdx + 1).trim()
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1)
          }
          if (!process.env[key]) {
            process.env[key] = val
          }
        }
      })
    }
  }
}

loadEnvFiles()

import { getAdminAuth, getAdminFirestore, hasAdminConfig } from '../src/lib/firebase/admin'

async function run() {
  console.log('--- RK Travel Hub: Set Admin Claim ---')

  // Requirement d: Must refuse to run if service account env vars are missing
  if (!hasAdminConfig()) {
    console.error(
      '\n❌ Error: Missing Firebase Service Account credentials.\n' +
        'This script requires Firebase Admin SDK credentials in environment variables.\n' +
        'Please set one of the following in your environment or .env.local file:\n' +
        '  1. FIREBASE_SERVICE_ACCOUNT_KEY (path to service account JSON file or JSON string)\n' +
        '  2. FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY\n' +
        '  3. GOOGLE_APPLICATION_CREDENTIALS\n'
    )
    process.exit(1)
  }

  // Email argument from command line or default to admin@gmail.com
  const emailArg = process.argv[2]?.trim() || 'admin@gmail.com'

  if (!emailArg || !emailArg.includes('@')) {
    console.error(`\n❌ Error: Invalid email provided: "${emailArg}". Please specify a valid email address.`)
    process.exit(1)
  }

  try {
    const auth = getAdminAuth()
    const db = getAdminFirestore()

    console.log(`\n🔍 Looking up Firebase Auth account for: ${emailArg}...`)
    const user = await auth.getUserByEmail(emailArg)

    console.log(`✓ Found user UID: ${user.uid}`)

    // Assign custom user claim: { admin: true }
    console.log('⚙️  Assigning custom claim { admin: true }...')
    await auth.setCustomUserClaims(user.uid, {
      ...(user.customClaims || {}),
      admin: true,
    })

    // Also update/record in users collection for profile synchronization
    try {
      const userDocRef = db.collection('users').doc(user.uid)
      await userDocRef.set(
        {
          email: user.email || emailArg,
          role: 'admin',
          isAdmin: true,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      )
      console.log('✓ Synchronized user profile role in Firestore.')
    } catch (dbErr) {
      console.warn('⚠️ Warning: Could not update Firestore user document:', dbErr)
    }

    // Verify claims applied
    const updatedUser = await auth.getUser(user.uid)
    console.log('\n✅ SUCCESS: Custom claims successfully updated!')
    console.log('User Claims:', JSON.stringify(updatedUser.customClaims, null, 2))
    console.log(`Account ${emailArg} now has verified administrative privileges.\n`)
  } catch (error: any) {
    if (error?.code === 'auth/user-not-found') {
      console.error(
        `\n❌ Error: Account "${emailArg}" was not found in Firebase Auth.\n` +
          'Please ensure the account exists before assigning the admin claim.'
      )
    } else {
      console.error('\n❌ Error assigning admin claim:', error?.message || error)
    }
    process.exit(1)
  }
}

run()
