#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
echo "================================================"
echo "  69 AI - macOS DMG Installer Builder (1-Click)"
echo "================================================"
echo "Target: DMG terpisah untuk Apple Silicon (arm64) & Intel (x64)"
echo "Signing: ad-hoc, tanpa notarization (CR-009, distribusi open source pribadi)"
echo ""
echo "[1/4] Memeriksa & Menginstall dependencies..."
npm ci --no-audit

echo "[2/4] Membangun frontend (frontend/ → app-dist/)..."
npm run build:frontend

echo "[3/4] Membangun Installer .DMG untuk macOS..."
rm -rf dist-desktop
npx electron-builder --mac

echo "[4/4] Verifikasi signature & membuat checksum..."
for app in dist-desktop/mac*/*.app; do
  codesign --verify --deep --strict "$app" && echo "  codesign OK: $app"
done
(cd dist-desktop && shasum -a 256 *.dmg > SHA256SUMS.txt && cat SHA256SUMS.txt)

echo ""
echo "Selesai! File installer ada di folder: dist-desktop/"
ls -lh dist-desktop/*.dmg
echo "================================================"
echo "Buka .dmg, drag ke Applications. Saat pertama dibuka, macOS akan memblokir"
echo "karena app tidak di-notarize: buka System Settings → Privacy & Security → Open Anyway."
