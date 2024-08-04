const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');


const execPromise = require('util').promisify(exec);

async function startAllConnections(namespaces, ovpnPath, ipBlock) {
  try {
    const total = namespaces.length;
    let completed = 0;

    await readOVPNFile(ovpnPath);
    const connectionPromises = namespaces.map(namespace => {
      return new Promise((resolve, reject) => {
        console.log(`Starting OpenVPN in namespace ${namespace} using ${ovpnPath}`);
        
        const logFilePath = path.join('/tmp', `openvpn-${namespace}.log`);
        const command = `sudo ip netns exec ${namespace} openvpn --config ${ovpnPath} --log ${logFilePath}`;
        
        const openvpnProcess = exec(command);

        openvpnProcess.stdout.on('data', data => {
          console.log(`OpenVPN stdout in namespace ${namespace}: ${data}`);
        });

        openvpnProcess.stderr.on('data', data => {
          console.error(`OpenVPN stderr in namespace ${namespace}: ${data}`);
        });

        openvpnProcess.on('close', async code => {
          if (code === 0) {
            console.log(`OpenVPN started successfully in namespace ${namespace}`);
            await readLogFile(logFilePath, namespace);
            resolve();
          } else {
            console.error(`OpenVPN process exited with code ${code} in namespace ${namespace}`);
            reject(`OpenVPN failed in namespace ${namespace}`);
          }

          completed++;
          if (completed === total) {
            resolve();
          }
        });
      });
    });

    await Promise.all(connectionPromises);
  } catch (error) {
    console.error('Error starting OpenVPN connections:', error.message);
  }
}

async function readOVPNFile(filePath) {
  try {
    const data = await fs.promises.readFile(filePath, 'utf8');
    console.log(`OVPN Configuration File Content:`);

    const remoteLine = data.match(/^remote\s+\S+/m);
    const protoLine = data.match(/^proto\s+\S+/m);

    if (remoteLine) {
      console.log(`Remote: ${remoteLine[0]}`);
    } else {
      console.log('No remote line found in the OVPN file.');
    }

    if (protoLine) {
      console.log(`Proto: ${protoLine[0]}`);
    } else {
      console.log('No proto line found in the OVPN file.');
    }
  } catch (error) {
    console.error(`Error reading OVPN file ${filePath}: ${error.message}`);
  }
}

async function readLogFile(filePath, namespace) {
  try {
    const data = await fs.promises.readFile(filePath, 'utf8');
    console.log(`OpenVPN log for ${namespace}:\n${data}`);
  } catch (error) {
    console.error(`Error reading log file ${filePath}: ${error.message}`);
    await fixFilePermissions(filePath, namespace);
  }
}

async function fixFilePermissions(filePath, namespace) {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    await execPromise(`sudo chmod 666 ${filePath}`);
    console.log(`Permissions fixed for ${filePath}. Attempting to read the file again...`);
    await readLogFile(filePath, namespace);
  } catch (error) {
    console.error(`Error fixing permissions for log file ${filePath}: ${error.message}`);
  }
}

module.exports = { startAllConnections };
