const readline = require('readline');
const { startAllConnections } = require('./baglanti');
const { prepareClients, configureRouting } = require('./hazirlik');
const { cleanUp } = require('./temizlik');
const { exec } = require('child_process');
const util = require('util');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const execPromise = util.promisify(exec);

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

async function enableIPForwarding(interface) {
  try {
    await execPromise('sudo sysctl -w net.ipv4.ip_forward=1');
    console.log('IP forwarding enabled');
    await execPromise(`sudo iptables -t nat -A POSTROUTING -o ${interface} -j MASQUERADE`);
    console.log(`NAT configured using interface ${interface}`);
  } catch (error) {
    console.error('Error configuring IP forwarding and NAT:', error.message);
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
      rl.namespaces = namespaces; 


      const interface = await getDefaultNetworkInterface();
      await enableIPForwarding(interface);

      const routeIP = await new Promise(resolve => {
        rl.question('Statik yönlendirme IP adresini girin (örneğin, 192.168.0.0/16): ', resolve);
      });
      await configureRouting(routeIP);

      break;
    case '2':
      // Start all connections
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
      // Clean up
      try {
        await cleanUp();
      } catch (error) {
        console.error('Error during cleanup:', error.message);
      }
      break;
    case '4':
      // Exit
      rl.close();
      process.exit(0);
      break;
    default:
      console.log('Geçersiz seçenek.');
      break;
  }
  main(); 
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
