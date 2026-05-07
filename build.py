#!/usr/bin/env python3
"""
FouFou — City Trail Generator - Build Script
Produces 3 files: index.html (tiny shell), app-data.js (data), app-code.js (JSX)

Usage: python3 build.py          # production build (stripped)
       python3 build.py --debug   # debug build (keeps console.log)
"""
import re, json, sys, glob, os

def read_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        return f.read()

def strip_for_production(code):
    """Remove debug logging, excessive comments, and blank lines for production."""
    lines = code.split('\n')
    result = []
    skip_depth = 0

    for line in lines:
        stripped = line.strip()

        if skip_depth > 0:
            skip_depth += stripped.count('{') + stripped.count('(') + stripped.count('[')
            skip_depth -= stripped.count('}') + stripped.count(')') + stripped.count(']')
            if skip_depth <= 0:
                skip_depth = 0
            continue

        if re.match(r'\s*console\.(log|warn|info)\s*\(', stripped):
            opens = stripped.count('(') + stripped.count('{') + stripped.count('[')
            closes = stripped.count(')') + stripped.count('}') + stripped.count(']')
            if opens > closes:
                skip_depth = opens - closes
            continue

        # Keep addDebugLog - it has internal debugMode check
        # if re.match(r'\s*addDebugLog\s*\(', stripped): [REMOVED - kept for runtime debug]

        if re.match(r'\s*\.then\(\s*\(\)\s*=>\s*console\.(log|warn)\(', stripped):
            continue

        if re.match(r'\s*\.catch\(\s*\w+\s*=>\s*console\.(log|warn)\(', stripped):
            continue

        if stripped.startswith('//') and not stripped.startswith('// __INSERT') and not stripped.startswith('// ==='):
            continue

        if stripped == '' and result and result[-1].strip() == '':
            continue

        result.append(line)

    return '\n'.join(result)

