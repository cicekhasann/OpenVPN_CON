const { exec } = require('child_process');

// Function to delete a namespace
async function deleteNamespace(namespace) {
  return new Promise((resolve, reject) => {
    exec(`sudo ip netns delete ${namespace}`, (error, stdout, stderr) => {
      if (error && !stderr.includes("No such file or directory")) {
        reject(`Error deleting namespace: ${stderr}`);
      } else {
        resolve();
      }
    });
  });
}

// Function to create a namespace
async function createNamespace(namespace) {
  try {
    await deleteNamespace(namespace);
    console.log(`Creating namespace: ${namespace}`);
    return new Promise((resolve, reject) => {
      exec(`sudo ip netns add ${namespace}`, (error, stdout, stderr) => {
        if (error) {
          reject(`Error creating namespace: ${stderr}`);
        } else {
          resolve();
        }
      });
    });
  } catch (error) {
    console.error(error);
    throw error; // Rethrow to ensure errors propagate
  }
}

// Function to configure IP for a namespace
async function configureIp(namespace, ip) {
  return new Promise((resolve, reject) => {
    console.log(`Configuring IP ${ip} for namespace: ${namespace}`);
    exec(`sudo ip netns exec ${namespace} ip addr add ${ip}/24 dev lo`, (error, stdout, stderr) => {
      if (error) {
        reject(`Error configuring IP: ${stderr}`);
      } else {
        exec(`sudo ip netns exec ${namespace} ip link set dev lo up`, (error, stdout, stderr) => {
          if (error) {
            reject(`Error setting up link: ${stderr}`);
          } else {
            resolve();
          }
        });
      }
    });
  });
}

// Function to prepare namespaces and IPs for multiple clients
async function prepareClients(ipBlock, ipStart, numClients) {
  let namespaces = [];
  console.log(`Starting preparation for ${numClients} clients.`);
  try {
    for (let i = 0; i < numClients; i++) {
      const namespace = `vpnns${i}`;
      const ip = `${ipBlock}.${parseInt(ipStart) + i}`;
      await createNamespace(namespace);
      await configureIp(namespace, ip);
      namespaces.push({ namespace, ip });
      console.log(`Created namespace ${namespace} with IP ${ip}`);
    }
  } catch (error) {
    console.error('Error during preparation:', error);
  }
  console.log(`Preparation completed for ${numClients} clients.`);
  return namespaces;
}

// Function to clean up namespaces
async function cleanUpNamespaces() {
  const namespaces = ['vpnns0', 'vpnns1']; // List your namespaces here
  for (const namespace of namespaces) {
    try {
      await deleteNamespace(namespace);
      console.log(`Deleted namespace: ${namespace}`);
    } catch (error) {
      console.error(`Error deleting namespace ${namespace}: ${error}`);
    }
  }
}

module.exports = { prepareClients, cleanUpNamespaces };
