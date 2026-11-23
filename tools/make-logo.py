#!/usr/bin/env python3
"""Gera icons/logo.svg e icons/icon-*.svg (flor de camomila de 8 pétalas com miolo-moeda "R$").

O "R$" é convertido em contorno (path) a partir da fonte Nunito guardada em vendor/,
para o SVG não depender de fonte instalada no aparelho.

Uso:  pip install fonttools brotli && python3 tools/make-logo.py
Depois rode `node tools/make-icons.mjs` para gerar os PNG.
"""
import re
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "vendor/fonts/nunito-latin-wght-normal.woff2"


def rs_path():
    font = instantiateVariableFont(TTFont(FONT), {"wght": 900})
    glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
    x, parts = 0, []
    for ch in "R$":
        name = cmap[ord(ch)]
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(TransformPen(pen, (1, 0, 0, -1, x, 0)))
        parts.append(pen.getCommands())
        x += glyphs[name].width - 30
    d = " ".join(parts)
    d = re.sub(r"-?\d+\.\d+", lambda m: f"{float(m.group()):.0f}", d)
    return d, x


RS, RS_W = rs_path()
RS_SCALE = 0.074
RS_TX = 256 - RS_W * RS_SCALE / 2
RS_TY = 256 + 705 * RS_SCALE / 2  # 705 = altura das maiúsculas na Nunito

PETAL = "M0 -40 C -50 -70 -58 -170 -14 -214 Q 0 -226 14 -214 C 58 -170 50 -70 0 -40 Z"
VEIN = "M0 -70 Q 3 -140 0 -196"


def flower(prefix=""):
    p = prefix
    petals = "\n".join(
        f'    <g transform="rotate({i * 45} 256 256)"><use href="#{p}petal"/></g>' for i in range(8)
    )
    return f"""  <defs>
    <linearGradient id="{p}pg" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#FFF1CF"/>
      <stop offset=".45" stop-color="#FFFBF1"/>
      <stop offset="1" stop-color="#FFFFFF"/>
    </linearGradient>
    <radialGradient id="{p}cg" cx=".38" cy=".32" r=".8">
      <stop offset="0" stop-color="#FFF3BF"/>
      <stop offset=".55" stop-color="#FCE08A"/>
      <stop offset="1" stop-color="#F2C45F"/>
    </radialGradient>
    <filter id="{p}soft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#8A6A3A" flood-opacity=".16"/>
    </filter>
    <g id="{p}petal">
      <path transform="translate(256 256)" d="{PETAL}" fill="url(#{p}pg)" stroke="#EEDFC0" stroke-width="3"/>
      <path transform="translate(256 256)" d="{VEIN}" fill="none" stroke="#F1E4C6" stroke-width="3" stroke-linecap="round"/>
    </g>
  </defs>
  <g filter="url(#{p}soft)">
{petals}
  </g>
  <g filter="url(#{p}soft)">
    <circle cx="256" cy="256" r="74" fill="url(#{p}cg)"/>
    <circle cx="256" cy="256" r="74" fill="none" stroke="#E7B453" stroke-width="5"/>
    <circle cx="256" cy="256" r="60" fill="none" stroke="#F7D987" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round"/>
  </g>
  <path transform="translate({RS_TX:.1f} {RS_TY:.1f}) scale({RS_SCALE})" d="{RS}" fill="#B98731"/>
"""


def svg(body, title="ChaMony"):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="{title}">
  <title>{title}</title>
{body}</svg>
"""


BG = """  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#9AA8C2"/>
      <stop offset="1" stop-color="#6E7D99"/>
    </linearGradient>
  </defs>
"""


def scaled(prefix, scale):
    off = 256 * (1 - scale)
    return f'  <g transform="translate({off:.1f} {off:.1f}) scale({scale})">\n{flower(prefix)}  </g>\n'


icons = ROOT / "icons"
(icons / "logo.svg").write_text(svg(flower()))
# Ícone "any": quadrado arredondado colorido com a flor grande.
(icons / "icon-any.svg").write_text(svg(BG + '  <rect width="512" height="512" rx="112" fill="url(#bg)"/>\n' + scaled("a", 0.86)))
# Ícone "maskable": fundo até a borda; flor dentro da zona segura (círculo de 80%).
(icons / "icon-maskable.svg").write_text(svg(BG + '  <rect width="512" height="512" fill="url(#bg)"/>\n' + scaled("m", 0.66)))
print("ok")
