import { CommandReference } from '../types';

export const STAGING_COMMAND_DATABASE: CommandReference[] = [
  // =========================================================================
  // 1. CISCO IOS-XE (Catalyst 9200/9300/9400/9500/9600, Catalyst 8200/8300/8500, ISR 4000, WLC 9800)
  // =========================================================================
  {
    id: 'cisco-staging-factory-to-ssh',
    brand: 'cisco',
    modelCategory: 'Cisco IOS-XE (Catalyst 9000 / Cat 8000 / ISR / WLC 9800)',
    osFamily: 'ios-xe',
    category: 'staging_ssh',
    categoryLabel: 'Staging Awal Pabrik -> Akses SSH (IOS-XE)',
    command: `! 1. Lewati dialog konfigurasi otomatis saat booting pertama
! Would you like to enter the initial configuration dialog? [yes/no]: no
enable

! 2. Masuk ke mode Global Configuration
configure terminal

! 3. Tentukan Hostname & Domain Name (Wajib untuk Crypto Key)
hostname Catalyst-C9300-Staging
ip domain-name enterprise.local

! 4. Generate RSA Crypto Key (Min. 2048-bit untuk SSH v2)
crypto key generate rsa modulus 2048

! 5. Aktifkan SSH v2 & Timeout
ip ssh version 2
ip ssh time-out 60
ip ssh authentication-retries 3

! 6. Buat Akun Administrator Privilege 15 dengan Password Kuat
username admin privilege 15 algorithm-type scrypt secret CiscoAdmin2026!

! 7. Aktifkan AAA / Local Login pada Jalur VTY (SSH Lines)
line vty 0 15
 session-timeout 15
 transport input ssh
 login local
 exit

! 8. Konfigurasi IP Management pada Interface GigabitEthernet0/0 (Dedicated Mgmt) atau VLAN 1
interface GigabitEthernet0/0
 description MANAGEMENT-PORT
 ip address 10.254.88.215 255.255.255.0
 no shutdown
 exit

! Atau jika switch tanpa port dedicated management, gunakan SVI VLAN 1:
! interface Vlan1
!  ip address 10.254.88.215 255.255.255.0
!  no shutdown
!  exit

! 9. Set Default Gateway untuk Rute Keluar
ip route 0.0.0.0 0.0.0.0 10.254.88.1

! 10. Simpan Konfigurasi Permanen ke NVRAM
end
write memory`,
    description: 'Panduan staging awal dari kondisi pabrik (zero config) Cisco IOS-XE hingga switch/router memiliki IP management, RSA Key 2048-bit, user privilege 15, dan port SSH (22) aktif.',
    explanationId: 'Langkah awal: Hubungkan kabel console (9600 baud). Tolak dialog awal (no). Set domain-name dan buat RSA key 2048 agar SSH v2 aktif. Atur "transport input ssh" dan "login local" pada line vty 0 15.',
    sampleOutput: `Catalyst-C9300-Staging# show ip ssh
SSH Enabled - version 2.0
Authentication timeout: 60 secs; Authentication retries: 3
Minimum expected Diffie-Hellman key size : 2048 bits
IOS Keys in SECSH format(ssh-rsa,尊):
Catalyst-C9300-Staging.enterprise.local`,
    verificationTip: 'Jalankan "show ip ssh" dan "show line vty" untuk memastikan status SSH Enabled version 2.0.',
    mode: 'config',
    tags: ['cisco', 'staging', 'initial-config', 'factory-reset', 'ssh', 'ios-xe', 'catalyst', 'cat9000', 'cat8000', 'rsa', 'vty'],
  },

  // =========================================================================
  // 2. CISCO NX-OS (Nexus 9300, 9500 Data Center Switch)
  // =========================================================================
  {
    id: 'cisco-nxos-staging-factory-to-ssh',
    brand: 'cisco',
    modelCategory: 'Cisco NX-OS (Nexus 9000 / 9300 / 9500 Data Center)',
    osFamily: 'nx-os',
    category: 'staging_ssh',
    categoryLabel: 'Staging Awal Pabrik -> Akses SSH (NX-OS Nexus)',
    command: `! 1. Batalkan Auto-Provisioning POAP pada boot awal
! Do you want to abort Power On Auto Provisioning (POAP) and proceed to normal setup? (yes/no)[n]: yes
! Do you want to enforce secure password standard? (yes/no) [y]: y
! Enter the password for "admin": CiscoNexus2026!

! 2. Masuk ke mode konfigurasi
configure terminal

! 3. Atur Hostname Nexus
hostname N9K-Core-Staging

! 4. Aktifkan Fitur SSH & Buat RSA Key
feature ssh
ssh key rsa 2048 force

! 5. Konfigurasi Port Dedicated Management mgmt0 pada VRF management
interface mgmt0
 description OOB-MANAGEMENT
 ip address 10.254.88.215/24
 no shutdown
 exit

! 6. Atur Default Route pada VRF management
vrf context management
 ip route 0.0.0.0/0 10.254.88.1
 exit

! 7. Simpan Konfigurasi ke Startup Config
copy running-config startup-config`,
    description: 'Staging switch Cisco Nexus NX-OS dari kondisi baru (POAP abort) hingga IP mgmt0 dan daemon SSH aktif pada VRF management.',
    explanationId: 'Pada NX-OS, SSH diaktifkan dengan perintah "feature ssh". Port mgmt0 secara bawaan berada di dalam "vrf context management", sehingga default gateway harus diset di dalam vrf tersebut.',
    sampleOutput: `N9K-Core-Staging# show feature | include ssh
sshServer              1          enabled`,
    verificationTip: 'Uji dengan "show feature | include ssh" dan "ping 10.254.88.1 vrf management".',
    mode: 'config',
    tags: ['cisco', 'nexus', 'nx-os', 'staging', 'poap', 'mgmt0', 'ssh', 'feature ssh', 'factory-reset'],
  },

  // =========================================================================
  // 3. FORTINET FORTIOS (FortiGate 40F s/d 1000F NGFW)
  // =========================================================================
  {
    id: 'forti-staging-factory-to-ssh',
    brand: 'fortinet',
    modelCategory: 'Fortinet FortiOS 7.x (FortiGate NGFW)',
    osFamily: 'fortios',
    category: 'staging_ssh',
    categoryLabel: 'Staging Awal Pabrik -> Akses SSH & HTTPS (FortiOS)',
    command: `# 1. Login Pertama via Console (9600 Baud)
# Default Login: admin (Password kosong, langsung tekan Enter)
# Sistem akan mewajibkan memasukkan password baru:
# New password: FortiGateAdmin2026!
# Confirm password: FortiGateAdmin2026!

# 2. Atur Hostname & Timeout Administrasi
config system global
    set hostname "FG-100F-Staging"
    set timezone 55
    set admintimeout 30
    set admin-sport 443
    set admin-ssh-port 22
end

# 3. Konfigurasi IP Management & Izinkan Akses SSH, HTTPS, Ping
config system interface
    edit "mgmt"
        set mode static
        set ip 10.254.88.215 255.255.255.0
        set allowaccess ping https ssh fabric
        set description "OOB-MGMT-STAGING"
    next
    # Atau jika menggunakan port wan1 / internal1:
    edit "wan1"
        set mode static
        set ip 10.254.88.215 255.255.255.0
        set allowaccess ping https ssh
    next
end

# 4. Atur Default Static Route Gateway
config router static
    edit 1
        set gateway 10.254.88.1
        set device "wan1"
    next
end

# 5. Verifikasi Status Listener SSH & Interface
diagnose system admin list
get system interface physical`,
    description: 'Prosedur staging FortiGate dari kondisi pabrik (password default kosong) hingga interface management memiliki IP static dan SSH/HTTPS aktif.',
    explanationId: 'Pastikan "allowaccess" pada interface yang dituju mencakup "ssh" dan "https". Perubahan konfigurasi di FortiOS langsung aktif begitu mengetik "end" atau "next".',
    sampleOutput: `FG-100F-Staging # get system interface wan1
==[ wan1 ]
name: wan1   mode: static   ip: 10.254.88.215 255.255.255.0   status: up
allowaccess: ping https ssh`,
    verificationTip: 'Periksa baris allowaccess: ping https ssh pada "get system interface <port>".',
    mode: 'config',
    tags: ['fortinet', 'fortigate', 'fortios', 'staging', 'factory-reset', 'zero-config', 'ssh', 'allowaccess'],
  },

  // =========================================================================
  // 4. JUNIPER JUNOS OS (EX2300, EX3400, EX4300, EX4400, QFX, MX, SRX)
  // =========================================================================
  {
    id: 'juniper-staging-factory-to-ssh',
    brand: 'juniper',
    modelCategory: 'Juniper Junos OS (EX / QFX / MX / SRX)',
    osFamily: 'junos',
    category: 'staging_ssh',
    categoryLabel: 'Staging Awal Pabrik -> Akses SSH (Junos OS)',
    command: `# 1. Login Pertama via Console (9600 Baud)
# Default Login: root (Tanpa password)
root% cli
root> configure

# 2. Tentukan Root Password (WAJIB! Junos menolak commit tanpa root password)
set system root-authentication plain-text-password
# Masukkan password: JuniperRoot2026!
# Konfirmasi password: JuniperRoot2026!

# 3. Atur Hostname & Timezone
set system host-name EX4400-Staging
set system time-zone Asia/Jakarta

# 4. Buat Akun Administrator Baru dengan Hak Super-User
set system login user admin class super-user authentication plain-text-password
# Masukkan password admin: JuniperAdmin2026!

# 5. Aktifkan Layanan SSH v2 & Izinkan Login
set system services ssh protocol-version v2
set system services ssh root-login allow
set system services ssh connection-limit 10

# 6. Konfigurasi Port Dedicated Management me0 / fxp0 (atau SVI irb / vlan)
set interfaces me0 unit 0 family inet address 10.254.88.215/24
# Untuk Switch EX yang menggunakan irb / vlan 1:
# set interfaces irb unit 0 family inet address 10.254.88.215/24

# 7. Konfigurasi Default Static Route
set routing-options static route 0.0.0.0/0 next-hop 10.254.88.1

# 8. Validasi & Commit Konfigurasi
commit check
commit and-quit`,
    description: 'Prosedur staging lengkap switch/router Juniper Junos dari unboxing hingga SSH aktif. Memenuhi validasi wajib root-authentication sebelum commit.',
    explanationId: 'Di Junos OS, Anda tidak bisa menyimpan konfigurasi (commit) jika belum menentukan "root-authentication". Setelah itu aktifkan "set system services ssh".',
    sampleOutput: `commit complete
Exiting configuration mode`,
    verificationTip: 'Pastikan "commit check" tidak menghasilkan error sebelum menjalankan "commit".',
    mode: 'config',
    tags: ['juniper', 'junos', 'staging', 'factory-reset', 'root-authentication', 'ssh', 'me0', 'ex4400', 'commit'],
  },

  // =========================================================================
  // 5. ARUBA AOS-CX (Switch 6000, 6100, 6200, 6300, 6400, 8325, 8360, 8400)
  // =========================================================================
  {
    id: 'aruba-aoscx-staging-factory-to-ssh',
    brand: 'aruba',
    modelCategory: 'Aruba AOS-CX 10.x (Switch 6000 / 6300 / 8325 / 8360)',
    osFamily: 'aoscx',
    category: 'staging_ssh',
    categoryLabel: 'Staging Awal Pabrik -> Akses SSH (ArubaOS-CX)',
    command: `! 1. Login Pertama via Console (115200 Baud)
! Default Login: admin (Password kosong)
! Sistem akan meminta pembuatan password baru:
! Enter new password: ArubaAdmin2026!
! Confirm new password: ArubaAdmin2026!

! 2. Masuk ke mode konfigurasi
configure terminal

! 3. Atur Hostname Switch
hostname Aruba-CX-6300-Staging

! 4. Buat Akun Administrator & Hak Akses
user admin group administrators password plaintext ArubaAdmin2026!

! 5. Aktifkan SSH Server pada VRF default dan mgmt
ssh server vrf default
ssh server vrf mgmt

! 6. Konfigurasi Port Dedicated Management mgmt (OOB)
interface mgmt
 no shutdown
 ip static 10.254.88.215/24
 default-gateway 10.254.88.1
 exit

! Atau jika menggunakan In-Band VLAN 1 SVI:
! interface vlan 1
!  ip address 10.254.88.215/24
!  no shutdown
!  exit
! ip route 0.0.0.0/0 10.254.88.1

! 7. Simpan Konfigurasi Permanen
write memory`,
    description: 'Staging switch enterprise modern Aruba AOS-CX dari kondisi bawaan pabrik hingga SSH server aktif di VRF default dan interface mgmt.',
    explanationId: 'Aruba CX menggunakan baud rate default 115200 pada port console USB/RJ45. SSH server wajib di-enable per VRF dengan perintah "ssh server vrf default" atau "mgmt".',
    sampleOutput: `Aruba-CX-6300-Staging# show ssh server status
VRF Name         : default
SSH Server State : Enabled`,
    verificationTip: 'Periksa status dengan "show ssh server status" dan "show interface mgmt".',
    mode: 'config',
    tags: ['aruba', 'aoscx', 'staging', 'factory-reset', 'ssh', 'mgmt', 'vrf', 'cx6300', 'write-memory'],
  },

  // =========================================================================
  // 6. RUCKUS FASTIRON (ICX 7150, ICX 7450, ICX 7650, ICX 7850, ICX 8200)
  // =========================================================================
  {
    id: 'ruckus-icx-staging-factory-to-ssh',
    brand: 'ruckus',
    modelCategory: 'Ruckus FastIron (ICX 7150 / 7450 / 7850 / 8200)',
    osFamily: 'fastiron',
    category: 'staging_ssh',
    categoryLabel: 'Staging Awal Pabrik -> Akses SSH (Ruckus FastIron ICX)',
    command: `! 1. Hubungkan Console (9600 Baud)
! Prompt awal: ICX>
enable

! 2. Masuk ke mode konfigurasi
configure terminal

! 3. Atur Hostname Switch
hostname ICX7850-Staging

! 4. Generate RSA Crypto Key untuk SSH
crypto key generate rsa modulus 2048

! 5. Buat Akun Administrator Super-User (Privilege 0 di FastIron adalah Super-User)
username admin privilege 0 password RuckusAdmin2026!

! 6. Aktifkan SSH Server & Authentication Retries
ip ssh server enable
ip ssh timeout 60
ip ssh authentication-retries 3

! 7. Konfigurasi Port Dedicated Management 1 (atau VE 1 SVI)
interface management 1
 ip address 10.254.88.215 255.255.255.0
 no shutdown
 exit

! Atau jika switch access tanpa port mgmt terpisah:
! vlan 1
!  router-interface ve 1
! interface ve 1
!  ip address 10.254.88.215 255.255.255.0
!  exit

! 8. Tentukan Default Gateway
ip default-gateway 10.254.88.1

! 9. Simpan Konfigurasi ke Flash Startup
write memory`,
    description: 'Panduan staging switch Ruckus FastIron ICX dari factory reset hingga SSH server aktif dan dapat diakses dari remote.',
    explanationId: 'Catatan penting FastIron: Privilege 0 adalah level tertinggi (Super-User) pada sintaks Ruckus ICX. Gunakan "crypto key generate rsa modulus 2048" lalu "ip ssh server enable".',
    sampleOutput: `SSH Server is enabled.
RSA key size: 2048 bits`,
    verificationTip: 'Periksa status dengan "show ip ssh" dan simpan dengan "write memory".',
    mode: 'config',
    tags: ['ruckus', 'icx', 'fastiron', 'staging', 'factory-reset', 'ssh', 'rsa', 'management', 'icx7850'],
  },

  // =========================================================================
  // 7. HPE COMWARE 7 (FlexFabric 5940, 5900, 5710, 5130, 5510)
  // =========================================================================
  {
    id: 'hpe-comware-staging-factory-to-ssh',
    brand: 'hpe',
    modelCategory: 'HPE Comware 7 (FlexFabric 5940 / 5900 / 5710 / 5130)',
    osFamily: 'comware',
    category: 'staging_ssh',
    categoryLabel: 'Staging Awal Pabrik -> Akses SSH (HPE Comware 7)',
    command: `# 1. Hubungkan Console (9600 Baud)
# Prompt awal: <HPE>
system-view

# 2. Atur System Name (Hostname)
sysname HPE-5940-Staging

# 3. Generate Local RSA & DSA Public Key
public-key local create rsa
# Masukkan panjang key: 2048

# 4. Aktifkan SSH (STelnet) Server
ssh server enable

# 5. Buat Akun Administrator Lokal dengan Role network-admin
local-user admin class manage
 password simple HpeAdmin2026!
 service-type ssh terminal
 authorization-attribute user-role network-admin
 quit

# 6. Konfigurasi VTY Line untuk Mengizinkan Hanya SSH (Scheme Auth)
line vty 0 63
 authentication-mode scheme
 protocol inbound ssh
 quit

# 7. Konfigurasi Port Dedicated Management M-GigabitEthernet0/0/0
interface M-GigabitEthernet0/0/0
 ip address 10.254.88.215 255.255.255.0
 quit

# 8. Atur Default Static Route
ip route-static 0.0.0.0 0.0.0.0 10.254.88.1

# 9. Simpan Konfigurasi Permanen
save force
return`,
    description: 'Staging switch HPE FlexFabric Comware 7 dari kondisi baru hingga SSH (STelnet) siap melayani koneksi administrasi remote.',
    explanationId: 'Pada Comware 7, "authentication-mode scheme" pada line vty 0 63 mengarahkan otentikasi ke database local-user. Perintah "save force" menyimpan tanpa dialog konfirmasi tambahan.',
    sampleOutput: `<HPE-5940-Staging> display ssh server status
 SSH version : 2.0
 SSH status  : Enabled`,
    verificationTip: 'Gunakan "display ssh server status" dan "display local-user" untuk memverifikasi.',
    mode: 'config',
    tags: ['hpe', 'comware', 'flexfabric', 'staging', 'factory-reset', 'ssh', 'stelnet', 'scheme', 'save-force'],
  },

  // =========================================================================
  // 8. HPE ARUBAOS-S / PROCURVE (2930F, 2930M, 3810M, 5400R zl2)
  // =========================================================================
  {
    id: 'hpe-arubaoss-staging-factory-to-ssh',
    brand: 'hpe',
    modelCategory: 'HPE ArubaOS-S / ProCurve (2930F / 3810M / 5400R)',
    osFamily: 'arubaos-s',
    category: 'staging_ssh',
    categoryLabel: 'Staging Awal Pabrik -> Akses SSH (HPE ArubaOS-S ProCurve)',
    command: `! 1. Hubungkan Console (115200 Baud), tekan [Enter] 2 kali
! Prompt: HP-2930F#
configure terminal

! 2. Atur Hostname Switch
hostname HP-2930F-Staging

! 3. Generate Crypto Key SSH RSA
crypto key generate ssh rsa 2048

! 4. Aktifkan Layanan SSH Server
ip ssh
ip ssh filetransfer

! 5. Buat Password Operator & Manager (Admin)
password manager user-name admin plaintext HpeAdmin2026!

! 6. Konfigurasi Alamat IP pada VLAN 1 Default
vlan 1
 name "DEFAULT_VLAN"
 ip address 10.254.88.215 255.255.255.0
 exit

! 7. Tentukan Default Gateway
ip default-gateway 10.254.88.1

! 8. Simpan Konfigurasi Permanen
write memory`,
    description: 'Staging switch legacy/campus HPE ArubaOS-S (ProCurve) hingga SSH dan manager user aktif.',
    explanationId: 'ArubaOS-S menggunakan perintah "crypto key generate ssh rsa" dan "ip ssh" untuk mengaktifkan secure shell.',
    sampleOutput: `HP-2930F-Staging# show ip ssh
  SSH Enabled     : Yes
  Version         : 2.0`,
    verificationTip: 'Periksa dengan "show ip ssh" dan pastikan SSH Enabled: Yes.',
    mode: 'config',
    tags: ['hpe', 'arubaos-s', 'procurve', '2930f', 'staging', 'factory-reset', 'ssh', 'manager', 'write-memory'],
  },

  // =========================================================================
  // 9. DELL SMARTFABRIC OS10 (PowerSwitch S4100-ON, S5200-ON, Z9264F-ON, N3200)
  // =========================================================================
  {
    id: 'dell-os10-staging-factory-to-ssh',
    brand: 'dell',
    modelCategory: 'Dell SmartFabric OS10 (PowerSwitch S4100 / S5200 / Z9264F)',
    osFamily: 'os10',
    category: 'staging_ssh',
    categoryLabel: 'Staging Awal Pabrik -> Akses SSH (Dell OS10)',
    command: `! 1. Login Pertama via Console (115200 Baud)
! Default Login: admin (Password: admin)
! Masuk ke mode konfigurasi
configure terminal

! 2. Atur Hostname Switch
hostname OS10-S5248-Staging

! 3. Ganti Password Default Admin & Berikan Role sysadmin
username admin password DellAdmin2026! role sysadmin

! 4. Aktifkan Layanan SSH Server
ip ssh server enable
ip ssh server version 2

! 5. Konfigurasi Port Dedicated Management (mgmt 1/1/1)
interface mgmt 1/1/1
 no ip address dhcp
 ip address 10.254.88.215/24
 no shutdown
 exit

! 6. Tentukan Management Route ke Default Gateway
management route 0.0.0.0/0 10.254.88.1

! 7. Simpan Konfigurasi Permanen
end
write memory`,
    description: 'Prosedur staging switch data center Dell EMC PowerSwitch OS10 dari unboxing hingga port OOB mgmt 1/1/1 dan SSH aktif.',
    explanationId: 'Dell OS10 memisahkan routing port management menggunakan command "management route 0.0.0.0/0 <gateway>". Jangan lupa ubah password bawaan "admin".',
    sampleOutput: `OS10-S5248-Staging# show ip ssh server
SSH Server is enabled
SSH version: 2`,
    verificationTip: 'Periksa dengan "show ip ssh server" dan "show interface mgmt 1/1/1".',
    mode: 'config',
    tags: ['dell', 'os10', 'powerswitch', 'staging', 'factory-reset', 'ssh', 'mgmt', 's5200', 'sysadmin'],
  },

  // =========================================================================
  // 10. LINUX SERVER (Ubuntu 24.04/22.04 LTS, Debian 12, RHEL 9, Rocky Linux 9)
  // =========================================================================
  {
    id: 'linux-staging-fresh-to-ssh',
    brand: 'linux',
    modelCategory: 'Linux Server (Ubuntu / Debian / RHEL / Rocky)',
    osFamily: 'linux-server',
    category: 'staging_ssh',
    categoryLabel: 'Staging Server Linux Kosong -> Akses SSH & IP Static',
    command: `# ==========================================
# 1. UBUNTU / DEBIAN SERVER
# ==========================================
# Install & Aktifkan OpenSSH Server
sudo apt update && sudo apt install -y openssh-server ufw

# Pastikan service SSH berjalan & otomatis start saat boot
sudo systemctl enable --now ssh

# Buat User Staging Admin Baru dengan Akses Sudo
sudo useradd -m -s /bin/bash sysadmin
echo "sysadmin:LinuxAdmin2026!" | sudo chpasswd
sudo usermod -aG sudo sysadmin

# Konfigurasi IP Static Netplan (/etc/netplan/01-netcfg.yaml)
cat << 'EOF' | sudo tee /etc/netplan/01-netcfg.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    ens34:
      dhcp4: no
      addresses: [10.254.88.215/24]
      routes:
        - to: default
          via: 10.254.88.1
      nameservers:
        addresses: [10.254.88.254, 8.8.8.8]
EOF
sudo netplan apply

# Buka Port 22 di UFW Firewall
sudo ufw allow 22/tcp
sudo ufw --force enable

# ==========================================
# 2. RHEL 9 / ROCKY LINUX / ALMALINUX (Alternatif)
# ==========================================
# sudo dnf install -y openssh-server firewalld
# sudo systemctl enable --now sshd
# sudo useradd -m sysadmin && echo "sysadmin:LinuxAdmin2026!" | sudo chpasswd && sudo usermod -aG wheel sysadmin
# sudo nmcli con mod ens34 ipv4.addresses 10.254.88.215/24 ipv4.gateway 10.254.88.1 ipv4.dns "10.254.88.254 8.8.8.8" ipv4.method manual
# sudo nmcli con up ens34
# sudo firewall-cmd --permanent --add-service=ssh && sudo firewall-cmd --reload`,
    description: 'Langkah instalasi dan konfigurasi server Linux fresh install dari nol: paket OpenSSH, pembuatan user sudo, IP static Netplan/nmcli, dan perizinan firewall.',
    explanationId: 'Template ini memastikan server Linux siap diakses remote melalui SSH port 22 segera setelah OS di-install.',
    sampleOutput: `● ssh.service - OpenBSD Secure Shell server
     Loaded: loaded (/lib/systemd/system/ssh.service; enabled; vendor preset: enabled)
     Active: active (running) since Sat 2026-08-22 10:00:00 UTC; 5s ago`,
    verificationTip: 'Periksa socket listening dengan "ss -tulpn | grep :22".',
    mode: 'privileged',
    tags: ['linux', 'ubuntu', 'debian', 'rhel', 'rocky', 'staging', 'fresh-install', 'openssh', 'netplan', 'ufw'],
  },

  // =========================================================================
  // 11. MACBOOK / MACOS (Apple macOS Sequoia 15 / Sonoma 14)
  // =========================================================================
  {
    id: 'macos-staging-remote-login-ssh',
    brand: 'macos',
    modelCategory: 'MacBook / macOS Terminal (Zsh CLI)',
    osFamily: 'macos',
    category: 'staging_ssh',
    categoryLabel: 'Staging macOS Baru -> Remote Login SSH & IP Static',
    command: `# 1. Aktifkan Remote Login (SSH Server Daemon Bawaan Apple macOS)
sudo systemsetup -setremotelogin on

# 2. Verifikasi Status Remote Login
sudo systemsetup -getremotelogin

# 3. Izinkan User Saat Ini untuk Login via SSH
sudo dseditgroup -o create -q com.apple.access_ssh
sudo dseditgroup -o edit -a $(whoami) -t user com.apple.access_ssh

# 4. Set IP Static pada Adapter Wi-Fi atau Ethernet (Opsional Staging)
# sudo networksetup -setmanual "Wi-Fi" 10.254.88.215 255.255.255.0 10.254.88.1
# sudo networksetup -setdnsservers "Wi-Fi" 10.254.88.254 8.8.8.8

# 5. Cek Alamat IP Mac Saat Ini
ipconfig getifaddr en0

# 6. Uji Akses SSH Lokal ke MacBook
ssh $(whoami)@127.0.0.1`,
    description: 'Prosedur mengaktifkan SSH Server bawaan macOS (Remote Login) dan pemberian izin akses user melalui Terminal CLI.',
    explanationId: 'Apple macOS telah menyertakan OpenSSH Server bawaan yang dapat diaktifkan tanpa install aplikasi tambahan menggunakan utility "systemsetup".',
    sampleOutput: `Remote Login: On
SSH connection to localhost established.`,
    verificationTip: 'Pastikan "sudo systemsetup -getremotelogin" menghasilkan output "Remote Login: On".',
    mode: 'privileged',
    tags: ['macos', 'macbook', 'staging', 'ssh', 'remote-login', 'systemsetup', 'dseditgroup', 'en0'],
  },

  // =========================================================================
  // 12. WINDOWS (Windows 11, Windows 10 & Windows Server 2022 / 2025)
  // =========================================================================
  {
    id: 'windows-staging-openssh-server',
    brand: 'windows',
    modelCategory: 'Windows Desktop & Server (PowerShell 7 / Admin)',
    osFamily: 'windows',
    category: 'staging_ssh',
    categoryLabel: 'Staging Windows Baru -> OpenSSH Server & Firewall Port 22',
    command: `# Jalankan PowerShell sebagai Administrator (Run as Administrator)

# 1. Pasang Fitur Resmi OpenSSH.Server di Windows
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0

# 2. Start Service OpenSSH SSHD & Atur Auto-Start saat Booting
Start-Service sshd
Set-Service -Name sshd -StartupType 'Automatic'

# 3. Buka Port TCP 22 pada Windows Defender Firewall
New-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -LocalPort 22 -Action Allow

# 4. Konfigurasi IP Static pada Adapter Jaringan (Opsional Staging)
New-NetIPAddress -InterfaceAlias "Ethernet" -IPAddress "10.254.88.215" -PrefixLength 24 -DefaultGateway "10.254.88.1"
Set-DnsClientServerAddress -InterfaceAlias "Ethernet" -ServerAddresses ("10.254.88.254", "8.8.8.8")

# 5. Uji Koneksi SSH Lokal ke Windows
ssh Administrator@127.0.0.1`,
    description: 'Panduan lengkap mengaktifkan OpenSSH Server resmi Microsoft di Windows 10/11 dan Windows Server 2022/2025 melalui PowerShell Admin.',
    explanationId: 'Fitur OpenSSH Server resmi Microsoft memungkinkan remote terminal PowerShell / CMD langsung ke komputer Windows secara aman melalui port 22.',
    sampleOutput: `Path          : 
Online        : True
RestartNeeded : False

Status   Name               DisplayName
------   ----               -----------
Running  sshd               OpenSSH SSH Server`,
    verificationTip: 'Periksa status dengan "Get-Service sshd" (harus Status: Running dan StartupType: Automatic).',
    mode: 'privileged',
    tags: ['windows', 'powershell', 'staging', 'openssh', 'sshd', 'firewall', 'port-22', 'win11', 'win-server'],
  },

  // =========================================================================
  // 13. ANDROID (Android 15 / 14 Smartphone / Tablet via Termux & ADB)
  // =========================================================================
  {
    id: 'android-staging-termux-ssh',
    brand: 'android',
    modelCategory: 'Android Mobile (Termux / ADB Shell CLI)',
    osFamily: 'android',
    category: 'staging_ssh',
    categoryLabel: 'Staging Android Smartphone -> SSH Server (Termux Port 8022)',
    command: `# ==========================================
# 1. DI SMARTPHONE ANDROID (Aplikasi Termux)
# ==========================================
# Update repository paket & install OpenSSH
pkg update && pkg install -y openssh

# Tentukan password login terminal Android
passwd
# Masukkan password: AndroidAdmin2026!

# Jalankan daemon SSH server (Default Termux berjalan di Port 8022)
sshd

# Cek username Termux dan IP Wi-Fi Smartphone
whoami
ip -4 addr show wlan0

# ==========================================
# 2. CARA REMOTE DARI PC / LAPTOP KE ANDROID:
# ==========================================
# ssh -p 8022 [username_termux]@[IP_WLAN0_ANDROID]
# Contoh: ssh -p 8022 u0_a245@192.168.1.50

# ==========================================
# 3. ALTERNATIF: AKTIFKAN WIRELESS ADB (Port 5555)
# ==========================================
# Hubungkan kabel USB sekali lalu ketik di PC:
# adb tcpip 5555
# Cabut kabel, lalu sambungkan via Wi-Fi:
# adb connect 192.168.1.50:5555
# adb shell`,
    description: 'Prosedur menjalankan SSH server port 8022 di Android menggunakan Termux atau mengaktifkan Wireless ADB port 5555 tanpa root.',
    explanationId: 'Di Android, non-root user tidak dapat membuka port di bawah 1024, sehingga SSH Termux berjalan secara default di port 8022.',
    sampleOutput: `u0_a245
inet 192.168.1.50/24 brd 192.168.1.255 scope global wlan0`,
    verificationTip: 'Gunakan "pgrep sshd" di Termux untuk memastikan daemon SSH sedang berjalan.',
    mode: 'user',
    tags: ['android', 'termux', 'adb', 'staging', 'ssh', 'port-8022', 'wireless-debugging', 'mobile'],
  },

  // =========================================================================
  // 14. MIKROTIK ROUTEROS (CCR2004, CCR2116, RB5009, CHR, CRS326)
  // =========================================================================
  {
    id: 'mikrotik-staging-factory-to-ssh',
    brand: 'mikrotik',
    modelCategory: 'MikroTik RouterOS v7 (CCR / CRS / RB / CHR)',
    osFamily: 'routeros',
    category: 'staging_ssh',
    categoryLabel: 'Staging Awal Pabrik -> Akses SSH (MikroTik RouterOS v7)',
    command: `# 1. Reset Konfigurasi ke Kondisi Kosong (Zero Config / Tanpa Script Default)
/system reset-configuration no-defaults=yes skip-backup=yes

# 2. Login Pertama via Serial Console (115200 Baud) atau Winbox MAC
# User: admin (Password kosong, tekan Enter)

# 3. Atur Nama Hostname & Password Kuat
/system identity set name="CCR2004-Staging"
/user set admin password="MikroTikAdmin2026!"

# 4. Konfigurasi Alamat IP Management pada Port ether1
/ip address add address=10.254.88.215/24 interface=ether1 network=10.254.88.0

# 5. Tentukan Default Gateway
/ip route add dst-address=0.0.0.0/0 gateway=10.254.88.1

# 6. Aktifkan Service SSH Port 22 & Batasi Akses IP (Opsional)
/ip service set ssh port=22 disabled=no address=0.0.0.0/0

# 7. Aktifkan SSH Strong Crypto (RouterOS v7)
/ip ssh set strong-crypto=yes forwarding-enabled=no

# 8. Verifikasi Status Layanan IP
/ip service print where name=ssh`,
    description: 'Prosedur staging router/switch MikroTik dari reset kosong (no-defaults=yes) hingga IP address, strong-crypto SSH, dan password admin terpasang.',
    explanationId: 'Pilihan "no-defaults=yes" menghapus seluruh bridge default 192.168.88.1 sehingga router bersih dan siap dikonfigurasi sesuai skema IP enterprise.',
    sampleOutput: `Flags: X - disabled, I - invalid 
 #   NAME     PORT  ADDRESS          CERTIFICATE 
 0   ssh        22`,
    verificationTip: 'Periksa dengan "/ip service print" dan uji ping ke gateway dengan "/ping 10.254.88.1".',
    mode: 'config',
    tags: ['mikrotik', 'routeros', 'staging', 'factory-reset', 'zero-config', 'ssh', 'strong-crypto', 'ccr2004'],
  },

  // =========================================================================
  // 15. OPENWRT & VYOS (Software Defined Routers & Firewalls)
  // =========================================================================
  {
    id: 'openwrt-vyos-staging-factory-to-ssh',
    brand: 'openwrt',
    modelCategory: 'OpenWrt & VyOS Enterprise Gateway',
    osFamily: 'openwrt',
    category: 'staging_ssh',
    categoryLabel: 'Staging Awal Pabrik -> Akses SSH (OpenWrt & VyOS)',
    command: `# ==========================================
# 1. OPENWRT GATEWAY
# ==========================================
# Hubungkan Serial Console / Telnet (192.168.1.1)
# Set password root pertama kali (WAJIB agar SSH Dropbear aktif)
passwd
# Masukkan password: OpenWrtAdmin2026!

# Konfigurasi Dropbear SSH Server via UCI
uci set dropbear.@dropbear[0].Port='22'
uci set dropbear.@dropbear[0].Interface='lan'
uci set dropbear.@dropbear[0].PasswordAuth='on'
uci set dropbear.@dropbear[0].RootPasswordAuth='on'
uci commit dropbear
/etc/init.d/dropbear restart

# Ganti IP LAN menjadi IP Staging
uci set network.lan.ipaddr='10.254.88.215'
uci set network.lan.netmask='255.255.255.0'
uci set network.lan.gateway='10.254.88.1'
uci set network.lan.dns='10.254.88.254 8.8.8.8'
uci commit network
/etc/init.d/network restart

# ==========================================
# 2. VYOS NETWORK OS (Alternatif)
# ==========================================
# Login default: vyos / vyos
# configure
# set system host-name vyos-staging
# set system login user vyos authentication plaintext-password VyosAdmin2026!
# set service ssh port 22
# set interfaces ethernet eth0 address 10.254.88.215/24
# set protocols static route 0.0.0.0/0 next-hop 10.254.88.1
# commit
# save`,
    description: 'Prosedur staging router gateway OpenWrt dan VyOS dari kondisi baru hingga SSH Dropbear/OpenSSH siap diakses remote.',
    explanationId: 'Pada OpenWrt baru, SSH terkunci sampai Anda menentukan password root via "passwd". Setelah itu service Dropbear otomatis mengizinkan login SSH.',
    sampleOutput: `Restarting dropbear sshd... done.
Interface lan updated with IP 10.254.88.215`,
    verificationTip: 'Periksa proses dropbear dengan "ps | grep dropbear" atau "netstat -tulpn".',
    mode: 'config',
    tags: ['openwrt', 'vyos', 'staging', 'dropbear', 'ssh', 'uci', 'factory-reset', 'gateway'],
  },

  // =========================================================================
  // 12. ALLIED TELESIS (AlliedWare Plus / AW+ Switch, AR Router, TQ AP)
  // =========================================================================
  {
    id: 'allied-staging-factory-to-ssh',
    brand: 'alliedtelesis',
    modelCategory: 'Allied Telesis (Switch x-Series, AR Router, TQ AP)',
    osFamily: 'alliedware-plus',
    category: 'staging_ssh',
    categoryLabel: 'Staging Awal Pabrik -> Akses SSH & Management (AlliedWare Plus)',
    command: `! 1. Login default console: manager / friend (atau default AW+)
enable

! 2. Masuk ke Global Configuration Mode
configure terminal

! 3. Atur Hostname
hostname AT-x530-Staging

! 4. Buat Akun Administrator dengan Privilege 15
username admin privilege 15 password 8 AlliedAdmin2026!

! 5. Aktifkan SSH Server & Generate Host Key RSA
service ssh
crypto key generate hostkey rsa 2048

! 6. Konfigurasi IP Management pada SVI VLAN 1
interface vlan1
 ip address 10.254.88.215/24
 no shutdown
 exit

! 7. Tentukan Default Gateway Management
ip route 0.0.0.0/0 10.254.88.1

! 8. Simpan Konfigurasi Permanen ke Flash
exit
write memory`,
    description: 'Prosedur staging switch/router/AP Allied Telesis dari kondisi baru (factory-default) hingga siap diremote via SSH dan Web GUI.',
    explanationId: 'AlliedWare Plus mengaktifkan daemon SSH dengan perintah "service ssh" dan pembuatan host key RSA 2048-bit.',
    sampleOutput: `Generating RSA host key (2048 bit)...
[OK]
SSH server is enabled on port 22.
Configuration saved to flash:default.cfg`,
    verificationTip: 'Uji koneksi SSH dari workstation dengan "ssh admin@10.254.88.215" dan verifikasi dengan "show ssh server".',
    mode: 'config',
    tags: ['alliedtelesis', 'allied', 'staging', 'factory-to-ssh', 'awplus', 'switch', 'router', 'ssh'],
  },
];
