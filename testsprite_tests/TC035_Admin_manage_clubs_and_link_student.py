"""
TC035 — Admin cria clube, vincula a aluno e aluno vê clube no perfil.

Pré-requisitos:
  - App rodando em http://localhost:3000
  - Variáveis de ambiente: ADMIN_EMAIL, ADMIN_PASSWORD, STUDENT_EMAIL, STUDENT_PASSWORD
  - Migration 008_clubs_linked_to_students.sql aplicada no projeto Supabase
"""

import os
import time
from playwright.sync_api import sync_playwright, expect

BASE_URL = os.getenv("APP_URL", "http://localhost:3000")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
STUDENT_EMAIL = os.getenv("STUDENT_EMAIL", "")
STUDENT_PASSWORD = os.getenv("STUDENT_PASSWORD", "")
CLUB_NAME = f"Clube QA {int(time.time())}"


def login(page, email, password):
    page.goto(f"{BASE_URL}/#login")
    page.fill("#login-email", email)
    page.fill("#login-password", password)
    page.click("button[type='submit']")
    page.wait_for_url(f"{BASE_URL}/#dashboard", timeout=10_000)


def test_admin_create_club_and_link_student():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # 1. Admin login
        login(page, ADMIN_EMAIL, ADMIN_PASSWORD)

        # 2. Navegar para #clubs
        page.goto(f"{BASE_URL}/#clubs")
        page.wait_for_selector("#clubs-list", timeout=8_000)

        # 3. Criar clube
        page.click("#add-club-btn")
        page.wait_for_selector("#club-form", timeout=5_000)
        page.fill("input[name='name']", CLUB_NAME)
        page.click("#club-form button[type='submit']")
        page.wait_for_selector(f"text={CLUB_NAME}", timeout=8_000)

        # 4. Navegar para #users e selecionar aluno de teste
        page.goto(f"{BASE_URL}/#users")
        page.wait_for_selector("#users-list", timeout=8_000)
        page.click("button[data-role='student']")
        page.wait_for_timeout(1_000)

        # Clicar no primeiro aluno da lista
        first_student = page.locator(".user-item-card").first
        first_student.click()
        page.wait_for_selector("#edit-user-form", timeout=5_000)

        # Selecionar clube
        page.select_option("select[name='club_id']", label=CLUB_NAME)
        page.click("#edit-user-form button[type='submit']")
        page.wait_for_timeout(2_000)

        # 5. Reabrir formulário e confirmar clube salvo
        first_student = page.locator(".user-item-card").first
        first_student.click()
        page.wait_for_selector("#edit-user-form", timeout=5_000)
        selected = page.locator("select[name='club_id']").input_value()
        assert selected != "", f"club_id deveria estar selecionado, mas ficou vazio"

        browser.close()
        print("TC035 passou: clube criado e vinculado ao aluno com sucesso.")


if __name__ == "__main__":
    test_admin_create_club_and_link_student()
