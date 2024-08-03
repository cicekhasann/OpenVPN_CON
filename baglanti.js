const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

async function startAllConnections(namespaces, ovpnPath, ipBlock) {
  return new Promise((resolve, reject) => {
    let completed = 0;
    const total = namespaces.length;

    // Read and display OVPN configuration file content
    readOVPNFile(ovpnPath);

    namespaces.forEach(namespace => {
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

      openvpnProcess.on('close', code => {
        if (code === 0) {
          console.log(`OpenVPN started successfully in namespace ${namespace}`);
          readLogFile(logFilePath, namespace);
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
}
function readOVPNFile(filePath) {
    fs.readFile(filePath, 'utf8', (error, data) => {
      if (error) {
        console.error(`Error reading OVPN file ${filePath}: ${error}`);
      } else {
        console.log(`OVPN Configuration File Content:`);
  
        // Extract and print remote and proto lines
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
      }
    });
  }
  
function readLogFile(filePath, namespace) {
  fs.readFile(filePath, 'utf8', (error, data) => {
    if (error) {
      console.error(`Error reading log file ${filePath}: ${error}`);
      fixFilePermissions(filePath, namespace);
    } else {
      console.log(`OpenVPN log for ${namespace}:\n${data}`);
    }
  });
}

function fixFilePermissions(filePath, namespace) {
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error(`Log file ${filePath} does not exist.`);
      return;
    }

    exec(`sudo chmod 666 ${filePath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error fixing permissions for log file ${filePath}: ${stderr}`);
        return;
      }

      console.log(`Permissions fixed for ${filePath}. Attempting to read the file again...`);
      readLogFile(filePath, namespace);
    });
  });
}

module.exports = { startAllConnections };
