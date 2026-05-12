"""
TC036 — Admin cria clube com logo e vê imagem no card.

Pré-requisitos:
  - App rodando em http://localhost:3000
  - Variáveis de ambiente: ADMIN_EMAIL, ADMIN_PASSWORD
  - Migration 008_clubs_linked_to_students.sql aplicada no projeto Supabase
  - Bucket público club-logos configurado no Supabase Storage
"""

import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE_URL = os.getenv("APP_URL", "http://localhost:3000")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
CLUB_NAME = f"Clube Logo QA {int(time.time())}"
FIXTURE_PATH = Path(__file__).parent / "fixtures" / "club-logo.svg"


def login(page, email, password):
    page.goto(f"{BASE_URL}/#login")
    page.fill("#login-email", email)
    page.fill("#login-password", password)
    page.click("button[type='submit']")
    page.wait_for_url(f"{BASE_URL}/#dashboard", timeout=10_000)


def test_admin_create_club_with_logo():
    if not ADMIN_EMAIL or not ADMIN_PASSWORD:
        raise RuntimeError("Defina ADMIN_EMAIL e ADMIN_PASSWORD para executar TC036.")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            # 1. Admin login
            login(page, ADMIN_EMAIL, ADMIN_PASSWORD)

            # 2. Navegar para #clubs
            page.goto(f"{BASE_URL}/#clubs")
            page.wait_for_selector("#clubs-list", timeout=8_000)

            # 3. Criar clube com logo
            page.click("#add-club-btn")
            page.wait_for_selector("#club-form", timeout=5_000)
            page.fill("input[name='name']", CLUB_NAME)
            page.set_input_files("#club-logo-file", str(FIXTURE_PATH))
            page.click("#club-form button[type='submit']")

            # 4. Confirmar card e imagem persistida
            card = page.locator(".club-card", has_text=CLUB_NAME).first
            expect(card).to_be_visible(timeout=15_000)
            expect(card.locator('img[src*="club-logos"]')).to_be_visible(timeout=15_000)
        finally:
            browser.close()

        print("TC036 passou: clube criado com logo visível no card.")


if __name__ == "__main__":
    test_admin_create_club_with_logo()