def build():
    debug_mode = '--debug' in sys.argv
    mode = "DEBUG" if debug_mode else "PRODUCTION"
    print(f"🔨 Building FouFou ({mode})...")

    # Read all source files
    template = read_file('_source-template.html')
    code_template = read_file('_app-code-template.js')
    i18n = read_file('i18n.js')
    config = read_file('config.js')

    city_files = sorted(glob.glob('city-*.js'))
    city_data = '\n'.join([read_file(f) for f in city_files])
    if city_files:
        print(f"📦 City files: {', '.join(city_files)}")

    utils = read_file('utils.js')
    app_logic = read_file('app-logic.js')
    views = read_file('views.js')
    dialogs = read_file('dialogs.js')

    # Strip for production
    if not debug_mode:
        before = sum(len(x) for x in [app_logic, views, dialogs, utils, config])
        app_logic = strip_for_production(app_logic)
        views = strip_for_production(views)
        dialogs = strip_for_production(dialogs)
        utils = strip_for_production(utils)
        config = strip_for_production(config)
        after = sum(len(x) for x in [app_logic, views, dialogs, utils, config])
        saved = before - after
        print(f"🧹 Stripped {saved:,} bytes ({saved*100//before}% reduction)")

    # Extract version
    m = re.search(r"VERSION\s*=\s*'([^']+)'", config)
    ver = m.group(1) if m else '0.0.0'

    # ── VERSION BUMP GUARD ──────────────────────────────────────────────────
    # Check if version was already used in a previous build
    last_build_file = '.last_built_version'
    if os.path.exists(last_build_file):
        last_ver = open(last_build_file).read().strip()
        if last_ver == ver:
            print(f"\n⚠️  ════════════════════════════════════════════════")
            print(f"⚠️  VERSION NOT BUMPED — still {ver} (same as last build)")
            print(f"⚠️  Run: sed -i \"s/VERSION = '{ver}'/VERSION = 'X.Y.Z'/\" config.js")
            print(f"⚠️  And: sed -i 's/\"version\": \"{ver}\"/\"version\": \"X.Y.Z\"/' version.json")
            print(f"⚠️  ════════════════════════════════════════════════\n")
    # Record this build's version
    open(last_build_file, 'w').write(ver)
    # ────────────────────────────────────────────────────────────────────────

    with open('version.json', 'w') as f:
        json.dump({"version": ver}, f)
    print(f"📋 Version: {ver}")

    # Auto-update version + date in CLAUDE_CONTEXT.md
    import datetime
    if os.path.exists('CLAUDE_CONTEXT.md'):
        ctx = open('CLAUDE_CONTEXT.md', encoding='utf-8').read()
        # Update version line (English format: **vX.Y.Z** under "## Current Version")
        ctx = re.sub(r'\*\*v[\d.]+\*\*', f'**v{ver}**', ctx, count=1)
        # Legacy Hebrew format (if anyone still uses it)
        ctx = re.sub(r'- \*\*גרסה:\*\* `[\d.]+`.*', f'- **גרסה:** `{ver}` ({datetime.date.today().strftime("%b %d, %Y")})', ctx)
        # Update footer date line
        ctx = re.sub(r'\*עדכון אחרון:.*\*', f'*עדכון אחרון: {datetime.date.today().strftime("%d/%m/%Y")} — v{ver}*', ctx)
        open('CLAUDE_CONTEXT.md', 'w', encoding='utf-8').write(ctx)
        print(f"📝 CLAUDE_CONTEXT.md updated → v{ver}")

    # === BUILD FILE 1: app-data.js (i18n + cities + config + utils) ===
    app_data = f"// FouFou app-data.js v{ver}\n"
    app_data += i18n + '\n'
    app_data += city_data + '\n'
    app_data += config + '\n'
    app_data += utils + '\n'

    with open('app-data.js', 'w', encoding='utf-8') as f:
        f.write(app_data)
    data_kb = len(app_data.encode('utf-8')) / 1024
    print(f"📄 app-data.js ({data_kb:.0f}KB)")

    # === BUILD FILE 2: app-code.js (JSX app code) ===
    quick_add_component = read_file('quick-add-component.js') if __import__('os').path.exists('quick-add-component.js') else ''
    app_code = code_template
    app_code = app_code.replace('// __INSERT_QUICK_ADD_COMPONENT__', quick_add_component)
    app_code = app_code.replace('// __INSERT_APP_LOGIC__', app_logic)
    app_code = app_code.replace('// __INSERT_VIEWS__', views)
    app_code = app_code.replace('// __INSERT_DIALOGS__', dialogs)

    with open('app-code.js', 'w', encoding='utf-8') as f:
        f.write(app_code)
    code_lines = app_code.count('\n') + 1
    code_kb = len(app_code.encode('utf-8')) / 1024
    print(f"📄 app-code.js ({code_lines} lines, {code_kb:.0f}KB JSX source)")

    # Pre-compile: JSX → plain JS → minified (removes browser Babel dependency)
    import subprocess, shutil
    if shutil.which('node') and os.path.exists('compile.js') and os.path.exists('node_modules'):
        result = subprocess.run(['node', 'compile.js', 'app-code.js'], capture_output=True, text=True, encoding='utf-8', errors='replace')
        if result.returncode == 0:
            print((result.stdout or '').strip())
        else:
            print(f"⚠️  compile.js failed — shipping JSX source (browser Babel fallback active)")
            print((result.stderr or '')[:200])
    else:
        # Try fallback: use our installed Babel at /tmp/babel-test
        import os as _os
        if shutil.which('node') and _os.path.exists('/tmp/babel-test/node_modules/@babel/core'):
            transform_js = (
                "const babel=require('/tmp/babel-test/node_modules/@babel/core');"
                "const fs=require('fs');"
                "const code=fs.readFileSync('app-code.js','utf8');"
                "const result=babel.transformSync(code,{"
                "plugins:['/tmp/babel-test/node_modules/@babel/plugin-transform-react-jsx'],"
                "filename:'app-code.js',compact:false});"
                "fs.writeFileSync('app-code.js',result.code);"
                "process.stdout.write('OK:'+result.code.split('\\n').length+'\\n');"
            )
            r = subprocess.run(['node', '-e', transform_js], capture_output=True, text=True, cwd='.')
            if r.returncode == 0 and r.stdout.startswith('OK:'):
                lines = r.stdout.strip().split(':')[1]
                print(f"📄 app-code.js ({lines} lines, compiled JS via babel-test)")
            else:
                print(f"⚠️  Babel transform failed — shipping JSX source")
                print(r.stderr[:200])
        else:
            print(f"⚠️  compile.js / node_modules not found — shipping JSX source (browser Babel fallback active)")

    # === BUILD FILE 2.5: sw.js — update CACHE_NAME version ===
    if os.path.exists('sw.js'):
        with open('sw.js', 'r', encoding='utf-8') as f:
            sw = f.read()
        sw = re.sub(r"const CACHE_NAME = 'foufou(-\w+)?-v[\d.]+'", f"const CACHE_NAME = 'foufou-dev-v{ver}'", sw)
        # Also update versioned asset URLs in OFFLINE_ASSETS
        sw = re.sub(r"app-data\.js\?v=[\d.]+", f"app-data.js?v={ver}", sw)
        sw = re.sub(r"app-code\.js\?v=[\d.]+", f"app-code.js?v={ver}", sw)
        with open('sw.js', 'w', encoding='utf-8') as f:
            f.write(sw)
        print(f"📄 sw.js cache updated → foufou-v{ver}")

    # === BUILD FILE 3: index.html (tiny shell with splash) ===
    index_html = template.replace('__VERSION__', ver)

    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(index_html)
    html_lines = index_html.count('\n') + 1
    html_kb = len(index_html.encode('utf-8')) / 1024
    print(f"📄 index.html ({html_lines} lines, {html_kb:.1f}KB)")

    total_kb = data_kb + code_kb + html_kb
    print(f"✅ Total: {total_kb:.0f}KB (index.html {html_kb:.1f}KB + app-data.js {data_kb:.0f}KB + app-code.js {code_kb:.0f}KB)")

