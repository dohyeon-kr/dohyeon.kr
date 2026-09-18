from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
THEME = ROOT / "themes" / "monoliquid"


def read(path: str) -> str:
    return (THEME / path).read_text(encoding="utf-8")


def test_project_promo_banner_contract():
    default = read("default.hbs")
    partial = read("partials/project-promo-banner.hbs")
    script = read("assets/js/project-promo-banner.js")
    styles = read("assets/css/project-promo-banner.css")

    assert '{{> "project-promo-banner"}}' in default
    assert '<link rel="stylesheet" href="{{asset "css/project-promo-banner.css"}}">' in default
    assert 'src="{{asset "js/project-promo-banner.js"}}"' in default

    assert 'data-project-promo' in partial
    assert 'https://poli.it.kr' in partial
    assert 'https://dohyeon-kr.github.io/free-rider/' in partial
    assert 'aria-live="off"' in partial
    assert 'data-project-promo-slide' in partial
    assert 'data-project-promo-toggle' in partial

    # Each slide must read like a self-contained ad creative from the product,
    # not a shared Monoliquid promo card.
    assert 'project-promo__creative' in partial
    assert 'project-promo__poli-wordmark' in partial
    assert 'https://poli.it.kr/brand/poli/avatar-v1/deliver.png' in partial
    assert 'project-promo__rider-lockup' in partial
    assert 'https://raw.githubusercontent.com/dohyeon-kr/free-rider/main/src/assets/free-rider-app-icon.png' in partial
    assert 'project-promo__rider-window' in partial
    assert 'project-promo__rider-urlbar' in partial

    assert "prefers-reduced-motion: reduce" in script
    assert "pointerenter" in script
    assert "focusin" in script
    assert "visibilitychange" in script
    assert "5000" in script

    assert ".project-promo" in styles
    assert ".project-promo__slide--poli" in styles
    assert ".project-promo__slide--free-rider" in styles
    assert "#dfe7df" in styles
    assert "#343936" in styles
    assert "#0d0e11" in styles
    assert "#d4ff00" in styles
    assert "var(--pattern-blackmetal)" not in styles
    assert "@media (max-width:" in styles


if __name__ == "__main__":
    test_project_promo_banner_contract()
    print("project promo banner contract: ok")
