const fs = require('fs');
let content = fs.readFileSync('src/firebase.ts', 'utf8');

// The [code=unavailable] warning is just a benign console log when Firebase switches to offline mode. 
// It often happens in restricted preview iframes. We will change the init slightly to ensure 
// we only enable offline persistence explicitly, and let standard WebSocket connect by default, 
// removing experimentalForceLongPolling which is sometimes aggressive.

content = content.replace(
  /export const db = initializeFirestore\(app, \{[\s\S]*?\}, firebaseAppletConfig\.firestoreDatabaseId\);/,
  `export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
}, firebaseAppletConfig.firestoreDatabaseId);`
);

fs.writeFileSync('src/firebase.ts', content, 'utf8');
