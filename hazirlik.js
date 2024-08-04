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
  const [baseIP, thirdOctetStart] = ipBlock.split('.');
  let ipStartNum = parseInt(ipStart, 10);
  const namespaces = [];
  const baseIPWithDot = `${baseIP}.`;
  
  let currentThirdOctet = parseInt(thirdOctetStart, 10);

  let currentFourthOctet = parseInt(ipStart, 10);

  for (let i = 0; i < numClients; i++) {
    const namespaceName = `vpnns${i}`;
    namespaces.push(namespaceName);

    // Determine IP address
    const ipAddress = `${baseIP}.${currentThirdOctet}.${currentFourthOctet}`;    // Create and configure namespace
    console.log(`Creating namespace ${namespaceName}`);
    await execPromise(`sudo ip netns add ${namespaceName}`);
    
    console.log(`Configuring IP ${ipAddress} for namespace ${namespaceName}`);
    await execPromise(`sudo ip netns exec ${namespaceName} ip addr add ${ipAddress}/24 dev lo`);
    await execPromise(`sudo ip netns exec ${namespaceName} ip link set lo up`);
    
    currentFourthOctet += 1;

    // If the fourth octet reaches 255, reset and increment the third octet
    if (currentFourthOctet > 254) {
      currentFourthOctet = 1;
      currentThirdOctet += 1;

    }
  }

  return namespaces;
}


async function configureRouting(destination, gateway, iface) {
  try {
    await execPromise(`sudo ip route add ${destination} via ${gateway} dev ${iface}`);
    console.log(`Static route added: ${destination} via ${gateway} dev ${iface}`);
  } catch (error) {
    console.error('Error configuring routing:', error.message);
  }
}

module.exports = { prepareClients, configureRouting };
