const readline = require('readline');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function cleanUpNamespaces() {
  try {
    const { stdout: namespaces } = await execPromise('sudo ip netns list');
    const namespacesArray = namespaces.split('\n').filter(ns => ns);

    for (const namespace of namespacesArray) {
      console.log(`Deleting namespace: ${namespace}`);
      await execPromise(`sudo ip netns delete ${namespace}`);
      console.log(`Deleted namespace: ${namespace}`);
    }
  } catch (error) {
    console.error('Error during namespace cleanup:', error.message);
  }
}

async function listRoutes() {
  try {
    const { stdout: routeList } = await execPromise('ip route show');
    return routeList.split('\n').filter(route => route.includes('via'));
  } catch (error) {
    console.error('Error listing routes:', error.message);
    return [];
  }
}

async function deleteStaticRoutes(routesToDelete) {
  try {
    for (const route of routesToDelete) {
      const routeParts = route.split(' ');
      const destination = routeParts[0];
      const via = routeParts[routeParts.indexOf('via') + 1];
      await execPromise(`sudo ip route del ${destination} via ${via}`);
      console.log(`Deleted static route: ${destination} via ${via}`);
    }
  } catch (error) {
    console.error('Error deleting static routes:', error.message);
  }
}

async function cleanUpRouting() {
  try {
    await execPromise('sudo sysctl -w net.ipv4.ip_forward=0');
    console.log('IP forwarding disabled');

    const routes = await listRoutes();
    if (routes.length > 0) {
      console.log('Mevcut statik rotalar:');
      routes.forEach((route, index) => console.log(`${index + 1}: ${route}`));

      const routeSelection = await new Promise(resolve => {
        rl.question('Silmek istediğiniz rota numaralarını girin (virgülle ayrılmış): ', resolve);
      });

      const selectedIndices = routeSelection.split(',').map(Number);
      const routesToDelete = selectedIndices.map(index => routes[index - 1]);
      if (routesToDelete.length > 0) {
        await deleteStaticRoutes(routesToDelete);
      } else {
        console.log('Silinecek rota seçilmedi.');
      }
    } else {
      console.log('Silinecek statik rota bulunamadı.');
    }
  } catch (error) {
    console.error('Error during routing cleanup:', error.message);
  }
}

async function cleanUp() {
  await cleanUpNamespaces();
  await cleanUpRouting();
  rl.close();
}

module.exports = { cleanUp };
