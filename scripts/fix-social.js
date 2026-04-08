// scripts/fix-social.js
// Remove Facebook, atualiza links de Instagram e YouTube
require('dotenv').config();
const { getDb } = require('../database/firestore');

async function fixSocial() {
  const db = getDb();
  const snap = await db.collection('social_media').get();

  for (const doc of snap.docs) {
    const data = doc.data();
    const name = (data.name || '').toLowerCase();

    if (name === 'facebook' || name.includes('facebook')) {
      await doc.ref.delete();
      console.log(`✓ Deletado: ${data.name}`);
    } else if (name === 'instagram') {
      await doc.ref.update({
        link: 'https://www.instagram.com/jacsonander/',
        username: '@jacsonander'
      });
      console.log(`✓ Atualizado: Instagram`);
    } else if (name === 'youtube') {
      await doc.ref.update({
        link: 'https://www.youtube.com/@Jacsonander',
        username: '@Jacsonander'
      });
      console.log(`✓ Atualizado: YouTube`);
    } else if (name === 'github') {
      await doc.ref.update({
        link: 'https://github.com/JacsonAnderson',
        username: '@JacsonAnderson'
      });
      console.log(`✓ Atualizado: GitHub`);
    }
  }

  console.log('✅ Redes sociais atualizadas');
  process.exit(0);
}

fixSocial().catch(e => { console.error(e); process.exit(1); });
