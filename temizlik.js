const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);


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

async function cleanUpRouting() {
  try {

    await execPromise('sudo sysctl -w net.ipv4.ip_forward=0');
    console.log('IP forwarding disabled');

    const { stdout: routeList } = await execPromise('ip route show');
    const routes = routeList.split('\n').filter(route => route);

    for (const route of routes) {
      if (route.includes('via')) {
        const routeParts = route.split(' ');
        const destination = routeParts[0];
        const via = routeParts[routeParts.indexOf('via') + 1];
        console.log(`Deleting static route: ${destination} via ${via}`);
        await execPromise(`sudo ip route del ${destination} via ${via}`);
        console.log(`Deleted static route: ${destination} via ${via}`);
      }
    }
  } catch (error) {
    console.error('Error during routing cleanup:', error.message);
  }
}

async function cleanUp() {
  await cleanUpNamespaces();
  await cleanUpRouting();
}

module.exports = { cleanUp };
