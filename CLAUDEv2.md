## ENVIRONMENT
- OS: Windows 11
- Shell: PowerShell 7+ (UTF-8 default)
- Node.js: v20.x
- jq: v1.6+ (zainstalowany via Chocolatey)
- Separator ścieżek: używaj `/` (działa w PowerShell i Node)

## ERROR PROTOCOL
1. If projectMAP.json is missing → run `node .claude/treeFilesRebuild.js`
2. If jq fails → try native Node.js alternative (json-query npm)
3. If function not found in map → READ ENTIRE FILE as fallback

# Plik projectMAP.json
a **projectMAP.json** is high-utility, grep-friendly JSON Knowledge Base that maps the project's logical flow rather than just its file structure.

1. **Format:** JSON.
2. **Structure:** Keep it FLAT. Max depth of 3 levels.
3. **Focus:** Map of functions in project. Show relation between files and functions, describe what they do, to quick search, 
4. **Grep-ability:** Use unique, descriptive keys. Avoid generic names like "utils".
5. **Content:** Do not dump code. List specific *function names* and quick *descriptions* of what they do, in 8 words or less.
6. **fileTreeUpdate**: to auto-generate file tree structure.
    EXAMPLE: bash `node .claude/sync-project-map.js`

## example file projectMAP.json structure
```json
{
 "fileTree": {
    "root": ".",
    "structure": [
      "index.html",
      "js/main.js",
      "js/game/Player.js",
    ]
  },

  "domains": [
    {
      "id": "INTERFACE_PREGAME",
      "desc": "UI and Lobby logic",
      "files": [
        {
          "p": "index.html",
          "keys": {
            "checkOrientation()": "landscape check",
            "initMainMenu()": "UI bootstrap"
          }
        }
      ]
    }
  ]
}
```

## How to use projectMAP.json
<projectMAP_tool>
When searching for information in the codebase, FOLLOW THIS PROTOCOL strictly to save context window:

1. **LOCATE (Map First):**
   - DO NOT read source files randomly.
   - Use `jq` to find information based on keywords
     Example: `jq --argjson szukane '["SŁOW_KLUCZOWE1", "SŁOW_KLUCZOWE2", "SŁOW_KLUCZOWE3"]' '.domains[] | select(tojson | test($szukane | join("|"); "i"))' projectMAP.json`
     Example: `jq '[ .domains[] | select(tojson | test("SŁOWO_KLUCZOWE"; "i")) ]' projectMAP.json` 

2. **GET FILE LOCATION:**
   - if you dont know where the file is located in the project structure, read `minimumFilesTree.md` file

3. **READ (Source Code):**
   - Only after identifying the specific target file from step 1, use `read_file` (or `cat`) on that specific source file.
</projectMAP_tool>


## Rób to dla każdego promptu
- zawsze aktualizuj projectMAP.json po zmianach w kodzie (dodawanie, usuwanie, zmienianie nazwy funkcji). Kiedy planujesz plaujesz proces, zrób to na końcu.
- zawsze używaj projectMAP.json do lokalizowania funkcji i plików w kodzie


**IMPORTANT FOR CLAUDE CODE:**
- **NEVER** edit, modify, or "improve" text content in HTML files (index.html)
- This includes: form labels, instructions, error messages, button text, PWA installation steps
- All text content has been **manually crafted and polished** by the developer
- You may ONLY modify: JavaScript logic, CSS styles, code structure
- If you need to add new features, create NEW elements - don't modify existing text

**Examples of what NOT to change:**
- ❌ Form field labels ("Nick", "Email/Hasło")
- ❌ Button text ("ZROBIŁEM, ROZPOCZNIJ GRĘ")
- ❌ PWA installation instructions
- ❌ Error messages ("❌ PWA nie wykryto!")
- ❌ Any user-facing Polish text


**LODIS - GALAGA** is a Space Invaders-style arcade game built with p5.js, featuring:
- Cross-platform support (desktop + mobile PWA)
- Endless wave system with progressive difficulty
- Online leaderboard integration (Google Sheets API)
- Weapon heat mechanics and power-up system


### Tech Stack
- **Rendering:** p5.js (canvas-based)
- **Language:** ES6 JavaScript (modules)
- **Storage:** localStorage + Google Sheets API
- **PWA:** manifest.json (fullscreen, landscape)
- **Fonts:** Google Fonts (Orbitron, Rajdhani, Russo One) + Press Start 2P (local)
