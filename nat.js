const { exec } = require('child_process');

async function setupNAT(physicalInterface, ipBlock) {
  return new Promise((resolve, reject) => {
    console.log(`Setting up NAT using physical interface ${physicalInterface} for IP block ${ipBlock}`);
    
    // Clear existing NAT rules for the IP block
    const clearCommands = [
      `sudo iptables -t nat -D POSTROUTING -s ${ipBlock}.0/24 -o ${physicalInterface} -j MASQUERADE`,
      `sudo iptables -D FORWARD -i ${physicalInterface} -o lo -m state --state RELATED,ESTABLISHED -j ACCEPT`,
      `sudo iptables -D FORWARD -i lo -o ${physicalInterface} -j ACCEPT`
    ];

    // Add new NAT rules
    const commands = [
      `sudo iptables -t nat -A POSTROUTING -s ${ipBlock}.0/24 -o ${physicalInterface} -j MASQUERADE`,
      `sudo iptables -A FORWARD -i ${physicalInterface} -o lo -m state --state RELATED,ESTABLISHED -j ACCEPT`,
      `sudo iptables -A FORWARD -i lo -o ${physicalInterface} -j ACCEPT`
    ];

    // Execute commands to clear existing rules and set up new NAT rules
    Promise.all(clearCommands.concat(commands).map(cmd => {
      return new Promise((cmdResolve, cmdReject) => {
        exec(cmd, (error, stdout, stderr) => {
          if (error) {
            cmdReject(`Error configuring NAT: ${stderr}`);
          } else {
            cmdResolve(stdout);
          }
        });
      });
    }))
    .then(() => resolve('NAT setup completed successfully.'))
    .catch(reject);
  });
}

module.exports = { setupNAT };
