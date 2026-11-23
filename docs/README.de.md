# Neon Breakout

[English](../README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [한국어](README.ko.md) | [Русский](README.ru.md)

`breakout-web` integriert Fables vollständiges Spiel samt Neon-Grafik, Effekten und Audio. Eine native TypeScript-Engine ersetzt das alte React-Spiel. Desktop- und Mobilbrowser werden unterstützt; das ursprüngliche Fable-Verzeichnis bleibt unverändert.

## Entwicklung und Prüfung

```bash
bun install
bun run dev
```

```bash
bun run build
bun run test
bun run lint
bun run typecheck
```

Die bestehende Toolchain mit Vite 5 + TypeScript 5.6 bleibt erhalten, ohne neue Abhängigkeiten. Der Build erzeugt eine gewöhnliche statische Website in `dist/`, die über HTTP(S) bereitgestellt werden muss, keine einzelne HTML-Datei zum Öffnen per Doppelklick.

## Spiel

- Kampagne mit 5 Kapiteln und 30 Levels, Bossbegegnungen, Levelauswahl und Sternen
- Seedbasierte, prozedural erzeugte Endloslevels mit einem Boss alle 10 Ebenen; jeder neue Lauf erhält einen neuen Seed
- 11 Items: breiter Schläger, Verlangsamung, Multiball, Durchschlag, Fünf-Ball-Fächer, Laser, Magnet, Schild, Zusatzleben und zwei negative Effekte: kurzer Schläger und Beschleunigung
- Doppel vervielfacht die aktuelle Ballzahl mit 2, Fächer mit 5, bis insgesamt höchstens 200 Bälle; die Bälle fächern sich an der Position jedes vorhandenen Balls um dessen bisherige Flugrichtung auf.
- Durchgänge auf beiden Seiten der Steinformation lassen Bälle nach oben hinter die Steine gelangen.
- 9 Oberflächensprachen, beim ersten Besuch anhand der Browsersprache gewählt und in den Einstellungen änderbar

## Steuerung

- Kampagne, freigeschaltetes Level oder Endlosmodus im Menü wählen
- Maus: bewegen zum Zielen, klicken zum Abschuss; danach den Schläger durch Mausbewegung steuern
- Tastatur: ←/→ oder A/D steuern den Schläger; Leertaste, ↑ oder W schießen; Esc oder P pausieren/fortsetzen
- Touch: ziehen zum Zielen, loslassen zum Abschuss; danach an beliebiger Stelle im Spielfeld ziehen, um den Schläger zu bewegen
- Vom Magneten gehaltene Bälle per Klick, Loslassen oder Abschusstaste freigeben; Pause, Wiederholen, nächstes Level und Hauptmenü sind über die Oberfläche erreichbar

## Browserspeicher

`localStorage` speichert Kampagnenfreischaltungen, Sterne und Levelbestwerte, Endlosrekord und höchste abgeschlossene Ebene sowie Sprache, Sound- und Musikeinstellungen. **Neuladen stellt den laufenden Versuch nicht wieder her**. Dauerhafte Rekorde erfordern verfügbaren Browserspeicher.

Alte `breakout-web`-Spielstände bleiben erhalten, werden wegen anderer Levelregeln aber nicht automatisch migriert. Vorhandene Fable-Spielstände desselben Origins (Protokoll, Host, Port) bleiben über den Schlüssel `neon-breakout:v1` kompatibel. Ein Origin-Wechsel überträgt keine Spielstände.
