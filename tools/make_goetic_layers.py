"""Package unchanged historical scan content in independent SVG clipping layers.

No raster redraw or resampling: masks and display filters are SVG geometry.
Run from any directory. Outputs are self-contained, transparent SVG assets.
"""
import base64
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "artwork" / "goetic-layers"
SOURCE = ROOT / "magic-circle" / "public" / "goetia-source.jpg"


def svg(body, defs="", title=""):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" role="img" aria-label="{title}">
<title>{title}</title><defs>{defs}</defs>{body}</svg>'''


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    image = base64.b64encode(SOURCE.read_bytes()).decode("ascii")
    common = f'''
<clipPath id="plate"><path d="M0 0 H300 V20 H700 V0 H1000 V1000 H700 V985 H300 V1000 H0 Z"/></clipPath>
<filter id="ink" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%">
<feColorMatrix type="luminanceToAlpha"/>
<feComponentTransfer result="a"><feFuncA type="linear" slope="-2.5" intercept="1.8"/></feComponentTransfer>
<feFlood flood-color="#e8d49c"/><feComposite in2="a" operator="in"/>
</filter>
<g id="source" clip-path="url(#plate)"><svg width="1000" height="1000" viewBox="50 636 1620 1620">
<image width="1728" height="2324" href="data:image/jpeg;base64,{image}" filter="url(#ink)"/>
</svg></g>'''
    layers = {
        "01-snake": ("Snake and inscriptions", '''<mask id="region"><rect width="1000" height="1000" fill="black"/>
<ellipse cx="496" cy="501" rx="461" ry="463" fill="white"/>
<ellipse cx="496" cy="501" rx="295" ry="297" fill="black"/>
<g fill="black"><rect width="1000" height="46"/><rect y="958" width="1000" height="42"/>
<rect y="400" width="48" height="230"/><rect x="949" y="400" width="51" height="230"/></g>
</mask>'''),
        "02-exterior-stars": ("Exterior stars", '''<mask id="region"><rect width="1000" height="1000" fill="black"/>
<g fill="white"><rect x="0" y="0" width="190" height="200"/><rect x="810" y="0" width="190" height="200"/>
<rect x="0" y="810" width="190" height="190"/><rect x="810" y="810" width="190" height="190"/></g>
<ellipse cx="496" cy="501" rx="466" ry="468" fill="black"/>
</mask>'''),
        "03-interior-stars": ("Interior stars", '''<mask id="region"><rect width="1000" height="1000" fill="black"/>
<g fill="white"><polygon points="497,201 583,237 583,332 499,391 413,332 413,237"/>
<rect x="345" y="274" width="315" height="62"/>
<polygon points="245,410 355,410 393,500 355,589 245,589 201,500"/>
<polygon points="648,410 754,410 795,502 755,589 648,589 610,500"/>
<polygon points="497,607 590,650 590,766 499,802 410,766 410,650"/>
<rect x="340" y="678" width="320" height="64"/></g>
</mask>'''),
        "04-central-square": ("Central square and crosses", '''<mask id="region"><rect width="1000" height="1000" fill="black"/>
<rect x="392" y="390" width="217" height="219" fill="white"/>
</mask>'''),
    }
    for name, (title, region) in layers.items():
        (OUTPUT / f"{name}.svg").write_text(svg('<use href="#source" mask="url(#region)"/>', common + region, title), encoding="utf-8")
    (OUTPUT / "00-outline.svg").write_text(svg('<circle cx="496" cy="501" r="452" fill="none" stroke="#d7c38f" stroke-width="1.5"/>', title="Plain starting circle"), encoding="utf-8")
    particles = []
    import math
    for i in range(42):
        angle = i * 2.3999632297
        radius = 310 + ((i * 71) % 175)
        x, y = 496 + radius * math.cos(angle), 501 + radius * math.sin(angle)
        particles.append(f'<circle class="spark" cx="{x:.2f}" cy="{y:.2f}" r="{1.1 + (i % 4) * .55:.2f}" style="animation-delay:-{i * .37:.2f}s;animation-duration:{3 + (i % 7) * .53:.2f}s"/>')
    effect_defs = '''<radialGradient id="haze"><stop offset="0" stop-color="#d3a544" stop-opacity="0"/><stop offset=".55" stop-color="#d3a544" stop-opacity="0"/><stop offset=".77" stop-color="#ebc66b" stop-opacity=".13"/><stop offset=".9" stop-color="#d5a446" stop-opacity=".2"/><stop offset="1" stop-color="#d5a446" stop-opacity="0"/></radialGradient>
<filter id="mist" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="17"/></filter>
<filter id="shine" x="-400%" y="-400%" width="900%" height="900%"><feGaussianBlur stdDeviation="2.4"/></filter>
<style>.breath{transform-origin:496px 501px;animation:breathe 9s ease-in-out infinite alternate}.spark{fill:#ffe7a1;animation:twinkle 4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}@keyframes breathe{from{opacity:.45;transform:scale(.97) rotate(-2deg)}to{opacity:1;transform:scale(1.02) rotate(2deg)}}@keyframes twinkle{0%,100%{opacity:.08;transform:translateY(3px) scale(.6)}50%{opacity:.95;transform:translateY(-5px) scale(1)}}@media(prefers-reduced-motion:reduce){.breath,.spark{animation:none}.breath{opacity:.7}.spark{opacity:.6}}</style>'''
    effect = '<g class="breath"><circle cx="496" cy="501" r="496" fill="url(#haze)"/><g fill="none" stroke="#e2b654" stroke-width="16" filter="url(#mist)"><ellipse cx="496" cy="501" rx="444" ry="425" opacity=".22"/><ellipse cx="496" cy="501" rx="407" ry="446" opacity=".17"/></g></g>'
    effect += '<g>' + ''.join(particles) + '</g>'
    (OUTPUT / "05-golden-mist.svg").write_text(svg(effect, effect_defs, "Animated golden mist and sparkles"), encoding="utf-8")
    print(f"Created six transparent SVG layers in {OUTPUT}")


if __name__ == "__main__":
    main()
