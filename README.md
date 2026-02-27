# Jstris Match Logger & Stats Extractor

A Tampermonkey script that hooks into the Jstris results screen to log your matches locally. It saves your raw stats to the browser's IndexedDB and calculates advanced Tetra-style competitive metrics on the fly.

I originally put this together to keep track of my own bot matches and calculate things like APP and Cheese without having to export to a spreadsheet every single time.

## What it does

* **Local Match History:** Automatically saves your match stats (time, blocks, attack, APM, etc.) to your browser's local storage using `localForage`. It only logs matches where you drop at least 20 blocks.
* **Advanced Math:** Calculates competitive metrics when you open the stats page, including:
  * APP (Attack Per Piece) & VS/APM
  * DSS (Downstack per Second) & DSP (Downstack per Piece)
  * Cheese Index, GBE (Garbage Blocking Efficiency), and WAPP
  * Playstyle estimates (Opener, Plonk, Stride, Inf DS)
* **Replay Strings:** Extracts both your replay code and the bot's replay code (if applicable) for easy copy-pasting.
* **In-Game UI:** Adds a "Data Menu" button next to the native Jstris Settings button. It opens a custom, scrollable table overlay to view your history.
* **CSV Export:** Lets you export either your raw base stats or the fully calculated advanced stats to a CSV file.

## Installation

1. Make sure you have a userscript manager installed (like [Tampermonkey](https://www.tampermonkey.net/)).
2. Click [here](https://github.com/Tucnak28/jstris-advanced-logger/raw/refs/heads/main/jstris-match-logger.user.js) to install the script. *(Note: Replace this placeholder with the link to the RAW .user.js file once uploaded)*.
3. Accept the installation prompt.
4. Refresh Jstris.

## Usage

Just play the game normally. Every time the results screen pops up, the script quietly grabs the data and pushes it to your local database. 

To view your stats, click the **Data Menu** button on the main screen (right next to the Settings / New Game buttons). From there, you can view your match history, click a replay string to copy it to your clipboard, delete your latest match, or export everything to a CSV.

## Note

This is just a local client-side script running in your own browser. It doesn't ping any external databases and isn't affiliated with the official Jstris game.
