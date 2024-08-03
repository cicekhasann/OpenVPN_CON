const { exec } = require('child_process');

async function cleanUpNamespaces() {
  // Retrieve namespaces and delete them
  const namespaces = await execPromise('sudo ip netns list');
  const namespacesArray = namespaces.split('\n').filter(ns => ns);

  for (const namespace of namespacesArray) {
    console.log(`Deleting namespace: ${namespace}`);
    await execPromise(`sudo ip netns delete ${namespace}`);
    console.log(`Deleted namespace: ${namespace}`);
  }
}

function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(stderr);
      } else {
        resolve(stdout);
      }
    });
  });
}

module.exports = { cleanUpNamespaces };
