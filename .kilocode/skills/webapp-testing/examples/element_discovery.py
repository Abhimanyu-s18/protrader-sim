from playwright.sync_api import sync_playwright
import tempfile
import os

# Example: Discovering buttons and other elements on a page

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    # Navigate to page and wait for it to fully load
    try:
        page.goto('http://localhost:5173', timeout=5000)
        page.wait_for_load_state('networkidle', timeout=5000)
    except Exception as e:
        print(f"Navigation failed: {e}")
        browser.close()
        exit(1)

    # Discover all buttons on the page
    buttons = page.locator('button').all()
    print(f"Found {len(buttons)} buttons:")
    for i, button in enumerate(buttons):
        try:
            text = button.inner_text() if button.is_visible() else "[hidden]"
            print(f"  [{i}] {text}")
        except Exception as e:
            print(f"  [{i}] [error accessing element: {e}]")

    # Discover links
    links = page.locator('a[href]').all()
    print(f"\nFound {len(links)} links:")
    for link in links[:5]:  # Show first 5
        try:
            text = link.inner_text().strip()
            href = link.get_attribute('href')
            print(f"  - {text} -> {href}")
        except Exception as e:
            print(f"  - [error reading link: {e}]")

    # Discover input fields
    inputs = page.locator('input, textarea, select').all()
    print(f"\nFound {len(inputs)} input fields:")
    for i, input_elem in enumerate(inputs):
        try:
            name = input_elem.get_attribute('name') or input_elem.get_attribute('id') or "[unnamed]"
            input_type = input_elem.get_attribute('type') or 'text'
            print(f"  - {name} ({input_type})")
        except Exception as e:
            print(f"  [{i}] [error accessing input element: {e}]")

    # Take screenshot for visual reference
    try:
        screenshot_path = os.path.join(tempfile.gettempdir(), 'page_discovery.png')
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"\nScreenshot saved to {screenshot_path}")
    except Exception as e:
        print(f"\nScreenshot failed: {e}")

    browser.close()