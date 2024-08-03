const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// OVPN dosya yolunu burada tanımlayın
const ovpnFilePath = '/home/epati/Downloads/1021176ngfw.ovpn';
const namespace = 'vpnns0';

// Dosya yolunu kontrol et
if (!fs.existsSync(ovpnFilePath)) {
    console.error('OVPN dosyası bulunamadı:', ovpnFilePath);
    process.exit(1);
}

// OpenVPN komutunu oluştur
const openvpnCommand = `sudo openvpn --config ${ovpnFilePath} --dev tun --ifconfig 10.8.0.2 10.8.0.1 --namespace ${namespace}`;

// OpenVPN'i çalıştır
exec(openvpnCommand, (error, stdout, stderr) => {
    if (error) {
        console.error('OpenVPN çalıştırılamadı:', error.message);
        process.exit(1);
    }
    if (stderr) {
        console.error('OpenVPN stderr:', stderr);
    }
    console.log('OpenVPN stdout:', stdout);
});
