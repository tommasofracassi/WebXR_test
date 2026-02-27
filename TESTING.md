# Guida Rapida: Testare WebXR su Meta Quest 3

## 🔴 Perché vedi "VR NOT SUPPORTED"?

**È normale!** I browser desktop (Chrome, Safari, Firefox su Mac/Windows) **non supportano WebXR** perché non hanno hardware VR.

Il messaggio "VR NOT SUPPORTED" significa che stai testando sul browser sbagliato. Devi usare il **browser del Meta Quest 3**.

## ✅ Soluzione: Usa HTTPS

WebXR richiede **HTTPS** per funzionare. Ecco come configurarlo:

### Metodo 1: Cloudflare Tunnel (Consigliato - Gratuito)

```bash
# 1. Installa cloudflared (solo la prima volta)
brew install cloudflare/cloudflare/cloudflared

# 2. Avvia il tunnel (lascia npm run dev in esecuzione)
cloudflared tunnel --url http://localhost:5173
```

Vedrai un output tipo:
```
2024-01-15 Your quick Tunnel has been created! Visit it at:
https://random-words-1234.trycloudflare.com
```

**Copia questo URL HTTPS** e aprilo sul browser del Meta Quest 3!

### Metodo 2: ngrok (Alternativa)

```bash
# 1. Installa ngrok
brew install ngrok

# 2. Avvia il tunnel
ngrok http 5173
```

Usa l'URL HTTPS che ngrok ti fornisce.

### Metodo 3: Vite con HTTPS (Rete Locale)

Modifica `package.json`:
```json
{
  "scripts": {
    "dev": "vite --host --https"
  }
}
```

Poi:
```bash
npm run dev
```

Trova il tuo IP locale:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Accedi da Quest 3: `https://[TUO_IP]:5173` (accetta il certificato self-signed)

## 📱 Come Testare sul Meta Quest 3

1. **Indossa il visore Meta Quest 3**
2. **Apri il browser** (icona del globo nel menu principale)
3. **Digita l'URL HTTPS** che hai ottenuto con uno dei metodi sopra
4. **Dovresti vedere**:
   - Il cubo rotante verde
   - Un pulsante verde "ENTER VR" in basso
5. **Clicca "ENTER VR"**
6. **Ora sei in VR!** 🎉
   - Il cubo dovrebbe essere visibile in 3D stereoscopico
   - Muovi la testa per guardare intorno
   - La griglia ti aiuta a orientarti nello spazio

## 🐛 Verifica sul Browser Desktop

Apri la console del browser (F12) e dovresti vedere:

```
⚠️ WebXR API is available but immersive-vr is not supported.
This is normal on desktop browsers. Use Meta Quest 3 browser to test.
```

Oppure:

```
❌ WebXR is not available in this browser.
```

**Questo è normale!** Significa che il codice funziona correttamente.

## 🎯 Quick Start

```bash
# Terminal 1: Server Vite (già in esecuzione)
npm run dev

# Terminal 2: Tunnel HTTPS
cloudflared tunnel --url http://localhost:5173
```

Poi apri l'URL HTTPS sul Meta Quest 3!
