// Firebase: Google sign-in + Firestore with an on-device cache,
// so the app keeps working offline and syncs when back online.
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

// These values are public by design — access is protected by firestore.rules.
const firebaseConfig = {
  apiKey: 'AIzaSyAXkvFgBNjuX181Y0w_mUHT5uxSYO2aM38',
  authDomain: 'bankcal-2d763.firebaseapp.com',
  projectId: 'bankcal-2d763',
  storageBucket: 'bankcal-2d763.firebasestorage.app',
  messagingSenderId: '799138565904',
  appId: '1:799138565904:web:cb102364289ff1c6769f95',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})

export async function signIn() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  try {
    await signInWithPopup(auth, provider)
  } catch (e) {
    // Some installed-app browsers block popups — fall back to a full-page redirect.
    if (e?.code === 'auth/popup-blocked' || e?.code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, provider)
    } else {
      throw e
    }
  }
}

export const logOut = () => signOut(auth)
