// Firebase: Google sign-in + Firestore with an on-device cache,
// so the app keeps working offline and syncs when back online.
import { initializeApp } from 'firebase/app'
import { deleteUser, getAuth, getRedirectResult, GoogleAuthProvider, reauthenticateWithPopup, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

// These values are public by design — access is protected by firestore.rules.
const firebaseConfig = {
  apiKey: 'AIzaSyAXkvFgBNjuX181Y0w_mUHT5uxSYO2aM38',
  // Sign-in runs through our own domain (proxied to Firebase by vercel.json) so
  // phone browsers don't block it as a cross-site login.
  authDomain: location.hostname.endsWith('vercel.app') ? location.host : 'bankcal-2d763.firebaseapp.com',
  projectId: 'bankcal-2d763',
  storageBucket: 'bankcal-2d763.firebasestorage.app',
  messagingSenderId: '799138565904',
  appId: '1:799138565904:web:cb102364289ff1c6769f95',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  // a field left empty (undefined) must never make a whole save fail
  ignoreUndefinedProperties: true,
})

// Phones (and the installed home-screen app) use a full-page redirect;
// desktops use a popup.
const preferRedirect =
  matchMedia('(display-mode: standalone)').matches || navigator.standalone || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

export async function signIn() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  if (preferRedirect) return signInWithRedirect(auth, provider)
  try {
    await signInWithPopup(auth, provider)
  } catch (e) {
    if (e?.code === 'auth/popup-blocked' || e?.code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, provider)
    } else {
      throw e
    }
  }
}

// Result of a redirect sign-in (null if there wasn't one). Errors surface on the sign-in screen.
export const redirectResult = getRedirectResult(auth)

export const logOut = () => signOut(auth)

// Set while an account is being deleted, so nothing writes the data back
export const leaving = { on: false }
// Remove the sign-in itself. Google insists on a recent sign-in for this; if it can't be
// confirmed here, we sign out and report 'signin' so the person can finish after signing in again.
export async function removeSignIn() {
  const u = auth.currentUser
  try { await deleteUser(u); return 'done' } catch (e) {
    if (e?.code === 'auth/requires-recent-login') {
      try { await reauthenticateWithPopup(u, new GoogleAuthProvider()); await deleteUser(u); return 'done' } catch { /* fall through */ }
    }
    await signOut(auth).catch(() => {})
    return 'signin'
  }
}
