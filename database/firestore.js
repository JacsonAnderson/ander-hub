// database/firestore.js
// Substitui o database/init.js - conexão com Firestore ao invés de SQLite
const admin = require('firebase-admin');

function _init() {
  if (admin.apps.length > 0) return; // já inicializado

  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Credenciais via variável de ambiente (CI/CD manual)
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
      storageBucket: bucketName
    });
  } else if (process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT) {
    // Firebase App Hosting / Cloud Run: usa Application Default Credentials automaticamente
    // Não precisa de serviceAccountKey.json — o Google Cloud provê as credenciais
    admin.initializeApp({ storageBucket: bucketName });
  } else {
    // Desenvolvimento local: arquivo serviceAccountKey.json na raiz do projeto
    // Baixe em: Firebase Console → Configurações → Contas de serviço → Gerar nova chave privada
    const sa = require('../serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(sa),
      storageBucket: bucketName
    });
  }
}

function getDb() {
  _init();
  return admin.firestore();
}

function getBucket() {
  _init();
  return admin.storage().bucket();
}

// Converte um documento Firestore em objeto JS simples
function docToObj(doc) {
  if (!doc || !doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

// Converte um snapshot de coleção em array
function snapToArr(snap) {
  return snap.docs.map(docToObj);
}

const FieldValue = admin.firestore.FieldValue;

module.exports = { getDb, getBucket, FieldValue, docToObj, snapToArr };
