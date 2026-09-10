from pathlib import Path
import shutil, sys
root=Path.cwd(); index=root/'index.html'; src=Path(__file__).with_name('photography-house.html'); dst=root/'photography-house.html'
if not index.exists():
    sys.exit('ERROR: Run this from inside your existing Finance Tracker folder (index.html was not found).')
backup=root/'index.before-photography-house.html'
if not backup.exists(): shutil.copy2(index, backup)
text=index.read_text(encoding='utf-8')
nav='<a class="actionbtn" href="/">Main Finance Dashboard</a>\n        <a class="actionbtn" href="/photography-house.html">Photography + New House</a>'
if '/photography-house.html' not in text:
    marker='<a class="actionbtn" href="/outgoings">Manage Direct Debits</a>'
    if marker in text: text=text.replace(marker, nav+'\n        '+marker,1)
    else: sys.exit('ERROR: Could not find the existing navigation marker. No changes made.')
    index.write_text(text,encoding='utf-8')
shutil.copy2(src,dst)
print('READY: index.html updated and photography-house.html added.')
print('Backup:', backup)
print('Next: npx vercel --prod')
