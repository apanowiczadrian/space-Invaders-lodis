## Instalacja

1. Use npm to install the server.
```
npm install -g http-server
```
2. Run the server.
```
cd directory/
http-server -c-1
```

---


# Space Invaders - Penguin Edition

## Zasady Gry

### Sterowanie

**Desktop:**
- `Strzałka <-  -> ` - ruch w lewo prawo   
- `Spacja` - strzał
- `D` - dev overlay (statystyki)
- `G` - god mode (nieśmiertelność)
- `+` - zwiększ fale (endless mode)
- `-` - zmniejsz fale (endless mode)

**Mobile:**
- Lewa połowa ekranu - ruch w lewo
- Prawa połowa ekranu - ruch w prawo + auto-strzał

### Punktacja i Poziomy

- **Bazowe punkty:** 1 punkt za przeciwnika (+1 punkt za każde 2 fale)
- **Boss:** 10x więcej punktów niż zwykły przeciwnik
- **Komety:** 10-30 punktów (zależnie od rozmiaru)

**Fale (Endless Mode):**
- Każda kolejna fala zwiększa trudność
- **Fala 1-10:** Przeciwnicy mają 1 HP, Boss 5 HP
- **Fala 11-20:** Przeciwnicy 2 HP, Boss 10 HP
- **Fala 21-30:** Przeciwnicy 3 HP, Boss 15 HP
- Przeciwnicy strzelają coraz częściej z każdą falą (+15% na falę)
- Komety pojawiają się częściej na wyższych poziomach

### Power-upy

- **❤️ Life:** +1 życie (max 3)
- **🛡️ Shield:** Tarcza na 1 trafienie
- **🔥 Auto-fire:** Automatyczny ogień na 4 sekundy
- **3️⃣ Triple Shot:** Potrójny strzał na 5 sekund
- **🚀 Rocket:** Niszczy wszystkich przeciwników i komety na ekranie

**Szanse na drop:**
- Przeciwnicy: 3% (Life), 5% (Shield, Auto-fire, Triple Shot, Rocket)
- Komety: 5-10% (Rocket, zależnie od rozmiaru)

### Mechanika Broni

- **Zamrażanie:** Im więcej strzelasz, tym bardziej broń się oziębia
- **Kolor:** Zielony (ciepło) → Żółty → Niebieski (FROZEN)
- Kiedy broń jest zamrożona, nie możesz strzelać przez krótki czas

