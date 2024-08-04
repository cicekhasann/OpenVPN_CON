const readline = require('readline');
const { startAllConnections } = require('./baglanti'); // Ensure correct path
const { prepareClients } = require('./hazirlik'); // Ensure correct path
const { cleanUpNamespaces } = require('./temizlik');
const { exec } = require('child_process');
const util = require('util');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify exec for easier use with async/await
const execPromise = util.promisify(exec);

// Function to detect the default network interface
async function getDefaultNetworkInterface() {
  try {
    const { stdout } = await execPromise('ip route show default');
    const match = stdout.match(/dev (\w+)/);
    if (match) {
      return match[1];
    } else {
      throw new Error('Default network interface not found');
    }
  } catch (error) {
    console.error('Error detecting default network interface:', error.message);
    process.exit(1);
  }
}

// Function to configure NAT
async function configureNAT(interface) {
  try {
    // Flush existing NAT rules
    await execPromise('sudo iptables -t nat -F');
    
    // Apply NAT rules
    await execPromise(`sudo iptables -t nat -A POSTROUTING -o ${interface} -j MASQUERADE`);
    
    // Enable IP forwarding
    await execPromise('sudo sysctl -w net.ipv4.ip_forward=1');
    
    console.log(`NAT configured using interface ${interface}`);
  } catch (error) {
    console.error('Error configuring NAT:', error.message);
  }
}

async function handleOption(option) {
  switch (option) {
    case '1':
      const ipBlock = await new Promise(resolve => {
        rl.question('IP bloğunu girin (örneğin, 192.168): ', resolve);
      });
      const ipStart = await new Promise(resolve => {
        rl.question('Başlangıç IP numarasını girin (örneğin, 10): ', resolve);
      });
      const numClients = parseInt(await new Promise(resolve => {
        rl.question('Müşteri sayısını girin: ', resolve);
      }), 10);
      const namespaces = await prepareClients(ipBlock, ipStart, numClients);
      rl.namespaces = namespaces; // Save namespaces to readline instance

      // Configure NAT automatically
      const interface = await getDefaultNetworkInterface();
      await configureNAT(interface);
      break;
    case '2':
      const ovpnPath = await new Promise(resolve => {
        rl.question('OVPN dosyasının yolunu girin: ', resolve);
      });
      if (rl.namespaces) {
        await startAllConnections(rl.namespaces, ovpnPath);
      } else {
        console.error('No namespaces available. Please create namespaces first.');
      }
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