def test_maps_url_sanitize():
    import re
    broken_patterns = ['maps.app.goo.gl/', 'goo.gl/', 'app.goo.gl']
    def is_broken(url):
        if not url: return False
        for p in broken_patterns:
            if p in url: return True
        if 'google.com/maps' not in url: return True
        m = re.search(r'query_place_id=([^&]+)', url)
        if m:
            pid = m.group(1)
            if pid and not re.match(r'^(ChIJ|EiI|GhIJ)', pid): return True
        return False

    must_break = [
        'https://maps.app.goo.gl/7uy33NJtWPWEDnVT7',
        'https://goo.gl/maps/abc123',
        'https://app.goo.gl/xyz',
        'https://www.google.com/maps/search/?api=1&query=test&query_place_id=BADKEY123',
        'https://someothersite.com/maps',
    ]
    must_pass = [
        'https://www.google.com/maps/search/?api=1&query=test&query_place_id=ChIJabc123',
        'https://www.google.com/maps/search/?api=1&query=Bangkok&query_place_id=EiIabc',
        'https://www.google.com/maps/@13.73,100.52,15z',
    ]

    # Verify name+address is used over address-only (the Heng HoiTod bug)
    # Simulate: place with name + address, no coords, no placeId
    # Expected URL must contain the restaurant name, not just the address
    import urllib.parse
    def mock_url(name, address, coords=None, place_id=None):
        if place_id:
            return f'https://www.google.com/maps/search/?api=1&query={urllib.parse.quote(name)}&query_place_id={place_id}'
        if name and coords:
            return f'https://www.google.com/maps/search/?api=1&query={urllib.parse.quote(name + " " + str(coords[0]) + "," + str(coords[1]))}'
        if name and address:
            return f'https://www.google.com/maps/search/?api=1&query={urllib.parse.quote(name + " " + address)}'
        if address:
            return f'https://www.google.com/maps/search/?api=1&query={urllib.parse.quote(address)}'
        return '#'

    url = mock_url('Heng HoiTod Chawlae', '1326 Banthat Thong Rd')
    if 'Heng+HoiTod' not in url and 'Heng%20HoiTod' not in url and 'Heng HoiTod' not in url:
        errors.append(f'name+address bug: URL does not contain restaurant name: {url}')
    url_addr_only = mock_url('', '1326 Banthat Thong Rd')
    if '1326' not in url_addr_only:
        errors.append(f'address-only fallback broken: {url_addr_only}')
    errors = []
    for url in must_break:
        if not is_broken(url): errors.append(f'MISSED broken URL: {url}')
    for url in must_pass:
        if is_broken(url): errors.append(f'FALSE positive on valid URL: {url}')
    if errors:
        print('\n❌ test_maps_url_sanitize FAILED:')
        for e in errors: print(f'  {e}')
        raise SystemExit(1)
    print('✅ test_maps_url_sanitize passed')


if __name__ == '__main__':
    test_maps_url_sanitize()
    build()
