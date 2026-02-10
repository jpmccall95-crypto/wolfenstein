// ============================================
// online.js - Startet den Server mit ngrok-Anleitung
// ============================================

console.log('');
console.log('========================================');
console.log('  WOLFENSTEIN 3D - ONLINE SPIELEN');
console.log('========================================');
console.log('');
console.log('  Server wird gestartet...');
console.log('');
console.log('  Um online zu spielen:');
console.log('  1. Lass dieses Terminal offen');
console.log('  2. Oeffne ein NEUES Terminal');
console.log('  3. Fuehre aus: ngrok http 3000');
console.log('  4. Kopiere den https://*.ngrok.io Link');
console.log('  5. Schicke den Link an deine Mitspieler!');
console.log('');
console.log('  ngrok installieren:');
console.log('    npm install -g ngrok');
console.log('    oder: https://ngrok.com/download');
console.log('');
console.log('========================================');
console.log('');

// Server starten
require('./server.js');
