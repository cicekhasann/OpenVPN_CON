const { exec } = require('child_process');

async function deleteNamespace(namespace) {
  return new Promise((resolve, reject) => {
    exec(`sudo ip netns delete ${namespace}`, (error, stdout, stderr) => {
      if (error && !stderr.includes("No such file or directory")) {
        reject(`Error deleting namespace: ${stderr}`);
      } else {
        console.log(`Deleted namespace: ${namespace}`);
        resolve();
      }
    });
  });
}

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
    throw error;
  }
}

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
    console.error('Error during preparation:', error);
  }
  console.log(`Preparation completed for ${numClients} clients.`);
  return namespaces;
}

module.exports = { prepareClients };
