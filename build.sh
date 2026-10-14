#!/bin/sh
# Rebuilds index.html from src/ (macOS/Linux/Git Bash):  sh build.sh
cd "$(dirname "$0")/src"
{ echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'
  cat a_head.html; echo '<script>'
  cat b_data.js c_engine.js d_loop.js f_captains.js g_depth.js h_audio.js i_console.js j_traders.js k_port.js l_holdings.js m_holdui.js e_ui.js
  echo '</script>'; echo '</body></html>'; } > ../index.html
echo "Built index.html"
