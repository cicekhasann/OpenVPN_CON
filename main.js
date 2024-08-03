const readline = require('readline');
const { startAllConnections } = require('./baglanti'); // Ensure correct path
const { prepareClients, cleanUpNamespaces } = require('./hazirlik'); // Ensure correct path

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function handleOption(option) {
  switch (option) {
    case '1':
      const ipBlock = await new Promise(resolve => {
        rl.question('IP bloğunu girin (örneğin, 192.168.1): ', resolve);
      });
      const ipStart = await new Promise(resolve => {
        rl.question('Başlangıç IP numarasını girin (örneğin, 10): ', resolve);
      });
      const numClients = parseInt(await new Promise(resolve => {
        rl.question('Müşteri sayısını girin: ', resolve);
      }), 10);
      await prepareClients(ipBlock, ipStart, numClients);
      break;
    case '2':
      const ovpnPath = await new Promise(resolve => {
        rl.question('OVPN dosyasının yolunu girin: ', resolve);
      });
      const namespaces = ['vpnns0']; // Example namespace list, modify as needed
      await startAllConnections(namespaces, ovpnPath);
      break;
    case '3':
      try {
        await cleanUpNamespaces();
      } catch (error) {
        console.error('Temizlik yaparken bir hata oluştu:', error.message);
      }
      break;
    case '4':
      rl.close();
      process.exit(0);
      break;
    default:
      console.log('Geçersiz seçenek.');
      break;
  }
  main(); // Continue to the next prompt
}

function main() {
  console.log('1. Bağlantı Oluştur');
  console.log('2. Eşzamanlı Oturumları Başlat');
  console.log('3. Temizlik Yap');
  console.log('4. Çıkış');
  
  rl.question('Bir seçenek seçin: ', async (option) => {
    await handleOption(option);
  });
}

main();
