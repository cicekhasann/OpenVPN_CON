const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

async function deleteNamespace(namespace) {
  try {
    await execPromise(`sudo ip netns delete ${namespace}`);
    console.log(`Deleted namespace: ${namespace}`);
  } catch (error) {
    if (!error.stderr.includes("No such file or directory")) {
      throw new Error(`Error deleting namespace: ${error.stderr}`);
    }
    console.log(`Namespace ${namespace} does not exist.`);
  }
}

async function createNamespace(namespace) {
  try {
    await deleteNamespace(namespace);
    console.log(`Creating namespace: ${namespace}`);
    await execPromise(`sudo ip netns add ${namespace}`);
  } catch (error) {
    throw new Error(`Error creating namespace: ${error.message}`);
  }
}

async function configureIp(namespace, ip) {
  try {
    console.log(`Configuring IP ${ip} for namespace: ${namespace}`);
    await execPromise(`sudo ip netns exec ${namespace} ip addr add ${ip}/24 dev lo`);
    await execPromise(`sudo ip netns exec ${namespace} ip link set dev lo up`);
  } catch (error) {
    throw new Error(`Error configuring IP for ${namespace}: ${error.message}`);
  }
}

async function prepareClients(ipBlock, ipStart, numClients) {
  let namespaces = [];
  let currentBlock = parseInt(ipBlock.split('.').pop(), 10);
  let currentIp = parseInt(ipStart, 10);

  console.log(`Starting preparation for ${numClients} clients.`);
  try {
    for (let i = 0; i < numClients; i++) {
      const namespace = `vpnns${i}`;
      const ip = `${ipBlock}.${currentBlock}.${currentIp}`;
      await createNamespace(namespace);
      await configureIp(namespace, ip);
      namespaces.push(namespace);
      console.log(`Created namespace ${namespace} with IP ${ip}`);

      currentIp++;
      if (currentIp > 254) {
        currentIp = 1;
        currentBlock++;
      }
    }
  } catch (error) {
    console.error('Error during preparation:', error.message);
  }
  console.log(`Preparation completed for ${numClients} clients.`);
  return namespaces;
}


async function configureRouting(ipBlock, iface) {
  try {
    const route = `${ipBlock}.0.0/16`;
    await execPromise(`sudo ip route add ${route} dev ${iface}`);
    console.log(`Static route configured for ${route} via ${iface}`);
  } catch (error) {
    console.error('Error configuring routing:', error.message);
  }
}

module.exports = { prepareClients, configureRouting };
