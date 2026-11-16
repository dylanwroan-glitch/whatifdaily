# sheet.py — contact sheet of stills (sorted by time) with time labels: python3 sheet.py out.jpg [cols] [files...]
import sys, glob, os, re
from PIL import Image, ImageDraw
out = sys.argv[1]; cols = int(sys.argv[2]) if len(sys.argv) > 2 else 6
files = sys.argv[3:] or glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'stills', 's_*.jpg'))
key = lambda f: float(re.findall(r's_([0-9.]+)\.jpg', f)[0]) if re.findall(r's_([0-9.]+)\.jpg', f) else 0
files = sorted(files, key=key)
w, h = 300, 533
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (w + 4), rows * (h + 4)), (20, 20, 20))
d = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((w, h))
    x, y = (i % cols) * (w + 4), (i // cols) * (h + 4)
    sheet.paste(im, (x, y)); d.rectangle([x, y, x + 70, y + 22], fill=(0, 0, 0)); d.text((x + 4, y + 4), '%.2f' % key(f), fill=(255, 255, 0))
sheet.save(out, quality=88)
print(out, len(files))
