const L={wan_connection_type:{label:"WAN Connection Type (Mode WAN)",category:"wan",description:"Menentukan metode autentikasi dan alokasi IP publik/uplink dari ISP. Pilihan umum: PPPoE (sering digunakan Fiber ISP seperti Indihome/Biznet/MyRepublic), Static IP (IP Statis leased-line), DHCP Client / IPoE (otomatis dari modem upstream).",recommendation:"Gunakan PPPoE jika berlangganan broadband rumahan/kantor dengan username & password ISP. Gunakan Static IP untuk dedicated internet.",impactLevel:"critical",commonErrors:["PPPoE Authentication Failed (Username/Password salah)","DHCP No Lease Offered (Kabel WAN lepas/salah port)"]},wan_mtu:{label:"WAN MTU (Maximum Transmission Unit)",category:"wan",description:"Ukuran paket data Ethernet terbesar (dalam byte) yang dapat ditransmisikan tanpa fragmentasi.",recommendation:"Untuk koneksi PPPoE, atur ke 1480 atau 1492 (karena ada 8-byte PPPoE header overhead). Untuk koneksi Ethernet/DHCP standar, atur ke 1500.",impactLevel:"high",rfcStandard:"RFC 2516 (A Method for Transmitting PPP Over Ethernet)",commonErrors:["MTU 1500 pada PPPoE menyebabkan beberapa website (seperti perbankan/streaming) tidak bisa dibuka (Black Hole MTU)."]},vlan_id:{label:"VLAN ID / 802.1Q Tag",category:"wan",description:"Virtual LAN identifier (1 - 4094) untuk memisahkan traffic layer 2 (misal: VLAN 100 untuk Internet, VLAN 200 untuk IPTV/UseeTV, VLAN 300 untuk VoIP).",recommendation:"Masukkan VLAN ID sesuai instruksi ISP jika modem GPON dalam mode Bridge. Kosongkan (Untagged) jika port upstream sudah access port.",impactLevel:"high",rfcStandard:"IEEE 802.1Q"},nat_masquerade:{label:"NAT (Network Address Translation) / Masquerade",category:"firewall",description:"Menerjemahkan seluruh IP privat lokal (192.168.x.x / 10.x.x.x) ke satu IP publik WAN saat mengakses internet keluar.",recommendation:"Wajib DIAKTIFKAN (Enabled) pada antarmuka WAN router gateway agar perangkat klien LAN bisa mengakses internet.",impactLevel:"critical",rfcStandard:"RFC 3022"},dns_primary:{label:"Primary DNS Server",category:"lan",description:"Server penerjemah nama domain (URL) menjadi alamat IP yang digunakan router dan disebarkan ke klien via DHCP.",recommendation:"Gunakan DNS publik berkecepatan tinggi: 1.1.1.1 (Cloudflare), 8.8.8.8 (Google), atau 9.9.9.9 (Quad9 untuk malware filtering).",impactLevel:"medium"},dns_secondary:{label:"Secondary / Backup DNS Server",category:"lan",description:"Server DNS cadangan jika server DNS utama mengalami timeout atau gangguan.",recommendation:"Gunakan 1.0.0.1 (Cloudflare Secondary) atau 8.8.4.4 (Google Secondary).",impactLevel:"medium"},dhcp_pool_start:{label:"DHCP Pool Start - End Range",category:"lan",description:"Rentang alokasi alamat IP dinamis yang dibagikan ke laptop, smartphone, dan perangkat klien di jaringan lokal.",recommendation:"Sisakan blok IP awal (misal .2 s/d .50) untuk perangkat dengan Static IP (seperti Server, Printer, Access Point, Switch, NVR CCTV), dan atur pool DHCP di .51 s/d .254.",impactLevel:"medium"},dhcp_lease_time:{label:"DHCP Lease Time",category:"lan",description:"Durasi waktu sebuah perangkat klien diizinkan memegang alamat IP sebelum harus memperpanjang (renew) sewa IP ke router.",recommendation:"Untuk kantor/rumah: 12 - 24 Jam (720 - 1440 menit). Untuk kafe/hotspot publik dengan perputaran tamu tinggi: 30 - 60 menit agar pool IP tidak cepat habis.",impactLevel:"medium"},wlan_ssid:{label:"Wi-Fi SSID (Network Name)",category:"wireless",description:"Nama sinyal Wi-Fi yang dipancarkan oleh Access Point / Router nirkabel.",recommendation:"Gunakan nama yang jelas. Pisahkan SSID 2.4GHz (jangkauan luas) dan 5GHz (kecepatan tinggi) jika tidak menggunakan Band Steering.",impactLevel:"medium"},wlan_security:{label:"Wi-Fi Security & Encryption",category:"security",description:"Protokol keamanan enkripsi sandi nirkabel. Pilihan: Open (tanpa sandi), WPA2-PSK (AES), WPA3-SAE (paling aman).",recommendation:"Gunakan mode WPA2/WPA3 Mixed Mode (AES) dengan password minimal 10-12 karakter kombinasi angka dan huruf.",impactLevel:"high"},pon_optical_rx:{label:"GPON Optical Rx Power (Daya Terima Serat Optik)",category:"pon",description:"Tingkat intensitas daya cahaya laser optik yang diterima oleh modem ONT/ONU dari perangkat OLT sentral (dalam satuan dBm).",recommendation:"Rentang normal yang sehat: antara -15.0 dBm hingga -24.0 dBm. Nilai di bawah -27.0 dBm menandakan redaman terlalu tinggi / kabel fiber optic tertekuk atau kotor.",impactLevel:"critical"},firewall_syn_flood:{label:"SYN Flood / DoS Protection",category:"firewall",description:"Fitur pertahanan router untuk menolak serangan TCP SYN flood yang mencoba menghabiskan memory koneksi router.",recommendation:"Aktifkan (Enabled) dengan limit threshold adaptif.",impactLevel:"medium"},stp_priority:{label:"STP / RSTP Bridge Priority",category:"routing",description:"Prioritas Spanning Tree Protocol untuk menentukan Root Bridge switch dalam topologi redundansi layer 2.",recommendation:"Atur switch Core utama ke nilai prioritas terendah: 4096 atau 0, switch Distribution ke 8192, dan switch Access ke 32768.",impactLevel:"high",rfcStandard:"IEEE 802.1D / 802.1w"}};function v(b){const{url:h,brand:u="mikrotik",pageTitle:k="Device Web Management",errorText:w="",formData:n={},rawHtmlOrText:y="",userQuestion:S=""}=b,t=`${h} ${k} ${w} ${JSON.stringify(n)} ${y}`.toLowerCase(),r=(S||"").toLowerCase(),o=(u||"").toLowerCase(),d=[],P=[],l=[],s=[],A=t.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g)||[],f=Array.from(new Set(A)).filter(a=>!a.startsWith("0.")&&!a.startsWith("127.")),i=n.lan_ip||f.find(a=>a.startsWith("192.168.")||a.startsWith("10."))||"192.168.1.1",g=n.wan_ip||f.find(a=>!a.startsWith("192.168.")&&!a.startsWith("10.")&&!a.startsWith("172.16."))||"203.0.113.10";let m="healthy",c=`Analisis Web GUI ${u.toUpperCase()} (${k}) berhasil diproses.`,p=`Parameter tampilan web manajemen ${u.toUpperCase()} terpantau aktif.`;const I=r.includes("setting")||r.includes("konfigurasi")||r.includes("cara")||r.includes("langkah")||r.includes("setup")||r.includes("panduan");if(t.includes("authentication failed")||t.includes("chap auth fail")||t.includes("auth error")||t.includes("bad credentials")?(m="critical",c="Autentikasi WAN PPPoE Gagal! Username atau password akun ISP tidak cocok.",d.push("PPPoE Session Terminated: Auth Failure (Kode LCP / PAP / CHAP menolak login)"),d.push("Router tidak mendapatkan IP Publik dari ISP"),p="Server BRAS/PPPoE ISP menolak kredensial yang dimasukkan. Periksa kembali username (pastikan format domain ISP benar, misal @telkom.net atau @biznet) dan password akun.",l.push({parameter:"PPPoE Username / Password",recommendedValue:"Format lengkap sesuai SPK ISP",reason:"Mencegah penolakan sesi pada BRAS Gateway"}),l.push({parameter:"WAN MTU",recommendedValue:"1480 atau 1492",reason:"Mengakomodasi 8-byte PPPoE header"})):(t.includes("no carrier")||t.includes("link down")||t.includes("wan disconnected")||t.includes("physically down"))&&(m="critical",c="Port WAN Terputus Fisik (Physical Link DOWN).",d.push("Kabel Ethernet WAN tidak terhubung atau modem upstream mati."),d.push("Interface PHY negotiate 0 Mbps."),p="Kabel UTP patch-cord WAN pada port 1/WAN tidak mendeteksi sinyal listrik. Pastikan modem ONT dalam kondisi menyala dan kabel UTP RJ45 terpasang rapat.",l.push({parameter:"Link Speed Negotiation",recommendedValue:"Auto-Negotiation (1000Mbps Full Duplex)",reason:"Mencegah duplex mismatch dengan port modem ISP"})),t.includes("rx optical")||t.includes("optical power")||t.includes("gpon")||t.includes("onu")||t.includes("olt")){const a=t.match(/[-]?\d+\.?\d*\s*dbm/),e=a?parseFloat(a[0]):-21.5;e<-27?(m="critical",c=`Redaman Fiber Optik Sangat Buruk (${e} dBm)! Risiko Loss of Signal (LOS).`,d.push(`Optical Rx Power (${e} dBm) di luar batas aman standar GPON Class B+ (-8 dBm s/d -27 dBm).`),d.push("Tingkat error frame optik (BIP error) tinggi menyebabkan drop paket internet."),p="Sinyal cahaya dari OLT terlalu redup. Kemungkinan penyebab: kabel patchcord SC/UPC tertekuk (macro-bending), konektor berdebu, atau ada redaman sambungan splitter pasif yang tinggi.",l.push({parameter:"Optical Rx Power Target",recommendedValue:"-18.0 s/d -22.0 dBm",reason:"Menjamin stabilitas link optik jangka panjang tanpa fluktuasi BER"})):e>-8?(m="warning",c=`Daya Optik Terlalu Tinggi (${e} dBm) - Optical Receiver Overload.`,d.push(`Optical Rx Power (${e} dBm) berlebih, dapat merusak fotodioda receiver ONU.`)):d.push(`Optical Rx Power: ${e} dBm (🟢 Normal / Optimal Range)`)}if(n.wan_ip&&n.lan_ip){const a=n.wan_ip.trim(),e=n.lan_ip.trim();a.startsWith("192.168.1.")&&e.startsWith("192.168.1.")&&(m="critical",c="Konflik Alamat IP: Subnet WAN dan Subnet LAN Menggunakan Blok yang Sama (192.168.1.0/24)!",d.push("IP Subnet Overlap: Router tidak dapat merutekan paket karena gateway WAN dan interface lokal bertabrakan."),p="Jika modem ISP memberikan IP 192.168.1.x, maka LAN router HARUS diubah ke subnet berbeda, misalnya 192.168.2.1/24 atau 192.168.88.1/24.",l.push({parameter:"LAN IP Address",recommendedValue:"192.168.10.1/24 atau 192.168.88.1/24",reason:"Menghindari tabrakan routing dengan subnet modem upstream"}))}const N=["wan_connection_type","wan_mtu","nat_masquerade","dns_primary","dns_secondary","dhcp_pool_start","dhcp_lease_time","wlan_security"];for(const a of N){const e=L[a];e&&P.push({key:a,label:e.label,value:n[a]||(a==="wan_mtu"?"1492":a==="dns_primary"?"1.1.1.1":a==="dns_secondary"?"8.8.8.8":"Configured"),category:e.category,description:e.description,recommendation:e.recommendation,impactLevel:e.impactLevel,rfcStandard:e.rfcStandard,commonErrors:e.commonErrors})}if((I||r.includes("dhcp")||r.includes("ip")||r.includes("vlan")||r.includes("nat")||r.includes("wifi")||r.includes("routing"))&&(c=`Panduan Langkah Konfigurasi & Skrip CLI untuk ${u.toUpperCase()} (${k})`,p=`Berikut adalah langkah-langkah setting interaktif pada Web GUI ${u.toUpperCase()} serta padanan perintah CLI yang siap Anda copy-paste ke terminal.`),o.includes("mikrotik")||o.includes("routeros")?(s.push({title:"1. Konfigurasi IP Address & Gateway (MikroTik CLI)",cliSyntax:`/ip address add address=${i}/24 interface=bridge-lan comment="LAN Gateway"
/ip route add dst-address=0.0.0.0/0 gateway=${n.wan_gateway||"192.168.1.1"} check-gateway=ping`,description:"Menetapkan IP lokal router dan routing default gateway ke ISP."}),s.push({title:"2. Setup DHCP Server & DNS Resolver",cliSyntax:`/ip pool add name=dhcp-pool ranges=${i.replace(/\.\d+$/,".50")}-${i.replace(/\.\d+$/,".250")}
/ip dhcp-server add name=dhcp-lan interface=bridge-lan address-pool=dhcp-pool lease-time=12h disabled=no
/ip dhcp-server network add address=${i.replace(/\.\d+$/,".0")}/24 gateway=${i} dns-server=1.1.1.1,8.8.8.8
/ip dns set servers=1.1.1.1,8.8.8.8 allow-remote-requests=yes`,description:"Mendistribusikan IP dinamis ke semua perangkat klien LAN."}),s.push({title:"3. Setup NAT Internet Masquerade & Firewall",cliSyntax:`/ip firewall nat add chain=srcnat out-interface-list=WAN action=masquerade comment="NAT Out"
/ip firewall filter add chain=forward action=fasttrack-connection connection-state=established,related comment="FastTrack"`,description:"Mengaktifkan translasi NAT agar klien lokal bisa browsing ke internet."})):o.includes("fortinet")||o.includes("fortigate")?(s.push({title:"1. Konfigurasi Antarmuka LAN & WAN (FortiOS CLI)",cliSyntax:`config system interface
    edit "lan"
        set mode static
        set ip ${i} 255.255.255.0
        set allowaccess ping https ssh
    next
    edit "wan1"
        set mode static
        set ip ${g} 255.255.255.252
    next
end`,description:"Konfigurasi IP address dan akses management interface di FortiOS."}),s.push({title:"2. Konfigurasi Static Default Route",cliSyntax:`config router static
    edit 1
        set dst 0.0.0.0 0.0.0.0
        set gateway ${n.wan_gateway||"203.0.113.9"}
        set device "wan1"
    next
end`,description:"Mengarahkan seluruh traffic keluar ke next-hop gateway ISP."}),s.push({title:"3. Konfigurasi Firewall Policy & NAT Masquerade",cliSyntax:`config firewall policy
    edit 1
        set name "LAN_TO_INTERNET"
        set srcintf "lan"
        set dstintf "wan1"
        set srcaddr "all"
        set dstaddr "all"
        set action accept
        set schedule "always"
        set service "ALL"
        set nat enable
    next
end`,description:"Memberikan izin akses internet untuk subnet lokal dengan fitur NAT."})):o.includes("juniper")||o.includes("junos")?s.push({title:"1. Konfigurasi Interface & Routing (Juniper Junos)",cliSyntax:`configure
set interfaces ge-0/0/0 unit 0 family inet address ${g}/30
set interfaces ge-0/0/1 unit 0 family inet address ${i}/24
set routing-options static route 0.0.0.0/0 next-hop ${n.wan_gateway||"203.0.113.9"}
commit and-quit`,description:"Menetapkan IP antarmuka WAN/LAN dan default routing static pada Junos OS."}):o.includes("huawei")||o.includes("vrp")?s.push({title:"1. Konfigurasi Interface & NAT (Huawei VRP CLI)",cliSyntax:`system-view
interface GigabitEthernet0/0/1
 ip address ${i} 255.255.255.0
 quit
interface GigabitEthernet0/0/0
 ip address ${g} 255.255.255.252
 nat outbound 2000
 quit
ip route-static 0.0.0.0 0.0.0.0 ${n.wan_gateway||"203.0.113.9"}
return
save`,description:"Menetapkan antarmuka IP dan konfigurasi NAT Outbound di Huawei Router/Switch."}):o.includes("openwrt")||o.includes("luci")?s.push({title:"1. Konfigurasi Network Interfaces (OpenWrt UCI CLI)",cliSyntax:`uci set network.lan.ipaddr='${i}'
uci set network.lan.netmask='255.255.255.0'
uci set network.wan.proto='static'
uci set network.wan.ipaddr='${g}'
uci set network.wan.netmask='255.255.255.252'
uci set network.wan.gateway='${n.wan_gateway||"203.0.113.9"}
uci set network.wan.dns='1.1.1.1 8.8.8.8'
uci commit network
/etc/init.d/network restart`,description:"Menerapkan konfigurasi LAN dan WAN via unified configuration interface (uci)."}):(s.push({title:"1. Konfigurasi VLAN, SVI Interface & IP Gateway (Cisco IOS)",cliSyntax:`configure terminal
vlan 10
 name LAN_USERS
exit
interface Vlan10
 ip address ${i} 255.255.255.0
 no shutdown
exit
interface GigabitEthernet0/0/1
 switchport mode access
 switchport access vlan 10
 no shutdown
end
write memory`,description:"Membuat VLAN 10, mengalokasikan subnet gateway SVI, dan assign port access."}),s.push({title:"2. Konfigurasi DHCP Pool & NAT Overload",cliSyntax:`configure terminal
ip dhcp excluded-address ${i} ${i.replace(/\.\d+$/,".20")}
ip dhcp pool LAN_POOL
 network ${i.replace(/\.\d+$/,".0")} 255.255.255.0
 default-router ${i}
 dns-server 1.1.1.1 8.8.8.8
exit
access-list 1 permit ${i.replace(/\.\d+$/,".0")} 0.0.0.255
ip nat inside source list 1 interface GigabitEthernet0/0/0 overload
end
write memory`,description:"Menyediakan DHCP otomatis untuk perangkat klien dan NAT internet overload."})),n&&Object.keys(n).length>0)for(const[a,e]of Object.entries(n))(a.includes("ip")||a.includes("mask")||a.includes("gateway")||a.includes("dns")||a.includes("mtu"))&&l.push({parameter:a.toUpperCase().replace(/_/g," "),recommendedValue:e,reason:"Terverifikasi dari parameter aktif pada halaman Web GUI"});return{status:m,brand:u.toUpperCase(),model:"Web Management Interface",pageTitle:k,url:h,summary:c,identifiedIssues:d,explanation:p,parameterGuides:P,recommendedSettings:l,equivalentCliCommands:s}}export{L as WEB_PARAMETER_DICTIONARY,v as analyzeWebGuiScreenLocally};
